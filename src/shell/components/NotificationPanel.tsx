/**
 * Notification Panel — slide-out panel showing notifications and widget invites.
 *
 * Toggled from the nav bar bell icon. Subscribes to notification bus events
 * for real-time updates.
 *
 * @module shell/components
 * @layer L6
 */

import React, { useCallback, useEffect, useState } from 'react';

import type { BusEvent, Notification, WidgetInvite } from '@sn/types';
import { SocialGraphEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { palette, themeVar } from '../theme/theme-vars';

import { WidgetInviteCard } from './WidgetInviteCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InviteNotification {
  kind: 'invite';
  notification: Notification;
  invite: WidgetInvite;
}

interface SimpleNotification {
  kind: 'simple';
  notification: Notification;
}

type NotificationItem = InviteNotification | SimpleNotification;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function notificationLabel(n: Notification): string {
  switch (n.type) {
    case 'follow': return 'started following you';
    case 'follow_request': return 'requested to follow you';
    case 'mutual_follow': return 'You are now mutual follows!';
    case 'like': return 'liked your post';
    case 'comment': return 'commented on your post';
    case 'reply': return 'replied to your comment';
    case 'mention': return 'mentioned you';
    case 'repost': return 'reposted your post';
    case 'canvas_invite': return 'invited you to a canvas';
    case 'canvas_comment': return 'commented on your canvas';
    case 'widget_share': return 'shared a widget with you';
    case 'widget_connection_invite': return 'sent you a widget invite';
    case 'widget_broadcast': return 'broadcast a widget to you';
    default: return 'sent you a notification';
  }
}

function senderName(actorId: string): string {
  // In production this would come from a profile cache. For now, use IDs.
  const names: Record<string, string> = {
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d': 'Claude',
    '00c558e3-0e6a-476e-b9bf-c57ecd297659': 'Kimber',
  };
  return names[actorId] ?? actorId.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<NotificationItem[]>([]);

  // Listen for new notifications on the bus
  const handleNotification = useCallback((event: BusEvent) => {
    const payload = event.payload as { notification: Notification };
    const n = payload.notification;

    if (n.type === 'widget_connection_invite' || n.type === 'widget_broadcast') {
      // Build an invite item — we reconstruct the invite from the targetId
      // In production this would fetch the invite record. For now, use bus state.
      setItems((prev) => [
        {
          kind: 'invite',
          notification: n,
          invite: {
            id: n.targetId ?? n.id,
            senderId: n.actorId,
            recipientId: n.recipientId,
            mode: 'share',
            status: 'pending',
            isBroadcast: n.type === 'widget_broadcast',
            widgetId: 'unknown',
            createdAt: n.createdAt,
            updatedAt: n.createdAt,
          },
        },
        ...prev,
      ]);
    } else {
      setItems((prev) => [{ kind: 'simple', notification: n }, ...prev]);
    }
  }, []);

  // Also listen for invite-specific events with richer payload
  const handleInviteSent = useCallback((event: BusEvent) => {
    const payload = event.payload as { invite: WidgetInvite };
    const inv = payload.invite;
    setItems((prev) => {
      // Replace any placeholder invite notification with the real invite data
      const existing = prev.find(
        (i) => i.kind === 'invite' && i.invite.id === inv.id,
      );
      if (existing) {
        return prev.map((i) =>
          i.kind === 'invite' && i.invite.id === inv.id
            ? { ...i, invite: inv }
            : i,
        );
      }
      // Or add as new
      return [
        {
          kind: 'invite',
          notification: {
            id: `notif-${inv.id}`,
            recipientId: inv.recipientId,
            actorId: inv.senderId,
            type: inv.isBroadcast ? 'widget_broadcast' as const : 'widget_connection_invite' as const,
            targetType: 'widget_invite',
            targetId: inv.id,
            isRead: false,
            createdAt: inv.createdAt,
          },
          invite: inv,
        },
        ...prev,
      ];
    });
  }, []);

  useEffect(() => {
    const unsubs = [
      bus.subscribe(SocialGraphEvents.NOTIFICATION_CREATED, handleNotification),
      bus.subscribe(SocialGraphEvents.WIDGET_INVITE_SENT, handleInviteSent),
      bus.subscribe(SocialGraphEvents.WIDGET_BROADCAST_SENT, (event: BusEvent) => {
        // Broadcast events don't carry individual invites, just a count
        const p = event.payload as { broadcastId: string; senderId: string; widgetId: string; inviteCount: number };
        setItems((prev) => [
          {
            kind: 'simple',
            notification: {
              id: `broadcast-${p.broadcastId}`,
              recipientId: '',
              actorId: p.senderId,
              type: 'widget_broadcast',
              isRead: false,
              createdAt: new Date().toISOString(),
            },
          },
          ...prev,
        ]);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [handleNotification, handleInviteSent]);

  // Always mounted to capture events — just hide when closed
  return (
    <>
      {/* Backdrop — only when open */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 8000,
          }}
        />
      )}

      {/* Panel — always in DOM, visibility toggled */}
      <div
        data-testid="notification-panel"
        className="sn-glass-heavy sn-neo sn-holo-border"
        style={{
          position: 'fixed',
          top: 48,
          right: 16,
          width: 380,
          maxHeight: 'calc(100vh - 80px)',
          zIndex: 8001,
          display: isOpen ? 'flex' : 'none',
          flexDirection: 'column',
          fontFamily: themeVar('--sn-font-family'),
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '16px', color: palette.text }}>
            Notifications
          </span>
          <span style={{ fontSize: '12px', color: palette.textMuted }}>
            {items.filter((i) => i.kind === 'invite').length} invites
          </span>
        </div>

        {/* Items */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: palette.textMuted, fontSize: '14px' }}>
              No notifications yet.
            </div>
          ) : (
            items.map((item) => {
              if (item.kind === 'invite') {
                return (
                  <WidgetInviteCard
                    key={item.invite.id}
                    invite={item.invite}
                    senderName={senderName(item.invite.senderId)}
                    onDismiss={() =>
                      setItems((prev) =>
                        prev.filter((i) => !(i.kind === 'invite' && i.invite.id === item.invite.id)),
                      )
                    }
                  />
                );
              }
              return (
                <div
                  key={item.notification.id}
                  data-testid={`notif-${item.notification.type}`}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: item.notification.isRead ? 'transparent' : palette.surfaceGlassLight,
                    border: `1px solid ${palette.border}`,
                    fontSize: '13px',
                    color: palette.text,
                  }}
                >
                  <strong>{senderName(item.notification.actorId)}</strong>{' '}
                  {notificationLabel(item.notification)}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
