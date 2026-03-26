/**
 * useMessageSubscription — Supabase Realtime subscription for incoming messages.
 *
 * Subscribes to INSERT events on direct_messages table filtered by recipient_id.
 * When a new message arrives from another session/tab, emits a bus event so
 * ConversationList and MessageThread update in real-time.
 *
 * @module shell/messaging
 * @layer L6
 */

import { useEffect } from 'react';

import { SocialGraphEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { supabase } from '../../kernel/supabase';

/**
 * Map a Supabase Realtime row payload to a DirectMessage-compatible bus event.
 */
function mapRealtimeRow(row: Record<string, unknown>) {
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
 * Subscribe to real-time message delivery for the given user.
 * Emits SocialGraphEvents.MESSAGE_SENT on the local bus when a new message arrives
 * from another session.
 */
export function useMessageSubscription(userId: string | null | undefined): void {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-messages-${userId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const message = mapRealtimeRow(payload.new);
          bus.emit(SocialGraphEvents.MESSAGE_SENT, { message });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
