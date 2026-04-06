/**
 * SendWidgetDialog — Tests
 * @module shell/components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock bus
vi.mock('../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

// Mock social-graph
vi.mock('../../kernel/social-graph', () => ({
  sendWidgetInvite: vi.fn(() =>
    Promise.resolve({ success: true, data: { id: 'invite-1' } }),
  ),
  getFollowing: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        items: [
          {
            userId: 'user-alice',
            displayName: 'Alice',
            username: 'alice',
            visibility: 'public',
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            isVerified: false,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
          {
            userId: 'user-bob',
            displayName: 'Bob',
            username: 'bob',
            visibility: 'public',
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            isVerified: false,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        ],
        nextCursor: undefined,
        hasMore: false,
      },
    }),
  ),
  searchProfiles: vi.fn(() =>
    Promise.resolve({ success: true, data: [] }),
  ),
}));

// Mock auth store
vi.mock('../../kernel/stores/auth/auth.store', () => ({
  useAuthStore: vi.fn((selector: (s: unknown) => unknown) => {
    const state = { user: { id: 'user-1' } };
    return selector(state);
  }),
}));

// Mock canvas store
vi.mock('../../kernel/stores/canvas/canvas.store', () => ({
  useCanvasStore: vi.fn((selector: (s: unknown) => unknown) => {
    const state = { activeCanvasId: 'canvas-1' };
    return selector(state);
  }),
}));

// Mock widget store
vi.mock('../../kernel/stores/widget/widget.store', () => ({
  useWidgetStore: vi.fn((selector: (s: unknown) => unknown) => {
    const state = {
      registry: {
        'test-widget': {
          widgetId: 'test-widget',
          manifest: { name: 'Test Widget', permissions: [] },
          htmlContent: '<div>test</div>',
        },
      },
    };
    return selector(state);
  }),
}));

// Mock Modal
vi.mock('./Modal', () => ({
  Modal: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="modal">
      <div data-testid="modal-title">{title}</div>
      {children}
    </div>
  ),
}));

import { bus } from '../../kernel/bus';
import { sendWidgetInvite, getFollowing } from '../../kernel/social-graph';

import { SendWidgetDialog } from './SendWidgetDialog';

const mockEmit = bus.emit as ReturnType<typeof vi.fn>;
const mockSendWidgetInvite = sendWidgetInvite as ReturnType<typeof vi.fn>;
const mockGetFollowing = getFollowing as ReturnType<typeof vi.fn>;

describe('SendWidgetDialog', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with search input and modal title', async () => {
    render(<SendWidgetDialog widgetId="test-widget" onClose={onClose} />);

    expect(screen.getByTestId('modal-title').textContent).toContain('Send Widget');
    expect(screen.getByTestId('send-widget-search')).toBeTruthy();
  });

  it('loads following list on mount', async () => {
    render(<SendWidgetDialog widgetId="test-widget" onClose={onClose} />);

    await waitFor(() => {
      expect(mockGetFollowing).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-row-user-alice')).toBeTruthy();
      expect(screen.getByTestId('user-row-user-bob')).toBeTruthy();
    });
  });

  it('sends invite when Send button clicked', async () => {
    render(<SendWidgetDialog widgetId="test-widget" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('send-to-user-alice')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('send-to-user-alice'));

    await waitFor(() => {
      expect(mockSendWidgetInvite).toHaveBeenCalledWith(
        'user-alice',
        expect.objectContaining({ widgetId: 'test-widget', mode: 'share' }),
        'user-1',
      );
    });
  });

  it('shows success state after sending', async () => {
    render(<SendWidgetDialog widgetId="test-widget" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('send-to-user-alice')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('send-to-user-alice'));

    await waitFor(() => {
      expect(screen.getByTestId('send-widget-done-btn')).toBeTruthy();
    });
  });

  it('emits bus event on successful send', async () => {
    render(<SendWidgetDialog widgetId="test-widget" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('send-to-user-alice')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('send-to-user-alice'));

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith('shell.widgetInvite.sent', {
        widgetId: 'test-widget',
        recipientId: 'user-alice',
        recipientName: 'Alice',
      });
    });
  });

  it('shows error state when invite fails', async () => {
    mockSendWidgetInvite.mockResolvedValueOnce({
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Mutual follows required.' },
    });

    // Set import.meta.env.DEV to false for this test
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = false;

    render(<SendWidgetDialog widgetId="test-widget" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('send-to-user-alice')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('send-to-user-alice'));

    await waitFor(() => {
      expect(screen.getByTestId('send-widget-retry-btn')).toBeTruthy();
    });

    import.meta.env.DEV = originalDev;
  });
});
