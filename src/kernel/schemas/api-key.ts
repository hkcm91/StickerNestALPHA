/**
 * User API Key Schemas
 *
 * Zod schemas for BYOK (Bring Your Own Key) integrations.
 * Users can provide their own API keys for Replicate, OpenAI, Anthropic, etc.
 *
 * @module kernel/schemas/api-key
 * @layer L0
 */

import { z } from "zod";

// =============================================================================
// API Key Provider Schema
// =============================================================================

/**
 * Supported API key providers
 */
export const ApiKeyProviderSchema = z.enum([
  "replicate",
  "openai",
  "anthropic",
  "custom",
]);

export type ApiKeyProvider = z.infer<typeof ApiKeyProviderSchema>;

// =============================================================================
// API Key Status Schema
// =============================================================================

/**
 * API key validation status
 * - active: Key validated and working
 * - invalid: Key failed validation
 * - pending: Awaiting validation
 */
export const ApiKeyStatusSchema = z.enum(["active", "invalid", "pending"]);

export type ApiKeyStatus = z.infer<typeof ApiKeyStatusSchema>;

// =============================================================================
// User API Key Schema (returned from server, no raw key)
// =============================================================================

/**
 * User API key metadata (key value never exposed to client)
 */
export const UserApiKeySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: ApiKeyProviderSchema,
  name: z.string().nullable(),
  keySuffix: z.string().max(6),
  status: ApiKeyStatusSchema,
  validationError: z.string().nullable(),
  lastValidatedAt: z.string().datetime().nullable(),
  lastUsedAt: z.string().datetime().nullable(),
  customBaseUrl: z.string().url().nullable(),
  customHeaderName: z.string().nullable(),
  customHeaderPrefix: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserApiKey = z.infer<typeof UserApiKeySchema>;

// =============================================================================
// Create API Key Input Schema
// =============================================================================

/**
 * Input for saving a new API key
 * The raw key is only sent during create/update and is encrypted server-side
 */
export const CreateApiKeyInputSchema = z.object({
  provider: ApiKeyProviderSchema,
  key: z.string().min(1, "API key is required"),
  name: z.string().optional(),
  customBaseUrl: z.string().url().optional(),
  customHeaderName: z.string().optional(),
  customHeaderPrefix: z.string().optional(),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeyInputSchema>;

// =============================================================================
// Update API Key Input Schema
// =============================================================================

/**
 * Input for updating an existing API key
 */
export const UpdateApiKeyInputSchema = z.object({
  key: z.string().min(1, "API key is required").optional(),
  name: z.string().optional(),
  customBaseUrl: z.string().url().optional(),
  customHeaderName: z.string().optional(),
  customHeaderPrefix: z.string().optional(),
});

export type UpdateApiKeyInput = z.infer<typeof UpdateApiKeyInputSchema>;

// =============================================================================
// Save API Key Response Schema
// =============================================================================

/**
 * Response from the api-key-save edge function
 */
export const SaveApiKeyResponseSchema = z.object({
  success: z.boolean(),
  key: UserApiKeySchema.optional(),
  error: z.string().optional(),
  code: z.string().optional(),
});

export type SaveApiKeyResponse = z.infer<typeof SaveApiKeyResponseSchema>;

// =============================================================================
// Validation Result Schema
// =============================================================================

/**
 * Result of validating an API key against the provider
 */
export const ApiKeyValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
  testedAt: z.string().datetime(),
});

export type ApiKeyValidationResult = z.infer<typeof ApiKeyValidationResultSchema>;

// =============================================================================
// Provider Display Info
// =============================================================================

/**
 * Display information for API key providers
 */
export const API_KEY_PROVIDER_INFO: Record<
  ApiKeyProvider,
  {
    label: string;
    description: string;
    docsUrl: string;
    keyPattern?: RegExp;
  }
> = {
  replicate: {
    label: "Replicate",
    description: "AI image generation (Flux, SDXL, etc.)",
    docsUrl: "https://replicate.com/account/api-tokens",
    keyPattern: /^r8_[a-zA-Z0-9]+$/,
  },
  openai: {
    label: "OpenAI",
    description: "GPT models, DALL-E, Whisper",
    docsUrl: "https://platform.openai.com/api-keys",
    keyPattern: /^sk-[a-zA-Z0-9-_]+$/,
  },
  anthropic: {
    label: "Anthropic",
    description: "Claude AI models",
    docsUrl: "https://console.anthropic.com/settings/keys",
    keyPattern: /^sk-ant-[a-zA-Z0-9-_]+$/,
  },
  custom: {
    label: "Custom API",
    description: "Any API with key-based authentication",
    docsUrl: "",
  },
};

// =============================================================================
// JSON Schemas
// =============================================================================

export const UserApiKeyJSONSchema = UserApiKeySchema.toJSONSchema();

export const CreateApiKeyInputJSONSchema = CreateApiKeyInputSchema.toJSONSchema();

export const ApiKeyProviderJSONSchema = ApiKeyProviderSchema.toJSONSchema();

export const ApiKeyStatusJSONSchema = ApiKeyStatusSchema.toJSONSchema();
