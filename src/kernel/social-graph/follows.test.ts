/**
 * Follows API tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SocialGraphEvents } from '@sn/types';

import { bus } from '../bus';

import {
  followUser,
  unfollowUser,
  acceptFollowRequest,
  rejectFollowRequest,
  isFollowing,
} from './follows';

// ---------------------------------------------------------------------------
// Mock notifications (follows calls createNotification internally)
// ---------------------------------------------------------------------------

vi.mock('./notifications', () => ({
  createNotification: vi.fn().mockResolvedValue({ success: true }),
}));

// ---------------------------------------------------------------------------
// Mock Supabase using vi.hoisted for shared refs
// ---------------------------------------------------------------------------

const { mockChain, mockFromFn } = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    or: vi.fn(),
    single: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
    lt: vi.fn(),
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
// Tests
// ---------------------------------------------------------------------------

describe('Follows API', () => {
  beforeEach(() => {
    for (const method of Object.values(mockChain)) {
      method.mockReset();
      method.mockReturnValue(mockChain);
    }
    mockFromFn.mockReset();
    mockFromFn.mockReturnValue(mockChain);
  });

  describe('followUser', () => {
    it('rejects following yourself', async () => {
      const result = await followUser('user-1', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SELF_ACTION');
      }
    });

    it('rejects following an already-followed user', async () => {
      // Already following check — found
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'follow-1', follower_id: 'user-1', following_id: 'user-2', status: 'active' },
        error: null,
      });

      const result = await followUser('user-2', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ALREADY_EXISTS');
      }
    });

    it('rejects following a user who has blocked you', async () => {
      // Already following check — not following
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });
      // Block check — blocked
      mockChain.single.mockResolvedValueOnce({ data: { blocker_id: 'user-2' }, error: null });

      const result = await followUser('user-2', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('BLOCKED');
      }
    });

    it('follows a public user with active status and emits event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.FOLLOW_CREATED, handler);

      const followRow = {
        id: 'follow-1',
        follower_id: 'user-1',
        following_id: 'user-2',
        status: 'active',
        created_at: '2024-06-01T00:00:00Z',
      };

      let callCount = 0;
      (mockFromFn as any).mockImplementation((table: string) => {
        callCount++;

        if (callCount === 1) {
          // Check existing follow — not found
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }

        if (callCount === 2 && table === 'blocks') {
          // Block check — not blocked
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }

        if (callCount === 3 && table === 'user_profiles') {
          // Profile visibility check — public
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { visibility: 'public' }, error: null }),
              }),
            }),
          };
        }

        if (callCount === 4 && table === 'follows') {
          // Insert follow
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: followRow, error: null }),
              }),
            }),
          };
        }

        if (table === 'notifications') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }

        if (callCount >= 5 && table === 'follows') {
          // Mutual follow check — no reverse
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }

        return mockChain;
      });

      const result = await followUser('user-2', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.followerId).toBe('user-1');
        expect(result.data.followingId).toBe('user-2');
        expect(result.data.status).toBe('active');
      }
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ follow: expect.any(Object), isPending: false }),
      );

      unsub();
    });

    it('creates pending follow for private profiles', async () => {
      const pendingFollowRow = {
        id: 'follow-2',
        follower_id: 'user-1',
        following_id: 'user-3',
        status: 'pending',
        created_at: '2024-06-01T00:00:00Z',
      };

      let callCount = 0;
      (mockFromFn as any).mockImplementation((table: string) => {
        callCount++;

        if (callCount === 1) {
          // Existing follow check — not found
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }

        if (callCount === 2 && table === 'blocks') {
          // Not blocked
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }

        if (callCount === 3 && table === 'user_profiles') {
          // Private profile
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { visibility: 'private' }, error: null }),
              }),
            }),
          };
        }

        if (callCount === 4 && table === 'follows') {
          // Insert pending follow
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: pendingFollowRow, error: null }),
              }),
            }),
          };
        }

        return mockChain;
      });

      const result = await followUser('user-3', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('pending');
      }
    });
  });

  describe('unfollowUser', () => {
    it('unfollows successfully and emits event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.FOLLOW_DELETED, handler);

      let callCount = 0;
      (mockFromFn as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Find existing follow
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'follow-1' }, error: null }),
                }),
              }),
            }),
          };
        }
        // Delete follow
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      const result = await unfollowUser('user-2', 'user-1');
      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ followerId: 'user-1', followingId: 'user-2' }),
      );

      unsub();
    });

    it('returns NOT_FOUND when not following', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await unfollowUser('user-2', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('acceptFollowRequest', () => {
    it('accepts a pending request and emits event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.FOLLOW_ACCEPTED, handler);

      const pendingRow = {
        id: 'follow-2',
        follower_id: 'user-1',
        following_id: 'user-3',
        status: 'pending',
        created_at: '2024-06-01T00:00:00Z',
      };

      const acceptedRow = { ...pendingRow, status: 'active' };

      let callCount = 0;
      (mockFromFn as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Find pending follow
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: pendingRow, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        // Update to active
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: acceptedRow, error: null }),
              }),
            }),
          }),
        };
      });

      const result = await acceptFollowRequest('user-1', 'user-3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
      }
      expect(handler).toHaveBeenCalled();

      unsub();
    });

    it('returns NOT_FOUND when no pending request exists', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await acceptFollowRequest('user-1', 'user-3');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('rejectFollowRequest', () => {
    it('rejects a pending request and emits event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.FOLLOW_REJECTED, handler);

      let callCount = 0;
      (mockFromFn as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Find pending follow
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { id: 'follow-2' }, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        // Delete follow
        return {
          from: vi.fn().mockReturnValue({
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      const result = await rejectFollowRequest('user-1', 'user-3');
      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ followerId: 'user-1', followingId: 'user-3' }),
      );

      unsub();
    });

    it('returns NOT_FOUND when no pending request exists', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await rejectFollowRequest('user-1', 'user-3');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('isFollowing', () => {
    it('returns true when user is following', async () => {
      mockChain.single.mockResolvedValueOnce({ data: { id: 'follow-1' }, error: null });

      const result = await isFollowing('user-1', 'user-2');
      expect(result).toBe(true);
    });

    it('returns false when user is not following', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await isFollowing('user-1', 'user-2');
      expect(result).toBe(false);
    });
  });
});
