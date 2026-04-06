/**
 * ConversationList — sidebar listing all conversations with previews.
 *
 * Shows avatar, name, last message preview, time, and unread badge.
 * Subscribes to bus events for real-time updates.
 *
 * @module shell/messaging
 * @layer L6
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { BusEvent } from '@sn/types';
import { SocialGraphEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { getConversationList } from '../../kernel/social-graph';
import type { ConversationPreview, DirectMessage } from '../../kernel/social-graph';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { themeVar } from '../theme/theme-vars';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export interface ConversationListProps {
  activeUserId?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({ activeUserId }) => {
  const currentUser = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  // Load conversations on mount
  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await getConversationList(currentUser!.id);
      if (!cancelled && result.success) {
        setConversations(result.data);
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  // Subscribe to new messages to update previews
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsub = bus.subscribe(SocialGraphEvents.MESSAGE_SENT, (event: BusEvent) => {
      const { message } = event.payload as { message: DirectMessage };
      const partnerId = message.senderId === currentUser!.id
        ? message.recipientId
        : message.senderId;

      setConversations((prev) => {
        const existing = prev.find((c) => c.otherUserId === partnerId);
        if (existing) {
          // Update existing conversation
          const updated = prev.map((c) =>
            c.otherUserId === partnerId
              ? {
                  ...c,
                  lastMessage: message,
                  unreadCount: message.senderId !== currentUser!.id
                    ? c.unreadCount + 1
                    : c.unreadCount,
                }
              : c,
          );
          // Re-sort by latest message
          return updated.sort(
            (a, b) =>
              new Date(b.lastMessage.createdAt).getTime() -
              new Date(a.lastMessage.createdAt).getTime(),
          );
        }
        // New conversation — add at top
        return [
          {
            otherUserId: partnerId,
            otherUserDisplayName: 'User',
            otherUserAvatarUrl: null,
            lastMessage: message,
            unreadCount: message.senderId !== currentUser!.id ? 1 : 0,
          },
          ...prev,
        ];
      });
    });

    return unsub;
  }, [currentUser?.id]);

  // Reset unread when conversation becomes active
  useEffect(() => {
    if (!activeUserId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.otherUserId === activeUserId ? { ...c, unreadCount: 0 } : c,
      ),
    );
  }, [activeUserId]);

  return (
    <div
      data-testid="conversation-list"
      className="sn-glass sn-holo-border"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${themeVar('--sn-border')}`,
          fontWeight: 600,
          fontSize: 16,
          color: themeVar('--sn-text'),
          flexShrink: 0,
        }}
      >
        Messages
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: 20, textAlign: 'center', color: themeVar('--sn-text-muted') }}>
            Loading...
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div
            data-testid="empty-conversations"
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: themeVar('--sn-text-muted'),
              fontSize: 14,
            }}
          >
            No conversations yet.
          </div>
        )}

        {conversations.map((convo) => {
          const isActive = convo.otherUserId === activeUserId;
          return (
            <Link
              key={convo.otherUserId}
              to={`/messages/${convo.otherUserId}`}
              data-testid="conversation-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                textDecoration: 'none',
                color: 'inherit',
                background: isActive
                  ? themeVar('--sn-surface-raised')
                  : 'transparent',
                borderLeft: isActive
                  ? `3px solid var(--sn-accent, #6366f1)`
                  : '3px solid transparent',
                transition: 'background 0.1s',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: convo.otherUserAvatarUrl
                    ? `url(${convo.otherUserAvatarUrl}) center/cover no-repeat`
                    : 'var(--sn-accent, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {!convo.otherUserAvatarUrl && convo.otherUserDisplayName.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 8,
                  }}
                >
                  <div
                    data-testid="convo-name"
                    style={{
                      fontWeight: convo.unreadCount > 0 ? 700 : 500,
                      fontSize: 13,
                      color: themeVar('--sn-text'),
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {convo.otherUserDisplayName}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: themeVar('--sn-text-muted'),
                      flexShrink: 0,
                    }}
                  >
                    {relativeTime(convo.lastMessage.createdAt)}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div
                    data-testid="convo-preview"
                    style={{
                      fontSize: 12,
                      color: themeVar('--sn-text-muted'),
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: convo.unreadCount > 0 ? 600 : 400,
                    }}
                  >
                    {convo.lastMessage.content}
                  </div>
                  {convo.unreadCount > 0 && (
                    <div
                      data-testid="unread-badge"
                      style={{
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        background: 'var(--sn-accent, #6366f1)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 5px',
                        flexShrink: 0,
                      }}
                    >
                      {convo.unreadCount > 99 ? '99+' : convo.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
