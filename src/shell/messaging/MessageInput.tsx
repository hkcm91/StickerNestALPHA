/**
 * MessageInput — text input with send button for composing messages.
 *
 * Enter sends, Shift+Enter inserts newline. Character count shown near limit.
 *
 * @module shell/messaging
 * @layer L6
 */

import React, { useCallback, useRef, useState } from 'react';

import { themeVar } from '../theme/theme-vars';

const MAX_LENGTH = 2000;

export interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled = false }) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sending = disabled;

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_LENGTH || sending) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, onSend, sending]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-grow textarea
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`; // max ~3 lines
  }, []);

  const charCount = value.length;
  const showCount = charCount > MAX_LENGTH - 200;
  const overLimit = charCount > MAX_LENGTH;

  return (
    <div
      data-testid="message-input"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        padding: '12px 16px',
        borderTop: `1px solid ${themeVar('--sn-border')}`,
        background: themeVar('--sn-surface'),
      }}
    >
      <div style={{ flex: 1, position: 'relative' }}>
        <textarea
          ref={textareaRef}
          data-testid="message-textarea"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={sending}
          rows={1}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 'var(--sn-radius, 8px)',
            border: `1px solid ${themeVar('--sn-border')}`,
            background: themeVar('--sn-bg'),
            color: themeVar('--sn-text'),
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'none',
            outline: 'none',
            lineHeight: 1.4,
            boxSizing: 'border-box',
          }}
        />
        {showCount && (
          <div
            data-testid="char-count"
            style={{
              position: 'absolute',
              bottom: 4,
              right: 8,
              fontSize: 10,
              color: overLimit ? '#ef4444' : themeVar('--sn-text-muted'),
            }}
          >
            {charCount}/{MAX_LENGTH}
          </div>
        )}
      </div>
      <button
        data-testid="send-btn"
        onClick={handleSend}
        disabled={!value.trim() || overLimit || sending}
        style={{
          padding: '8px 20px',
          borderRadius: 'var(--sn-radius, 8px)',
          border: 'none',
          background: !value.trim() || overLimit || sending
            ? themeVar('--sn-surface-raised')
            : 'var(--sn-accent, #6366f1)',
          color: !value.trim() || overLimit || sending
            ? themeVar('--sn-text-muted')
            : '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: !value.trim() || overLimit || sending ? 'default' : 'pointer',
          fontFamily: 'inherit',
          transition: 'background 0.15s, color 0.15s',
          flexShrink: 0,
        }}
      >
        Send
      </button>
    </div>
  );
};
