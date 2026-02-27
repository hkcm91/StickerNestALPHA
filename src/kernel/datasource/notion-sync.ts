/**
 * Notion Database Sync Adapter
 *
 * Imports Notion database schemas and data into local table DataSources.
 * Uses the existing Notion integration proxy (no credentials in this module).
 *
 * Flow:
 * 1. List accessible Notion databases via integration proxy
 * 2. User selects a database to import
 * 3. Map Notion property types → StickerNest column types
 * 4. Import rows as table rows
 * 5. Optionally set up sync config for future re-imports
 *
 * @module kernel/datasource/notion-sync
 */

import { DataManagerEvents } from '@sn/types';
import type {
  TableColumn,
  TableRow,
  TableSchema,
  CellValue,
  NotionColor,
  NotionRichText,
  NotionDatabase,
  NotionDatabaseProperty,
  NotionPage,
  NotionPropertyValue,
  NotionSyncConfig,
} from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import type { DataSourceResult, DataSourceError } from './datasource';

// =============================================================================
// Types
// =============================================================================

export interface NotionImportResult {
  dataSourceId: string;
  schema: TableSchema;
  rowCount: number;
  syncConfig: NotionSyncConfig;
}

export interface NotionDatabaseSummary {
  id: string;
  title: string;
  propertyCount: number;
  icon?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function fail(code: DataSourceError['code'], message: string): DataSourceResult<never> {
  return { success: false, error: { code, message } };
}

/**
 * Call the Notion integration proxy via Supabase Edge Function.
 */
async function callNotionProxy<T>(params: Record<string, unknown>): Promise<DataSourceResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke('notion-proxy', {
      body: params,
    });

    if (error) {
      return fail('UNKNOWN', `Notion proxy error: ${error.message}`);
    }

    return { success: true, data: data as T };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown Notion proxy error';
    return fail('UNKNOWN', message);
  }
}

// =============================================================================
// Property Type Mapping
// =============================================================================

/**
 * Map a Notion property type to a StickerNest column type.
 */
function mapNotionPropertyType(notionType: string): TableColumn['type'] {
  switch (notionType) {
    case 'title':
    case 'rich_text':
      return 'text';
    case 'number':
      return 'number';
    case 'select':
      return 'select';
    case 'multi_select':
      return 'multi_select';
    case 'date':
    case 'created_time':
    case 'last_edited_time':
      return 'date';
    case 'checkbox':
      return 'checkbox';
    case 'url':
      return 'url';
    case 'email':
      return 'email';
    case 'phone_number':
      return 'phone';
    case 'relation':
      return 'relation';
    case 'formula':
      return 'formula';
    case 'status':
      return 'select';
    case 'people':
    case 'files':
    case 'rollup':
    default:
      return 'text'; // Fallback: render as text
  }
}

/**
 * Convert a Notion database property definition to a TableColumn.
 */
function mapNotionProperty(
  name: string,
  prop: NotionDatabaseProperty,
  order: number,
): TableColumn {
  const column: TableColumn = {
    id: prop.id || crypto.randomUUID(),
    name,
    type: mapNotionPropertyType(prop.type),
    order,
  };

  // Map select/multi_select options
  type NotionOption = { id: string; name: string; color: NotionColor };

  if (prop.type === 'select' && prop.select?.options) {
    column.config = {
      selectOptions: prop.select.options.map((opt: NotionOption) => ({
        id: opt.id,
        name: opt.name,
        color: opt.color,
      })),
    };
  } else if (prop.type === 'multi_select' && prop.multi_select?.options) {
    column.config = {
      selectOptions: prop.multi_select.options.map((opt: NotionOption) => ({
        id: opt.id,
        name: opt.name,
        color: opt.color,
      })),
    };
  } else if (prop.type === 'status' && prop.status?.options) {
    column.config = {
      selectOptions: prop.status.options.map((opt: NotionOption) => ({
        id: opt.id,
        name: opt.name,
        color: opt.color,
      })),
    };
  } else if (prop.type === 'number' && prop.number?.format) {
    const format = prop.number.format;
    if (format === 'percent') column.config = { numberFormat: 'percent' };
    else if (format.includes('dollar') || format.includes('euro') || format.includes('pound')) {
      column.config = { numberFormat: 'currency' };
    }
  } else if (prop.type === 'formula' && prop.formula?.expression) {
    column.config = { formulaExpression: prop.formula.expression };
  }

  return column;
}

/**
 * Extract a cell value from a Notion property value.
 */
function extractCellValue(prop: NotionPropertyValue): CellValue {
  switch (prop.type) {
    case 'title':
      return prop.title.map((t: NotionRichText) => t.plain_text ?? t.text.content).join('');
    case 'rich_text':
      return prop.rich_text.map((t: NotionRichText) => t.plain_text ?? t.text.content).join('');
    case 'number':
      return prop.number;
    case 'select':
      return prop.select?.name ?? null;
    case 'multi_select':
      return prop.multi_select.map((s: { name: string }) => s.name);
    case 'date':
      return prop.date
        ? { start: prop.date.start, end: prop.date.end ?? undefined }
        : null;
    case 'checkbox':
      return prop.checkbox;
    case 'url':
      return prop.url;
    case 'email':
      return prop.email;
    case 'phone_number':
      return prop.phone_number;
    case 'status':
      return prop.status?.name ?? null;
    case 'relation':
      return prop.relation.map((r: { id: string }) => ({ id: r.id }));
    case 'formula': {
      const f = prop.formula;
      if (f.type === 'string') return f.string;
      if (f.type === 'number') return f.number;
      if (f.type === 'boolean') return f.boolean;
      if (f.type === 'date') return f.date?.start ?? null;
      return null;
    }
    case 'created_time':
      return prop.created_time;
    case 'last_edited_time':
      return prop.last_edited_time;
    case 'people':
      return prop.people.map((p: { id: string; name?: string }) => p.name ?? p.id).join(', ');
    case 'files':
      return prop.files.map((f: { name: string }) => f.name).join(', ');
    case 'rollup': {
      const r = prop.rollup;
      if (r.type === 'number') return r.number ?? null;
      if (r.type === 'date') return r.date?.start ?? null;
      return null;
    }
    default:
      return null;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * List Notion databases accessible to the user.
 */
export async function listNotionDatabases(
  callerId: string,
): Promise<DataSourceResult<NotionDatabaseSummary[]>> {
  const result = await callNotionProxy<{
    results: Array<{
      object: string;
      id: string;
      title: Array<{ plain_text?: string; text?: { content: string } }>;
      properties: Record<string, unknown>;
      icon?: { emoji?: string };
    }>;
  }>({
    type: 'databases.list',
    userId: callerId,
  });

  if (!result.success) return result;

  const databases: NotionDatabaseSummary[] = (result.data.results ?? [])
    .filter((r) => r.object === 'database')
    .map((db) => ({
      id: db.id,
      title: db.title?.[0]?.plain_text ?? db.title?.[0]?.text?.content ?? 'Untitled',
      propertyCount: Object.keys(db.properties ?? {}).length,
      icon: db.icon?.emoji,
    }));

  return { success: true, data: databases };
}

/**
 * Import a Notion database into a local table DataSource.
 * Creates a new DataSource with the mapped schema and imported rows.
 */
export async function importNotionDatabase(
  notionDatabaseId: string,
  callerId: string,
  scope: 'canvas' | 'user' | 'shared' | 'public' = 'user',
  canvasId?: string,
): Promise<DataSourceResult<NotionImportResult>> {
  bus.emit(DataManagerEvents.NOTION_SYNC_STARTED, { notionDatabaseId });

  // Step 1: Retrieve Notion database schema
  const dbResult = await callNotionProxy<NotionDatabase>({
    type: 'database.retrieve',
    database_id: notionDatabaseId,
    userId: callerId,
  });

  if (!dbResult.success) {
    bus.emit(DataManagerEvents.NOTION_SYNC_FAILED, {
      notionDatabaseId,
      error: dbResult.error.message,
    });
    return dbResult;
  }

  const notionDb = dbResult.data;

  // Step 2: Map Notion properties to TableColumns
  const columnMapping: Record<string, string> = {};
  const columns: TableColumn[] = [];
  let order = 0;

  for (const [propName, prop] of Object.entries(notionDb.properties)) {
    const column = mapNotionProperty(propName, prop, order);
    columns.push(column);
    columnMapping[column.id] = propName;
    order++;
  }

  // Step 3: Query all rows from the Notion database
  let allPages: NotionPage[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const queryResult = await callNotionProxy<{
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    }>({
      type: 'database.query',
      database_id: notionDatabaseId,
      page_size: 100,
      start_cursor: startCursor,
      userId: callerId,
    });

    if (!queryResult.success) {
      bus.emit(DataManagerEvents.NOTION_SYNC_FAILED, {
        notionDatabaseId,
        error: queryResult.error.message,
      });
      return queryResult;
    }

    allPages = allPages.concat(queryResult.data.results);
    hasMore = queryResult.data.has_more;
    startCursor = queryResult.data.next_cursor ?? undefined;
  }

  // Step 4: Map Notion pages to table rows
  const now = new Date().toISOString();
  const rows: TableRow[] = allPages.map((page) => {
    const cells: Record<string, CellValue> = {};

    for (const col of columns) {
      const notionPropName = columnMapping[col.id];
      const propValue = page.properties[notionPropName];
      if (propValue) {
        cells[col.id] = extractCellValue(propValue);
      }
    }

    return {
      id: page.id,
      cells,
      createdAt: page.created_time ?? now,
      updatedAt: page.last_edited_time ?? now,
    };
  });

  // Step 5: Build TableSchema and content
  const dbTitle = notionDb.title?.[0]?.plain_text ?? notionDb.title?.[0]?.text?.content ?? 'Imported Database';
  const primaryColumnId = columns.find((c) =>
    notionDb.properties[columnMapping[c.id]]?.type === 'title',
  )?.id ?? columns[0]?.id;

  const tableSchema: TableSchema = {
    columns,
    views: [
      {
        id: crypto.randomUUID(),
        name: 'All',
        type: 'table',
        visibleColumns: columns.map((c) => c.id),
      },
    ],
    primaryColumnId,
  };

  const syncConfig: NotionSyncConfig = {
    notionDatabaseId,
    columnMapping,
    lastSyncedAt: now,
    syncDirection: 'import',
    status: 'synced',
  };

  // Step 6: Create the DataSource
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (supabase.from('data_sources') as any)
    .insert({
      type: 'table',
      owner_id: callerId,
      scope,
      canvas_id: canvasId ?? null,
      schema: tableSchema,
      content: { rows },
      metadata: {
        name: dbTitle,
        description: `Imported from Notion: ${dbTitle}`,
        icon: notionDb.icon?.emoji ?? undefined,
        custom: { notionSync: syncConfig },
      },
      revision: 0,
    })
    .select('id')
    .single()) as { data: { id: string } | null; error: { message: string } | null };

  if (error || !data) {
    bus.emit(DataManagerEvents.NOTION_SYNC_FAILED, {
      notionDatabaseId,
      error: error?.message ?? 'Failed to create DataSource.',
    });
    return fail('UNKNOWN', error?.message ?? 'Failed to create DataSource.');
  }

  bus.emit(DataManagerEvents.NOTION_SYNC_COMPLETED, {
    notionDatabaseId,
    dataSourceId: data.id,
    rowCount: rows.length,
    columnCount: columns.length,
  });

  return {
    success: true,
    data: {
      dataSourceId: data.id,
      schema: tableSchema,
      rowCount: rows.length,
      syncConfig,
    },
  };
}

/**
 * Re-sync an existing DataSource from its linked Notion database.
 * Merges new/updated rows, preserving local-only changes.
 */
export async function resyncNotionDatabase(
  dataSourceId: string,
  callerId: string,
): Promise<DataSourceResult<{ added: number; updated: number }>> {
  // Read existing DataSource metadata to get sync config
  const { data: ds, error: dsError } = (await supabase
    .from('data_sources')
    .select('metadata, schema, content, revision')
    .eq('id', dataSourceId)
    .single()) as {
    data: {
      metadata: Record<string, unknown>;
      schema: Record<string, unknown>;
      content: Record<string, unknown>;
      revision: number;
    } | null;
    error: { message: string } | null;
  };

  if (dsError || !ds) {
    return fail('NOT_FOUND', 'DataSource not found.');
  }

  const syncConfig = (ds.metadata as Record<string, unknown>)?.custom as
    | Record<string, unknown>
    | undefined;
  const notionSync = syncConfig?.notionSync as NotionSyncConfig | undefined;

  if (!notionSync?.notionDatabaseId) {
    return fail('VALIDATION_ERROR', 'This DataSource is not linked to a Notion database.');
  }

  bus.emit(DataManagerEvents.NOTION_SYNC_STARTED, {
    notionDatabaseId: notionSync.notionDatabaseId,
    dataSourceId,
  });

  // Query Notion for current rows
  const queryResult = await callNotionProxy<{
    results: NotionPage[];
    has_more: boolean;
  }>({
    type: 'database.query',
    database_id: notionSync.notionDatabaseId,
    page_size: 100,
    userId: callerId,
  });

  if (!queryResult.success) {
    bus.emit(DataManagerEvents.NOTION_SYNC_FAILED, {
      notionDatabaseId: notionSync.notionDatabaseId,
      error: queryResult.error.message,
    });
    return queryResult;
  }

  // Parse existing content
  const existingContent = ds.content as { rows?: TableRow[] } | null;
  const existingRows = existingContent?.rows ?? [];
  const existingRowMap = new Map(existingRows.map((r) => [r.id, r]));
  const schema = ds.schema as { columns?: TableColumn[] } | null;
  const columns = schema?.columns ?? [];

  let added = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const page of queryResult.data.results) {
    const cells: Record<string, CellValue> = {};
    for (const col of columns) {
      const notionPropName = notionSync.columnMapping[col.id];
      const propValue = page.properties[notionPropName];
      if (propValue) {
        cells[col.id] = extractCellValue(propValue);
      }
    }

    if (existingRowMap.has(page.id)) {
      // Update existing row
      const existing = existingRowMap.get(page.id)!;
      existing.cells = cells;
      existing.updatedAt = now;
      updated++;
    } else {
      // Add new row
      existingRows.push({
        id: page.id,
        cells,
        createdAt: page.created_time ?? now,
        updatedAt: now,
      });
      added++;
    }
  }

  // Save updated content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = (await (supabase.from('data_sources') as any)
    .update({
      content: { rows: existingRows },
      revision: ds.revision + 1,
      updated_at: now,
      metadata: {
        ...ds.metadata,
        custom: {
          ...(ds.metadata as Record<string, unknown>)?.custom as Record<string, unknown>,
          notionSync: {
            ...notionSync,
            lastSyncedAt: now,
            status: 'synced',
          },
        },
      },
    })
    .eq('id', dataSourceId)) as { error: { message: string } | null };

  if (updateError) {
    bus.emit(DataManagerEvents.NOTION_SYNC_FAILED, {
      notionDatabaseId: notionSync.notionDatabaseId,
      error: updateError.message,
    });
    return fail('UNKNOWN', updateError.message);
  }

  bus.emit(DataManagerEvents.NOTION_SYNC_COMPLETED, {
    notionDatabaseId: notionSync.notionDatabaseId,
    dataSourceId,
    added,
    updated,
  });

  return { success: true, data: { added, updated } };
}
