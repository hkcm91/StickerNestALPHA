/**
 * API Keys Management Module
 *
 * Client-side functions for managing user API keys (BYOK model).
 * All encryption and validation happens server-side via edge functions.
 *
 * @module kernel/api-keys
 * @layer L0
 */

import type {
  ApiKeyProvider,
  CreateApiKeyInput,
  UserApiKey,
  SaveApiKeyResponse,
} from "../schemas/api-key";
import { supabase } from "../supabase";

// =============================================================================
// Types
// =============================================================================

/**
 * Database row shape for user_api_keys table.
 * Used until Supabase types are regenerated with the new table.
 */
interface UserApiKeyRow {
  id: string;
  user_id: string;
  provider: string;
  name: string | null;
  encrypted_key: unknown;
  key_suffix: string;
  status: string;
  validation_error: string | null;
  last_validated_at: string | null;
  last_used_at: string | null;
  custom_base_url: string | null;
  custom_header_name: string | null;
  custom_header_prefix: string | null;
  created_at: string;
  updated_at: string;
}

function normalizeApiKeyName(row: UserApiKeyRow): string | null {
  if (row.provider === "custom") {
    return row.name;
  }
  if (row.name === "__default__") {
    return null;
  }
  return row.name;
}

export interface ApiKeyError {
  code: string;
  message: string;
}

export type ApiKeyResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiKeyError };

// =============================================================================
// API Functions
// =============================================================================

/**
 * Save (create or update) an API key for a provider.
 * The raw key is sent to the edge function which validates and encrypts it.
 */
export async function saveApiKey(
  input: CreateApiKeyInput
): Promise<ApiKeyResult<UserApiKey>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      success: false,
      error: { code: "AUTH_ERROR", message: "Not authenticated" },
    };
  }

  const response = await supabase.functions.invoke<SaveApiKeyResponse>(
    "api-key-save",
    {
      body: input,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (response.error) {
    return {
      success: false,
      error: {
        code: "FUNCTION_ERROR",
        message: response.error.message ?? "Failed to save API key",
      },
    };
  }

  if (!response.data?.success || !response.data.key) {
    return {
      success: false,
      error: {
        code: response.data?.code ?? "UNKNOWN_ERROR",
        message: response.data?.error ?? "Failed to save API key",
      },
    };
  }

  return { success: true, data: response.data.key };
}

/**
 * List all API keys for the current user.
 * Returns metadata only (no decrypted key values).
 */
export async function listApiKeys(): Promise<ApiKeyResult<UserApiKey[]>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: { code: "AUTH_ERROR", message: "Not authenticated" },
    };
  }

  const { data, error } = await supabase
    .from("user_api_keys" as "users")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      success: false,
      error: { code: "DB_ERROR", message: error.message },
    };
  }

  // Transform snake_case to camelCase
  const rows = data as unknown as UserApiKeyRow[];
  const keys: UserApiKey[] = (rows ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    provider: row.provider as ApiKeyProvider,
    name: normalizeApiKeyName(row),
    keySuffix: row.key_suffix,
    status: row.status as UserApiKey['status'],
    validationError: row.validation_error,
    lastValidatedAt: row.last_validated_at,
    lastUsedAt: row.last_used_at,
    customBaseUrl: row.custom_base_url,
    customHeaderName: row.custom_header_name,
    customHeaderPrefix: row.custom_header_prefix,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { success: true, data: keys };
}

/**
 * Get a single API key by ID.
 */
export async function getApiKey(
  keyId: string
): Promise<ApiKeyResult<UserApiKey>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: { code: "AUTH_ERROR", message: "Not authenticated" },
    };
  }

  const { data, error } = await supabase
    .from("user_api_keys" as "users")
    .select("*")
    .eq("id", keyId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return {
      success: false,
      error: { code: "DB_ERROR", message: error.message },
    };
  }

  if (!data) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "API key not found" },
    };
  }

  const row = data as unknown as UserApiKeyRow;
  const key: UserApiKey = {
    id: row.id,
    userId: row.user_id,
    provider: row.provider as ApiKeyProvider,
    name: normalizeApiKeyName(row),
    keySuffix: row.key_suffix,
    status: row.status as UserApiKey['status'],
    validationError: row.validation_error,
    lastValidatedAt: row.last_validated_at,
    lastUsedAt: row.last_used_at,
    customBaseUrl: row.custom_base_url,
    customHeaderName: row.custom_header_name,
    customHeaderPrefix: row.custom_header_prefix,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return { success: true, data: key };
}

/**
 * Get a user's API key for a specific provider.
 */
export async function getApiKeyByProvider(
  provider: ApiKeyProvider
): Promise<ApiKeyResult<UserApiKey | null>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: { code: "AUTH_ERROR", message: "Not authenticated" },
    };
  }

  const { data, error } = await supabase
    .from("user_api_keys" as "users")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: { code: "DB_ERROR", message: error.message },
    };
  }

  if (!data) {
    return { success: true, data: null };
  }

  const row = data as unknown as UserApiKeyRow;
  const key: UserApiKey = {
    id: row.id,
    userId: row.user_id,
    provider: row.provider as ApiKeyProvider,
    name: normalizeApiKeyName(row),
    keySuffix: row.key_suffix,
    status: row.status as UserApiKey['status'],
    validationError: row.validation_error,
    lastValidatedAt: row.last_validated_at,
    lastUsedAt: row.last_used_at,
    customBaseUrl: row.custom_base_url,
    customHeaderName: row.custom_header_name,
    customHeaderPrefix: row.custom_header_prefix,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return { success: true, data: key };
}

/**
 * Delete an API key.
 */
export async function deleteApiKey(keyId: string): Promise<ApiKeyResult<void>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: { code: "AUTH_ERROR", message: "Not authenticated" },
    };
  }

  const { error } = await supabase
    .from("user_api_keys" as "users")
    .delete()
    .eq("id", keyId)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: { code: "DB_ERROR", message: error.message },
    };
  }

  return { success: true, data: undefined };
}

/**
 * Revalidate an existing API key.
 * Useful when a key was marked invalid and the user wants to retry.
 */
export async function revalidateApiKey(
  keyId: string
): Promise<ApiKeyResult<UserApiKey>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      success: false,
      error: { code: "AUTH_ERROR", message: "Not authenticated" },
    };
  }

  const response = await supabase.functions.invoke<SaveApiKeyResponse>(
    "api-key-save",
    {
      body: { keyId, action: "revalidate" },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (response.error) {
    return {
      success: false,
      error: {
        code: "FUNCTION_ERROR",
        message: response.error.message ?? "Failed to revalidate API key",
      },
    };
  }

  if (!response.data?.success || !response.data.key) {
    return {
      success: false,
      error: {
        code: response.data?.code ?? "UNKNOWN_ERROR",
        message: response.data?.error ?? "Failed to revalidate API key",
      },
    };
  }

  return { success: true, data: response.data.key };
}

/**
 * Check if user has an active API key for a provider.
 * Does not reveal the key value.
 */
export async function hasActiveApiKey(
  provider: ApiKeyProvider
): Promise<boolean> {
  const result = await getApiKeyByProvider(provider);
  return result.success && result.data?.status === "active";
}
