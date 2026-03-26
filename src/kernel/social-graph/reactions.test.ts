/**
 * Reactions API tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SocialGraphEvents } from '@sn/types';

import { bus } from '../bus';

import {
  addReaction,
  removeReaction,
  getReactions,
  getReactionCounts,
  getUserReaction,
} from './reactions';

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
    gt: vi.fn(),
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
// Helpers
// ---------------------------------------------------------------------------

const makeReactionRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'reaction-1',
  user_id: 'user-1',
  target_type: 'post',
  target_id: 'post-1',
  type: 'like',
  created_at: '2024-06-01T00:00:00Z',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Reactions API', () => {
  beforeEach(() => {
    for (const method of Object.values(mockChain)) {
      method.mockReset();
      method.mockReturnValue(mockChain);
    }
    mockFromFn.mockReset();
    mockFromFn.mockReturnValue(mockChain);
  });

  // =========================================================================
  // addReaction
  // =========================================================================
  describe('addReaction', () => {
    it('adds a new reaction and emits bus event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.REACTION_ADDED, handler);

      let callCount = 0;
      (mockFromFn as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Check existing — not found
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
        // Insert
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: makeReactionRow(),
                error: null,
              }),
            }),
          }),
        };
      });

      const result = await addReaction('post', 'post-1', 'like', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('reaction-1');
        expect(result.data.type).toBe('like');
      }
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ payload: expect.objectContaining({ reaction: expect.any(Object) }) }),
      );

      unsub();
    });

    it('updates an existing reaction to a different type', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.REACTION_ADDED, handler);

      let callCount = 0;
      (mockFromFn as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Check existing — found with type 'like'
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: makeReactionRow({ type: 'like' }),
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        // Update
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: makeReactionRow({ type: 'love' }),
                  error: null,
                }),
              }),
            }),
          }),
        };
      });

      const result = await addReaction('post', 'post-1', 'love', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('love');
      }
      expect(handler).toHaveBeenCalled();

      unsub();
    });

    it('returns ALREADY_EXISTS for same reaction type', async () => {
      // Existing reaction with same type
      mockChain.single.mockResolvedValueOnce({
        data: makeReactionRow({ type: 'like' }),
        error: null,
      });

      const result = await addReaction('post', 'post-1', 'like', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ALREADY_EXISTS');
      }
    });

    it('returns error when insert fails', async () => {
      let callCount = 0;
      (mockFromFn as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
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
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'DB error' },
              }),
            }),
          }),
        };
      });

      const result = await addReaction('post', 'post-1', 'like', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });

  // =========================================================================
  // removeReaction
  // =========================================================================
  describe('removeReaction', () => {
    it('removes a reaction and emits bus event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.REACTION_REMOVED, handler);

      let callCount = 0;
      (mockFromFn as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Find existing
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { id: 'reaction-1' }, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        // Delete
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      const result = await removeReaction('post', 'post-1', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('reaction-1');
      }
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ targetType: 'post', targetId: 'post-1', userId: 'user-1' }),
        }),
      );

      unsub();
    });

    it('returns NOT_FOUND when no reaction exists', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await removeReaction('post', 'post-1', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('returns error on DB failure during delete', async () => {
      let callCount = 0;
      (mockFromFn as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { id: 'reaction-1' }, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
          }),
        };
      });

      const result = await removeReaction('post', 'post-1', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });

  // =========================================================================
  // getReactions
  // =========================================================================
  describe('getReactions', () => {
    it('returns reactions for a target', async () => {
      const rows = [makeReactionRow({ id: 'r1' }), makeReactionRow({ id: 'r2' })];
      mockChain.order.mockResolvedValueOnce({ data: rows, error: null });

      const result = await getReactions('post', 'post-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    it('returns error on DB failure', async () => {
      mockChain.order.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      const result = await getReactions('post', 'post-1');
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // getReactionCounts
  // =========================================================================
  describe('getReactionCounts', () => {
    it('returns counts by reaction type', async () => {
      const rows = [{ type: 'like' }, { type: 'like' }, { type: 'love' }];
      mockFromFn.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      });

      const result = await getReactionCounts('post', 'post-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.like).toBe(2);
        expect(result.data.love).toBe(1);
        expect(result.data.laugh).toBe(0);
      }
    });
  });

  // =========================================================================
  // getUserReaction
  // =========================================================================
  describe('getUserReaction', () => {
    it('returns user reaction when it exists', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: makeReactionRow(),
        error: null,
      });

      const result = await getUserReaction('post', 'post-1', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toBeNull();
        expect(result.data!.type).toBe('like');
      }
    });

    it('returns null when user has no reaction', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows found' },
      });

      const result = await getUserReaction('post', 'post-1', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('returns error for non-NoRows DB error', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection timeout' },
      });

      const result = await getUserReaction('post', 'post-1', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });
});
