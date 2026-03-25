import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1";
const API_KEY_SECRET = Deno.env.get("API_KEY_SECRET");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
};

// =============================================================================
// Types
// =============================================================================

interface CanvasAgentRequest {
  /** System prompt for the AI */
  system: string;
  /** Conversation messages */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Anthropic model ID (default: claude-sonnet-4-20250514) */
  model?: string;
  /** Max tokens to generate (default: 4096) */
  maxTokens?: number;
  /** Whether to stream the response */
  stream?: boolean;
}

function isValidRequest(body: unknown): body is CanvasAgentRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.system === "string" &&
    b.system.length > 0 &&
    Array.isArray(b.messages) &&
    b.messages.length > 0
  );
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// =============================================================================
// Key lookup (shared pattern with ai-widget-generate)
// =============================================================================

async function getUserApiKey(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  provider: string,
): Promise<{ keyId: string; keyValue: string } | null> {
  function decodeHexToText(hexValue: string): string | null {
    const hex = hexValue.startsWith("\\x") ? hexValue.slice(2) : hexValue;
    if (hex.length === 0 || hex.length % 2 !== 0) return null;
    if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return new TextDecoder().decode(bytes);
  }

  function decodeStoredKey(value: unknown): string | null {
    if (typeof value === "string") {
      if (value.startsWith("\\x")) return decodeHexToText(value);
      try { return atob(value); } catch { return value; }
    }
    if (value instanceof Uint8Array) {
      const asText = new TextDecoder().decode(value);
      try { return atob(asText); } catch { return asText; }
    }
    return null;
  }

  if (API_KEY_SECRET) {
    try {
      await serviceClient.rpc("set_config", {
        setting_name: "app.api_key_secret",
        setting_value: API_KEY_SECRET,
        is_local: true,
      });
    } catch { /* ignore */ }
  }

  const { data: decryptedData, error } = await serviceClient.rpc(
    "get_decrypted_api_key",
    { p_user_id: userId, p_provider: provider },
  );

  if (error || !decryptedData?.[0]?.key_value) {
    const { data: keyData } = await serviceClient
      .from("user_api_keys")
      .select("id, encrypted_key")
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (keyData?.encrypted_key) {
      const decoded = decodeStoredKey(keyData.encrypted_key);
      if (decoded) return { keyId: keyData.id, keyValue: decoded };
    }
    return null;
  }

  return { keyId: decryptedData[0].id, keyValue: decryptedData[0].key_value };
}

async function updateKeyLastUsed(
  serviceClient: ReturnType<typeof createClient>,
  keyId: string,
): Promise<void> {
  await serviceClient
    .from("user_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyId);
}

// =============================================================================
// Anthropic API — non-streaming
// =============================================================================

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
): Promise<{ text: string }> {
  const anthropicModel = model.startsWith("anthropic/")
    ? model.slice("anthropic/".length)
    : model;

  const res = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw Object.assign(new Error("Invalid API key"), { code: "INVALID_API_KEY", status: res.status });
    }
    throw new Error(`Anthropic API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
  return { text: textBlock?.text ?? "" };
}

// =============================================================================
// Anthropic API — streaming (SSE)
// =============================================================================

async function streamAnthropic(
  apiKey: string,
  model: string,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
): Promise<void> {
  const anthropicModel = model.startsWith("anthropic/")
    ? model.slice("anthropic/".length)
    : model;

  const res = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: maxTokens,
      stream: true,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw Object.assign(new Error("Invalid API key"), { code: "INVALID_API_KEY", status: res.status });
    }
    throw new Error(`Anthropic API error (${res.status}): ${text}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") continue;

      try {
        const event = JSON.parse(jsonStr);
        if (event.type === "content_block_delta" && event.delta?.text) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ token: event.delta.text })}\n\n`));
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }
}

// =============================================================================
// Main handler
// =============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed", code: "METHOD_ERROR" }, 405);
    }

    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Unauthorized", code: "AUTH_ERROR" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ success: false, error: "Unauthorized", code: "AUTH_ERROR" }, 401);
    }

    // Parse request
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body", code: "INVALID_REQUEST" }, 400);
    }

    if (!isValidRequest(body)) {
      return jsonResponse({
        success: false,
        error: "Invalid request: requires { system, messages }",
        code: "INVALID_REQUEST",
      }, 400);
    }

    // Get user's Anthropic API key
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userKey = await getUserApiKey(serviceClient, user.id, "anthropic");
    if (!userKey) {
      return jsonResponse({
        success: false,
        error: "No Anthropic API key configured. Add your key in Settings > Integrations.",
        code: "NO_API_KEY",
      }, 400);
    }

    const model = body.model ?? "claude-sonnet-4-20250514";
    const maxTokens = body.maxTokens ?? 4096;

    // ─── Streaming mode ─────────────────────────────────────────────
    if (body.stream) {
      const encoder = new TextEncoder();
      const stream = new TransformStream<Uint8Array, Uint8Array>();
      const writer = stream.writable.getWriter();

      (async () => {
        try {
          await streamAnthropic(
            userKey.keyValue,
            model,
            body.system,
            body.messages,
            maxTokens,
            writer,
            encoder,
          );
          await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          await updateKeyLastUsed(serviceClient, userKey.keyId);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          const code = (err as { code?: string }).code;
          console.error(`[ai-canvas-agent] Stream error: ${message}`);
          await writer.write(encoder.encode(`data: ${JSON.stringify({ error: message, code: code ?? "GENERATION_FAILED" })}\n\n`));
        } finally {
          await writer.close();
        }
      })();

      return new Response(stream.readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          ...CORS_HEADERS,
        },
      });
    }

    // ─── Non-streaming mode ─────────────────────────────────────────
    const result = await callAnthropic(
      userKey.keyValue,
      model,
      body.system,
      body.messages,
      maxTokens,
    );

    await updateKeyLastUsed(serviceClient, userKey.keyId);

    return jsonResponse({ success: true, text: result.text });

  } catch (err: unknown) {
    const error = err as Error & { code?: string; status?: number };
    const message = error.message ?? String(err);
    console.error(`[ai-canvas-agent] Error: ${message}`);

    if (error.code === "INVALID_API_KEY") {
      return jsonResponse({
        success: false,
        error: "API key is invalid. Please update it in Settings > Integrations.",
        code: "INVALID_API_KEY",
      }, 401);
    }

    return jsonResponse({ success: false, error: `Agent failed: ${message}`, code: "GENERATION_FAILED" }, 400);
  }
});
