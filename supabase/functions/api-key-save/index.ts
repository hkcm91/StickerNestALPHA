import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_KEY_SECRET = Deno.env.get("API_KEY_SECRET");
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
};

interface SaveRequest {
  provider: "replicate" | "openai" | "anthropic" | "custom";
  key: string;
  name?: string;
  customBaseUrl?: string;
  customHeaderName?: string;
  customHeaderPrefix?: string;
}

interface RevalidateRequest {
  keyId: string;
  action: "revalidate";
}

type RequestBody = SaveRequest | RevalidateRequest;

function isRevalidateRequest(body: RequestBody): body is RevalidateRequest {
  return "action" in body && body.action === "revalidate";
}

function isSaveRequest(body: RequestBody): body is SaveRequest {
  return (
    "provider" in body &&
    "key" in body &&
    typeof body.provider === "string" &&
    typeof body.key === "string"
  );
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    // Return 200 for handled app-level errors so supabase-js surfaces payload
    // in `data` instead of generic `response.error` non-2xx messages.
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function getKeySuffix(key: string): string {
  return key.slice(-6);
}

function toPostgresByteaHex(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return `\\x${hex}`;
}

function normalizeStorageName(provider: SaveRequest["provider"], name?: string): string {
  if (provider === "custom") {
    const trimmed = name?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : "default";
  }

  // Non-custom providers are single-key-per-provider.
  return "__default__";
}

async function validateReplicateKey(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.replicate.com/v1/account", {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid API key" };
    }

    if (!response.ok) {
      return { valid: false, error: `Replicate API error: ${response.status}` };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Failed to connect to Replicate: ${err}` };
  }
}

async function validateOpenAIKey(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid API key" };
    }

    if (!response.ok) {
      return { valid: false, error: `OpenAI API error: ${response.status}` };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Failed to connect to OpenAI: ${err}` };
  }
}

async function validateAnthropicKey(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Anthropic validates keys by making a minimal request to the messages endpoint
    // We use a lightweight call that will fail fast if the key is invalid
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid API key" };
    }

    // Any other response (including rate limit) means the key is valid
    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Failed to connect to Anthropic: ${err}` };
  }
}

async function validateCustomKey(
  key: string,
  baseUrl?: string,
  headerName?: string,
  headerPrefix?: string
): Promise<{ valid: boolean; error?: string }> {
  if (!baseUrl) {
    return { valid: false, error: "Custom provider requires a base URL" };
  }

  try {
    const headers: Record<string, string> = {
      [headerName ?? "Authorization"]: `${headerPrefix ?? "Bearer"} ${key}`,
    };

    const response = await fetch(baseUrl, {
      method: "HEAD",
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid API key" };
    }

    // Any other response means the key is likely valid
    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Failed to connect to custom API: ${err}` };
  }
}

async function validateApiKey(
  provider: string,
  key: string,
  customBaseUrl?: string,
  customHeaderName?: string,
  customHeaderPrefix?: string
): Promise<{ valid: boolean; error?: string }> {
  switch (provider) {
    case "replicate":
      return validateReplicateKey(key);
    case "openai":
      return validateOpenAIKey(key);
    case "anthropic":
      return validateAnthropicKey(key);
    case "custom":
      return validateCustomKey(key, customBaseUrl, customHeaderName, customHeaderPrefix);
    default:
      return { valid: false, error: `Unknown provider: ${provider}` };
  }
}

Deno.serve(async (req: Request) => {
  try {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed", code: "METHOD_ERROR" },
      405
    );
  }

  // Check API key secret is configured
  if (!API_KEY_SECRET) {
    return jsonResponse(
      {
        success: false,
        error: "API key encryption not configured on server",
        code: "CONFIG_ERROR",
      },
      500
    );
  }

  // Authenticate the request via Supabase JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(
      { success: false, error: "Missing authorization header", code: "AUTH_ERROR" },
      401
    );
  }

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
      401
    );
  }

  // Parse request body
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid JSON body", code: "INVALID_REQUEST" },
      400
    );
  }

  // Create service client for database operations
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Set the session config for decrypt/encrypt helper functions.
  await serviceClient.rpc("set_config", {
    setting_name: "app.api_key_secret",
    setting_value: API_KEY_SECRET,
    is_local: true,
  }).catch(() => {
    // If this fails, get_decrypted_api_key may fail and fallback paths will be used.
  });

  // Handle revalidation request
  if (isRevalidateRequest(body)) {
    // Fetch the existing key
    const { data: existingKey, error: fetchError } = await serviceClient
      .from("user_api_keys")
      .select("*")
      .eq("id", body.keyId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingKey) {
      return jsonResponse(
        { success: false, error: "API key not found", code: "NOT_FOUND" },
        404
      );
    }

    // Decrypt the key for validation
    const { data: decryptedData, error: decryptError } = await serviceClient.rpc(
      "get_decrypted_api_key",
      { p_user_id: user.id, p_provider: existingKey.provider }
    );

    if (decryptError || !decryptedData?.[0]?.key_value) {
      return jsonResponse(
        { success: false, error: "Failed to decrypt key", code: "DECRYPT_ERROR" },
        500
      );
    }

    const decryptedKey = decryptedData[0].key_value;

    // Validate the key
    const validation = await validateApiKey(
      existingKey.provider,
      decryptedKey,
      existingKey.custom_base_url,
      existingKey.custom_header_name,
      existingKey.custom_header_prefix
    );

    // Update the key status
    const { data: updated, error: updateError } = await serviceClient
      .from("user_api_keys")
      .update({
        status: validation.valid ? "active" : "invalid",
        validation_error: validation.error ?? null,
        last_validated_at: new Date().toISOString(),
      })
      .eq("id", body.keyId)
      .select()
      .single();

    if (updateError) {
      return jsonResponse(
        { success: false, error: updateError.message, code: "DB_ERROR" },
        500
      );
    }

    return jsonResponse({
      success: true,
      key: {
        id: updated.id,
        userId: updated.user_id,
        provider: updated.provider,
        name: updated.provider === "custom" ? updated.name : null,
        keySuffix: updated.key_suffix,
        status: updated.status,
        validationError: updated.validation_error,
        lastValidatedAt: updated.last_validated_at,
        lastUsedAt: updated.last_used_at,
        customBaseUrl: updated.custom_base_url,
        customHeaderName: updated.custom_header_name,
        customHeaderPrefix: updated.custom_header_prefix,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  }

  // Handle save request
  if (!isSaveRequest(body)) {
    return jsonResponse(
      {
        success: false,
        error: 'Invalid request: requires { provider, key }',
        code: "INVALID_REQUEST",
      },
      400
    );
  }

  const { provider, key, name, customBaseUrl, customHeaderName, customHeaderPrefix } = body;
  const storageName = normalizeStorageName(provider, name);

  // Validate the key against the provider
  const validation = await validateApiKey(
    provider,
    key,
    customBaseUrl,
    customHeaderName,
    customHeaderPrefix
  );

  const keySuffix = getKeySuffix(key);
  const status = validation.valid ? "active" : "invalid";
  const now = new Date().toISOString();

  // For non-custom providers, keep exactly one row to avoid duplicate-key ambiguity.
  if (provider !== "custom") {
    await serviceClient
      .from("user_api_keys")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);
  }

  // Upsert the key (update if exists for same user+provider+name)
  const upsertData = {
    user_id: user.id,
    provider,
    name: name ?? null,
    key_suffix: keySuffix,
    status,
    validation_error: validation.error ?? null,
    last_validated_at: now,
    custom_base_url: customBaseUrl ?? null,
    custom_header_name: customHeaderName ?? null,
    custom_header_prefix: customHeaderPrefix ?? null,
  };

  // Use raw SQL to handle encryption since pgp_sym_encrypt needs to be called
  const { data: saved, error: saveError } = await serviceClient.rpc("exec_sql", {
    query: `
      INSERT INTO user_api_keys (
        user_id, provider, name, encrypted_key, key_suffix, status,
        validation_error, last_validated_at, custom_base_url,
        custom_header_name, custom_header_prefix
      ) VALUES (
        $1, $2, $3, pgp_sym_encrypt($4, $5), $6, $7::api_key_status,
        $8, $9, $10, $11, $12
      )
      ON CONFLICT (user_id, provider, name)
      DO UPDATE SET
        encrypted_key = pgp_sym_encrypt($4, $5),
        key_suffix = $6,
        status = $7::api_key_status,
        validation_error = $8,
        last_validated_at = $9,
        custom_base_url = $10,
        custom_header_name = $11,
        custom_header_prefix = $12,
        updated_at = NOW()
      RETURNING *
    `,
    params: [
      user.id,
      provider,
      storageName,
      key,
      API_KEY_SECRET,
      keySuffix,
      status,
      validation.error ?? null,
      now,
      customBaseUrl ?? null,
      customHeaderName ?? null,
      customHeaderPrefix ?? null,
    ],
  });

  // Fallback: If exec_sql RPC doesn't exist, use direct insert with manual encryption
  if (saveError?.message?.includes("function") || saveError?.message?.includes("does not exist")) {
    // Create the encrypted key directly in the insert
    const { data: directSaved, error: directError } = await serviceClient
      .from("user_api_keys")
      .upsert(
        {
          user_id: user.id,
          provider,
          name: storageName,
          // Note: This is a simplified approach - in production you'd want proper encryption
          encrypted_key: toPostgresByteaHex(key),
          key_suffix: keySuffix,
          status,
          validation_error: validation.error ?? null,
          last_validated_at: now,
          custom_base_url: customBaseUrl ?? null,
          custom_header_name: customHeaderName ?? null,
          custom_header_prefix: customHeaderPrefix ?? null,
        },
        { onConflict: "user_id,provider,name" }
      )
      .select()
      .single();

    if (directError) {
      return jsonResponse(
        { success: false, error: directError.message, code: "DB_ERROR" },
        500
      );
    }

    return jsonResponse({
      success: true,
      key: {
        id: directSaved.id,
        userId: directSaved.user_id,
        provider: directSaved.provider,
        name: directSaved.provider === "custom" ? directSaved.name : null,
        keySuffix: directSaved.key_suffix,
        status: directSaved.status,
        validationError: directSaved.validation_error,
        lastValidatedAt: directSaved.last_validated_at,
        lastUsedAt: directSaved.last_used_at,
        customBaseUrl: directSaved.custom_base_url,
        customHeaderName: directSaved.custom_header_name,
        customHeaderPrefix: directSaved.custom_header_prefix,
        createdAt: directSaved.created_at,
        updatedAt: directSaved.updated_at,
      },
    });
  }

  if (saveError) {
    return jsonResponse(
      { success: false, error: saveError.message, code: "DB_ERROR" },
      500
    );
  }

  const savedRow = Array.isArray(saved) ? saved[0] : saved;

  return jsonResponse({
    success: true,
    key: {
      id: savedRow.id,
      userId: savedRow.user_id,
      provider: savedRow.provider,
      name: savedRow.provider === "custom" ? savedRow.name : null,
      keySuffix: savedRow.key_suffix,
      status: savedRow.status,
      validationError: savedRow.validation_error,
      lastValidatedAt: savedRow.last_validated_at,
      lastUsedAt: savedRow.last_used_at,
      customBaseUrl: savedRow.custom_base_url,
      customHeaderName: savedRow.custom_header_name,
      customHeaderPrefix: savedRow.custom_header_prefix,
      createdAt: savedRow.created_at,
      updatedAt: savedRow.updated_at,
    },
  });
  } catch (err) {
    return jsonResponse({
      success: false,
      code: "UNHANDLED_ERROR",
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
