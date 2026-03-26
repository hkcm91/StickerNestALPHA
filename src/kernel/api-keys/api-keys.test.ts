/**
 * API Keys Management Tests
 *
 * @module kernel/api-keys
 * @layer L0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase before imports
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from '../supabase';

import {
  saveApiKey,
  listApiKeys,
  getApiKey,
  getApiKeyByProvider,
  deleteApiKey,
  revalidateApiKey,
  hasActiveApiKey,
} from './api-keys';

const mockGetUser = supabase.auth.getUser as ReturnType<typeof vi.fn>;
const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;

const TEST_USER = { id: 'user-1' };
const TEST_SESSION = { access_token: 'token-123' };

function mockApiKeyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'key-1',
    user_id: 'user-1',
    provider: 'openai',
    name: '__default__',
    encrypted_key: '***',
    key_suffix: 'sk-...abc',
    status: 'active',
    validation_error: null,
    last_validated_at: '2026-01-01T00:00:00Z',
    last_used_at: null,
    custom_base_url: null,
    custom_header_name: null,
    custom_header_prefix: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('API Keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveApiKey', () => {
    it('returns AUTH_ERROR when no session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const result = await saveApiKey({ provider: 'openai', rawKey: 'sk-test' } as never);

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('AUTH_ERROR');
    });

    it('saves key via edge function on success', async () => {
      mockGetSession.mockResolvedValue({ data: { session: TEST_SESSION } });
      mockInvoke.mockResolvedValue({
        data: { success: true, key: { id: 'key-1', provider: 'openai' } },
        error: null,
      });

      const result = await saveApiKey({ provider: 'openai', rawKey: 'sk-test' } as never);

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.id).toBe('key-1');
    });

    it('returns FUNCTION_ERROR when invoke fails', async () => {
      mockGetSession.mockResolvedValue({ data: { session: TEST_SESSION } });
      mockInvoke.mockResolvedValue({ data: null, error: { message: 'Timeout' } });

      const result = await saveApiKey({ provider: 'openai', rawKey: 'sk-test' } as never);

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('FUNCTION_ERROR');
    });

    it('returns error when function response indicates failure', async () => {
      mockGetSession.mockResolvedValue({ data: { session: TEST_SESSION } });
      mockInvoke.mockResolvedValue({
        data: { success: false, code: 'INVALID_KEY', error: 'Key is invalid' },
        error: null,
      });

      const result = await saveApiKey({ provider: 'openai', rawKey: 'bad' } as never);

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('INVALID_KEY');
    });
  });

  describe('listApiKeys', () => {
    it('returns AUTH_ERROR when no user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await listApiKeys();

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('AUTH_ERROR');
    });

    it('lists keys for authenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
      const rows = [mockApiKeyRow(), mockApiKeyRow({ id: 'key-2', provider: 'anthropic' })];
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      });

      const result = await listApiKeys();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        // __default__ name should be normalized to null for non-custom providers
        expect(result.data[0].name).toBeNull();
      }
    });

    it('returns DB_ERROR on query failure', async () => {
      mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }),
          }),
        }),
      });

      const result = await listApiKeys();

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('DB_ERROR');
    });
  });

  describe('getApiKey', () => {
    it('retrieves a single key by ID', async () => {
      mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockApiKeyRow(), error: null }),
            }),
          }),
        }),
      });

      const result = await getApiKey('key-1');

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.id).toBe('key-1');
    });

    it('returns AUTH_ERROR when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getApiKey('key-1');

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('AUTH_ERROR');
    });
  });

  describe('getApiKeyByProvider', () => {
    it('returns null data when no key exists for provider', async () => {
      mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const result = await getApiKeyByProvider('replicate');

      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBeNull();
    });

    it('normalizes custom provider name correctly', async () => {
      mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
      const row = mockApiKeyRow({ provider: 'custom', name: 'My Custom API' });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
            }),
          }),
        }),
      });

      const result = await getApiKeyByProvider('custom');

      expect(result.success).toBe(true);
      if (result.success) expect(result.data!.name).toBe('My Custom API');
    });
  });

  describe('deleteApiKey', () => {
    it('deletes a key by ID', async () => {
      mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const result = await deleteApiKey('key-1');

      expect(result.success).toBe(true);
    });

    it('returns AUTH_ERROR when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await deleteApiKey('key-1');

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('AUTH_ERROR');
    });
  });

  describe('revalidateApiKey', () => {
    it('revalidates via edge function', async () => {
      mockGetSession.mockResolvedValue({ data: { session: TEST_SESSION } });
      mockInvoke.mockResolvedValue({
        data: { success: true, key: { id: 'key-1', status: 'active' } },
        error: null,
      });

      const result = await revalidateApiKey('key-1');

      expect(result.success).toBe(true);
    });
  });

  describe('hasActiveApiKey', () => {
    it('returns true when active key exists', async () => {
      mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockApiKeyRow({ status: 'active' }),
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await hasActiveApiKey('openai');
      expect(result).toBe(true);
    });

    it('returns false when key is invalid', async () => {
      mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockApiKeyRow({ status: 'invalid' }),
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await hasActiveApiKey('openai');
      expect(result).toBe(false);
    });
  });
});
