/**
 * Blocks API tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SocialGraphEvents } from '@sn/types';

import { bus } from '../bus';

import { blockUser, unblockUser, isBlocked, isBlockedEitherWay } from './blocks';

// ---------------------------------------------------------------------------
// Mock Supabase using vi.hoisted for shared refs
// ---------------------------------------------------------------------------

const { mockChain, mockFromFn } = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    or: vi.fn(),
    single: vi.fn(),
    limit: vi.fn(),
  };
  // Chain methods return themselves
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

describe('Blocks API', () => {
  beforeEach(() => {
    // Restore chain methods
    for (const method of Object.values(mockChain)) {
      method.mockReset();
      method.mockReturnValue(mockChain);
    }
    mockFromFn.mockReset();
    mockFromFn.mockReturnValue(mockChain);
  });

  describe('blockUser', () => {
    it('rejects blocking yourself', async () => {
      const result = await blockUser('user-1', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SELF_ACTION');
      }
    });

    it('rejects blocking an already-blocked user', async () => {
      // Check if already blocked → found
      mockChain.single.mockResolvedValueOnce({ data: { blocker_id: 'user-1' }, error: null });

      const result = await blockUser('user-2', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ALREADY_EXISTS');
      }
    });

    it('blocks a user successfully and emits event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.USER_BLOCKED, handler);

      // Check if already blocked → not blocked
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      // For the insert call we need to return a non-chain resolved value
      // blockUser calls supabase.from('blocks').insert({...}) which resolves directly
      const blocksInsertChain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'or', 'single', 'limit']) {
        blocksInsertChain[m] = vi.fn(() => blocksInsertChain);
      }

      const followsDeleteChain: Record<string, unknown> = {};
      for (const m of ['or', 'eq']) {
        followsDeleteChain[m] = vi.fn(() => Promise.resolve({ error: null }));
      }

      let callCount = 0;
      (mockFromFn as any).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // First call: blocks table check
          return mockChain;
        }
        if (table === 'blocks') {
          // Insert call
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        // follows delete
        return {
          delete: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      // Re-set for the first .single() check
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await blockUser('user-2', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.blockerId).toBe('user-1');
        expect(result.data.blockedId).toBe('user-2');
      }
      expect(handler).toHaveBeenCalled();

      unsub();
    });
  });

  describe('unblockUser', () => {
    it('rejects unblocking a user that is not blocked', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await unblockUser('user-2', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('unblocks a user successfully and emits event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.USER_UNBLOCKED, handler);

      // Check existing block → found
      mockChain.single.mockResolvedValueOnce({ data: { blocker_id: 'user-1' }, error: null });

      let callCount = 0;
      mockFromFn.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: check existing block
          return mockChain;
        }
        // Second call: delete block
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      });

      mockChain.single.mockResolvedValueOnce({ data: { blocker_id: 'user-1' }, error: null });

      const result = await unblockUser('user-2', 'user-1');
      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalled();

      unsub();
    });
  });

  describe('isBlocked', () => {
    it('returns true when user is blocked', async () => {
      mockChain.single.mockResolvedValueOnce({ data: { blocker_id: 'user-1' }, error: null });
      const result = await isBlocked('user-1', 'user-2');
      expect(result).toBe(true);
    });

    it('returns false when user is not blocked', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });
      const result = await isBlocked('user-1', 'user-2');
      expect(result).toBe(false);
    });
  });

  describe('isBlockedEitherWay', () => {
    it('returns true when a block exists in either direction', async () => {
      mockChain.limit.mockResolvedValueOnce({ data: [{ blocker_id: 'user-2' }], error: null });
      const result = await isBlockedEitherWay('user-1', 'user-2');
      expect(result).toBe(true);
    });

    it('returns false when no block exists', async () => {
      mockChain.limit.mockResolvedValueOnce({ data: [], error: null });
      const result = await isBlockedEitherWay('user-1', 'user-2');
      expect(result).toBe(false);
    });
  });
});
