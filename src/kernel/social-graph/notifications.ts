/**
 * Social Graph Notifications API
 * @module kernel/social-graph/notifications
 */

import { SocialGraphEvents } from '@sn/types';
import type { Notification, NotificationType } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import type { SocialResult, PaginationOptions, Paginated, QueryResult } from './types';

/**
 * Map a database row to a Notification type.
 */
function mapNotificationRow(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    recipientId: row.recipient_id as string,
    actorId: row.actor_id as string,
    type: row.type as NotificationType,
    targetType: (row.target_type as string) ?? undefined,
    targetId: (row.target_id as string) ?? undefined,
    isRead: row.is_read as boolean,
    createdAt: row.created_at as string,
  };
}

/**
 * Create a notification (internal use).
 * Returns null if notification should be suppressed (self-action, blocked user).
 */
export async function createNotification(
  recipientId: string,
  actorId: string,
  type: NotificationType,
  targetType?: string,
  targetId?: string,
): Promise<SocialResult<Notification | null>> {
  // Don't notify yourself
  if (recipientId === actorId) {
    return { success: true, data: null };
  }

  // Check if actor is blocked by recipient
  const { data: blocked } = (await supabase
    .from('blocks')
    .select('blocker_id')
    .eq('blocker_id', recipientId)
    .eq('blocked_id', actorId)
    .single()) as QueryResult<{ blocker_id: string }>;

  if (blocked) {
    return { success: true, data: null };
  }

  const { data, error } = (await supabase
    .from('notifications')
    .insert({
      recipient_id: recipientId,
      actor_id: actorId,
      type,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
    })
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to create notification.' },
    };
  }

  const notification = mapNotificationRow(data);

  bus.emit(SocialGraphEvents.NOTIFICATION_CREATED, { notification });

  return { success: true, data: notification };
}

/**
 * Get notifications for a user.
 */
export async function getNotifications(
  callerId: string,
  options: PaginationOptions & { unreadOnly?: boolean } = {},
): Promise<SocialResult<Paginated<Notification>>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', callerId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (options.cursor) {
    query = query.lt('id', options.cursor);
  }

  const { data, error } = (await query) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const items = (data ?? []).slice(0, limit).map(mapNotificationRow);
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Get unread notification count.
 */
export async function getUnreadCount(callerId: string): Promise<SocialResult<number>> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', callerId)
    .eq('is_read', false);

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  return { success: true, data: count ?? 0 };
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(
  notificationId: string,
  callerId: string,
): Promise<SocialResult<Notification>> {
  // Verify ownership
  const { data: existing } = (await supabase
    .from('notifications')
    .select('recipient_id')
    .eq('id', notificationId)
    .single()) as QueryResult<{ recipient_id: string }>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Notification not found.' },
    };
  }

  if (existing.recipient_id !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Cannot modify another user\'s notification.' },
    };
  }

  const { data, error } = (await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to mark notification as read.' },
    };
  }

  const notification = mapNotificationRow(data);

  bus.emit(SocialGraphEvents.NOTIFICATION_READ, { notification });

  return { success: true, data: notification };
}

/**
 * Mark all notifications as read.
 */
export async function markAllAsRead(callerId: string): Promise<SocialResult<{ count: number }>> {
  const { data, error } = (await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', callerId)
    .eq('is_read', false)
    .select('id')) as QueryResult<Array<{ id: string }>>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const count = (data ?? []).length;

  bus.emit(SocialGraphEvents.NOTIFICATIONS_ALL_READ, { userId: callerId, count });

  return { success: true, data: { count } };
}

/**
 * Delete a notification.
 */
export async function deleteNotification(
  notificationId: string,
  callerId: string,
): Promise<SocialResult<{ id: string }>> {
  // Verify ownership
  const { data: existing } = (await supabase
    .from('notifications')
    .select('recipient_id')
    .eq('id', notificationId)
    .single()) as QueryResult<{ recipient_id: string }>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Notification not found.' },
    };
  }

  if (existing.recipient_id !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Cannot delete another user\'s notification.' },
    };
  }

  const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  return { success: true, data: { id: notificationId } };
}

/**
 * Delete all read notifications.
 */
export async function deleteReadNotifications(
  callerId: string,
): Promise<SocialResult<{ count: number }>> {
  const { data, error } = (await supabase
    .from('notifications')
    .delete()
    .eq('recipient_id', callerId)
    .eq('is_read', true)
    .select('id')) as QueryResult<Array<{ id: string }>>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  return { success: true, data: { count: (data ?? []).length } };
}
