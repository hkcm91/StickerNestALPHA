/**
 * ToastContainer — Tests
 * @module shell/components
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRemoveToast = vi.fn();

vi.mock('../../kernel/stores/ui/ui.store', () => ({
  useUIStore: vi.fn((selector: (s: unknown) => unknown) => {
    const state = {
      toasts: [] as Array<{ id: string; message: string; type: string }>,
      removeToast: mockRemoveToast,
    };
    return selector(state);
  }),
}));

import { useUIStore } from '../../kernel/stores/ui/ui.store';

import { ToastContainer } from './ToastContainer';

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when no toasts', () => {
    render(<ToastContainer />);
    expect(screen.getByTestId('toast-container')).toBeTruthy();
  });

  it('renders toast messages', () => {
    vi.mocked(useUIStore).mockImplementation((selector: (s: unknown) => unknown) => {
      const state = {
        toasts: [
          { id: '1', message: 'File saved', type: 'success' },
          { id: '2', message: 'Connection lost', type: 'error' },
        ],
        removeToast: mockRemoveToast,
      };
      return selector(state);
    });
    render(<ToastContainer />);
    expect(screen.getByText('File saved')).toBeTruthy();
    expect(screen.getByText('Connection lost')).toBeTruthy();
  });

  it('renders toast with correct test id per type', () => {
    vi.mocked(useUIStore).mockImplementation((selector: (s: unknown) => unknown) => {
      const state = {
        toasts: [{ id: '1', message: 'Info toast', type: 'info' }],
        removeToast: mockRemoveToast,
      };
      return selector(state);
    });
    render(<ToastContainer />);
    expect(screen.getByTestId('toast-info')).toBeTruthy();
  });

  it('calls removeToast when dismiss button is clicked', () => {
    vi.mocked(useUIStore).mockImplementation((selector: (s: unknown) => unknown) => {
      const state = {
        toasts: [{ id: 'toast-1', message: 'Dismissable toast', type: 'warning' }],
        removeToast: mockRemoveToast,
      };
      return selector(state);
    });
    render(<ToastContainer />);
    // The dismiss button contains the multiplication sign character
    const dismissBtn = screen.getByTestId('toast-warning').querySelector('button');
    expect(dismissBtn).toBeTruthy();
    fireEvent.click(dismissBtn!);
    expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
  });

  it('renders multiple toasts simultaneously', () => {
    vi.mocked(useUIStore).mockImplementation((selector: (s: unknown) => unknown) => {
      const state = {
        toasts: [
          { id: '1', message: 'Toast A', type: 'info' },
          { id: '2', message: 'Toast B', type: 'success' },
          { id: '3', message: 'Toast C', type: 'error' },
        ],
        removeToast: mockRemoveToast,
      };
      return selector(state);
    });
    render(<ToastContainer />);
    expect(screen.getByText('Toast A')).toBeTruthy();
    expect(screen.getByText('Toast B')).toBeTruthy();
    expect(screen.getByText('Toast C')).toBeTruthy();
  });
});
