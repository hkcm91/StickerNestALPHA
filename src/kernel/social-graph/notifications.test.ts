/**
 * Notifications API tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SocialGraphEvents } from '@sn/types';

import { bus } from '../bus';

import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
} from './notifications';

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
    is: vi.fn(),
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

const makeNotificationRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'notif-1',
  recipient_id: 'user-1',
  actor_id: 'user-2',
  type: 'follow',
  target_type: null,
  target_id: null,
  is_read: false,
  created_at: '2024-06-01T00:00:00Z',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Notifications API', () => {
  beforeEach(() => {
    for (const method of Object.values(mockChain)) {
      method.mockReset();
      method.mockReturnValue(mockChain);
    }
    mockFromFn.mockReset();
    mockFromFn.mockReturnValue(mockChain);
  });

  // =========================================================================
  // createNotification
  // =========================================================================
  describe('createNotification', () => {
    it('creates a notification and emits bus event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.NOTIFICATION_CREATED, handler);

      let callCount = 0;
      (mockFromFn as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
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
        // Insert notification
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: makeNotificationRow(),
                error: null,
              }),
            }),
          }),
        };
      });

      const result = await createNotification('user-1', 'user-2', 'follow');
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe('notif-1');
        expect(result.data.recipientId).toBe('user-1');
      }
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ notification: expect.any(Object) }),
        }),
      );

      unsub();
    });

    it('suppresses self-notifications', async () => {
      const result = await createNotification('user-1', 'user-1', 'follow');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('suppresses notifications when actor is blocked', async () => {
      // Block check returns a result
      mockChain.single.mockResolvedValueOnce({ data: { blocker_id: 'user-1' }, error: null });

      const result = await createNotification('user-1', 'user-2', 'follow');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
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
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
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

      const result = await createNotification('user-1', 'user-2', 'follow');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });

  // =========================================================================
  // getNotifications
  // =========================================================================
  describe('getNotifications', () => {
    it('returns paginated notifications', async () => {
      const rows = [makeNotificationRow({ id: 'n1' }), makeNotificationRow({ id: 'n2' })];
      mockChain.limit.mockResolvedValueOnce({ data: rows, error: null });

      const result = await getNotifications('user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(2);
      }
    });

    it('returns error on DB failure', async () => {
      mockChain.limit.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      const result = await getNotifications('user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });

  // =========================================================================
  // getUnreadCount
  // =========================================================================
  describe('getUnreadCount', () => {
    it('returns unread count', async () => {
      mockFromFn.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
          }),
        }),
      });

      const result = await getUnreadCount('user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(3);
      }
    });

    it('returns 0 when count is null', async () => {
      mockFromFn.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: null, error: null }),
          }),
        }),
      });

      const result = await getUnreadCount('user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });
  });

  // =========================================================================
  // markAsRead
  // =========================================================================
  describe('markAsRead', () => {
    it('marks a notification as read and emits bus event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.NOTIFICATION_READ, handler);

      let callCount = 0;
      (mockFromFn as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { recipient_id: 'user-1' }, error: null }),
              }),
            }),
          };
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: makeNotificationRow({ is_read: true }),
                  error: null,
                }),
              }),
            }),
          }),
        };
      });

      const result = await markAsRead('notif-1', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isRead).toBe(true);
      }
      expect(handler).toHaveBeenCalled();

      unsub();
    });

    it('rejects marking another user notification', async () => {
      mockChain.single.mockResolvedValueOnce({ data: { recipient_id: 'user-1' }, error: null });

      const result = await markAsRead('notif-1', 'user-2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('returns NOT_FOUND for non-existent notification', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await markAsRead('notif-999', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  // =========================================================================
  // markAllAsRead
  // =========================================================================
  describe('markAllAsRead', () => {
    it('marks all notifications as read and emits bus event', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(SocialGraphEvents.NOTIFICATIONS_ALL_READ, handler);

      mockChain.select.mockResolvedValueOnce({ data: [{ id: 'n1' }, { id: 'n2' }], error: null });

      const result = await markAllAsRead('user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(2);
      }
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ userId: 'user-1', count: 2 }),
        }),
      );

      unsub();
    });
  });

  // =========================================================================
  // deleteNotification
  // =========================================================================
  describe('deleteNotification', () => {
    it('deletes a notification successfully', async () => {
      let callCount = 0;
      (mockFromFn as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { recipient_id: 'user-1' }, error: null }),
              }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      const result = await deleteNotification('notif-1', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('notif-1');
      }
    });

    it('rejects deletion by non-recipient', async () => {
      mockChain.single.mockResolvedValueOnce({ data: { recipient_id: 'user-1' }, error: null });

      const result = await deleteNotification('notif-1', 'user-2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('returns NOT_FOUND for non-existent notification', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await deleteNotification('notif-999', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  // =========================================================================
  // deleteReadNotifications
  // =========================================================================
  describe('deleteReadNotifications', () => {
    it('deletes read notifications and returns count', async () => {
      mockChain.select.mockResolvedValueOnce({ data: [{ id: 'n1' }], error: null });

      const result = await deleteReadNotifications('user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(1);
      }
    });
  });
});
