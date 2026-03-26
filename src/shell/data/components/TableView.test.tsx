/**
 * TableView component tests.
 *
 * @vitest-environment happy-dom
 * @module shell/data
 * @layer L6
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

import { TableView } from './TableView';

vi.mock('../../../kernel/datasource', () => ({
  getTableSchema: vi.fn(),
  getTableRows: vi.fn(),
  queryTableRows: vi.fn(),
  addRow: vi.fn(),
  updateRow: vi.fn(),
  deleteRow: vi.fn(),
}));

import {
  getTableSchema,
  getTableRows,
  addRow,
} from '../../../kernel/datasource';

const MOCK_USER = { id: 'user-1', email: 'a@b.com', displayName: 'Test', avatarUrl: null, tier: 'free' as const };

const MOCK_SCHEMA = {
  columns: [
    { id: 'col-1', name: 'Name', type: 'text', order: 0 },
    { id: 'col-2', name: 'Age', type: 'number', order: 1 },
  ],
  views: [],
};

const MOCK_ROWS = [
  { id: 'row-1', cells: { 'col-1': 'Alice', 'col-2': 30 } },
  { id: 'row-2', cells: { 'col-1': 'Bob', 'col-2': 25 } },
];

function renderTableView(overrides = {}) {
  const props = {
    dataSourceId: 'ds-1',
    onBack: vi.fn(),
    onOpenAI: vi.fn(),
    onColumnEdit: vi.fn(),
    onAddColumn: vi.fn(),
    ...overrides,
  };
  return { ...render(<TableView {...props} />), props };
}

describe('TableView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUser(MOCK_USER);
    useAuthStore.getState().setInitialized();
    (getTableSchema as any).mockResolvedValue({ success: true, data: MOCK_SCHEMA });
    (getTableRows as any).mockResolvedValue({ success: true, data: MOCK_ROWS });
  });

  it('shows loading state then renders the table with data', async () => {
    renderTableView();
    expect(screen.getByTestId('table-loading')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId('table-view')).toBeTruthy();
      expect(screen.getByTestId('data-table')).toBeTruthy();
    });

    expect(screen.getByTestId('col-header-col-1')).toBeTruthy();
    expect(screen.getByTestId('col-header-col-2')).toBeTruthy();
    expect(screen.getByTestId('row-row-1')).toBeTruthy();
    expect(screen.getByTestId('row-row-2')).toBeTruthy();
  });

  it('calls onBack when back button is clicked', async () => {
    const { props } = renderTableView();
    await waitFor(() => screen.getByTestId('table-view'));

    fireEvent.click(screen.getByTestId('btn-back'));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenAI when AI Assistant button is clicked', async () => {
    const { props } = renderTableView();
    await waitFor(() => screen.getByTestId('table-view'));

    fireEvent.click(screen.getByTestId('btn-ai-assist'));
    expect(props.onOpenAI).toHaveBeenCalledTimes(1);
  });

  it('calls onColumnEdit when column edit button is clicked', async () => {
    const { props } = renderTableView();
    await waitFor(() => screen.getByTestId('table-view'));

    fireEvent.click(screen.getByTestId('col-edit-col-1'));
    expect(props.onColumnEdit).toHaveBeenCalledWith(MOCK_SCHEMA.columns[0]);
  });

  it('calls onAddColumn when add column button is clicked', async () => {
    const { props } = renderTableView();
    await waitFor(() => screen.getByTestId('table-view'));

    fireEvent.click(screen.getByTestId('btn-add-column'));
    expect(props.onAddColumn).toHaveBeenCalledTimes(1);
  });

  it('shows empty columns state when schema has no columns', async () => {
    (getTableSchema as any).mockResolvedValue({
      success: true,
      data: { columns: [], views: [] },
    });

    renderTableView();
    await waitFor(() => {
      expect(screen.getByTestId('empty-columns')).toBeTruthy();
    });
  });

  it('calls addRow when add row button is clicked', async () => {
    (addRow as any).mockResolvedValue({
      success: true,
      data: { id: 'row-3', cells: {} },
    });

    renderTableView();
    await waitFor(() => screen.getByTestId('table-view'));

    fireEvent.click(screen.getByTestId('btn-add-row'));
    await waitFor(() => {
      expect(addRow).toHaveBeenCalledWith('ds-1', {}, 'user-1');
    });
  });
});
