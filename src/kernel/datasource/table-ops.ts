/**
 * Table Operations Service
 *
 * Provides column, row, and view CRUD for table-type DataSources.
 * Operates on the DataSource `schema` (columns, views) and `content` (rows) fields.
 *
 * @module kernel/datasource/table-ops
 */

import {
  DataManagerEvents,
  KernelEvents,
  TableSchemaSchema,
  TableContentSchema,
} from '@sn/types';
import type {
  TableColumn,
  TableRow,
  TableSchema,
  TableContent,
  DatabaseView,
  CellValue,
  FilterRule,
  SortRule,
} from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import { getEffectiveRole, canWrite } from './acl';
import type { DataSourceResult, DataSourceError } from './datasource';

// =============================================================================
// Internal Helpers
// =============================================================================

type QueryResult<T> = { data: T | null; error: { message: string } | null };

interface RawDataSource {
  id: string;
  type: string;
  owner_id: string;
  schema: Record<string, unknown> | null;
  content: Record<string, unknown> | null;
  revision: number;
}

function fail(code: DataSourceError['code'], message: string): DataSourceResult<never> {
  return { success: false, error: { code, message } };
}

/**
 * Fetch a table DataSource with schema and content.
 */
async function fetchTable(
  dataSourceId: string,
  callerId: string,
): Promise<DataSourceResult<RawDataSource>> {
  const role = await getEffectiveRole(dataSourceId, callerId);
  if (!role) {
    return fail('PERMISSION_DENIED', 'No access to this DataSource.');
  }

  const { data, error } = (await supabase
    .from('data_sources')
    .select('id, type, owner_id, schema, content, revision')
    .eq('id', dataSourceId)
    .single()) as QueryResult<RawDataSource>;

  if (error || !data) {
    return fail('NOT_FOUND', 'DataSource not found.');
  }

  if (data.type !== 'table' && data.type !== 'custom') {
    return fail('VALIDATION_ERROR', `Table operations require type 'table' or 'custom', got '${data.type}'.`);
  }

  return { success: true, data };
}

/**
 * Parse the schema field into a typed TableSchema.
 */
function parseSchema(raw: Record<string, unknown> | null): TableSchema {
  const parsed = TableSchemaSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { columns: [], views: [] };
}

/**
 * Parse the content field into typed TableContent.
 */
function parseContent(raw: Record<string, unknown> | null): TableContent {
  const parsed = TableContentSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { rows: [] };
}

/**
 * Save schema and/or content back to the DataSource. Increments revision.
 */
async function saveTable(
  dataSourceId: string,
  updates: { schema?: TableSchema; content?: TableContent },
  currentRevision: number,
): Promise<DataSourceResult<{ revision: number }>> {
  const updateObj: Record<string, unknown> = {
    revision: currentRevision + 1,
    updated_at: new Date().toISOString(),
  };
  if (updates.schema) updateObj.schema = updates.schema;
  if (updates.content) updateObj.content = updates.content;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (supabase.from('data_sources') as any)
    .update(updateObj)
    .eq('id', dataSourceId)
    .select('revision')
    .single()) as QueryResult<{ revision: number }>;

  if (error || !data) {
    return fail('UNKNOWN', error?.message ?? 'Failed to save table.');
  }

  return { success: true, data: { revision: data.revision } };
}

// =============================================================================
// Read Operations (no write permission needed)
// =============================================================================

/**
 * Get the full table schema (columns + views) for a DataSource.
 */
export async function getTableSchema(
  dataSourceId: string,
  callerId: string,
): Promise<DataSourceResult<TableSchema>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  return { success: true, data: parseSchema(result.data.schema) };
}

/**
 * Get all rows from a table DataSource.
 */
export async function getTableRows(
  dataSourceId: string,
  callerId: string,
): Promise<DataSourceResult<TableRow[]>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const content = parseContent(result.data.content);
  return { success: true, data: content.rows };
}

/**
 * Get rows with client-side filter and sort applied.
 */
export async function queryTableRows(
  dataSourceId: string,
  callerId: string,
  options?: { filters?: FilterRule[]; sorts?: SortRule[]; limit?: number; offset?: number },
): Promise<DataSourceResult<{ rows: TableRow[]; total: number }>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const content = parseContent(result.data.content);
  let rows = [...content.rows];

  // Apply filters
  if (options?.filters?.length) {
    rows = applyFilters(rows, options.filters);
  }

  const total = rows.length;

  // Apply sorts
  if (options?.sorts?.length) {
    rows = applySorts(rows, options.sorts);
  }

  // Apply pagination
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? rows.length;
  rows = rows.slice(offset, offset + limit);

  return { success: true, data: { rows, total } };
}

// =============================================================================
// Column Operations
// =============================================================================

/**
 * Add a new column to a table DataSource.
 */
export async function addColumn(
  dataSourceId: string,
  column: TableColumn,
  callerId: string,
): Promise<DataSourceResult<TableSchema>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const role = await getEffectiveRole(dataSourceId, callerId);
  if (!role || !canWrite(role)) {
    return fail('PERMISSION_DENIED', 'Write access required to add columns.');
  }

  const schema = parseSchema(result.data.schema);

  // Check for duplicate column ID
  if (schema.columns.some((c: TableColumn) => c.id === column.id)) {
    return fail('VALIDATION_ERROR', `Column with ID '${column.id}' already exists.`);
  }

  schema.columns.push(column);

  const saveResult = await saveTable(dataSourceId, { schema }, result.data.revision);
  if (!saveResult.success) return saveResult;

  bus.emit(DataManagerEvents.COLUMN_ADDED, { dataSourceId, column });
  bus.emit(KernelEvents.DATASOURCE_UPDATED, { dataSourceId });

  return { success: true, data: schema };
}

/**
 * Update an existing column definition.
 */
export async function updateColumn(
  dataSourceId: string,
  columnId: string,
  updates: Partial<Pick<TableColumn, 'name' | 'type' | 'config'>>,
  callerId: string,
): Promise<DataSourceResult<TableSchema>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const role = await getEffectiveRole(dataSourceId, callerId);
  if (!role || !canWrite(role)) {
    return fail('PERMISSION_DENIED', 'Write access required to update columns.');
  }

  const schema = parseSchema(result.data.schema);
  const colIndex = schema.columns.findIndex((c: TableColumn) => c.id === columnId);
  if (colIndex === -1) {
    return fail('NOT_FOUND', `Column '${columnId}' not found.`);
  }

  const col = schema.columns[colIndex];
  if (updates.name !== undefined) col.name = updates.name;
  if (updates.type !== undefined) col.type = updates.type;
  if (updates.config !== undefined) col.config = updates.config;

  const saveResult = await saveTable(dataSourceId, { schema }, result.data.revision);
  if (!saveResult.success) return saveResult;

  bus.emit(DataManagerEvents.COLUMN_UPDATED, { dataSourceId, columnId, updates });

  return { success: true, data: schema };
}

/**
 * Remove a column from a table DataSource.
 * Also removes corresponding cell data from all rows.
 */
export async function removeColumn(
  dataSourceId: string,
  columnId: string,
  callerId: string,
): Promise<DataSourceResult<TableSchema>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const role = await getEffectiveRole(dataSourceId, callerId);
  if (!role || !canWrite(role)) {
    return fail('PERMISSION_DENIED', 'Write access required to remove columns.');
  }

  const schema = parseSchema(result.data.schema);
  const colIndex = schema.columns.findIndex((c: TableColumn) => c.id === columnId);
  if (colIndex === -1) {
    return fail('NOT_FOUND', `Column '${columnId}' not found.`);
  }

  schema.columns.splice(colIndex, 1);

  // Clean up row data for the removed column
  const content = parseContent(result.data.content);
  for (const row of content.rows) {
    delete row.cells[columnId];
  }

  const saveResult = await saveTable(dataSourceId, { schema, content }, result.data.revision);
  if (!saveResult.success) return saveResult;

  bus.emit(DataManagerEvents.COLUMN_REMOVED, { dataSourceId, columnId });

  return { success: true, data: schema };
}

/**
 * Reorder columns by providing the full ordered list of column IDs.
 */
export async function reorderColumns(
  dataSourceId: string,
  columnIds: string[],
  callerId: string,
): Promise<DataSourceResult<TableSchema>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const role = await getEffectiveRole(dataSourceId, callerId);
  if (!role || !canWrite(role)) {
    return fail('PERMISSION_DENIED', 'Write access required to reorder columns.');
  }

  const schema = parseSchema(result.data.schema);
  const colMap = new Map<string, TableColumn>(schema.columns.map((c: TableColumn) => [c.id, c]));

  const reordered: TableColumn[] = [];
  for (let i = 0; i < columnIds.length; i++) {
    const col = colMap.get(columnIds[i]);
    if (!col) {
      return fail('VALIDATION_ERROR', `Column '${columnIds[i]}' not found.`);
    }
    col.order = i;
    reordered.push(col);
  }

  schema.columns = reordered;

  const saveResult = await saveTable(dataSourceId, { schema }, result.data.revision);
  if (!saveResult.success) return saveResult;

  bus.emit(DataManagerEvents.COLUMN_REORDERED, { dataSourceId, columnIds });

  return { success: true, data: schema };
}

// =============================================================================
// Row Operations
// =============================================================================

/**
 * Add a new row to a table DataSource.
 */
export async function addRow(
  dataSourceId: string,
  cells: Record<string, CellValue>,
  callerId: string,
): Promise<DataSourceResult<TableRow>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const role = await getEffectiveRole(dataSourceId, callerId);
  if (!role || !canWrite(role)) {
    return fail('PERMISSION_DENIED', 'Write access required to add rows.');
  }

  const content = parseContent(result.data.content);
  const schema = parseSchema(result.data.schema);
  const now = new Date().toISOString();

  // Apply default values for columns not provided
  const fullCells: Record<string, CellValue> = {};
  for (const col of schema.columns) {
    if (cells[col.id] !== undefined) {
      fullCells[col.id] = cells[col.id];
    } else if (col.config?.defaultValue !== undefined) {
      fullCells[col.id] = col.config.defaultValue as CellValue;
    }
  }

  const row: TableRow = {
    id: crypto.randomUUID(),
    cells: fullCells,
    createdAt: now,
    updatedAt: now,
  };

  content.rows.push(row);

  const saveResult = await saveTable(dataSourceId, { content }, result.data.revision);
  if (!saveResult.success) return saveResult;

  bus.emit(DataManagerEvents.ROW_ADDED, { dataSourceId, row });

  return { success: true, data: row };
}

/**
 * Update cell values in an existing row.
 */
export async function updateRow(
  dataSourceId: string,
  rowId: string,
  cells: Record<string, CellValue>,
  callerId: string,
): Promise<DataSourceResult<TableRow>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const role = await getEffectiveRole(dataSourceId, callerId);
  if (!role || !canWrite(role)) {
    return fail('PERMISSION_DENIED', 'Write access required to update rows.');
  }

  const content = parseContent(result.data.content);
  const rowIndex = content.rows.findIndex((r: TableRow) => r.id === rowId);
  if (rowIndex === -1) {
    return fail('NOT_FOUND', `Row '${rowId}' not found.`);
  }

  const row = content.rows[rowIndex];
  Object.assign(row.cells, cells);
  row.updatedAt = new Date().toISOString();

  const saveResult = await saveTable(dataSourceId, { content }, result.data.revision);
  if (!saveResult.success) return saveResult;

  bus.emit(DataManagerEvents.ROW_UPDATED, { dataSourceId, rowId, cells });

  return { success: true, data: row };
}

/**
 * Delete a row from a table DataSource.
 */
export async function deleteRow(
  dataSourceId: string,
  rowId: string,
  callerId: string,
): Promise<DataSourceResult<{ id: string }>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const role = await getEffectiveRole(dataSourceId, callerId);
  if (!role || !canWrite(role)) {
    return fail('PERMISSION_DENIED', 'Write access required to delete rows.');
  }

  const content = parseContent(result.data.content);
  const rowIndex = content.rows.findIndex((r: TableRow) => r.id === rowId);
  if (rowIndex === -1) {
    return fail('NOT_FOUND', `Row '${rowId}' not found.`);
  }

  content.rows.splice(rowIndex, 1);

  const saveResult = await saveTable(dataSourceId, { content }, result.data.revision);
  if (!saveResult.success) return saveResult;

  bus.emit(DataManagerEvents.ROW_DELETED, { dataSourceId, rowId });

  return { success: true, data: { id: rowId } };
}

/**
 * Batch-add multiple rows.
 */
export async function addRows(
  dataSourceId: string,
  rowsData: Array<Record<string, CellValue>>,
  callerId: string,
): Promise<DataSourceResult<TableRow[]>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const role = await getEffectiveRole(dataSourceId, callerId);
  if (!role || !canWrite(role)) {
    return fail('PERMISSION_DENIED', 'Write access required to add rows.');
  }

  const content = parseContent(result.data.content);
  const now = new Date().toISOString();

  const newRows: TableRow[] = rowsData.map((cells) => ({
    id: crypto.randomUUID(),
    cells,
    createdAt: now,
    updatedAt: now,
  }));

  content.rows.push(...newRows);

  const saveResult = await saveTable(dataSourceId, { content }, result.data.revision);
  if (!saveResult.success) return saveResult;

  bus.emit(DataManagerEvents.ROWS_BATCH_ADDED, {
    dataSourceId,
    count: newRows.length,
  });

  return { success: true, data: newRows };
}

// =============================================================================
// View Operations
// =============================================================================

/**
 * Create a saved view for a table DataSource.
 */
export async function createView(
  dataSourceId: string,
  view: DatabaseView,
  callerId: string,
): Promise<DataSourceResult<DatabaseView>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const role = await getEffectiveRole(dataSourceId, callerId);
  if (!role || !canWrite(role)) {
    return fail('PERMISSION_DENIED', 'Write access required to create views.');
  }

  const schema = parseSchema(result.data.schema);
  if (!schema.views) schema.views = [];

  if (schema.views.some((v: DatabaseView) => v.id === view.id)) {
    return fail('VALIDATION_ERROR', `View with ID '${view.id}' already exists.`);
  }

  schema.views.push(view);

  const saveResult = await saveTable(dataSourceId, { schema }, result.data.revision);
  if (!saveResult.success) return saveResult;

  bus.emit(DataManagerEvents.VIEW_CREATED, { dataSourceId, view });

  return { success: true, data: view };
}

/**
 * Update a saved view.
 */
export async function updateView(
  dataSourceId: string,
  viewId: string,
  updates: Partial<Omit<DatabaseView, 'id'>>,
  callerId: string,
): Promise<DataSourceResult<DatabaseView>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const role = await getEffectiveRole(dataSourceId, callerId);
  if (!role || !canWrite(role)) {
    return fail('PERMISSION_DENIED', 'Write access required to update views.');
  }

  const schema = parseSchema(result.data.schema);
  const views = schema.views ?? [];
  const viewIndex = views.findIndex((v: DatabaseView) => v.id === viewId);
  if (viewIndex === -1) {
    return fail('NOT_FOUND', `View '${viewId}' not found.`);
  }

  Object.assign(views[viewIndex], updates);

  const saveResult = await saveTable(dataSourceId, { schema }, result.data.revision);
  if (!saveResult.success) return saveResult;

  bus.emit(DataManagerEvents.VIEW_UPDATED, { dataSourceId, viewId, updates });

  return { success: true, data: views[viewIndex] };
}

/**
 * Delete a saved view.
 */
export async function deleteView(
  dataSourceId: string,
  viewId: string,
  callerId: string,
): Promise<DataSourceResult<{ id: string }>> {
  const result = await fetchTable(dataSourceId, callerId);
  if (!result.success) return result;

  const role = await getEffectiveRole(dataSourceId, callerId);
  if (!role || !canWrite(role)) {
    return fail('PERMISSION_DENIED', 'Write access required to delete views.');
  }

  const schema = parseSchema(result.data.schema);
  const views = schema.views ?? [];
  const viewIndex = views.findIndex((v: DatabaseView) => v.id === viewId);
  if (viewIndex === -1) {
    return fail('NOT_FOUND', `View '${viewId}' not found.`);
  }

  views.splice(viewIndex, 1);

  const saveResult = await saveTable(dataSourceId, { schema }, result.data.revision);
  if (!saveResult.success) return saveResult;

  bus.emit(DataManagerEvents.VIEW_DELETED, { dataSourceId, viewId });

  return { success: true, data: { id: viewId } };
}

// =============================================================================
// Client-Side Filter & Sort
// =============================================================================

function applyFilters(rows: TableRow[], filters: FilterRule[]): TableRow[] {
  return rows.filter((row) =>
    filters.every((filter) => matchesFilter(row, filter)),
  );
}

function matchesFilter(row: TableRow, filter: FilterRule): boolean {
  const value = row.cells[filter.columnId];
  const target = filter.value;

  switch (filter.operator) {
    case 'is_empty':
      return value === null || value === undefined || value === '';
    case 'is_not_empty':
      return value !== null && value !== undefined && value !== '';
    case 'equals':
      return value === target;
    case 'not_equals':
      return value !== target;
    case 'contains':
      return typeof value === 'string' && typeof target === 'string'
        ? value.toLowerCase().includes(target.toLowerCase())
        : false;
    case 'not_contains':
      return typeof value === 'string' && typeof target === 'string'
        ? !value.toLowerCase().includes(target.toLowerCase())
        : true;
    case 'starts_with':
      return typeof value === 'string' && typeof target === 'string'
        ? value.toLowerCase().startsWith(target.toLowerCase())
        : false;
    case 'ends_with':
      return typeof value === 'string' && typeof target === 'string'
        ? value.toLowerCase().endsWith(target.toLowerCase())
        : false;
    case 'greater_than':
      return typeof value === 'number' && typeof target === 'number'
        ? value > target
        : false;
    case 'less_than':
      return typeof value === 'number' && typeof target === 'number'
        ? value < target
        : false;
    case 'greater_than_or_equal':
      return typeof value === 'number' && typeof target === 'number'
        ? value >= target
        : false;
    case 'less_than_or_equal':
      return typeof value === 'number' && typeof target === 'number'
        ? value <= target
        : false;
    case 'before':
      return typeof value === 'string' && typeof target === 'string'
        ? value < target
        : false;
    case 'after':
      return typeof value === 'string' && typeof target === 'string'
        ? value > target
        : false;
    case 'is_checked':
      return value === true;
    case 'is_not_checked':
      return value === false || value === null || value === undefined;
    default:
      return true;
  }
}

function applySorts(rows: TableRow[], sorts: SortRule[]): TableRow[] {
  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const aVal = a.cells[sort.columnId];
      const bVal = b.cells[sort.columnId];
      const cmp = compareValues(aVal, bVal);
      if (cmp !== 0) {
        return sort.direction === 'asc' ? cmp : -cmp;
      }
    }
    return 0;
  });
}

function compareValues(a: CellValue, b: CellValue): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b));
}
