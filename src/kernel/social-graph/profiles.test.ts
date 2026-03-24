/**
 * Profiles API tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SocialGraphEvents, UpdateProfileInputSchema } from '@sn/types';

import { bus } from '../bus';

import {
  getProfile,
  getProfileByUsername,
  createProfile,
  updateProfile,
  searchProfiles,
  isUsernameAvailable,
} from './profiles';

// ---------------------------------------------------------------------------
// Mock Supabase using vi.hoisted for shared refs
// ---------------------------------------------------------------------------

const { mockChain, mockFromFn } = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    ilike: vi.fn(),
    or: vi.fn(),
    single: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
    in: vi.fn(),
  };
  for (const method of Object.values(chain)) {
    method.mockReturnValue(chain);
  }
  const fromFn = vi.fn(() => chain);
  return { mockChain: chain, mockFromFn: fromFn };
});

vi.mock('../supabase', () => ({
  supabase: { from: mockFromFn },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const profileRow = {
  user_id: 'user-1',
  display_name: 'Alice',
  username: 'alice',
  bio: 'Hello world',
  avatar_url: 'https://example.com/avatar.png',
  banner_url: null,
  location: 'NYC',
  website_url: null,
  visibility: 'public',
  follower_count: 10,
  following_count: 5,
  post_count: 20,
  is_verified: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Profiles API', () => {
  beforeEach(() => {
    for (const method of Object.values(mockChain)) {
      method.mockReset();
      method.mockReturnValue(mockChain);
    }
    mockFromFn.mockReset();
    mockFromFn.mockReturnValue(mockChain);
  });

  describe('getProfile', () => {
    it('returns a profile when found', async () => {
      mockChain.single.mockResolvedValueOnce({ data: profileRow, error: null });

      const result = await getProfile('user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe('user-1');
        expect(result.data.displayName).toBe('Alice');
        expect(result.data.username).toBe('alice');
        expect(result.data.bio).toBe('Hello world');
        expect(result.data.followerCount).toBe(10);
      }
    });

    it('returns NOT_FOUND when profile does not exist', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await getProfile('nonexistent');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('getProfileByUsername', () => {
    it('returns a profile when found by username', async () => {
      mockChain.single.mockResolvedValueOnce({ data: profileRow, error: null });

      const result = await getProfileByUsername('alice');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('alice');
      }
    });

    it('returns NOT_FOUND for unknown username', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await getProfileByUsername('nobody');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('createProfile', () => {
    it('creates a profile and emits event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.PROFILE_CREATED, handler);

      // Username check — not taken
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      // Insert returns profile
      const insertChain = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: profileRow, error: null }),
        }),
      };
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          // First call is the username check, second is the insert
          const callCount = mockFromFn.mock.calls.length;
          if (callCount <= 1) return mockChain;
          return { insert: vi.fn().mockReturnValue(insertChain) };
        }
        return mockChain;
      });

      // Re-resolve the first username check
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await createProfile('user-1', 'Alice', 'alice');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe('user-1');
        expect(result.data.displayName).toBe('Alice');
      }
      expect(handler).toHaveBeenCalled();

      unsub();
    });

    it('rejects duplicate username', async () => {
      mockChain.single.mockResolvedValueOnce({ data: { user_id: 'other' }, error: null });

      const result = await createProfile('user-1', 'Alice', 'alice');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ALREADY_EXISTS');
      }
    });
  });

  describe('updateProfile', () => {
    it('rejects updating another user\'s profile', async () => {
      const result = await updateProfile('user-1', { displayName: 'Bob' }, 'user-2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('updates profile and emits event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.PROFILE_UPDATED, handler);

      const updatedRow = { ...profileRow, display_name: 'Alice Updated' };

      // No username change, so no username-taken check
      let callCount = 0;
      mockFromFn.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Update call
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
                }),
              }),
            }),
          };
        }
        return mockChain;
      });

      const result = await updateProfile('user-1', { displayName: 'Alice Updated' }, 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBe('Alice Updated');
      }
      expect(handler).toHaveBeenCalled();

      unsub();
    });

    it('rejects username change to an already-taken username', async () => {
      // Username check — taken by someone else
      mockChain.single.mockResolvedValueOnce({ data: { user_id: 'other-user' }, error: null });

      const result = await updateProfile('user-1', { username: 'taken' }, 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ALREADY_EXISTS');
      }
    });
  });

  describe('searchProfiles', () => {
    it('returns matching profiles sorted by follower count', async () => {
      const profiles = [profileRow, { ...profileRow, user_id: 'user-2', username: 'alicia' }];
      mockChain.order.mockResolvedValueOnce({ data: profiles, error: null });

      const result = await searchProfiles('ali');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    it('returns empty array for no matches', async () => {
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      const result = await searchProfiles('zzz');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('caps limit at 100', async () => {
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      await searchProfiles('ali', 500);
      // The limit call should have been called with 100, not 500
      expect(mockChain.limit).toHaveBeenCalledWith(100);
    });
  });

  describe('isUsernameAvailable', () => {
    it('returns true when username is available', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await isUsernameAvailable('newname');
      expect(result).toBe(true);
    });

    it('returns false when username is taken', async () => {
      mockChain.single.mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null });

      const result = await isUsernameAvailable('alice');
      expect(result).toBe(false);
    });
  });
});
