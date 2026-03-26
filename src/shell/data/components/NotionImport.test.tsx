/**
 * NotionImport component tests.
 *
 * @vitest-environment happy-dom
 * @module shell/data
 * @layer L6
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

import { NotionImport } from './NotionImport';

vi.mock('../../../kernel/datasource', () => ({
  listNotionDatabases: vi.fn(),
  importNotionDatabase: vi.fn(),
}));

import { listNotionDatabases, importNotionDatabase } from '../../../kernel/datasource';

const MOCK_USER = { id: 'user-1', email: 'a@b.com', displayName: 'Test', avatarUrl: null, tier: 'free' as const };

const MOCK_DBS = [
  { id: 'db-1', title: 'Tasks', icon: 'T', propertyCount: 5 },
  { id: 'db-2', title: 'Notes', icon: 'N', propertyCount: 3 },
];

describe('NotionImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUser(MOCK_USER);
    useAuthStore.getState().setInitialized();
    (listNotionDatabases as any).mockResolvedValue({ success: true, data: MOCK_DBS });
  });

  it('renders the modal with title', async () => {
    render(<NotionImport onImported={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('notion-import')).toBeTruthy();
    expect(screen.getByText('Import from Notion')).toBeTruthy();
  });

  it('shows loading state initially then displays databases', async () => {
    render(<NotionImport onImported={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('notion-loading')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId('notion-db-db-1')).toBeTruthy();
      expect(screen.getByTestId('notion-db-db-2')).toBeTruthy();
    });
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Notes')).toBeTruthy();
  });

  it('shows error when listNotionDatabases fails', async () => {
    (listNotionDatabases as any).mockResolvedValue({
      success: false,
      error: { message: 'Auth failed' },
    });

    render(<NotionImport onImported={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('notion-error')).toBeTruthy();
      expect(screen.getByText('Auth failed')).toBeTruthy();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<NotionImport onImported={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('btn-close-notion'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables import button when no database is selected', async () => {
    render(<NotionImport onImported={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('notion-db-db-1'));

    const importBtn = screen.getByTestId('btn-notion-import');
    expect(importBtn.hasAttribute('disabled')).toBe(true);
  });

  it('enables import button after selecting a database and calls onImported on success', async () => {
    const onImported = vi.fn();
    (importNotionDatabase as any).mockResolvedValue({
      success: true,
      data: { dataSourceId: 'ds-new' },
    });

    render(<NotionImport onImported={onImported} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId('notion-db-db-1'));

    fireEvent.click(screen.getByTestId('notion-db-db-1'));
    const importBtn = screen.getByTestId('btn-notion-import');
    expect(importBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(importBtn);
    await waitFor(() => {
      expect(onImported).toHaveBeenCalledWith('ds-new');
    });
  });
});
