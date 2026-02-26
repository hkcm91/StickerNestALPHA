/**
 * AI-Assisted Database Operations
 *
 * Routes all AI requests through the platform proxy — no API keys in this module.
 * Follows the same proxy pattern as Lab's AI generator.
 *
 * Features:
 * - Schema generation from natural language
 * - Cell autofill based on row context
 * - Column suggestions based on existing data
 * - Natural language → filter/sort queries
 * - Unstructured text → structured rows
 *
 * @module kernel/datasource/ai-service
 */

import {
  DataManagerEvents,
  AISchemaGenerateResponseSchema,
  AIAutofillResponseSchema,
  AISuggestColumnResponseSchema,
  AINaturalLanguageQueryResponseSchema,
  AIExtractDataResponseSchema,
} from '@sn/types';
import type {
  AISchemaGenerateResponse,
  AIAutofillResponse,
  AISuggestColumnResponse,
  AINaturalLanguageQueryResponse,
  AIExtractDataResponse,
  TableColumn,
  TableSchema,
  TableRow,
  CellValue,
} from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import type { DataSourceResult, DataSourceError } from './datasource';
import { getTableSchema, getTableRows } from './table-ops';

// =============================================================================
// Types
// =============================================================================

export interface AIServiceOptions {
  /** Override the proxy URL (defaults to env var) */
  proxyUrl?: string;
}

// =============================================================================
// Proxy Communication
// =============================================================================

function getProxyUrl(options?: AIServiceOptions): string | null {
  if (options?.proxyUrl) return options.proxyUrl;
  if (typeof import.meta !== 'undefined') {
    return (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AI_PROXY_URL ?? null;
  }
  return null;
}

function fail(code: DataSourceError['code'], message: string): DataSourceResult<never> {
  return { success: false, error: { code, message } };
}

/**
 * Send a request to the AI proxy.
 */
async function callProxy<T>(
  proxyUrl: string,
  request: {
    operation: string;
    schema?: TableSchema;
    rows?: TableRow[];
    prompt?: string;
    context?: string;
    text?: string;
    columnId?: string;
  },
  signal?: AbortSignal,
): Promise<DataSourceResult<T>> {
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'database-ai',
        ...request,
      }),
      signal,
    });

    if (!response.ok) {
      return fail('UNKNOWN', `AI proxy returned status ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data: data as T };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return fail('UNKNOWN', 'AI operation was cancelled.');
    }
    const message = err instanceof Error ? err.message : 'Unknown AI proxy error';
    return fail('UNKNOWN', `AI proxy error: ${message}`);
  }
}

// =============================================================================
// AI Operations
// =============================================================================

/**
 * Generate a database schema from natural language description.
 *
 * @example
 * ```ts
 * const result = await generateSchema({
 *   type: 'generate_schema',
 *   prompt: 'Create a bug tracker with priority, status, assignee, and due date',
 * });
 * ```
 */
export async function generateSchema(
  request: { prompt: string; context?: string },
  options?: AIServiceOptions,
): Promise<DataSourceResult<AISchemaGenerateResponse>> {
  const proxyUrl = getProxyUrl(options);
  if (!proxyUrl) {
    return fail('UNKNOWN', 'AI proxy is not configured. Set VITE_AI_PROXY_URL.');
  }

  bus.emit(DataManagerEvents.AI_OPERATION_STARTED, {
    operation: 'generate_schema',
    prompt: request.prompt,
  });

  const result = await callProxy<AISchemaGenerateResponse>(proxyUrl, {
    operation: 'generate_schema',
    prompt: request.prompt,
    context: request.context,
  });

  if (!result.success) {
    bus.emit(DataManagerEvents.AI_OPERATION_FAILED, {
      operation: 'generate_schema',
      error: result.error.message,
    });
    return result;
  }

  // Validate response shape
  const parsed = AISchemaGenerateResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    bus.emit(DataManagerEvents.AI_OPERATION_FAILED, {
      operation: 'generate_schema',
      error: 'Invalid AI response shape.',
    });
    return fail('VALIDATION_ERROR', 'AI returned an invalid schema response.');
  }

  bus.emit(DataManagerEvents.AI_OPERATION_COMPLETED, {
    operation: 'generate_schema',
    columnCount: parsed.data.columns.length,
  });

  return { success: true, data: parsed.data };
}

/**
 * Autofill empty cells in a column using AI analysis of existing row data.
 * AI looks at filled cells in the same column and other columns' values to infer patterns.
 */
export async function autofill(
  dataSourceId: string,
  columnId: string,
  callerId: string,
  rowIds?: string[],
  options?: AIServiceOptions,
): Promise<DataSourceResult<AIAutofillResponse>> {
  const proxyUrl = getProxyUrl(options);
  if (!proxyUrl) {
    return fail('UNKNOWN', 'AI proxy is not configured. Set VITE_AI_PROXY_URL.');
  }

  // Fetch schema and rows to provide context to AI
  const schemaResult = await getTableSchema(dataSourceId, callerId);
  if (!schemaResult.success) return schemaResult;

  const rowsResult = await getTableRows(dataSourceId, callerId);
  if (!rowsResult.success) return rowsResult;

  bus.emit(DataManagerEvents.AI_OPERATION_STARTED, {
    operation: 'autofill',
    dataSourceId,
    columnId,
  });

  const result = await callProxy<AIAutofillResponse>(proxyUrl, {
    operation: 'autofill',
    schema: schemaResult.data,
    rows: rowsResult.data,
    columnId,
  });

  if (!result.success) {
    bus.emit(DataManagerEvents.AI_OPERATION_FAILED, {
      operation: 'autofill',
      error: result.error.message,
    });
    return result;
  }

  const parsed = AIAutofillResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'AI returned an invalid autofill response.');
  }

  // Filter to requested rows if specified
  if (rowIds?.length) {
    const rowSet = new Set(rowIds);
    const filtered: Record<string, unknown> = {};
    for (const [rowId, value] of Object.entries(parsed.data.fills)) {
      if (rowSet.has(rowId)) {
        filtered[rowId] = value;
      }
    }
    parsed.data.fills = filtered as typeof parsed.data.fills;
  }

  bus.emit(DataManagerEvents.AI_OPERATION_COMPLETED, {
    operation: 'autofill',
    fillCount: Object.keys(parsed.data.fills).length,
  });

  return { success: true, data: parsed.data };
}

/**
 * Suggest a new AI-powered column based on existing data and a prompt.
 * Returns a column definition and sample computed values.
 */
export async function suggestColumn(
  dataSourceId: string,
  prompt: string,
  callerId: string,
  options?: AIServiceOptions,
): Promise<DataSourceResult<AISuggestColumnResponse>> {
  const proxyUrl = getProxyUrl(options);
  if (!proxyUrl) {
    return fail('UNKNOWN', 'AI proxy is not configured. Set VITE_AI_PROXY_URL.');
  }

  const schemaResult = await getTableSchema(dataSourceId, callerId);
  if (!schemaResult.success) return schemaResult;

  const rowsResult = await getTableRows(dataSourceId, callerId);
  if (!rowsResult.success) return rowsResult;

  bus.emit(DataManagerEvents.AI_OPERATION_STARTED, {
    operation: 'suggest_column',
    dataSourceId,
    prompt,
  });

  const result = await callProxy<AISuggestColumnResponse>(proxyUrl, {
    operation: 'suggest_column',
    schema: schemaResult.data,
    rows: rowsResult.data,
    prompt,
  });

  if (!result.success) {
    bus.emit(DataManagerEvents.AI_OPERATION_FAILED, {
      operation: 'suggest_column',
      error: result.error.message,
    });
    return result;
  }

  const parsed = AISuggestColumnResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'AI returned an invalid column suggestion.');
  }

  bus.emit(DataManagerEvents.AI_OPERATION_COMPLETED, {
    operation: 'suggest_column',
    columnName: parsed.data.column.name,
  });

  return { success: true, data: parsed.data };
}

/**
 * Convert a natural language query into structured filter/sort rules.
 *
 * @example
 * ```ts
 * const result = await naturalLanguageQuery(
 *   dataSourceId,
 *   'Show high priority bugs assigned to Alice due this week',
 *   callerId,
 * );
 * ```
 */
export async function naturalLanguageQuery(
  dataSourceId: string,
  query: string,
  callerId: string,
  options?: AIServiceOptions,
): Promise<DataSourceResult<AINaturalLanguageQueryResponse>> {
  const proxyUrl = getProxyUrl(options);
  if (!proxyUrl) {
    return fail('UNKNOWN', 'AI proxy is not configured. Set VITE_AI_PROXY_URL.');
  }

  const schemaResult = await getTableSchema(dataSourceId, callerId);
  if (!schemaResult.success) return schemaResult;

  bus.emit(DataManagerEvents.AI_OPERATION_STARTED, {
    operation: 'natural_language_query',
    dataSourceId,
    query,
  });

  const result = await callProxy<AINaturalLanguageQueryResponse>(proxyUrl, {
    operation: 'natural_language_query',
    schema: schemaResult.data,
    prompt: query,
  });

  if (!result.success) {
    bus.emit(DataManagerEvents.AI_OPERATION_FAILED, {
      operation: 'natural_language_query',
      error: result.error.message,
    });
    return result;
  }

  const parsed = AINaturalLanguageQueryResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'AI returned an invalid query response.');
  }

  bus.emit(DataManagerEvents.AI_OPERATION_COMPLETED, {
    operation: 'natural_language_query',
    filterCount: parsed.data.filters?.length ?? 0,
    sortCount: parsed.data.sorts?.length ?? 0,
  });

  return { success: true, data: parsed.data };
}

/**
 * Extract structured row data from unstructured text (paste, CSV, etc.).
 * AI parses the text and maps it to the DataSource's column schema.
 */
export async function extractData(
  dataSourceId: string,
  text: string,
  callerId: string,
  options?: AIServiceOptions,
): Promise<DataSourceResult<AIExtractDataResponse>> {
  const proxyUrl = getProxyUrl(options);
  if (!proxyUrl) {
    return fail('UNKNOWN', 'AI proxy is not configured. Set VITE_AI_PROXY_URL.');
  }

  const schemaResult = await getTableSchema(dataSourceId, callerId);
  if (!schemaResult.success) return schemaResult;

  bus.emit(DataManagerEvents.AI_OPERATION_STARTED, {
    operation: 'extract_data',
    dataSourceId,
    textLength: text.length,
  });

  const result = await callProxy<AIExtractDataResponse>(proxyUrl, {
    operation: 'extract_data',
    schema: schemaResult.data,
    text,
  });

  if (!result.success) {
    bus.emit(DataManagerEvents.AI_OPERATION_FAILED, {
      operation: 'extract_data',
      error: result.error.message,
    });
    return result;
  }

  const parsed = AIExtractDataResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'AI returned an invalid extraction response.');
  }

  bus.emit(DataManagerEvents.AI_OPERATION_COMPLETED, {
    operation: 'extract_data',
    rowCount: parsed.data.rows.length,
  });

  return { success: true, data: parsed.data };
}

// =============================================================================
// Convenience: Create database from AI-generated schema
// =============================================================================

/**
 * All-in-one: describe a database → AI generates schema → create DataSource with it.
 * Returns the created DataSource ID and the generated schema.
 */
export async function createDatabaseFromPrompt(
  prompt: string,
  callerId: string,
  scope: 'canvas' | 'user' | 'shared' | 'public' = 'user',
  canvasId?: string,
  options?: AIServiceOptions,
): Promise<DataSourceResult<{ dataSourceId: string; schema: AISchemaGenerateResponse }>> {
  // Step 1: Generate schema via AI
  const schemaResult = await generateSchema({ prompt }, options);
  if (!schemaResult.success) return schemaResult;

  const generated = schemaResult.data;

  // Step 2: Build the TableSchema from generated columns
  const tableSchema = {
    columns: generated.columns,
    views: [
      {
        id: crypto.randomUUID(),
        name: 'Default',
        type: 'table' as const,
        visibleColumns: generated.columns.map((c: TableColumn) => c.id),
      },
    ],
    primaryColumnId: generated.columns[0]?.id,
  };

  // Step 3: Build content with sample rows if provided
  const content = generated.sampleRows?.length
    ? {
        rows: generated.sampleRows.map((cells: Record<string, CellValue>) => ({
          id: crypto.randomUUID(),
          cells,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      }
    : { rows: [] };

  // Step 4: Create the DataSource via Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (supabase.from('data_sources') as any)
    .insert({
      type: 'table',
      owner_id: callerId,
      scope,
      canvas_id: canvasId ?? null,
      schema: tableSchema,
      content,
      metadata: {
        name: generated.name ?? 'Untitled Database',
        description: generated.description ?? '',
      },
      revision: 0,
    })
    .select('id')
    .single()) as { data: { id: string } | null; error: { message: string } | null };

  if (error || !data) {
    return fail('UNKNOWN', error?.message ?? 'Failed to create DataSource.');
  }

  bus.emit(DataManagerEvents.AI_OPERATION_COMPLETED, {
    operation: 'create_from_prompt',
    dataSourceId: data.id,
  });

  return {
    success: true,
    data: { dataSourceId: data.id, schema: generated },
  };
}
