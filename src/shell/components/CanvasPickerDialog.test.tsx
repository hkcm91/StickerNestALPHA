/**
 * CanvasPickerDialog — Tests
 * @module shell/components
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock auth store
vi.mock('../../kernel/stores/auth/auth.store', () => ({
  useAuthStore: vi.fn((selector: (s: unknown) => unknown) => {
    const state = { user: { id: 'user-1' } };
    return selector(state);
  }),
}));

// Mock supabase
vi.mock('../../kernel/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: [
                { id: 'canvas-1', name: 'My Canvas' },
                { id: 'canvas-2', name: 'Other Canvas' },
              ],
            })),
          })),
        })),
      })),
    })),
  },
}));

// Mock Modal
vi.mock('./Modal', () => ({
  Modal: ({ isOpen, onClose, title, children }: {
    isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode;
  }) => isOpen ? (
    <div data-testid="mock-modal">
      <div data-testid="modal-title">{title}</div>
      <button data-testid="modal-close" onClick={onClose}>Close</button>
      {children}
    </div>
  ) : null,
}));

import { CanvasPickerDialog } from './CanvasPickerDialog';

describe('CanvasPickerDialog', () => {
  const defaultProps = {
    onSelect: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CanvasPickerDialog {...defaultProps} />);
    expect(screen.getByTestId('mock-modal')).toBeTruthy();
  });

  it('displays the dialog title', () => {
    render(<CanvasPickerDialog {...defaultProps} />);
    expect(screen.getByText('Choose a Canvas')).toBeTruthy();
  });

  it('shows loading text initially', () => {
    render(<CanvasPickerDialog {...defaultProps} />);
    expect(screen.getByText('Loading canvases...')).toBeTruthy();
  });

  it('calls onClose when modal close is triggered', () => {
    const onClose = vi.fn();
    render(<CanvasPickerDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
