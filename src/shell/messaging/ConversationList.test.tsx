/**
 * ConversationList tests
 * @vitest-environment happy-dom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before component imports
// ---------------------------------------------------------------------------

vi.mock('../../kernel/social-graph', () => ({
  getConversationList: vi.fn(),
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

import { getConversationList } from '../../kernel/social-graph';
import type { Mock } from 'vitest';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';

import { ConversationList } from './ConversationList';
import type { ConversationPreview } from '../../kernel/social-graph';

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

function makeConversation(overrides: Partial<ConversationPreview> = {}): ConversationPreview {
  return {
    otherUserId: 'user-2',
    otherUserDisplayName: 'Bob',
    otherUserAvatarUrl: null,
    lastMessage: {
      id: 'msg-1',
      senderId: 'user-2',
      recipientId: 'user-1',
      content: 'Hey there!',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    unreadCount: 0,
    ...overrides,
  };
}

function renderList(activeUserId?: string) {
  return render(
    <MemoryRouter>
      <ConversationList activeUserId={activeUserId} />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConversationList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUser(MOCK_USER);
    useAuthStore.getState().setInitialized();
  });

  describe('loading state', () => {
    it('shows loading indicator initially before conversations load', () => {
      // Return a promise that never resolves so we stay in loading state
      (getConversationList as Mock).mockReturnValue(new Promise(() => {}));
      renderList();
      expect(screen.getByText('Loading...')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no conversations exist', async () => {
      (getConversationList as Mock).mockResolvedValue({ success: true, data: [] });
      renderList();
      await waitFor(() => {
        expect(screen.getByTestId('empty-conversations')).toBeTruthy();
      });
    });

    it('shows "No conversations yet." message in empty state', async () => {
      (getConversationList as Mock).mockResolvedValue({ success: true, data: [] });
      renderList();
      await waitFor(() => {
        expect(screen.getByText('No conversations yet.')).toBeTruthy();
      });
    });

    it('does not show empty state while loading', () => {
      (getConversationList as Mock).mockReturnValue(new Promise(() => {}));
      renderList();
      expect(screen.queryByTestId('empty-conversations')).toBeNull();
    });
  });

  describe('conversation rows', () => {
    it('renders conversation rows when conversations exist', async () => {
      const convos = [
        makeConversation({ otherUserId: 'user-2', otherUserDisplayName: 'Bob' }),
        makeConversation({ otherUserId: 'user-3', otherUserDisplayName: 'Carol' }),
      ];
      (getConversationList as Mock).mockResolvedValue({ success: true, data: convos });
      renderList();
      await waitFor(() => {
        const rows = screen.getAllByTestId('conversation-row');
        expect(rows).toHaveLength(2);
      });
    });

    it('renders conversation partner names', async () => {
      const convos = [
        makeConversation({ otherUserId: 'user-2', otherUserDisplayName: 'Bob' }),
        makeConversation({ otherUserId: 'user-3', otherUserDisplayName: 'Carol' }),
      ];
      (getConversationList as Mock).mockResolvedValue({ success: true, data: convos });
      renderList();
      await waitFor(() => {
        const names = screen.getAllByTestId('convo-name');
        const nameTexts = names.map((n) => n.textContent);
        expect(nameTexts).toContain('Bob');
        expect(nameTexts).toContain('Carol');
      });
    });

    it('renders last message preview text', async () => {
      const convos = [
        makeConversation({
          otherUserId: 'user-2',
          lastMessage: {
            id: 'msg-1',
            senderId: 'user-2',
            recipientId: 'user-1',
            content: 'See you tomorrow!',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        }),
      ];
      (getConversationList as Mock).mockResolvedValue({ success: true, data: convos });
      renderList();
      await waitFor(() => {
        const previews = screen.getAllByTestId('convo-preview');
        expect(previews[0].textContent).toBe('See you tomorrow!');
      });
    });
  });

  describe('unread badge', () => {
    it('shows unread badge for conversations with unread messages', async () => {
      const convos = [makeConversation({ unreadCount: 3 })];
      (getConversationList as Mock).mockResolvedValue({ success: true, data: convos });
      renderList();
      await waitFor(() => {
        expect(screen.getByTestId('unread-badge')).toBeTruthy();
      });
    });

    it('unread badge shows the correct count', async () => {
      const convos = [makeConversation({ unreadCount: 5 })];
      (getConversationList as Mock).mockResolvedValue({ success: true, data: convos });
      renderList();
      await waitFor(() => {
        expect(screen.getByTestId('unread-badge').textContent).toBe('5');
      });
    });

    it('shows "99+" when unread count exceeds 99', async () => {
      const convos = [makeConversation({ unreadCount: 150 })];
      (getConversationList as Mock).mockResolvedValue({ success: true, data: convos });
      renderList();
      await waitFor(() => {
        expect(screen.getByTestId('unread-badge').textContent).toBe('99+');
      });
    });

    it('does not show unread badge when unreadCount is 0', async () => {
      const convos = [makeConversation({ unreadCount: 0 })];
      (getConversationList as Mock).mockResolvedValue({ success: true, data: convos });
      renderList();
      await waitFor(() => {
        expect(screen.queryByTestId('unread-badge')).toBeNull();
      });
    });
  });

  describe('active conversation highlighting', () => {
    it('active conversation row does not have a transparent border (it is highlighted)', async () => {
      const convos = [makeConversation({ otherUserId: 'user-2' })];
      (getConversationList as Mock).mockResolvedValue({ success: true, data: convos });
      renderList('user-2');
      await waitFor(() => {
        const rows = screen.getAllByTestId('conversation-row');
        const activeRow = rows[0];
        // Active row uses a colored border-left (not transparent like inactive rows)
        expect(activeRow.getAttribute('style')).not.toContain('3px solid transparent');
      });
    });

    it('non-active conversation row does not have accent border', async () => {
      const convos = [
        makeConversation({ otherUserId: 'user-2' }),
        makeConversation({ otherUserId: 'user-3' }),
      ];
      (getConversationList as Mock).mockResolvedValue({ success: true, data: convos });
      renderList('user-2');
      await waitFor(() => {
        const rows = screen.getAllByTestId('conversation-row');
        // Second row (user-3) should have transparent border
        expect(rows[1].getAttribute('style')).toContain('transparent');
      });
    });

    it('no conversation is highlighted when activeUserId is undefined', async () => {
      const convos = [makeConversation({ otherUserId: 'user-2' })];
      (getConversationList as Mock).mockResolvedValue({ success: true, data: convos });
      renderList(undefined);
      await waitFor(() => {
        const rows = screen.getAllByTestId('conversation-row');
        expect(rows[0].getAttribute('style')).toContain('transparent');
      });
    });
  });

  describe('header', () => {
    it('shows Messages header', async () => {
      (getConversationList as Mock).mockResolvedValue({ success: true, data: [] });
      renderList();
      expect(screen.getByText('Messages')).toBeTruthy();
    });
  });
});
