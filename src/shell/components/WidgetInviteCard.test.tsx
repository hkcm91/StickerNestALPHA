/**
 * WidgetInviteCard — Tests
 * @module shell/components
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock bus
vi.mock('../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

// Mock social-graph
vi.mock('../../kernel/social-graph', () => ({
  acceptWidgetInvite: vi.fn(() => Promise.resolve({ success: true })),
  declineWidgetInvite: vi.fn(() => Promise.resolve({ success: true })),
}));

// Mock auth store
vi.mock('../../kernel/stores/auth/auth.store', () => ({
  useAuthStore: vi.fn((selector: (s: unknown) => unknown) => {
    const state = { user: { id: 'user-1' } };
    return selector(state);
  }),
}));

// Mock CanvasPickerDialog
vi.mock('./CanvasPickerDialog', () => ({
  CanvasPickerDialog: ({ onSelect, onClose }: { onSelect: (id: string) => void; onClose: () => void }) => (
    <div data-testid="canvas-picker">
      <button data-testid="pick-canvas" onClick={() => onSelect('canvas-1')}>Pick</button>
      <button data-testid="close-picker" onClick={onClose}>Close</button>
    </div>
  ),
}));

import type { WidgetInvite } from '@sn/types';

import { WidgetInviteCard } from './WidgetInviteCard';

const createInvite = (overrides: Partial<WidgetInvite> = {}): WidgetInvite => ({
  id: 'invite-1',
  senderId: 'sender-1',
  recipientId: 'user-1',
  mode: 'share',
  status: 'pending',
  isBroadcast: false,
  widgetId: 'widget-clock',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('WidgetInviteCard', () => {
  const defaultProps = {
    invite: createInvite(),
    senderName: 'Alice',
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<WidgetInviteCard {...defaultProps} />);
    expect(screen.getByTestId('widget-invite-card')).toBeTruthy();
  });

  it('displays sender name', () => {
    render(<WidgetInviteCard {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('displays widget ID', () => {
    render(<WidgetInviteCard {...defaultProps} />);
    expect(screen.getByText('widget-clock')).toBeTruthy();
  });

  it('displays correct mode badge for share mode', () => {
    render(<WidgetInviteCard {...defaultProps} />);
    expect(screen.getByText('Widget Share')).toBeTruthy();
  });

  it('displays correct mode badge for pipeline mode', () => {
    render(<WidgetInviteCard {...defaultProps} invite={createInvite({ mode: 'pipeline' })} />);
    expect(screen.getByText('Pipeline Connection')).toBeTruthy();
  });

  it('displays Broadcast label when isBroadcast is true', () => {
    render(<WidgetInviteCard {...defaultProps} invite={createInvite({ isBroadcast: true })} />);
    expect(screen.getByText('Broadcast')).toBeTruthy();
  });

  it('renders accept and decline buttons', () => {
    render(<WidgetInviteCard {...defaultProps} />);
    expect(screen.getByTestId('invite-accept-btn')).toBeTruthy();
    expect(screen.getByTestId('invite-decline-btn')).toBeTruthy();
  });

  it('shows canvas picker when Accept is clicked', () => {
    render(<WidgetInviteCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('invite-accept-btn'));
    expect(screen.getByTestId('canvas-picker')).toBeTruthy();
  });

  it('displays sender avatar initial when no avatar provided', () => {
    render(<WidgetInviteCard {...defaultProps} />);
    expect(screen.getByText('A')).toBeTruthy();
  });
});
