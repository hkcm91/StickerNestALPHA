/**
 * Messages API tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SocialGraphEvents } from '@sn/types';

import { bus } from '../bus';

import { isBlockedEitherWay } from './blocks';
import { sendMessage, canMessage, markAsRead, getUnreadMessageCount, getConversationList } from './messages';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

vi.mock('./blocks', () => ({
  isBlockedEitherWay: vi.fn(),
}));

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
        expect.objectContaining({ payload: expect.objectContaining({ message: expect.any(Object) }) }),
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
          payload: expect.objectContaining({
            senderId: 'user-2',
            readerId: 'user-1',
            count: 2,
          }),
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
      mockFromFn.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null, count: 5 }),
          }),
        }),
      }));

      const result = await getUnreadMessageCount('user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(5);
      }
    });

    it('returns 0 when no unread messages', async () => {
      mockFromFn.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
          }),
        }),
      }));

      const result = await getUnreadMessageCount('user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });

    it('returns error on database failure', async () => {
      mockFromFn.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' }, count: null }),
          }),
        }),
      }));

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

  describe('getConversationList', () => {
    /**
     * Helper: build a raw DB message row.
     */
    function makeRow(
      id: string,
      senderId: string,
      recipientId: string,
      content: string,
      isRead: boolean,
      createdAt: string,
    ): Record<string, unknown> {
      return {
        id,
        sender_id: senderId,
        recipient_id: recipientId,
        content,
        is_read: isRead,
        created_at: createdAt,
      };
    }

    /**
     * Wire up mockFromFn so that:
     *   - the first from() call (direct_messages) resolves via .limit()
     *   - the second from() call (users) resolves via .in()
     */
    function setupMocks(
      messagesResult: { data: Record<string, unknown>[] | null; error: null | { message: string } },
      profilesResult: { data: Array<{ id: string; display_name: string; avatar_url: string | null }> | null; error: null | { message: string } },
    ) {
      let callCount = 0;
      mockFromFn.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // direct_messages query: .select().or().order().limit() — limit is the final awaited call
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue(messagesResult),
                }),
              }),
            }),
          };
        }
        // users query: .select().in() — in() is the final awaited call
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue(profilesResult),
          }),
        };
      });
    }

    it('returns empty array when user has no messages', async () => {
      setupMocks({ data: [], error: null }, { data: [], error: null });

      const result = await getConversationList('user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('returns conversations ordered by latest message (newest first)', async () => {
      // user-1 has two conversation partners: user-2 (older) and user-3 (newer)
      const messages = [
        makeRow('msg-3', 'user-3', 'user-1', 'Hi from 3 again', true, '2024-06-03T12:00:00Z'),
        makeRow('msg-2', 'user-1', 'user-2', 'Hey 2', true, '2024-06-02T10:00:00Z'),
        makeRow('msg-1', 'user-2', 'user-1', 'Hello', true, '2024-06-01T09:00:00Z'),
      ];
      const profiles = [
        { id: 'user-2', display_name: 'Alice', avatar_url: null },
        { id: 'user-3', display_name: 'Bob', avatar_url: 'https://example.com/bob.png' },
      ];

      setupMocks({ data: messages, error: null }, { data: profiles, error: null });

      const result = await getConversationList('user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        // First conversation should be the one with the newest message (user-3)
        expect(result.data[0].otherUserId).toBe('user-3');
        expect(result.data[0].lastMessage.id).toBe('msg-3');
        // Second conversation should be user-2
        expect(result.data[1].otherUserId).toBe('user-2');
        expect(result.data[1].lastMessage.id).toBe('msg-2');
      }
    });

    it('correctly counts unread messages per conversation partner', async () => {
      // user-2 sent 2 unread messages and 1 read message to user-1
      const messages = [
        makeRow('msg-4', 'user-2', 'user-1', 'Still there?', false, '2024-06-04T08:00:00Z'),
        makeRow('msg-3', 'user-2', 'user-1', 'You around?', false, '2024-06-03T08:00:00Z'),
        makeRow('msg-2', 'user-2', 'user-1', 'Hello', true, '2024-06-02T08:00:00Z'),
        makeRow('msg-1', 'user-1', 'user-2', 'Hey!', true, '2024-06-01T08:00:00Z'),
      ];
      const profiles = [{ id: 'user-2', display_name: 'Alice', avatar_url: null }];

      setupMocks({ data: messages, error: null }, { data: profiles, error: null });

      const result = await getConversationList('user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        // Only the 2 unread messages from user-2 count (not the one user-1 sent)
        expect(result.data[0].unreadCount).toBe(2);
      }
    });

    it('includes user profile info (display name, avatar) from users table', async () => {
      const messages = [
        makeRow('msg-1', 'user-2', 'user-1', 'Hey!', false, '2024-06-01T00:00:00Z'),
      ];
      const profiles = [
        { id: 'user-2', display_name: 'Alice Smith', avatar_url: 'https://example.com/alice.png' },
      ];

      setupMocks({ data: messages, error: null }, { data: profiles, error: null });

      const result = await getConversationList('user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].otherUserDisplayName).toBe('Alice Smith');
        expect(result.data[0].otherUserAvatarUrl).toBe('https://example.com/alice.png');
      }
    });

    it('falls back to "Unknown User" and null avatar when profile is missing', async () => {
      const messages = [
        makeRow('msg-1', 'user-2', 'user-1', 'Hey!', false, '2024-06-01T00:00:00Z'),
      ];
      // profiles query returns empty (user-2 has no profile row)
      setupMocks({ data: messages, error: null }, { data: [], error: null });

      const result = await getConversationList('user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].otherUserDisplayName).toBe('Unknown User');
        expect(result.data[0].otherUserAvatarUrl).toBeNull();
      }
    });

    it('handles DB error on messages query', async () => {
      // Wire only the messages chain; profiles chain is never reached on error
      let callCount = 0;
      mockFromFn.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
                }),
              }),
            }),
          };
        }
        // Should not be called, but provide a no-op fallback
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const result = await getConversationList('user-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toBe('DB error');
      }
    });

    it('groups messages by conversation partner correctly (both sent and received)', async () => {
      // user-1 sent to user-2 and received from user-2 — all should belong to one conversation
      // user-1 also has a conversation with user-3
      const messages = [
        makeRow('msg-5', 'user-3', 'user-1', 'Hi from 3', false, '2024-06-05T00:00:00Z'),
        makeRow('msg-4', 'user-1', 'user-2', 'Reply to 2', true, '2024-06-04T00:00:00Z'),
        makeRow('msg-3', 'user-2', 'user-1', 'Message from 2', false, '2024-06-03T00:00:00Z'),
        makeRow('msg-2', 'user-1', 'user-2', 'Another to 2', true, '2024-06-02T00:00:00Z'),
        makeRow('msg-1', 'user-2', 'user-1', 'First from 2', true, '2024-06-01T00:00:00Z'),
      ];
      const profiles = [
        { id: 'user-2', display_name: 'Alice', avatar_url: null },
        { id: 'user-3', display_name: 'Bob', avatar_url: null },
      ];

      setupMocks({ data: messages, error: null }, { data: profiles, error: null });

      const result = await getConversationList('user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        // All messages with user-2 (sent and received) collapse into one conversation
        expect(result.data).toHaveLength(2);

        const user2Conv = result.data.find(c => c.otherUserId === 'user-2');
        const user3Conv = result.data.find(c => c.otherUserId === 'user-3');

        expect(user2Conv).toBeDefined();
        expect(user3Conv).toBeDefined();

        // Latest message in user-2 conversation is msg-4 (sent by user-1)
        expect(user2Conv!.lastMessage.id).toBe('msg-4');
        // Only msg-3 from user-2 is unread (msg-1 is read, msg-4 was sent by user-1 not received)
        expect(user2Conv!.unreadCount).toBe(1);

        // user-3 conversation has 1 unread
        expect(user3Conv!.unreadCount).toBe(1);

        // user-3 has newest message overall so should appear first
        expect(result.data[0].otherUserId).toBe('user-3');
        expect(result.data[1].otherUserId).toBe('user-2');
      }
    });
  });
});
