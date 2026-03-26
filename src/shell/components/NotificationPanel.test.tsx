/**
 * NotificationPanel — Tests
 * @module shell/components
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the bus
const mockSubscribe = vi.fn(() => vi.fn());
vi.mock('../../kernel/bus', () => ({
  bus: {
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
    emit: vi.fn(),
  },
}));

// Mock WidgetInviteCard since it has complex dependencies
vi.mock('./WidgetInviteCard', () => ({
  WidgetInviteCard: ({ invite, senderName }: { invite: { id: string }; senderName: string }) => (
    <div data-testid={`invite-card-${invite.id}`}>{senderName}</div>
  ),
}));

import { NotificationPanel } from './NotificationPanel';

describe('NotificationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when closed', () => {
    render(<NotificationPanel isOpen={false} onClose={vi.fn()} />);
    const panel = screen.getByTestId('notification-panel');
    expect(panel).toBeTruthy();
    expect(panel.style.display).toBe('none');
  });

  it('renders visible panel when open', () => {
    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);
    const panel = screen.getByTestId('notification-panel');
    expect(panel.style.display).toBe('flex');
  });

  it('displays Notifications header', () => {
    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('shows empty state when no notifications', () => {
    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('No notifications yet.')).toBeTruthy();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<NotificationPanel isOpen={true} onClose={onClose} />);
    // The backdrop is the first div with position:fixed that is not the panel
    const backdrop = container.querySelector('div[style*="rgba(0, 0, 0"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('subscribes to bus events on mount', () => {
    render(<NotificationPanel isOpen={false} onClose={vi.fn()} />);
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('adds notification when bus event fires', () => {
    let notifHandler: ((event: unknown) => void) | undefined;
    mockSubscribe.mockImplementation((eventType: string, handler: (event: unknown) => void) => {
      if (eventType === 'social-graph.notification.created') {
        notifHandler = handler;
      }
      return vi.fn();
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    if (notifHandler) {
      act(() => {
        notifHandler!({
          type: 'social-graph.notification.created',
          payload: {
            notification: {
              id: 'notif-1',
              recipientId: 'user-1',
              actorId: 'user-2',
              type: 'follow',
              isRead: false,
              createdAt: new Date().toISOString(),
            },
          },
        });
      });
      expect(screen.getByText(/started following you/)).toBeTruthy();
    }
  });
});
