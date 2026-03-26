/**
 * MessagingPage tests
 * @vitest-environment happy-dom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before component imports
// ---------------------------------------------------------------------------

vi.mock('../../kernel/social-graph', () => ({
  getProfile: vi.fn(),
  getConversationList: vi.fn(),
  getConversation: vi.fn(),
  sendMessage: vi.fn(),
  markAsRead: vi.fn(),
  canMessage: vi.fn(),
  isBlocked: vi.fn(),
}));

vi.mock('../../kernel/bus', () => ({
  bus: {
    subscribe: vi.fn(() => () => {}),
    emit: vi.fn(),
  },
}));

vi.mock('../../kernel/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

import { getProfile, getConversationList, getConversation, markAsRead } from '../../kernel/social-graph';
import type { Mock } from 'vitest';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';

import { MessagingPage } from './MessagingPage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: 'user-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
  tier: 'free' as const,
};

/**
 * Render MessagingPage at a given path.
 * Uses MemoryRouter with Routes so useParams works correctly.
 */
function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/messages" element={<MessagingPage />} />
        <Route path="/messages/:userId" element={<MessagingPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MessagingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUser(MOCK_USER);
    useAuthStore.getState().setInitialized();

    // Default: empty conversation list
    (getConversationList as Mock).mockResolvedValue({ success: true, data: [] });

    // Default: profile fetch resolves with a name
    (getProfile as Mock).mockResolvedValue({
      success: true,
      data: { displayName: 'Bob', userId: 'user-2' },
    });

    // Default: conversation fetch resolves with empty message list
    (getConversation as Mock).mockResolvedValue({
      success: true,
      data: { items: [], hasMore: false, nextCursor: undefined },
    });

    // markAsRead is a fire-and-forget call — resolve silently
    (markAsRead as Mock).mockResolvedValue({ success: true });
  });

  describe('layout', () => {
    it('renders the messaging page container', () => {
      renderPage('/messages');
      expect(screen.getByTestId('page-messaging')).toBeTruthy();
    });

    it('renders the conversation list panel', () => {
      renderPage('/messages');
      expect(screen.getByTestId('conversation-list')).toBeTruthy();
    });
  });

  describe('no userId param — inbox view', () => {
    it('shows "Select a conversation" prompt when no userId param', () => {
      renderPage('/messages');
      expect(screen.getByTestId('no-conversation-selected')).toBeTruthy();
    });

    it('shows correct prompt text when no userId param', () => {
      renderPage('/messages');
      expect(
        screen.getByText('Select a conversation to start messaging'),
      ).toBeTruthy();
    });

    it('does not show MessageThread when no userId param', () => {
      renderPage('/messages');
      // The message thread has a header with the other user's name;
      // without a userId we should not see message-thread
      expect(screen.queryByTestId('message-thread')).toBeNull();
    });
  });

  describe('with userId param — thread view', () => {
    it('shows message thread when userId param is present', async () => {
      renderPage('/messages/user-2');
      // The no-conversation-selected placeholder should not be visible
      expect(screen.queryByTestId('no-conversation-selected')).toBeNull();
    });

    it('does not show select-conversation prompt when userId param is present', () => {
      renderPage('/messages/user-2');
      expect(screen.queryByTestId('no-conversation-selected')).toBeNull();
    });

    it('fetches profile for the active user id', async () => {
      renderPage('/messages/user-2');
      await waitFor(() => {
        expect(getProfile).toHaveBeenCalledWith('user-2');
      });
    });

    it('shows "Loading..." in thread header while profile is being fetched', () => {
      // Return a never-resolving promise so we stay in loading state
      (getProfile as Mock).mockReturnValue(new Promise(() => {}));
      renderPage('/messages/user-2');
      // MessagingPage passes otherUserDisplayName || 'Loading...' to MessageThread header
      const threadHeader = screen.getByTestId('thread-header');
      expect(threadHeader.textContent).toBe('Loading...');
    });

    it('shows resolved display name after profile loads', async () => {
      (getProfile as Mock).mockResolvedValue({
        success: true,
        data: { displayName: 'Charlie', userId: 'user-3' },
      });
      renderPage('/messages/user-3');
      await waitFor(() => {
        expect(screen.getByText('Charlie')).toBeTruthy();
      });
    });

    it('falls back to "User" when profile fetch fails', async () => {
      (getProfile as Mock).mockResolvedValue({ success: false });
      renderPage('/messages/user-2');
      await waitFor(() => {
        expect(screen.getByText('User')).toBeTruthy();
      });
    });
  });
});
