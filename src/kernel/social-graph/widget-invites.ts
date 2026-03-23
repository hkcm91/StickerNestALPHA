/**
 * Social Graph Widget Invites API
 * @module kernel/social-graph/widget-invites
 *
 * Handles 1:1 widget connection invites (mutual follows required)
 * and 1:many broadcasts (creator to followers).
 *
 * Invites are stateful records; the notification system is the delivery mechanism.
 */

import { SocialGraphEvents } from '@sn/types';
import type { WidgetInvite, WidgetInviteMode } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import { isBlockedEitherWay } from './blocks';
import { isFollowing, getFollowers } from './follows';
import { createNotification } from './notifications';
import type { SocialResult, PaginationOptions, Paginated, QueryResult } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mapInviteRow(row: Record<string, unknown>): WidgetInvite {
  return {
    id: row.id as string,
    senderId: row.sender_id as string,
    recipientId: row.recipient_id as string,
    mode: row.mode as WidgetInviteMode,
    status: row.status as WidgetInvite['status'],
    isBroadcast: row.is_broadcast as boolean,
    broadcastId: (row.broadcast_id as string) ?? undefined,
    widgetId: row.widget_id as string,
    widgetManifestSnapshot: (row.widget_manifest_snapshot as Record<string, unknown>) ?? undefined,
    widgetHtml: (row.widget_html as string) ?? undefined,
    sourcePortId: (row.source_port_id as string) ?? undefined,
    targetPortId: (row.target_port_id as string) ?? undefined,
    sourceCanvasId: (row.source_canvas_id as string) ?? undefined,
    sourceWidgetInstanceId: (row.source_widget_instance_id as string) ?? undefined,
    targetCanvasId: (row.target_canvas_id as string) ?? undefined,
    targetWidgetInstanceId: (row.target_widget_instance_id as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    expiresAt: (row.expires_at as string) ?? undefined,
  };
}

/** Payload for sending an invite or broadcast */
export interface WidgetInvitePayload {
  widgetId: string;
  mode: WidgetInviteMode;
  widgetManifestSnapshot?: Record<string, unknown>;
  widgetHtml?: string;
  sourcePortId?: string;
  targetPortId?: string;
  sourceCanvasId?: string;
  sourceWidgetInstanceId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Send (1:1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a 1:1 widget invite. Requires mutual follows.
 */
export async function sendWidgetInvite(
  recipientId: string,
  payload: WidgetInvitePayload,
  callerId: string,
): Promise<SocialResult<WidgetInvite>> {
  // Cannot invite yourself
  if (recipientId === callerId) {
    return {
      success: false,
      error: { code: 'SELF_ACTION', message: 'Cannot send a widget invite to yourself.' },
    };
  }

  // Check blocks
  const blocked = await isBlockedEitherWay(callerId, recipientId);
  if (blocked) {
    return {
      success: false,
      error: { code: 'BLOCKED', message: 'Cannot send invite to this user.' },
    };
  }

  // Check mutual follows
  const [callerFollows, recipientFollows] = await Promise.all([
    isFollowing(callerId, recipientId),
    isFollowing(recipientId, callerId),
  ]);

  if (!callerFollows || !recipientFollows) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Widget invites require mutual follows.' },
    };
  }

  // Insert invite (unique constraint prevents duplicate pending invites)
  const { data, error } = (await supabase
    .from('widget_invites')
    .insert({
      sender_id: callerId,
      recipient_id: recipientId,
      mode: payload.mode,
      widget_id: payload.widgetId,
      widget_manifest_snapshot: payload.widgetManifestSnapshot ?? null,
      widget_html: payload.widgetHtml ?? null,
      source_port_id: payload.sourcePortId ?? null,
      target_port_id: payload.targetPortId ?? null,
      source_canvas_id: payload.sourceCanvasId ?? null,
      source_widget_instance_id: payload.sourceWidgetInstanceId ?? null,
    })
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    // Check for duplicate pending invite
    if (error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
      return {
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'A pending invite for this widget already exists.' },
      };
    }
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to create widget invite.' },
    };
  }

  const invite = mapInviteRow(data);

  // Create notification for delivery
  await createNotification(
    recipientId,
    callerId,
    'widget_connection_invite',
    'widget_invite',
    invite.id,
  );

  bus.emit(SocialGraphEvents.WIDGET_INVITE_SENT, { invite });

  return { success: true, data: invite };
}

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast (1:many)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Broadcast a widget to all followers. No mutual follow required.
 */
export async function broadcastWidget(
  payload: WidgetInvitePayload,
  callerId: string,
): Promise<SocialResult<{ broadcastId: string; inviteCount: number }>> {
  // Fetch all active followers (up to cap)
  const MAX_BROADCAST = 10_000;
  const followersResult = await getFollowers(callerId, { limit: MAX_BROADCAST });

  if (!followersResult.success) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'Failed to fetch followers.' },
    };
  }

  const followers = followersResult.data.items;
  if (followers.length === 0) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'No followers to broadcast to.' },
    };
  }

  // Filter out blocked users
  const blockChecks = await Promise.all(
    followers.map(async (f) => ({
      userId: f.userId,
      blocked: await isBlockedEitherWay(callerId, f.userId),
    })),
  );
  const eligibleFollowers = blockChecks.filter((c) => !c.blocked);

  if (eligibleFollowers.length === 0) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'No eligible followers to broadcast to.' },
    };
  }

  // Generate broadcast group ID
  const broadcastId = crypto.randomUUID();

  // Batch insert invite rows
  const inviteRows = eligibleFollowers.map((f) => ({
    sender_id: callerId,
    recipient_id: f.userId,
    mode: payload.mode,
    status: 'pending',
    is_broadcast: true,
    broadcast_id: broadcastId,
    widget_id: payload.widgetId,
    widget_manifest_snapshot: payload.widgetManifestSnapshot ?? null,
    widget_html: payload.widgetHtml ?? null,
    source_port_id: payload.sourcePortId ?? null,
    target_port_id: payload.targetPortId ?? null,
    source_canvas_id: payload.sourceCanvasId ?? null,
    source_widget_instance_id: payload.sourceWidgetInstanceId ?? null,
  }));

  const { data: inserted, error } = (await supabase
    .from('widget_invites')
    .insert(inviteRows)
    .select()) as QueryResult<Record<string, unknown>[]>;

  if (error || !inserted) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to create broadcast invites.' },
    };
  }

  // Create notifications for each recipient
  await Promise.all(
    inserted.map((row) =>
      createNotification(
        row.recipient_id as string,
        callerId,
        'widget_broadcast',
        'widget_invite',
        row.id as string,
      ),
    ),
  );

  bus.emit(SocialGraphEvents.WIDGET_BROADCAST_SENT, {
    broadcastId,
    senderId: callerId,
    widgetId: payload.widgetId,
    inviteCount: inserted.length,
  });

  return { success: true, data: { broadcastId, inviteCount: inserted.length } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Accept / Decline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accept a widget invite, selecting a target canvas for placement.
 */
export async function acceptWidgetInvite(
  inviteId: string,
  targetCanvasId: string,
  callerId: string,
): Promise<SocialResult<WidgetInvite>> {
  const { data: existing } = (await supabase
    .from('widget_invites')
    .select('*')
    .eq('id', inviteId)
    .single()) as QueryResult<Record<string, unknown>>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Invite not found.' },
    };
  }

  if (existing.recipient_id !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Cannot accept another user\'s invite.' },
    };
  }

  if (existing.status !== 'pending') {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invite is already ${existing.status as string}.` },
    };
  }

  const { data, error } = (await supabase
    .from('widget_invites')
    .update({ status: 'accepted', target_canvas_id: targetCanvasId })
    .eq('id', inviteId)
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to accept invite.' },
    };
  }

  const invite = mapInviteRow(data);

  bus.emit(SocialGraphEvents.WIDGET_INVITE_ACCEPTED, { invite, targetCanvasId });

  return { success: true, data: invite };
}

/**
 * Decline a widget invite.
 */
export async function declineWidgetInvite(
  inviteId: string,
  callerId: string,
): Promise<SocialResult<WidgetInvite>> {
  const { data: existing } = (await supabase
    .from('widget_invites')
    .select('*')
    .eq('id', inviteId)
    .single()) as QueryResult<Record<string, unknown>>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Invite not found.' },
    };
  }

  if (existing.recipient_id !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Cannot decline another user\'s invite.' },
    };
  }

  if (existing.status !== 'pending') {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invite is already ${existing.status as string}.` },
    };
  }

  const { data, error } = (await supabase
    .from('widget_invites')
    .update({ status: 'declined' })
    .eq('id', inviteId)
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to decline invite.' },
    };
  }

  const invite = mapInviteRow(data);

  bus.emit(SocialGraphEvents.WIDGET_INVITE_DECLINED, { invite });

  return { success: true, data: invite };
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get pending widget invites for a user.
 */
export async function getPendingWidgetInvites(
  callerId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<Paginated<WidgetInvite>>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('widget_invites')
    .select('*')
    .eq('recipient_id', callerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt('created_at', options.cursor);
  }

  const { data, error } = (await query) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const items = (data ?? []).slice(0, limit).map(mapInviteRow);
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Get a single widget invite by ID.
 */
export async function getWidgetInvite(
  inviteId: string,
  callerId: string,
): Promise<SocialResult<WidgetInvite>> {
  const { data, error } = (await supabase
    .from('widget_invites')
    .select('*')
    .eq('id', inviteId)
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Invite not found.' },
    };
  }

  // Only sender or recipient can view
  if (data.sender_id !== callerId && data.recipient_id !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Cannot view this invite.' },
    };
  }

  return { success: true, data: mapInviteRow(data) };
}
