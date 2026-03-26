/**
 * DatabaseList component tests.
 *
 * @vitest-environment happy-dom
 * @module shell/data
 * @layer L6
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

import { DatabaseList } from './DatabaseList';

vi.mock('../../../kernel/datasource', () => ({
  listDataSources: vi.fn(),
}));

import { listDataSources } from '../../../kernel/datasource';

const MOCK_USER = { id: 'user-1', email: 'a@b.com', displayName: 'Test', avatarUrl: null, tier: 'free' as const };

const MOCK_DATASOURCES = [
  { id: 'ds-1', type: 'table', scope: 'user', metadata: { name: 'Tasks', description: 'My tasks' }, updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ds-2', type: 'doc', scope: 'shared', metadata: { name: 'Notes' }, updatedAt: '2025-02-01T00:00:00Z' },
];

function renderList(overrides = {}) {
  const props = {
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    onImportNotion: vi.fn(),
    onUseTemplate: vi.fn(),
    ...overrides,
  };
  return { ...render(<DatabaseList {...props} />), props };
}

describe('DatabaseList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUser(MOCK_USER);
    useAuthStore.getState().setInitialized();
    (listDataSources as any).mockResolvedValue({ success: true, data: MOCK_DATASOURCES });
  });

  it('renders title and action buttons', async () => {
    renderList();
    expect(screen.getByText('Databases')).toBeTruthy();
    expect(screen.getByTestId('btn-create-database')).toBeTruthy();
    expect(screen.getByTestId('btn-import-notion')).toBeTruthy();
    expect(screen.getByTestId('btn-use-template')).toBeTruthy();
  });

  it('displays database cards after loading', async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByTestId('database-card-ds-1')).toBeTruthy();
      expect(screen.getByTestId('database-card-ds-2')).toBeTruthy();
    });
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Notes')).toBeTruthy();
  });

  it('shows empty state when no databases exist', async () => {
    (listDataSources as any).mockResolvedValue({ success: true, data: [] });
    renderList();
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeTruthy();
      expect(screen.getByText(/No databases yet/)).toBeTruthy();
    });
  });

  it('calls onSelect when a database card is clicked', async () => {
    const { props } = renderList();
    await waitFor(() => screen.getByTestId('database-card-ds-1'));

    fireEvent.click(screen.getByTestId('database-card-ds-1'));
    expect(props.onSelect).toHaveBeenCalledWith(MOCK_DATASOURCES[0]);
  });

  it('calls onCreate, onImportNotion, onUseTemplate on button clicks', () => {
    const { props } = renderList();
    fireEvent.click(screen.getByTestId('btn-create-database'));
    expect(props.onCreate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('btn-import-notion'));
    expect(props.onImportNotion).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('btn-use-template'));
    expect(props.onUseTemplate).toHaveBeenCalledTimes(1);
  });

  it('filters databases by search text', async () => {
    renderList();
    await waitFor(() => screen.getByTestId('database-card-ds-1'));

    fireEvent.change(screen.getByTestId('search-databases'), { target: { value: 'Tasks' } });
    expect(screen.getByTestId('database-card-ds-1')).toBeTruthy();
    expect(screen.queryByTestId('database-card-ds-2')).toBeNull();
  });

  it('shows loading indicator initially', () => {
    renderList();
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });
});
