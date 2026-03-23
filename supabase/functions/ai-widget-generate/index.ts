import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1";
const REPLICATE_API_BASE = "https://api.replicate.com/v1";
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;
const API_KEY_SECRET = Deno.env.get("API_KEY_SECRET");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
};

// =============================================================================
// System prompt for widget generation
// =============================================================================

const WIDGET_SYSTEM_PROMPT = `You are a StickerNest widget generator. You create single-file HTML widgets.

Rules:
- Output ONLY valid HTML. No markdown fences, no explanation text.
- The widget must be a complete HTML document with <html>, <head>, and <body> tags.
- Include all CSS in a <style> tag and all JS in a <script> tag.
- The StickerNest SDK is available as \`window.StickerNest\` — do NOT import or include it.
- Call \`StickerNest.register({ ... })\` with a manifest object, then call \`StickerNest.ready()\`.
- Use CSS custom properties for theming: --sn-bg, --sn-surface, --sn-accent, --sn-text, --sn-text-muted, --sn-border, --sn-radius, --sn-font-family.
- Do NOT include remote script sources (no CDN links).
- Make the widget responsive to its container size.
- Keep the widget self-contained and functional.

PIPELINE WIRING:
- Widgets communicate via typed event ports declared in the manifest.
- When the user asks to connect to existing widgets, they will provide port contracts.
- Your StickerNest.register() manifest MUST declare matching event types in the 'events' field:
  events: {
    emits: [{ name: "event-name", description: "what it does" }],
    subscribes: [{ name: "event-name", description: "what it does" }]
  }
- To receive data from another widget: add the EXACT event name to 'subscribes' array AND call StickerNest.subscribe("event-name", handler) in your code.
- To send data to another widget: add the EXACT event name to 'emits' array AND call StickerNest.emit("event-name", payload) in your code.
- Port names must EXACTLY match the connected widget's port names for auto-wiring to work.
- Always include both the manifest declaration AND the corresponding SDK call.`;

const EXPLAIN_SYSTEM_PROMPT = `You are a helpful coding assistant for StickerNest widget development. Answer questions clearly and concisely. Do not generate code unless specifically asked.`;

// =============================================================================
// Types
// =============================================================================

interface WidgetGenRequest {
  provider: "anthropic" | "replicate";
  model: string;
  prompt: string;
  type: "widget-generation" | "explain";
  stream?: boolean;
}

function isValidRequest(body: unknown): body is WidgetGenRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    (b.provider === "anthropic" || b.provider === "replicate") &&
    typeof b.model === "string" &&
    b.model.length > 0 &&
    typeof b.prompt === "string" &&
    b.prompt.length > 0 &&
    (b.type === "widget-generation" || b.type === "explain")
  );
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// =============================================================================
// Key lookup (generalized from ai-generate)
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
  prompt: string,
  type: "widget-generation" | "explain",
): Promise<{ text: string }> {
  const systemPrompt = type === "widget-generation"
    ? WIDGET_SYSTEM_PROMPT
    : EXPLAIN_SYSTEM_PROMPT;

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
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
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
  prompt: string,
  type: "widget-generation" | "explain",
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
): Promise<void> {
  const systemPrompt = type === "widget-generation"
    ? WIDGET_SYSTEM_PROMPT
    : EXPLAIN_SYSTEM_PROMPT;

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
      max_tokens: 8192,
      stream: true,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
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
// Replicate API — non-streaming
// =============================================================================

async function pollPrediction(
  id: string,
  token: string,
): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const res = await fetch(`${REPLICATE_API_BASE}/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Replicate poll failed (${res.status}): ${text}`);
    }

    const prediction = await res.json();

    if (prediction.status === "succeeded") {
      const output = prediction.output;
      if (typeof output === "string") return output;
      if (Array.isArray(output)) return output.join("");
      return JSON.stringify(output);
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(prediction.error || `Prediction ${prediction.status}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error("Generation timed out after 120 seconds");
}

async function callReplicate(
  apiKey: string,
  model: string,
  prompt: string,
  type: "widget-generation" | "explain",
): Promise<{ text: string }> {
  const systemPrompt = type === "widget-generation"
    ? WIDGET_SYSTEM_PROMPT
    : EXPLAIN_SYSTEM_PROMPT;

  // Wrap prompt with explicit instructions — some Replicate models ignore system_prompt
  const wrappedPrompt = type === "widget-generation"
    ? `${systemPrompt}\n\nIMPORTANT: Your ENTIRE response must be a single valid HTML document starting with <!DOCTYPE html>. Do NOT include any explanation, commentary, or markdown. Output raw HTML only.\n\n${prompt}`
    : prompt;

  const res = await fetch(`${REPLICATE_API_BASE}/models/${model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: {
        prompt: wrappedPrompt,
        system_prompt: systemPrompt,
        max_tokens: 8192,
        max_new_tokens: 8192,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw Object.assign(new Error("Invalid API key"), { code: "INVALID_API_KEY", status: res.status });
    }
    throw new Error(`Replicate error (${res.status}): ${text}`);
  }

  const prediction = await res.json();

  // Check if we got a completed prediction with actual content
  if (prediction.status === "succeeded" && prediction.output) {
    const output = prediction.output;
    const text = typeof output === "string"
      ? output
      : Array.isArray(output) ? output.join("") : JSON.stringify(output);
    if (text.trim().length > 0) {
      return { text };
    }
  }

  // If no output yet or empty, poll until complete
  if (prediction.id) {
    const text = await pollPrediction(prediction.id, apiKey);
    return { text };
  }

  throw new Error(`Replicate returned no prediction ID. Status: ${prediction.status}`);
}

// =============================================================================
// Replicate API — streaming (SSE)
// =============================================================================

async function streamReplicate(
  apiKey: string,
  model: string,
  prompt: string,
  type: "widget-generation" | "explain",
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
): Promise<void> {
  const systemPrompt = type === "widget-generation"
    ? WIDGET_SYSTEM_PROMPT
    : EXPLAIN_SYSTEM_PROMPT;

  // Wrap prompt with explicit instructions — some Replicate models ignore system_prompt
  const wrappedPrompt = type === "widget-generation"
    ? `${systemPrompt}\n\nIMPORTANT: Your ENTIRE response must be a single valid HTML document starting with <!DOCTYPE html>. Do NOT include any explanation, commentary, or markdown. Output raw HTML only.\n\n${prompt}`
    : prompt;

  // Create prediction with stream=true to get the streaming URL
  const res = await fetch(`${REPLICATE_API_BASE}/models/${model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: {
        prompt: wrappedPrompt,
        system_prompt: systemPrompt,
        max_tokens: 8192,
        max_new_tokens: 8192,
      },
      stream: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw Object.assign(new Error("Invalid API key"), { code: "INVALID_API_KEY", status: res.status });
    }
    throw new Error(`Replicate error (${res.status}): ${text}`);
  }

  const prediction = await res.json();
  const streamUrl = prediction.urls?.stream;

  if (!streamUrl) {
    // Model doesn't support streaming — fall back to polling and send as one chunk
    const text = await pollPrediction(prediction.id, apiKey);
    await writer.write(encoder.encode(`data: ${JSON.stringify({ token: text })}\n\n`));
    return;
  }

  // Read the SSE stream from Replicate
  const streamRes = await fetch(streamUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "text/event-stream",
    },
  });

  if (!streamRes.ok || !streamRes.body) {
    // Fall back to polling
    const text = await pollPrediction(prediction.id, apiKey);
    await writer.write(encoder.encode(`data: ${JSON.stringify({ token: text })}\n\n`));
    return;
  }

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "output"; // Replicate sends event: output for tokens, event: done at end

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      // Track event type — Replicate sends "event: output" and "event: done"
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
        continue;
      }

      if (line.startsWith("data: ")) {
        // Skip data lines for "done" events (they contain "{}" not content)
        if (currentEvent === "done") continue;

        const token = line.slice(6);
        if (token.trim()) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        }
      }
    }
  }
}

// =============================================================================
// Extract HTML from model response
// =============================================================================

function extractHtml(text: string): string {
  const trimmed = text.trim();

  // If the response is wrapped in markdown code fences, extract the content
  const fenceMatch = trimmed.match(/```(?:html)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // If it starts with <!DOCTYPE or <html, use as-is
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith("<HTML")) {
    return trimmed;
  }

  // Try to find HTML embedded in conversational text
  const htmlBlockMatch = trimmed.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
  if (htmlBlockMatch) return htmlBlockMatch[1].trim();

  const htmlTagMatch = trimmed.match(/(<html[\s\S]*<\/html>)/i);
  if (htmlTagMatch) return htmlTagMatch[1].trim();

  // Return raw text — client-side validation will catch issues
  return trimmed;
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
        error: 'Invalid request: requires { provider, model, prompt, type }',
        code: "INVALID_REQUEST",
      }, 400);
    }

    // Get user's API key for the provider
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userKey = await getUserApiKey(serviceClient, user.id, body.provider);
    if (!userKey) {
      const providerLabel = body.provider === "anthropic" ? "Anthropic" : "Replicate";
      return jsonResponse({
        success: false,
        error: `No ${providerLabel} API key configured. Add your key in Settings > Integrations.`,
        code: "NO_API_KEY",
      }, 400);
    }

    // ─── Streaming mode ─────────────────────────────────────────────
    if (body.stream) {
      const encoder = new TextEncoder();
      const stream = new TransformStream<Uint8Array, Uint8Array>();
      const writer = stream.writable.getWriter();

      // Run the streaming call in the background so we can return the response immediately
      (async () => {
        try {
          if (body.provider === "anthropic") {
            await streamAnthropic(userKey.keyValue, body.model, body.prompt, body.type, writer, encoder);
          } else {
            await streamReplicate(userKey.keyValue, body.model, body.prompt, body.type, writer, encoder);
          }
          await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          await updateKeyLastUsed(serviceClient, userKey.keyId);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          const code = (err as { code?: string }).code;
          console.error(`[ai-widget-generate] Stream error: ${message}`);
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
    let result: { text: string };

    if (body.provider === "anthropic") {
      result = await callAnthropic(userKey.keyValue, body.model, body.prompt, body.type);
    } else {
      result = await callReplicate(userKey.keyValue, body.model, body.prompt, body.type);
    }

    await updateKeyLastUsed(serviceClient, userKey.keyId);

    if (body.type === "explain") {
      return jsonResponse({ success: true, text: result.text });
    }

    const html = extractHtml(result.text);
    return jsonResponse({ success: true, html });

  } catch (err: unknown) {
    const error = err as Error & { code?: string; status?: number };
    const message = error.message ?? String(err);
    const stack = error.stack ?? '';
    console.error(`[ai-widget-generate] Error: ${message}\n${stack}`);

    if (error.code === "INVALID_API_KEY") {
      return jsonResponse({
        success: false,
        error: `API key is invalid. Please update it in Settings > Integrations.`,
        code: "INVALID_API_KEY",
      }, 401);
    }

    if (message.includes("timed out")) {
      return jsonResponse({ success: false, error: message, code: "TIMEOUT" }, 504);
    }

    return jsonResponse({ success: false, error: `Generation failed: ${message}`, code: "GENERATION_FAILED" }, 400);
  }
});
