/**
 * Comments API tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SocialGraphEvents } from '@sn/types';

import { bus } from '../bus';

import {
  createComment,
  getComment,
  updateComment,
  deleteComment,
  getComments,
  getCommentReplies,
  getCommentCount,
} from './comments';

// ---------------------------------------------------------------------------
// Mock Supabase using vi.hoisted for shared refs
// ---------------------------------------------------------------------------

const { mockChain, mockFromFn, mockRpc } = vi.hoisted(() => {
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
    is: vi.fn(),
    contains: vi.fn(),
  };
  for (const method of Object.values(chain)) {
    method.mockReturnValue(chain);
  }
  const fromFn = vi.fn(() => chain);
  const rpc = vi.fn().mockResolvedValue({ error: null });
  return { mockChain: chain, mockFromFn: fromFn, mockRpc: rpc };
});

vi.mock('../supabase', () => ({
  supabase: { from: mockFromFn, rpc: mockRpc },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeCommentRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'comment-1',
  author_id: 'user-1',
  target_type: 'post',
  target_id: 'post-1',
  content: 'Nice post!',
  parent_id: null,
  mentioned_user_ids: [],
  reply_count: 0,
  reaction_count: 0,
  created_at: '2024-06-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
  is_deleted: false,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Comments API', () => {
  beforeEach(() => {
    for (const method of Object.values(mockChain)) {
      method.mockReset();
      method.mockReturnValue(mockChain);
    }
    mockFromFn.mockReset();
    mockFromFn.mockReturnValue(mockChain);
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ error: null });
  });

  // =========================================================================
  // createComment
  // =========================================================================
  describe('createComment', () => {
    it('creates a comment successfully and emits bus event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.COMMENT_CREATED, handler);

      const row = makeCommentRow();
      mockChain.single.mockResolvedValueOnce({ data: row, error: null });

      const result = await createComment(
        { targetType: 'post', targetId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', content: 'Nice post!' },
        'user-1',
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('comment-1');
        expect(result.data.content).toBe('Nice post!');
      }
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ payload: expect.objectContaining({ comment: expect.any(Object) }) }),
      );

      unsub();
    });

    it('calls increment_comment_reply_count for replies', async () => {
      const row = makeCommentRow({ parent_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' });
      mockChain.single.mockResolvedValueOnce({ data: row, error: null });

      await createComment(
        {
          targetType: 'post',
          targetId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          content: 'Reply!',
          parentId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        },
        'user-1',
      );
      expect(mockRpc).toHaveBeenCalledWith('increment_comment_reply_count', {
        comment_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      });
    });

    it('returns VALIDATION_ERROR for invalid input', async () => {
      const result = await createComment({} as any, 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('returns error when supabase insert fails', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB error' },
      });

      const result = await createComment(
        { targetType: 'post', targetId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', content: 'Hello' },
        'user-1',
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });

  // =========================================================================
  // getComment
  // =========================================================================
  describe('getComment', () => {
    it('returns a comment by ID', async () => {
      mockChain.single.mockResolvedValueOnce({ data: makeCommentRow(), error: null });

      const result = await getComment('comment-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('comment-1');
      }
    });

    it('returns NOT_FOUND when comment does not exist', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await getComment('comment-999');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  // =========================================================================
  // updateComment
  // =========================================================================
  describe('updateComment', () => {
    it('updates a comment and emits bus event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.COMMENT_UPDATED, handler);

      let callCount = 0;
      (mockFromFn as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { author_id: 'user-1' }, error: null }),
              }),
            }),
          };
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: makeCommentRow({ content: 'Updated!' }),
                  error: null,
                }),
              }),
            }),
          }),
        };
      });

      const result = await updateComment('comment-1', 'Updated!', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('Updated!');
      }
      expect(handler).toHaveBeenCalled();

      unsub();
    });

    it('rejects update by non-owner', async () => {
      mockChain.single.mockResolvedValueOnce({ data: { author_id: 'user-1' }, error: null });

      const result = await updateComment('comment-1', 'Hacked', 'user-2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });
  });

  // =========================================================================
  // deleteComment
  // =========================================================================
  describe('deleteComment', () => {
    it('soft-deletes a comment and emits bus event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.COMMENT_DELETED, handler);

      let callCount = 0;
      (mockFromFn as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { author_id: 'user-1', parent_id: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      const result = await deleteComment('comment-1', 'user-1');
      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ payload: expect.objectContaining({ commentId: 'comment-1' }) }),
      );

      unsub();
    });

    it('calls decrement_comment_reply_count for reply deletion', async () => {
      let callCount = 0;
      (mockFromFn as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { author_id: 'user-1', parent_id: 'parent-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      await deleteComment('comment-1', 'user-1');
      expect(mockRpc).toHaveBeenCalledWith('decrement_comment_reply_count', { comment_id: 'parent-1' });
    });

    it('rejects deletion by non-owner', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { author_id: 'user-1', parent_id: null },
        error: null,
      });

      const result = await deleteComment('comment-1', 'user-2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });
  });

  // =========================================================================
  // getComments
  // =========================================================================
  describe('getComments', () => {
    it('returns paginated comments for a target', async () => {
      const rows = [makeCommentRow({ id: 'c1' }), makeCommentRow({ id: 'c2' })];
      mockChain.limit.mockResolvedValueOnce({ data: rows, error: null });

      const result = await getComments('post', 'post-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(2);
        expect(result.data.hasMore).toBe(false);
      }
    });

    it('returns error on DB failure', async () => {
      mockChain.limit.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      const result = await getComments('post', 'post-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });

  // =========================================================================
  // getCommentCount
  // =========================================================================
  describe('getCommentCount', () => {
    it('returns comment count', async () => {
      mockFromFn.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
            }),
          }),
        }),
      });

      const result = await getCommentCount('post', 'post-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(5);
      }
    });
  });
});
