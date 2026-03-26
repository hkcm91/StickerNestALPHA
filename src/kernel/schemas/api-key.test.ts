import { describe, it, expect } from 'vitest';

import {
  ApiKeyProviderSchema,
  ApiKeyStatusSchema,
  UserApiKeySchema,
  CreateApiKeyInputSchema,
  UpdateApiKeyInputSchema,
  SaveApiKeyResponseSchema,
  ApiKeyValidationResultSchema,
  API_KEY_PROVIDER_INFO,
} from './api-key';

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

describe('ApiKeyProviderSchema', () => {
  it('accepts all valid providers', () => {
    for (const p of ['replicate', 'openai', 'anthropic', 'custom']) {
      expect(ApiKeyProviderSchema.parse(p)).toBe(p);
    }
  });

  it('rejects invalid provider', () => {
    expect(() => ApiKeyProviderSchema.parse('google')).toThrow();
  });
});

describe('ApiKeyStatusSchema', () => {
  it('accepts all valid statuses', () => {
    for (const s of ['active', 'invalid', 'pending']) {
      expect(ApiKeyStatusSchema.parse(s)).toBe(s);
    }
  });

  it('rejects invalid status', () => {
    expect(() => ApiKeyStatusSchema.parse('expired')).toThrow();
  });
});

describe('UserApiKeySchema', () => {
  const validKey = () => ({
    id: uuid(),
    userId: uuid(),
    provider: 'openai' as const,
    name: null,
    keySuffix: 'abc123',
    status: 'active' as const,
    validationError: null,
    lastValidatedAt: null,
    lastUsedAt: null,
    customBaseUrl: null,
    customHeaderName: null,
    customHeaderPrefix: null,
    createdAt: now(),
    updatedAt: now(),
  });

  it('parses valid user api key', () => {
    const result = UserApiKeySchema.parse(validKey());
    expect(result.provider).toBe('openai');
    expect(result.name).toBeNull();
  });

  it('parses key with non-null optional fields', () => {
    const result = UserApiKeySchema.parse({
      ...validKey(),
      name: 'My Key',
      lastValidatedAt: now(),
      lastUsedAt: now(),
      customBaseUrl: 'https://api.example.com',
      customHeaderName: 'X-Api-Key',
      customHeaderPrefix: 'Bearer',
    });
    expect(result.name).toBe('My Key');
    expect(result.customBaseUrl).toBe('https://api.example.com');
  });

  it('rejects keySuffix longer than 6 chars', () => {
    expect(() =>
      UserApiKeySchema.parse({ ...validKey(), keySuffix: 'toolong!' }),
    ).toThrow();
  });

  it('rejects invalid customBaseUrl', () => {
    expect(() =>
      UserApiKeySchema.parse({ ...validKey(), customBaseUrl: 'not-a-url' }),
    ).toThrow();
  });

  it('rejects non-uuid id', () => {
    expect(() =>
      UserApiKeySchema.parse({ ...validKey(), id: 'bad-id' }),
    ).toThrow();
  });
});

describe('CreateApiKeyInputSchema', () => {
  it('parses minimal create input', () => {
    const result = CreateApiKeyInputSchema.parse({
      provider: 'anthropic',
      key: 'sk-ant-xyz',
    });
    expect(result.provider).toBe('anthropic');
    expect(result.name).toBeUndefined();
  });

  it('parses create with all optional fields', () => {
    const result = CreateApiKeyInputSchema.parse({
      provider: 'custom',
      key: 'my-key',
      name: 'My Custom Key',
      customBaseUrl: 'https://api.custom.com',
      customHeaderName: 'Authorization',
      customHeaderPrefix: 'Token',
    });
    expect(result.customBaseUrl).toBe('https://api.custom.com');
  });

  it('rejects empty key', () => {
    expect(() =>
      CreateApiKeyInputSchema.parse({ provider: 'openai', key: '' }),
    ).toThrow();
  });

  it('rejects missing key', () => {
    expect(() =>
      CreateApiKeyInputSchema.parse({ provider: 'openai' }),
    ).toThrow();
  });

  it('rejects invalid customBaseUrl', () => {
    expect(() =>
      CreateApiKeyInputSchema.parse({
        provider: 'custom',
        key: 'k',
        customBaseUrl: 'not-url',
      }),
    ).toThrow();
  });
});

describe('UpdateApiKeyInputSchema', () => {
  it('parses empty update', () => {
    expect(UpdateApiKeyInputSchema.parse({})).toEqual({});
  });

  it('parses partial update', () => {
    const result = UpdateApiKeyInputSchema.parse({ name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });

  it('rejects empty key when provided', () => {
    expect(() => UpdateApiKeyInputSchema.parse({ key: '' })).toThrow();
  });
});

describe('SaveApiKeyResponseSchema', () => {
  it('parses success response without key', () => {
    const result = SaveApiKeyResponseSchema.parse({ success: true });
    expect(result.success).toBe(true);
    expect(result.key).toBeUndefined();
  });

  it('parses error response', () => {
    const result = SaveApiKeyResponseSchema.parse({
      success: false,
      error: 'Invalid key',
      code: 'INVALID_KEY',
    });
    expect(result.error).toBe('Invalid key');
  });
});

describe('ApiKeyValidationResultSchema', () => {
  it('parses valid result', () => {
    const result = ApiKeyValidationResultSchema.parse({
      valid: true,
      testedAt: now(),
    });
    expect(result.valid).toBe(true);
  });

  it('parses invalid result with error', () => {
    const result = ApiKeyValidationResultSchema.parse({
      valid: false,
      error: 'Unauthorized',
      testedAt: now(),
    });
    expect(result.error).toBe('Unauthorized');
  });

  it('rejects missing testedAt', () => {
    expect(() =>
      ApiKeyValidationResultSchema.parse({ valid: true }),
    ).toThrow();
  });
});

describe('API_KEY_PROVIDER_INFO', () => {
  it('has entries for all providers', () => {
    expect(API_KEY_PROVIDER_INFO.replicate.label).toBe('Replicate');
    expect(API_KEY_PROVIDER_INFO.openai.label).toBe('OpenAI');
    expect(API_KEY_PROVIDER_INFO.anthropic.label).toBe('Anthropic');
    expect(API_KEY_PROVIDER_INFO.custom.label).toBe('Custom API');
  });

  it('has regex patterns for known providers', () => {
    expect(API_KEY_PROVIDER_INFO.replicate.keyPattern).toBeDefined();
    expect(API_KEY_PROVIDER_INFO.openai.keyPattern).toBeDefined();
    expect(API_KEY_PROVIDER_INFO.anthropic.keyPattern).toBeDefined();
    expect(API_KEY_PROVIDER_INFO.custom.keyPattern).toBeUndefined();
  });
});
