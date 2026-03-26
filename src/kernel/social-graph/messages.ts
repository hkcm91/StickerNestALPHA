/**
 * Social Graph Messages API
 * @module kernel/social-graph/messages
 *
 * Direct messaging between users. Messages are only allowed
 * when neither user has blocked the other.
 */

import { SocialGraphEvents } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import { isBlockedEitherWay } from './blocks';
import type { SocialResult, PaginationOptions, Paginated, QueryResult } from './types';

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

function mapMessageRow(row: Record<string, unknown>): DirectMessage {
  return {
    id: row.id as string,
    senderId: row.sender_id as string,
    recipientId: row.recipient_id as string,
    content: row.content as string,
    isRead: row.is_read as boolean,
    createdAt: row.created_at as string,
  };
}

/**
 * Send a direct message to another user.
 */
export async function sendMessage(
  recipientId: string,
  content: string,
  callerId: string,
): Promise<SocialResult<DirectMessage>> {
  if (recipientId === callerId) {
    return {
      success: false,
      error: { code: 'SELF_ACTION', message: 'Cannot message yourself.' },
    };
  }

  if (!content.trim()) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Message content cannot be empty.' },
    };
  }

  if (content.length > 2000) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Message content too long (max 2000 characters).' },
    };
  }

  // Check block status
  const blocked = await isBlockedEitherWay(callerId, recipientId);
  if (blocked) {
    return {
      success: false,
      error: { code: 'BLOCKED', message: 'Cannot send message to this user.' },
    };
  }

  const { data, error } = (await supabase
    .from('direct_messages')
    .insert({
      sender_id: callerId,
      recipient_id: recipientId,
      content: content.trim(),
    })
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to send message.' },
    };
  }

  const message = mapMessageRow(data);

  bus.emit(SocialGraphEvents.MESSAGE_SENT, { message });

  return { success: true, data: message };
}

/**
 * Get conversation messages between two users.
 */
export async function getConversation(
  otherUserId: string,
  callerId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<Paginated<DirectMessage>>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('direct_messages')
    .select('*')
    .or(
      `and(sender_id.eq.${callerId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${callerId})`,
    )
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

  const items = (data ?? []).slice(0, limit);
  const hasMore = (data ?? []).length > limit;
  const nextCursor =
    hasMore && items.length > 0
      ? (items[items.length - 1].created_at as string)
      : undefined;

  return {
    success: true,
    data: {
      items: items.map(mapMessageRow),
      nextCursor,
      hasMore,
    },
  };
}

/**
 * Mark messages in a conversation as read.
 * Marks all unread messages from `senderId` to `callerId` as read.
 */
export async function markAsRead(
  senderId: string,
  callerId: string,
): Promise<SocialResult<{ count: number }>> {
  if (senderId === callerId) {
    return {
      success: false,
      error: { code: 'SELF_ACTION', message: 'Cannot mark own messages as read.' },
    };
  }

  const { data, error } = (await supabase
    .from('direct_messages')
    .update({ is_read: true })
    .eq('sender_id', senderId)
    .eq('recipient_id', callerId)
    .eq('is_read', false)
    .select('id')) as QueryResult<Array<{ id: string }>>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const count = data?.length ?? 0;

  if (count > 0) {
    bus.emit(SocialGraphEvents.MESSAGES_READ, {
      senderId,
      readerId: callerId,
      count,
    });
  }

  return { success: true, data: { count } };
}

/**
 * Get the total count of unread messages for a user across all conversations.
 */
export async function getUnreadMessageCount(
  userId: string,
): Promise<SocialResult<number>> {
  const { error, count } = (await supabase
    .from('direct_messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)) as QueryResult<unknown[]> & { count: number | null };

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  return { success: true, data: count ?? 0 };
}

/**
 * Check if messaging is allowed between two users (no blocks).
 */
export async function canMessage(
  userA: string,
  userB: string,
): Promise<boolean> {
  if (userA === userB) return false;
  const blocked = await isBlockedEitherWay(userA, userB);
  return !blocked;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation List
// ─────────────────────────────────────────────────────────────────────────────

export interface ConversationPreview {
  otherUserId: string;
  otherUserDisplayName: string;
  otherUserAvatarUrl: string | null;
  lastMessage: DirectMessage;
  unreadCount: number;
}

/**
 * Get all conversations for a user, with the latest message and unread count
 * per conversation partner. Ordered by most recent message first.
 */
export async function getConversationList(
  callerId: string,
): Promise<SocialResult<ConversationPreview[]>> {
  // Fetch all messages involving this user (limited to latest 500 to bound cost)
  const { data: allMessages, error } = (await supabase
    .from('direct_messages')
    .select('*')
    .or(`sender_id.eq.${callerId},recipient_id.eq.${callerId}`)
    .order('created_at', { ascending: false })
    .limit(500)) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  if (!allMessages || allMessages.length === 0) {
    return { success: true, data: [] };
  }

  // Group by conversation partner, keeping only the latest message per partner
  const partnerMap = new Map<string, { lastMessage: DirectMessage; unreadCount: number }>();

  for (const row of allMessages) {
    const msg = mapMessageRow(row);
    const partnerId = msg.senderId === callerId ? msg.recipientId : msg.senderId;

    if (!partnerMap.has(partnerId)) {
      partnerMap.set(partnerId, { lastMessage: msg, unreadCount: 0 });
    }

    // Count unread messages sent TO us by this partner
    if (msg.recipientId === callerId && !msg.isRead) {
      const entry = partnerMap.get(partnerId)!;
      entry.unreadCount++;
    }
  }

  // Fetch user profiles for all conversation partners
  const partnerIds = Array.from(partnerMap.keys());
  const { data: profiles } = (await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .in('id', partnerIds)) as QueryResult<Array<{ id: string; display_name: string; avatar_url: string | null }>>;

  const profileMap = new Map<string, { displayName: string; avatarUrl: string | null }>();
  if (profiles) {
    for (const p of profiles) {
      profileMap.set(p.id, { displayName: p.display_name, avatarUrl: p.avatar_url });
    }
  }

  // Build conversation previews
  const previews: ConversationPreview[] = [];
  for (const [partnerId, { lastMessage, unreadCount }] of partnerMap) {
    const profile = profileMap.get(partnerId);
    previews.push({
      otherUserId: partnerId,
      otherUserDisplayName: profile?.displayName ?? 'Unknown User',
      otherUserAvatarUrl: profile?.avatarUrl ?? null,
      lastMessage,
      unreadCount,
    });
  }

  // Sort by latest message (newest first)
  previews.sort((a, b) =>
    new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime(),
  );

  return { success: true, data: previews };
}
