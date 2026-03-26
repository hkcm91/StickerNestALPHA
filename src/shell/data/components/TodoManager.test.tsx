/**
 * TodoManager component tests.
 *
 * @vitest-environment happy-dom
 * @module shell/data
 * @layer L6
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../../../kernel/stores/auth/auth.store';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

import { TodoManager } from './TodoManager';

// Build a chainable Supabase query mock that is also thenable.
// Every method returns the chain itself, and `.then` resolves with the result.
function mockChain(resolveValue: any) {
  const chain: any = {};
  const methods = ['from', 'select', 'insert', 'update', 'delete', 'eq', 'order'];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  // Make chain thenable so `await supabase.from(...).select(...).eq(...).order(...).order(...)` works
  chain.then = (resolve: any, reject?: any) => Promise.resolve(resolveValue).then(resolve, reject);
  return chain;
}

const supabaseChain = mockChain({ data: [], error: null });

vi.mock('../../../kernel/supabase', () => ({
  supabase: {
    from: vi.fn(() => supabaseChain),
  },
}));

const MOCK_USER = { id: 'user-1', email: 'a@b.com', displayName: 'Test', avatarUrl: null, tier: 'free' as const };

describe('TodoManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUser(MOCK_USER);
    useAuthStore.getState().setInitialized();
    // Reset addToast spy
    useUIStore.getState().addToast = vi.fn();
  });

  it('renders the header and add todo button', async () => {
    render(<TodoManager />);
    await waitFor(() => {
      expect(screen.getByText('My Todos')).toBeTruthy();
      expect(screen.getByText('+ Add Todo')).toBeTruthy();
    });
  });

  it('renders filter buttons (all, active, completed)', async () => {
    render(<TodoManager />);
    await waitFor(() => {
      expect(screen.getByText(/^All/)).toBeTruthy();
      expect(screen.getByText(/^Active/)).toBeTruthy();
      expect(screen.getByText(/^Completed/)).toBeTruthy();
    });
  });

  it('shows empty state when there are no todos', async () => {
    render(<TodoManager />);
    await waitFor(() => {
      expect(screen.getByText(/No todos yet/)).toBeTruthy();
    });
  });

  it('shows the form when Add Todo is clicked', async () => {
    render(<TodoManager />);
    await waitFor(() => screen.getByText('+ Add Todo'));
    fireEvent.click(screen.getByText('+ Add Todo'));
    expect(screen.getByPlaceholderText('What needs to be done?')).toBeTruthy();
    expect(screen.getByText('Add Todo')).toBeTruthy();
  });

  it('displays stats with active and completed counts', async () => {
    render(<TodoManager />);
    await waitFor(() => {
      expect(screen.getByText('0 active, 0 completed')).toBeTruthy();
    });
  });
});
