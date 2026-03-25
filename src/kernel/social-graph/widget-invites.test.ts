/**
 * Widget Invites API tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

vi.mock('./blocks', () => ({
  isBlockedEitherWay: vi.fn(),
}));

vi.mock('./follows', () => ({
  isFollowing: vi.fn(),
  getFollowers: vi.fn(),
}));

vi.mock('./notifications', () => ({
  createNotification: vi.fn().mockResolvedValue({ success: true, data: null }),
}));

vi.mock('../bus', () => ({
  bus: { emit: vi.fn() },
}));

import { bus } from '../bus';

import { isBlockedEitherWay } from './blocks';
import { isFollowing, getFollowers } from './follows';
import { createNotification } from './notifications';
import {
  sendWidgetInvite,
  broadcastWidget,
  acceptWidgetInvite,
  declineWidgetInvite,
  getPendingWidgetInvites,
  getWidgetInvite,
} from './widget-invites';

// Chain-able Supabase mock
const mockChain = {
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  lt: vi.fn(),
};

// Each method returns the chain (except terminal calls)
for (const key of Object.keys(mockChain) as Array<keyof typeof mockChain>) {
  mockChain[key].mockReturnThis();
}

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => mockChain),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SENDER = 'sender-uuid';
const RECIPIENT = 'recipient-uuid';
const WIDGET_ID = 'widget-abc';

const basePayload = {
  widgetId: WIDGET_ID,
  mode: 'share' as const,
};

const fakeInviteRow = {
  id: 'invite-1',
  sender_id: SENDER,
  recipient_id: RECIPIENT,
  mode: 'share',
  status: 'pending',
  is_broadcast: false,
  broadcast_id: null,
  widget_id: WIDGET_ID,
  widget_manifest_snapshot: null,
  widget_html: null,
  source_port_id: null,
  target_port_id: null,
  source_canvas_id: null,
  source_widget_instance_id: null,
  target_canvas_id: null,
  target_widget_instance_id: null,
  created_at: '2026-03-21T10:00:00Z',
  updated_at: '2026-03-21T10:00:00Z',
  expires_at: null,
};

function setupInsertSuccess(row: Record<string, unknown> = fakeInviteRow) {
  mockChain.single.mockResolvedValueOnce({ data: row, error: null });
  mockChain.insert.mockReturnValueOnce({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    }),
  });
}

function setupUpdateSuccess(row: Record<string, unknown>) {
  mockChain.update.mockReturnValueOnce({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: row, error: null }),
      }),
    }),
  });
}

// ---------------------------------------------------------------------------
// Tests: sendWidgetInvite
// ---------------------------------------------------------------------------

describe('Widget Invites API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isBlockedEitherWay as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (isFollowing as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    // Reset chain mocks
    for (const key of Object.keys(mockChain) as Array<keyof typeof mockChain>) {
      mockChain[key].mockReset().mockReturnThis();
    }
  });

  describe('sendWidgetInvite', () => {
    it('rejects self-invite', async () => {
      const result = await sendWidgetInvite(SENDER, basePayload, SENDER);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SELF_ACTION');
      }
    });

    it('rejects when blocked', async () => {
      (isBlockedEitherWay as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      const result = await sendWidgetInvite(RECIPIENT, basePayload, SENDER);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('BLOCKED');
      }
    });

    it('rejects when not mutual follows', async () => {
      // Sender follows recipient, but recipient doesn't follow sender
      (isFollowing as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(true)   // callerId -> recipientId
        .mockResolvedValueOnce(false); // recipientId -> callerId
      const result = await sendWidgetInvite(RECIPIENT, basePayload, SENDER);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('creates invite and notification on success', async () => {
      setupInsertSuccess();
      const result = await sendWidgetInvite(RECIPIENT, basePayload, SENDER);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('invite-1');
        expect(result.data.senderId).toBe(SENDER);
        expect(result.data.recipientId).toBe(RECIPIENT);
        expect(result.data.mode).toBe('share');
        expect(result.data.status).toBe('pending');
      }
      expect(createNotification).toHaveBeenCalledWith(
        RECIPIENT,
        SENDER,
        'widget_connection_invite',
        'widget_invite',
        'invite-1',
      );
      expect(bus.emit).toHaveBeenCalledWith(
        'kernel.socialgraph.widgetInvite.sent',
        expect.objectContaining({ invite: expect.objectContaining({ id: 'invite-1' }) }),
      );
    });

    it('rejects duplicate pending invite', async () => {
      mockChain.insert.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'duplicate key value violates unique constraint' },
          }),
        }),
      });
      const result = await sendWidgetInvite(RECIPIENT, basePayload, SENDER);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ALREADY_EXISTS');
      }
    });
  });

  // -------------------------------------------------------------------------
  // broadcastWidget
  // -------------------------------------------------------------------------

  describe('broadcastWidget', () => {
    it('rejects when no followers', async () => {
      (getFollowers as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { items: [], hasMore: false },
      });
      const result = await broadcastWidget(basePayload, SENDER);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('broadcasts to eligible followers', async () => {
      const followers = [
        { userId: 'follower-1' },
        { userId: 'follower-2' },
        { userId: 'follower-3' },
      ];
      (getFollowers as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { items: followers, hasMore: false },
      });
      // follower-2 is blocked
      (isBlockedEitherWay as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(false)  // follower-1
        .mockResolvedValueOnce(true)   // follower-2 blocked
        .mockResolvedValueOnce(false); // follower-3

      const insertedRows = [
        { ...fakeInviteRow, id: 'inv-1', recipient_id: 'follower-1', is_broadcast: true },
        { ...fakeInviteRow, id: 'inv-2', recipient_id: 'follower-3', is_broadcast: true },
      ];
      mockChain.insert.mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({ data: insertedRows, error: null }),
      });

      const result = await broadcastWidget(basePayload, SENDER);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.inviteCount).toBe(2); // follower-2 excluded
        expect(result.data.broadcastId).toBeDefined();
      }
      // Notifications created for each recipient
      expect(createNotification).toHaveBeenCalledTimes(2);
      expect(bus.emit).toHaveBeenCalledWith(
        'kernel.socialgraph.widgetBroadcast.sent',
        expect.objectContaining({ inviteCount: 2 }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // acceptWidgetInvite
  // -------------------------------------------------------------------------

  describe('acceptWidgetInvite', () => {
    it('rejects when invite not found', async () => {
      mockChain.eq.mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      const result = await acceptWidgetInvite('no-such-invite', 'canvas-1', RECIPIENT);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('rejects when caller is not the recipient', async () => {
      mockChain.eq.mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: fakeInviteRow, error: null }),
      });
      const result = await acceptWidgetInvite('invite-1', 'canvas-1', 'wrong-user');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('rejects when invite is not pending', async () => {
      const acceptedRow = { ...fakeInviteRow, status: 'accepted' };
      mockChain.eq.mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: acceptedRow, error: null }),
      });
      const result = await acceptWidgetInvite('invite-1', 'canvas-1', RECIPIENT);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('accepts invite and emits bus event', async () => {
      const acceptedRow = { ...fakeInviteRow, status: 'accepted', target_canvas_id: 'canvas-1' };
      // First call: select existing
      mockChain.eq.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({ data: fakeInviteRow, error: null }),
      });
      // Second call: update
      setupUpdateSuccess(acceptedRow);
      const result = await acceptWidgetInvite('invite-1', 'canvas-1', RECIPIENT);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('accepted');
        expect(result.data.targetCanvasId).toBe('canvas-1');
      }
      expect(bus.emit).toHaveBeenCalledWith(
        'kernel.socialgraph.widgetInvite.accepted',
        expect.objectContaining({ targetCanvasId: 'canvas-1' }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // declineWidgetInvite
  // -------------------------------------------------------------------------

  describe('declineWidgetInvite', () => {
    it('declines invite and emits bus event', async () => {
      const declinedRow = { ...fakeInviteRow, status: 'declined' };
      mockChain.eq.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({ data: fakeInviteRow, error: null }),
      });
      setupUpdateSuccess(declinedRow);
      const result = await declineWidgetInvite('invite-1', RECIPIENT);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('declined');
      }
      expect(bus.emit).toHaveBeenCalledWith(
        'kernel.socialgraph.widgetInvite.declined',
        expect.objectContaining({ invite: expect.objectContaining({ status: 'declined' }) }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // getPendingWidgetInvites
  // -------------------------------------------------------------------------

  describe('getPendingWidgetInvites', () => {
    it('returns paginated pending invites', async () => {
      mockChain.limit.mockResolvedValueOnce({
        data: [fakeInviteRow],
        error: null,
      });
      const result = await getPendingWidgetInvites(RECIPIENT);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.hasMore).toBe(false);
      }
    });
  });

  // -------------------------------------------------------------------------
  // getWidgetInvite
  // -------------------------------------------------------------------------

  describe('getWidgetInvite', () => {
    it('returns invite for sender', async () => {
      mockChain.single.mockResolvedValueOnce({ data: fakeInviteRow, error: null });
      const result = await getWidgetInvite('invite-1', SENDER);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('invite-1');
      }
    });

    it('returns invite for recipient', async () => {
      mockChain.single.mockResolvedValueOnce({ data: fakeInviteRow, error: null });
      const result = await getWidgetInvite('invite-1', RECIPIENT);
      expect(result.success).toBe(true);
    });

    it('rejects for unrelated user', async () => {
      mockChain.single.mockResolvedValueOnce({ data: fakeInviteRow, error: null });
      const result = await getWidgetInvite('invite-1', 'unrelated-user');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });
  });
});
