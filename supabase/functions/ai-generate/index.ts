import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface AiRequest {
  action: string;
  model: string; // "owner/model-name" or specific version ID
  input: Record<string, unknown>;
}

function isValidRequest(body: unknown): body is AiRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    b.action === "generate-image" &&
    typeof b.model === "string" &&
    b.model.length > 0 &&
    typeof b.input === "object" &&
    b.input !== null
  );
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

async function pollPrediction(
  id: string,
  token: string,
): Promise<{ output: unknown; id: string; status: string }> {
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
      return {
        output: prediction.output,
        id: prediction.id,
        status: prediction.status,
      };
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(
        prediction.error || `Prediction ${prediction.status}`,
      );
    }

    // Still processing — wait and poll again
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error("Generation timed out after 120 seconds");
}

async function getUserReplicateKey(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
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
      if (value.startsWith("\\x")) {
        return decodeHexToText(value);
      }

      try {
        return atob(value);
      } catch {
        return value;
      }
    }

    if (value instanceof Uint8Array) {
      const asText = new TextDecoder().decode(value);
      try {
        return atob(asText);
      } catch {
        return asText;
      }
    }

    return null;
  }

  // Set the encryption secret for decryption
  if (API_KEY_SECRET) {
    try {
      await serviceClient.rpc("set_config", {
        setting_name: "app.api_key_secret",
        setting_value: API_KEY_SECRET,
        is_local: true,
      });
    } catch {
      // Ignore if RPC doesn't exist
    }
  }

  // Try to get user's Replicate key
  const { data: decryptedData, error } = await serviceClient.rpc(
    "get_decrypted_api_key",
    { p_user_id: userId, p_provider: "replicate" }
  );

  if (error || !decryptedData?.[0]?.key_value) {
    // Fallback: try to get the base64-encoded key directly
    const { data: keyData } = await serviceClient
      .from("user_api_keys")
      .select("id, encrypted_key")
      .eq("user_id", userId)
      .eq("provider", "replicate")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (keyData?.encrypted_key) {
      const decoded = decodeStoredKey(keyData.encrypted_key);
      if (decoded) {
        return { keyId: keyData.id, keyValue: decoded };
      }
    }
    return null;
  }

  return {
    keyId: decryptedData[0].id,
    keyValue: decryptedData[0].key_value,
  };
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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed", code: "METHOD_ERROR" },
      405,
    );
  }

  // Authenticate the request via Supabase JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(
      { success: false, error: "Unauthorized", code: "AUTH_ERROR" },
      401,
    );
  }

  // Create authenticated client to verify user
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonResponse(
      { success: false, error: "Unauthorized", code: "AUTH_ERROR" },
      401,
    );
  }

  // Create service client for key lookup
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get user's Replicate API key
  const userKey = await getUserReplicateKey(serviceClient, user.id);

  if (!userKey) {
    return jsonResponse(
      {
        success: false,
        error: "No Replicate API key configured. Please add your API key in Settings > Integrations.",
        code: "NO_API_KEY",
      },
      400,
    );
  }

  const replicateToken = userKey.keyValue;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid JSON body", code: "INVALID_REQUEST" },
      400,
    );
  }

  if (!isValidRequest(body)) {
    return jsonResponse(
      {
        success: false,
        error:
          'Invalid request: requires { action: "generate-image", model: string, input: object }',
        code: "INVALID_REQUEST",
      },
      400,
    );
  }

  // Create prediction on Replicate
  try {
    const isFullModelPath = body.model.includes("/");
    const url = isFullModelPath
      ? `${REPLICATE_API_BASE}/models/${body.model}/predictions`
      : `${REPLICATE_API_BASE}/predictions`;

    const createBody = isFullModelPath
      ? { input: body.input }
      : { version: body.model, input: body.input };

    const createRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();

      // Check if this is an auth error (invalid key)
      if (createRes.status === 401 || createRes.status === 403) {
        // Mark the key as invalid
        await serviceClient
          .from("user_api_keys")
          .update({
            status: "invalid",
            validation_error: "Key rejected by Replicate API",
            last_validated_at: new Date().toISOString(),
          })
          .eq("id", userKey.keyId);

        return jsonResponse(
          {
            success: false,
            error: "Your Replicate API key is invalid. Please update it in Settings > Integrations.",
            code: "INVALID_API_KEY",
          },
          401,
        );
      }

      return jsonResponse(
        {
          success: false,
          error: `Replicate error: ${errorText}`,
          code: "PROVIDER_ERROR",
        },
        createRes.status,
      );
    }

    const prediction = await createRes.json();

    // Update last_used_at for the key
    await updateKeyLastUsed(serviceClient, userKey.keyId);

    // If already succeeded (some models return immediately)
    if (prediction.status === "succeeded") {
      return jsonResponse({
        success: true,
        data: {
          output: prediction.output,
          id: prediction.id,
          status: prediction.status,
        },
      });
    }

    // Poll until complete
    const result = await pollPrediction(prediction.id, replicateToken);
    return jsonResponse({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("timed out")) {
      return jsonResponse(
        { success: false, error: message, code: "TIMEOUT" },
        504,
      );
    }

    return jsonResponse(
      { success: false, error: message, code: "GENERATION_FAILED" },
      502,
    );
  }
});
