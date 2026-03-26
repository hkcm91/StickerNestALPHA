/**
 * MessageBubble tests
 * @vitest-environment happy-dom
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { MessageBubble } from './MessageBubble';
import type { DirectMessage } from '../../kernel/social-graph';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(overrides: Partial<DirectMessage> = {}): DirectMessage {
  return {
    id: 'msg-1',
    senderId: 'user-1',
    recipientId: 'user-2',
    content: 'Hello, world!',
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderBubble(message: DirectMessage, isSent: boolean) {
  return render(<MessageBubble message={message} isSent={isSent} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MessageBubble', () => {
  describe('content rendering', () => {
    it('renders message content', () => {
      const message = makeMessage({ content: 'Hello, world!' });
      renderBubble(message, false);
      expect(screen.getByText('Hello, world!')).toBeTruthy();
    });

    it('renders multi-line message content', () => {
      const message = makeMessage({ content: 'Line one\nLine two' });
      renderBubble(message, false);
      expect(screen.getByText((_, el) => el?.textContent === 'Line one\nLine two')).toBeTruthy();
    });
  });

  describe('sent vs received alignment', () => {
    it('sent messages have data-sent="true"', () => {
      const message = makeMessage();
      renderBubble(message, true);
      const bubble = screen.getByTestId('message-bubble');
      expect(bubble.getAttribute('data-sent')).toBe('true');
    });

    it('received messages have data-sent="false"', () => {
      const message = makeMessage();
      renderBubble(message, false);
      const bubble = screen.getByTestId('message-bubble');
      expect(bubble.getAttribute('data-sent')).toBe('false');
    });
  });

  describe('read indicator', () => {
    it('shows read indicator (double check) for sent and read messages', () => {
      const message = makeMessage({ isRead: true });
      renderBubble(message, true);
      expect(screen.getByTestId('read-indicator')).toBeTruthy();
    });

    it('does not show read indicator for sent but unread messages', () => {
      const message = makeMessage({ isRead: false });
      renderBubble(message, true);
      expect(screen.queryByTestId('read-indicator')).toBeNull();
    });

    it('does not show read indicator for received messages even if isRead is true', () => {
      const message = makeMessage({ isRead: true });
      renderBubble(message, false);
      expect(screen.queryByTestId('read-indicator')).toBeNull();
    });

    it('does not show read indicator for received unread messages', () => {
      const message = makeMessage({ isRead: false });
      renderBubble(message, false);
      expect(screen.queryByTestId('read-indicator')).toBeNull();
    });
  });

  describe('timestamp', () => {
    it('shows timestamp element', () => {
      const message = makeMessage({ createdAt: new Date().toISOString() });
      renderBubble(message, false);
      expect(screen.getByTestId('message-time')).toBeTruthy();
    });

    it('timestamp element is not empty', () => {
      const message = makeMessage({ createdAt: new Date().toISOString() });
      renderBubble(message, false);
      const timeEl = screen.getByTestId('message-time');
      // Should contain at least some text (the formatted time)
      expect(timeEl.textContent!.trim().length).toBeGreaterThan(0);
    });

    it('shows "Yesterday" for messages from yesterday', () => {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString();
      const message = makeMessage({ createdAt: yesterday });
      renderBubble(message, false);
      const timeEl = screen.getByTestId('message-time');
      expect(timeEl.textContent).toContain('Yesterday');
    });
  });
});
