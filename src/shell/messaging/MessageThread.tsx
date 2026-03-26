/**
 * MessageThread — displays messages in a conversation with auto-scroll
 * and real-time updates via bus events.
 *
 * @module shell/messaging
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { BusEvent } from '@sn/types';
import { SocialGraphEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import {
  getConversation,
  markAsRead,
  sendMessage,
} from '../../kernel/social-graph';
import type { DirectMessage } from '../../kernel/social-graph';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { themeVar } from '../theme/theme-vars';

import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';

export interface MessageThreadProps {
  otherUserId: string;
  otherUserDisplayName: string;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  otherUserId,
  otherUserDisplayName,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);

  // Load conversation on mount or when partner changes
  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessages([]);
      didInitialScroll.current = false;

      const result = await getConversation(otherUserId, currentUser!.id, { limit: 50 });
      if (cancelled) return;

      if (result.success) {
        // Messages come newest-first; reverse for display (oldest at top)
        setMessages(result.data.items.slice().reverse());
        setHasMore(result.data.hasMore);
        setCursor(result.data.nextCursor);
      }
      setLoading(false);

      // Mark messages as read
      await markAsRead(otherUserId, currentUser!.id);
    }

    load();
    return () => { cancelled = true; };
  }, [otherUserId, currentUser?.id]);

  // Auto-scroll to bottom on initial load and new messages
  useEffect(() => {
    if (!loading && messages.length > 0 && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: didInitialScroll.current ? 'smooth' : 'auto' });
      didInitialScroll.current = true;
    }
  }, [messages, loading]);

  // Subscribe to bus events for real-time messages
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsub = bus.subscribe(SocialGraphEvents.MESSAGE_SENT, (event: BusEvent) => {
      const { message } = event.payload as { message: DirectMessage };
      // Only add if this message belongs to the current conversation
      const isForThisConvo =
        (message.senderId === currentUser!.id && message.recipientId === otherUserId) ||
        (message.senderId === otherUserId && message.recipientId === currentUser!.id);

      if (isForThisConvo) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });

        // Mark as read if it's an incoming message
        if (message.senderId === otherUserId) {
          markAsRead(otherUserId, currentUser!.id);
        }
      }
    });

    return unsub;
  }, [otherUserId, currentUser?.id]);

  // Load older messages
  const loadMore = useCallback(async () => {
    if (!currentUser?.id || !hasMore || !cursor) return;
    const result = await getConversation(otherUserId, currentUser.id, { limit: 50, cursor });
    if (result.success) {
      setMessages((prev) => [...result.data.items.slice().reverse(), ...prev]);
      setHasMore(result.data.hasMore);
      setCursor(result.data.nextCursor);
    }
  }, [otherUserId, currentUser?.id, hasMore, cursor]);

  // Send message
  const handleSend = useCallback(
    async (content: string) => {
      if (!currentUser?.id) return;
      setSending(true);
      await sendMessage(otherUserId, content, currentUser.id);
      // Message will appear via bus event subscription
      setSending(false);
    },
    [otherUserId, currentUser?.id],
  );

  if (!currentUser) {
    return <div style={{ padding: 20, color: themeVar('--sn-text-muted') }}>Please log in to message.</div>;
  }

  return (
    <div
      data-testid="message-thread"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: themeVar('--sn-bg'),
      }}
    >
      {/* Header */}
      <div
        data-testid="thread-header"
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${themeVar('--sn-border')}`,
          background: themeVar('--sn-surface'),
          fontWeight: 600,
          fontSize: 15,
          color: themeVar('--sn-text'),
          flexShrink: 0,
        }}
      >
        {otherUserDisplayName}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        data-testid="message-list"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {hasMore && (
          <button
            data-testid="load-more"
            onClick={loadMore}
            style={{
              alignSelf: 'center',
              padding: '4px 16px',
              borderRadius: 12,
              border: 'none',
              background: themeVar('--sn-surface-raised'),
              color: themeVar('--sn-text-muted'),
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: 8,
            }}
          >
            Load older messages
          </button>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 20, color: themeVar('--sn-text-muted') }}>
            Loading...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div
            data-testid="empty-thread"
            style={{
              textAlign: 'center',
              padding: 40,
              color: themeVar('--sn-text-muted'),
              fontSize: 14,
            }}
          >
            No messages yet. Say hello!
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSent={msg.senderId === currentUser.id}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={sending} />
    </div>
  );
};
