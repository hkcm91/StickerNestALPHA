/**
 * Table Operations — Unit Tests
 *
 * Tests column CRUD, row CRUD, view management,
 * and client-side filtering/sorting.
 *
 * @module kernel/datasource/table-ops.test
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock supabase before imports
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock bus before imports
vi.mock('../bus', () => ({
  bus: {
    emit: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// Mock acl before imports
vi.mock('./acl', () => ({
  getEffectiveRole: vi.fn(),
  canWrite: vi.fn(),
}));

import { DataManagerEvents } from '@sn/types';
import type { TableColumn, TableRow, TableSchema } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import { getEffectiveRole, canWrite } from './acl';
import {
  getTableSchema,
  getTableRows,
  addColumn,
  removeColumn,
  addRow,
  updateRow,
  deleteRow,
  queryTableRows,
  createView,
  deleteView,
} from './table-ops';

// =============================================================================
// Helpers
// =============================================================================

const TEST_DS_ID = '11111111-1111-4111-8111-111111111111';
const TEST_USER_ID = '22222222-2222-4222-8222-222222222222';

function mockTableDs(schema: TableSchema, rows: TableRow[] = []) {
  return {
    id: TEST_DS_ID,
    type: 'table',
    owner_id: TEST_USER_ID,
    schema,
    content: { rows },
    revision: 1,
  };
}

function mockSupabaseChain(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  (supabase.from as Mock).mockReturnValue(chain);
  return chain;
}

function setupWriteAccess() {
  (getEffectiveRole as Mock).mockResolvedValue('owner');
  (canWrite as Mock).mockReturnValue(true);
}

function setupReadAccess() {
  (getEffectiveRole as Mock).mockResolvedValue('viewer');
  (canWrite as Mock).mockReturnValue(false);
}

function setupNoAccess() {
  (getEffectiveRole as Mock).mockResolvedValue(null);
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTableSchema', () => {
  it('returns parsed schema for a table DataSource', async () => {
    const schema: TableSchema = {
      columns: [
        { id: 'col1', name: 'Title', type: 'text', order: 0 },
        { id: 'col2', name: 'Count', type: 'number', order: 1 },
      ],
    };
    setupWriteAccess();
    mockSupabaseChain(mockTableDs(schema));

    const result = await getTableSchema(TEST_DS_ID, TEST_USER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.columns).toHaveLength(2);
      expect(result.data.columns[0].name).toBe('Title');
    }
  });

  it('returns empty schema for DataSource with null schema', async () => {
    setupWriteAccess();
    mockSupabaseChain({ ...mockTableDs({ columns: [] }), schema: null });

    const result = await getTableSchema(TEST_DS_ID, TEST_USER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.columns).toHaveLength(0);
    }
  });

  it('rejects non-table DataSource types', async () => {
    setupWriteAccess();
    mockSupabaseChain({ ...mockTableDs({ columns: [] }), type: 'doc' });

    const result = await getTableSchema(TEST_DS_ID, TEST_USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects users without access', async () => {
    setupNoAccess();

    const result = await getTableSchema(TEST_DS_ID, TEST_USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PERMISSION_DENIED');
    }
  });
});

describe('getTableRows', () => {
  it('returns all rows from a table DataSource', async () => {
    const rows: TableRow[] = [
      { id: 'r1', cells: { col1: 'Hello' }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      { id: 'r2', cells: { col1: 'World' }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ];
    setupWriteAccess();
    mockSupabaseChain(mockTableDs({ columns: [] }, rows));

    const result = await getTableRows(TEST_DS_ID, TEST_USER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].cells.col1).toBe('Hello');
    }
  });
});

describe('addColumn', () => {
  it('adds a column and emits bus event', async () => {
    setupWriteAccess();
    const ds = mockTableDs({ columns: [] });
    const chain = mockSupabaseChain(ds);
    // Mock the save
    chain.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { revision: 2 }, error: null }),
        }),
      }),
    });

    const newCol: TableColumn = { id: 'col1', name: 'Title', type: 'text', order: 0 };
    const result = await addColumn(TEST_DS_ID, newCol, TEST_USER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.columns).toContainEqual(newCol);
    }
    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.COLUMN_ADDED,
      expect.objectContaining({ dataSourceId: TEST_DS_ID, column: newCol }),
    );
  });

  it('rejects duplicate column IDs', async () => {
    setupWriteAccess();
    const existingCol: TableColumn = { id: 'col1', name: 'Title', type: 'text', order: 0 };
    mockSupabaseChain(mockTableDs({ columns: [existingCol] }));

    const result = await addColumn(TEST_DS_ID, existingCol, TEST_USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects viewers from adding columns', async () => {
    setupReadAccess();
    mockSupabaseChain(mockTableDs({ columns: [] }));

    const result = await addColumn(
      TEST_DS_ID,
      { id: 'c1', name: 'X', type: 'text', order: 0 },
      TEST_USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PERMISSION_DENIED');
    }
  });
});

describe('removeColumn', () => {
  it('removes a column and cleans up row data', async () => {
    setupWriteAccess();
    const cols: TableColumn[] = [
      { id: 'col1', name: 'Title', type: 'text', order: 0 },
      { id: 'col2', name: 'Count', type: 'number', order: 1 },
    ];
    const rows: TableRow[] = [
      { id: 'r1', cells: { col1: 'A', col2: 10 }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ];
    const ds = mockTableDs({ columns: cols }, rows);
    const chain = mockSupabaseChain(ds);
    chain.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { revision: 2 }, error: null }),
        }),
      }),
    });

    const result = await removeColumn(TEST_DS_ID, 'col2', TEST_USER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.columns).toHaveLength(1);
      expect(result.data.columns[0].id).toBe('col1');
    }
    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.COLUMN_REMOVED,
      expect.objectContaining({ dataSourceId: TEST_DS_ID, columnId: 'col2' }),
    );
  });
});

describe('addRow', () => {
  it('adds a row with provided cell values', async () => {
    setupWriteAccess();
    const ds = mockTableDs(
      { columns: [{ id: 'col1', name: 'Title', type: 'text', order: 0 }] },
      [],
    );
    const chain = mockSupabaseChain(ds);
    chain.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { revision: 2 }, error: null }),
        }),
      }),
    });

    const result = await addRow(TEST_DS_ID, { col1: 'Hello' }, TEST_USER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cells.col1).toBe('Hello');
      expect(result.data.id).toBeDefined();
    }
    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.ROW_ADDED,
      expect.objectContaining({ dataSourceId: TEST_DS_ID }),
    );
  });
});

describe('updateRow', () => {
  it('updates specific cells in a row', async () => {
    setupWriteAccess();
    const rows: TableRow[] = [
      { id: 'r1', cells: { col1: 'Old' }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ];
    const ds = mockTableDs({ columns: [] }, rows);
    const chain = mockSupabaseChain(ds);
    chain.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { revision: 2 }, error: null }),
        }),
      }),
    });

    const result = await updateRow(TEST_DS_ID, 'r1', { col1: 'New' }, TEST_USER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cells.col1).toBe('New');
    }
    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.ROW_UPDATED,
      expect.objectContaining({ dataSourceId: TEST_DS_ID, rowId: 'r1' }),
    );
  });

  it('returns NOT_FOUND for missing rows', async () => {
    setupWriteAccess();
    mockSupabaseChain(mockTableDs({ columns: [] }, []));

    const result = await updateRow(TEST_DS_ID, 'missing', { col1: 'X' }, TEST_USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});

describe('deleteRow', () => {
  it('deletes a row and emits bus event', async () => {
    setupWriteAccess();
    const rows: TableRow[] = [
      { id: 'r1', cells: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      { id: 'r2', cells: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ];
    const ds = mockTableDs({ columns: [] }, rows);
    const chain = mockSupabaseChain(ds);
    chain.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { revision: 2 }, error: null }),
        }),
      }),
    });

    const result = await deleteRow(TEST_DS_ID, 'r1', TEST_USER_ID);

    expect(result.success).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.ROW_DELETED,
      expect.objectContaining({ dataSourceId: TEST_DS_ID, rowId: 'r1' }),
    );
  });
});

describe('queryTableRows (filter + sort)', () => {
  it('filters rows by equals operator', async () => {
    setupWriteAccess();
    const rows: TableRow[] = [
      { id: 'r1', cells: { status: 'open' }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      { id: 'r2', cells: { status: 'closed' }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      { id: 'r3', cells: { status: 'open' }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ];
    mockSupabaseChain(mockTableDs({ columns: [] }, rows));

    const result = await queryTableRows(TEST_DS_ID, TEST_USER_ID, {
      filters: [{ columnId: 'status', operator: 'equals', value: 'open' }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toHaveLength(2);
      expect(result.data.total).toBe(2);
    }
  });

  it('sorts rows ascending', async () => {
    setupWriteAccess();
    const rows: TableRow[] = [
      { id: 'r1', cells: { name: 'Charlie' }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      { id: 'r2', cells: { name: 'Alice' }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      { id: 'r3', cells: { name: 'Bob' }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ];
    mockSupabaseChain(mockTableDs({ columns: [] }, rows));

    const result = await queryTableRows(TEST_DS_ID, TEST_USER_ID, {
      sorts: [{ columnId: 'name', direction: 'asc' }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows.map((r) => r.cells.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    }
  });

  it('paginates results', async () => {
    setupWriteAccess();
    const rows: TableRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`,
      cells: { val: i },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }));
    mockSupabaseChain(mockTableDs({ columns: [] }, rows));

    const result = await queryTableRows(TEST_DS_ID, TEST_USER_ID, {
      limit: 3,
      offset: 2,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toHaveLength(3);
      expect(result.data.total).toBe(10);
      expect(result.data.rows[0].id).toBe('r2');
    }
  });

  it('filters with contains operator (case-insensitive)', async () => {
    setupWriteAccess();
    const rows: TableRow[] = [
      { id: 'r1', cells: { title: 'Hello World' }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      { id: 'r2', cells: { title: 'Goodbye' }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ];
    mockSupabaseChain(mockTableDs({ columns: [] }, rows));

    const result = await queryTableRows(TEST_DS_ID, TEST_USER_ID, {
      filters: [{ columnId: 'title', operator: 'contains', value: 'hello' }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.rows[0].id).toBe('r1');
    }
  });
});

describe('createView / deleteView', () => {
  it('creates a view and emits bus event', async () => {
    setupWriteAccess();
    const ds = mockTableDs({ columns: [], views: [] });
    const chain = mockSupabaseChain(ds);
    chain.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { revision: 2 }, error: null }),
        }),
      }),
    });

    const view = {
      id: 'v1',
      name: 'My View',
      type: 'table' as const,
      visibleColumns: ['col1'],
    };

    const result = await createView(TEST_DS_ID, view, TEST_USER_ID);

    expect(result.success).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.VIEW_CREATED,
      expect.objectContaining({ dataSourceId: TEST_DS_ID, view }),
    );
  });

  it('deletes a view', async () => {
    setupWriteAccess();
    const ds = mockTableDs({
      columns: [],
      views: [{ id: 'v1', name: 'Test', type: 'table' }],
    });
    const chain = mockSupabaseChain(ds);
    chain.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { revision: 2 }, error: null }),
        }),
      }),
    });

    const result = await deleteView(TEST_DS_ID, 'v1', TEST_USER_ID);

    expect(result.success).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.VIEW_DELETED,
      expect.objectContaining({ dataSourceId: TEST_DS_ID, viewId: 'v1' }),
    );
  });
});
