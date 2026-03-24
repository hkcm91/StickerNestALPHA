/**
 * Messages API tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SocialGraphEvents } from '@sn/types';

import { bus } from '../bus';

import { sendMessage, canMessage, markAsRead, getUnreadMessageCount } from './messages';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

vi.mock('./blocks', () => ({
  isBlockedEitherWay: vi.fn(),
}));

import { isBlockedEitherWay } from './blocks';

// ---------------------------------------------------------------------------
// Mock Supabase using vi.hoisted for shared refs
// ---------------------------------------------------------------------------

const { mockChain, mockFromFn } = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    single: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
    lt: vi.fn(),
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

describe('Messages API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of Object.values(mockChain)) {
      method.mockReset();
      method.mockReturnValue(mockChain);
    }
    mockFromFn.mockReset();
    mockFromFn.mockReturnValue(mockChain);
    (isBlockedEitherWay as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  describe('sendMessage', () => {
    it('rejects messaging yourself', async () => {
      const result = await sendMessage('user-1', 'Hello', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SELF_ACTION');
      }
    });

    it('rejects empty content', async () => {
      const result = await sendMessage('user-2', '', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects whitespace-only content', async () => {
      const result = await sendMessage('user-2', '   ', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects content over 2000 characters', async () => {
      const result = await sendMessage('user-2', 'a'.repeat(2001), 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects when blocked', async () => {
      (isBlockedEitherWay as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      const result = await sendMessage('user-2', 'Hello', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('BLOCKED');
      }
    });

    it('sends message successfully and emits event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.MESSAGE_SENT, handler);

      const msgRow = {
        id: 'msg-1',
        sender_id: 'user-1',
        recipient_id: 'user-2',
        content: 'Hello',
        is_read: false,
        created_at: '2024-06-01T00:00:00Z',
      };

      mockFromFn.mockImplementation(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: msgRow, error: null }),
          }),
        }),
      }));

      const result = await sendMessage('user-2', 'Hello', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.senderId).toBe('user-1');
        expect(result.data.recipientId).toBe('user-2');
        expect(result.data.content).toBe('Hello');
        expect(result.data.isRead).toBe(false);
      }
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(Object) }),
      );

      unsub();
    });

    it('trims whitespace from message content', async () => {
      const msgRow = {
        id: 'msg-1',
        sender_id: 'user-1',
        recipient_id: 'user-2',
        content: 'Hello',
        is_read: false,
        created_at: '2024-06-01T00:00:00Z',
      };

      mockFromFn.mockImplementation(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: msgRow, error: null }),
          }),
        }),
      }));

      const result = await sendMessage('user-2', '  Hello  ', 'user-1');
      expect(result.success).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('rejects marking own messages as read', async () => {
      const result = await markAsRead('user-1', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SELF_ACTION');
      }
    });

    it('marks unread messages as read and emits event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.MESSAGES_READ, handler);

      mockFromFn.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: [{ id: 'msg-1' }, { id: 'msg-2' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }));

      const result = await markAsRead('user-2', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(2);
      }
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          senderId: 'user-2',
          readerId: 'user-1',
          count: 2,
        }),
      );

      unsub();
    });

    it('does not emit event when no messages were unread', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.MESSAGES_READ, handler);

      mockFromFn.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }));

      const result = await markAsRead('user-2', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(0);
      }
      expect(handler).not.toHaveBeenCalled();

      unsub();
    });

    it('returns error on database failure', async () => {
      mockFromFn.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'DB error' },
                }),
              }),
            }),
          }),
        }),
      }));

      const result = await markAsRead('user-2', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });

  describe('getUnreadMessageCount', () => {
    it('returns unread count', async () => {
      mockChain.eq.mockResolvedValueOnce({ data: null, error: null, count: 5 });

      const result = await getUnreadMessageCount('user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(5);
      }
    });

    it('returns 0 when no unread messages', async () => {
      mockChain.eq.mockResolvedValueOnce({ data: null, error: null, count: 0 });

      const result = await getUnreadMessageCount('user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });

    it('returns error on database failure', async () => {
      mockChain.eq.mockResolvedValueOnce({ data: null, error: { message: 'DB error' }, count: null });

      const result = await getUnreadMessageCount('user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });

  describe('canMessage', () => {
    it('returns false for self-messaging', async () => {
      const result = await canMessage('user-1', 'user-1');
      expect(result).toBe(false);
    });

    it('returns true when not blocked', async () => {
      const result = await canMessage('user-1', 'user-2');
      expect(result).toBe(true);
    });

    it('returns false when blocked', async () => {
      (isBlockedEitherWay as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      const result = await canMessage('user-1', 'user-2');
      expect(result).toBe(false);
    });
  });
});
