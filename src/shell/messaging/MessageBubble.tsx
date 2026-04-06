/**
 * MessageBubble — renders a single message in a conversation thread.
 *
 * Sent messages are right-aligned with accent background.
 * Received messages are left-aligned with surface background.
 *
 * @module shell/messaging
 * @layer L6
 */

import React from 'react';

import type { DirectMessage } from '../../kernel/social-graph';
import { themeVar } from '../theme/theme-vars';

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) return time;
  if (diffDays === 1) return `Yesterday ${time}`;
  if (diffDays < 7) {
    return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`;
  }
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}

export interface MessageBubbleProps {
  message: DirectMessage;
  isSent: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSent }) => (
  <div
    data-testid="message-bubble"
    data-sent={isSent}
    style={{
      display: 'flex',
      justifyContent: isSent ? 'flex-end' : 'flex-start',
      padding: '2px 0',
    }}
  >
    <div
      className={isSent ? 'sn-neo' : 'sn-glass sn-neo'}
      style={{
        maxWidth: '70%',
        padding: '8px 12px',
        borderRadius: isSent ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        background: isSent
          ? 'var(--sn-accent, #6366f1)'
          : undefined,
        color: isSent ? '#fff' : themeVar('--sn-text'),
        fontSize: 14,
        lineHeight: 1.45,
        wordBreak: 'break-word',
      }}
    >
      <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
      <div
        data-testid="message-time"
        style={{
          fontSize: 10,
          marginTop: 4,
          opacity: 0.65,
          textAlign: 'right',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {formatTime(message.createdAt)}
        {isSent && message.isRead && (
          <span data-testid="read-indicator" title="Read" style={{ fontSize: 11 }}>
            &#10003;&#10003;
          </span>
        )}
      </div>
    </div>
  </div>
);
