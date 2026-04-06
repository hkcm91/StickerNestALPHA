/**
 * Chat Panel — slide-out DM panel for direct messaging.
 *
 * @module shell/components
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  sendMessage,
  getConversation,
  markAsRead,
  canMessage,
  type DirectMessage,
} from '../../kernel/social-graph/messages';
import { useAuthStore } from '../../kernel/stores/auth';

export interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-set target user for the conversation (e.g., from profile page) */
  targetUserId?: string;
  targetUserName?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSend, setCanSend] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation when panel opens with a target user
  useEffect(() => {
    if (!isOpen || !targetUserId || !currentUser?.id) return;

    canMessage(currentUser.id, targetUserId).then((allowed) => {
      setCanSend(allowed);
    });

    getConversation(targetUserId, currentUser.id).then((result) => {
      if (result.success && result.data) {
        setMessages(result.data.items);
      }
      markAsRead(targetUserId, currentUser.id);
    });
  }, [isOpen, targetUserId, currentUser?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !targetUserId || !currentUser?.id || sending) return;

    setSending(true);
    setError(null);
    try {
      const result = await sendMessage(targetUserId, input.trim(), currentUser.id);
      if (result.success) {
        setMessages((prev) => [...prev, result.data]);
      } else {
        setError(result.error.message);
      }
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [input, targetUserId, currentUser?.id, sending]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div
      data-testid="chat-panel"
      className="sn-glass-heavy sn-neo sn-holo-border"
      style={{
        position: 'fixed',
        top: 48,
        right: 16,
        width: 360,
        maxHeight: 'calc(100vh - 64px)',
        display: isOpen ? 'flex' : 'none',
        flexDirection: 'column',
        zIndex: 9000,
        fontFamily: 'var(--sn-font-family, system-ui)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          {targetUserName ?? 'Messages'}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: 'var(--sn-text-muted, #7A7784)',
          }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          minHeight: 200,
          maxHeight: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {!targetUserId && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--sn-text-muted, #7A7784)',
              fontSize: 13,
              padding: 20,
            }}
          >
            Select a user to start a conversation.
          </div>
        )}
        {targetUserId && messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--sn-text-muted, #7A7784)',
              fontSize: 13,
              padding: 20,
            }}
          >
            No messages yet. Say hello!
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUser?.id;
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isOwn ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: 12,
                background: isOwn
                  ? 'var(--sn-accent, #6366f1)'
                  : 'var(--sn-bg, #f3f4f6)',
                color: isOwn ? '#fff' : 'var(--sn-text, #E8E6ED)',
                fontSize: 13,
                lineHeight: 1.4,
                wordBreak: 'break-word',
              }}
            >
              {msg.content}
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.7,
                  marginTop: 4,
                  textAlign: 'right',
                }}
              >
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '4px 12px',
            fontSize: 12,
            color: '#dc2626',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {/* Input */}
      {targetUserId && (
        <div
          style={{
            padding: 12,
            borderTop: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            data-testid="chat-input"
            type="text"
            placeholder={canSend ? 'Type a message...' : 'Cannot message this user'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!canSend || sending}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
              borderRadius: 'var(--sn-radius, 8px)',
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              background: 'var(--sn-bg, rgba(10,10,14,0.5))',
              color: 'var(--sn-text, #E8E6ED)',
            }}
          />
          <button
            data-testid="chat-send"
            onClick={handleSend}
            disabled={!canSend || sending || !input.trim()}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 'var(--sn-radius, 8px)',
              background: 'var(--sn-accent, #6366f1)',
              color: '#fff',
              cursor: canSend && !sending && input.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              fontSize: 13,
              opacity: canSend && !sending && input.trim() ? 1 : 0.5,
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
};
