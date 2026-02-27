/**
 * DataManagerPage tests
 * @vitest-environment happy-dom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataManagerPage } from './DataManagerPage';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import * as datasource from '../../kernel/datasource';

// Mock the kernel datasource module
vi.mock('../../kernel/datasource', () => ({
  listDataSources: vi.fn(),
  createDataSource: vi.fn(),
  getTableSchema: vi.fn(),
  getTableRows: vi.fn(),
  queryTableRows: vi.fn(),
  addColumn: vi.fn(),
  updateColumn: vi.fn(),
  removeColumn: vi.fn(),
  addRow: vi.fn(),
  updateRow: vi.fn(),
  deleteRow: vi.fn(),
  addRows: vi.fn(),
  applyTemplate: vi.fn(),
  createDatabaseFromPrompt: vi.fn(),
  listNotionDatabases: vi.fn(),
  importNotionDatabase: vi.fn(),
}));

const MOCK_USER = { id: 'user-1', email: 'test@test.com', displayName: 'Test User', avatarUrl: null, tier: 'free' as const };

describe('DataManagerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUser(MOCK_USER);
    useAuthStore.getState().setInitialized();
    
    // Default mock implementation
    (datasource.listDataSources as any).mockResolvedValue({ success: true, data: [] });
  });

  it('renders DatabaseList by default', async () => {
    render(<DataManagerPage />);
    expect(screen.getByTestId('page-data')).toBeTruthy();
    expect(screen.getByTestId('database-list')).toBeTruthy();
    // The title 'Databases' is an H1
    expect(screen.getByRole('heading', { name: /Databases/i })).toBeTruthy();
  });

  it('shows empty state when no databases exist', async () => {
    render(<DataManagerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeTruthy();
      expect(screen.getByText(/No databases yet/i)).toBeTruthy();
    });
  });

  it('renders databases when they exist', async () => {
    const mockDb = {
      id: 'db-1',
      type: 'table',
      ownerId: 'user-1',
      scope: 'user',
      metadata: { name: 'My Database' },
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      revision: 1
    };
    (datasource.listDataSources as any).mockResolvedValue({ success: true, data: [mockDb] });

    render(<DataManagerPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('database-card-db-1')).toBeTruthy();
      expect(screen.getByText('My Database')).toBeTruthy();
    });
  });

  it('navigates to TableView when a database is selected', async () => {
    const mockDb = {
      id: 'db-1',
      type: 'table',
      ownerId: 'user-1',
      scope: 'user',
      metadata: { name: 'My Database' },
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      revision: 1
    };
    (datasource.listDataSources as any).mockResolvedValue({ success: true, data: [mockDb] });
    (datasource.getTableSchema as any).mockResolvedValue({ success: true, data: { columns: [], views: [] } });
    (datasource.getTableRows as any).mockResolvedValue({ success: true, data: [] });

    render(<DataManagerPage />);
    
    await waitFor(() => screen.getByTestId('database-card-db-1'));
    fireEvent.click(screen.getByTestId('database-card-db-1'));

    await waitFor(() => {
      expect(screen.getByTestId('table-view')).toBeTruthy();
      expect(screen.queryByTestId('database-list')).toBeNull();
    });
  });

  it('navigates back to list from table view', async () => {
    const mockDb = {
      id: 'db-1',
      type: 'table',
      ownerId: 'user-1',
      scope: 'user',
      metadata: { name: 'My Database' },
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      revision: 1
    };
    (datasource.listDataSources as any).mockResolvedValue({ success: true, data: [mockDb] });
    (datasource.getTableSchema as any).mockResolvedValue({ success: true, data: { columns: [], views: [] } });
    (datasource.getTableRows as any).mockResolvedValue({ success: true, data: [] });

    render(<DataManagerPage />);
    
    await waitFor(() => screen.getByTestId('database-card-db-1'));
    fireEvent.click(screen.getByTestId('database-card-db-1'));
    await waitFor(() => screen.getByTestId('table-view'));

    fireEvent.click(screen.getByTestId('btn-back'));

    await waitFor(() => {
      expect(screen.getByTestId('database-list')).toBeTruthy();
      expect(screen.queryByTestId('table-view')).toBeNull();
    });
  });
});
