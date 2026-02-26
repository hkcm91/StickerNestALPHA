/**
 * Database Management Schemas
 *
 * Defines typed interfaces for table-type DataSource management:
 * column definitions, row data, view configurations, AI operations,
 * and pre-built templates.
 *
 * @module @sn/types/database-management
 */

import { z } from 'zod';

// =============================================================================
// Column Types
// =============================================================================

/**
 * Supported column types for table DataSources.
 *
 * @remarks
 * - Basic types map to standard form inputs
 * - `select` / `multi_select` have configurable options
 * - `formula` computes from other columns (expression-based)
 * - `ai` generates values via the AI proxy (prompt-based)
 * - `relation` references rows in another DataSource
 */
export const ColumnTypeSchema = z.enum([
  'text',
  'number',
  'select',
  'multi_select',
  'date',
  'checkbox',
  'url',
  'email',
  'phone',
  'relation',
  'formula',
  'ai',
]);

export type ColumnType = z.infer<typeof ColumnTypeSchema>;

/**
 * Select option for select/multi_select columns.
 */
export const SelectOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
});

export type SelectOption = z.infer<typeof SelectOptionSchema>;

/**
 * Number display format.
 */
export const NumberFormatSchema = z.enum([
  'number',
  'currency',
  'percent',
  'rating',
]);

export type NumberFormat = z.infer<typeof NumberFormatSchema>;

/**
 * Column configuration — type-specific settings.
 */
export const ColumnConfigSchema = z.object({
  /** Options for select / multi_select columns */
  selectOptions: z.array(SelectOptionSchema).optional(),
  /** Display format for number columns */
  numberFormat: NumberFormatSchema.optional(),
  /** Currency code (e.g., 'USD') when numberFormat is 'currency' */
  currencyCode: z.string().optional(),
  /** Date format string (e.g., 'YYYY-MM-DD') */
  dateFormat: z.string().optional(),
  /** Include time in date columns */
  dateIncludeTime: z.boolean().optional(),
  /** Expression for formula columns */
  formulaExpression: z.string().optional(),
  /** AI prompt template for ai columns — {{column_name}} placeholders reference other columns */
  aiPrompt: z.string().optional(),
  /** Target DataSource ID for relation columns */
  relationDataSourceId: z.string().uuid().optional(),
  /** Display property from related DataSource */
  relationDisplayColumn: z.string().optional(),
  /** Default value for new rows */
  defaultValue: z.unknown().optional(),
  /** Whether the column is required (non-empty) */
  required: z.boolean().optional(),
});

export type ColumnConfig = z.infer<typeof ColumnConfigSchema>;

/**
 * Table column definition.
 */
export const TableColumnSchema = z.object({
  /** Unique column identifier */
  id: z.string(),
  /** Display name */
  name: z.string().min(1),
  /** Column data type */
  type: ColumnTypeSchema,
  /** Type-specific configuration */
  config: ColumnConfigSchema.optional(),
  /** Display order (0-indexed) */
  order: z.number().int().nonnegative(),
});

export type TableColumn = z.infer<typeof TableColumnSchema>;

// =============================================================================
// Cell Values
// =============================================================================

/**
 * A cell value in a table row. Type varies by column type.
 */
export const CellValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),         // multi_select values
  z.object({                   // date range
    start: z.string(),
    end: z.string().nullable().optional(),
  }),
  z.array(z.object({           // relation references
    id: z.string(),
    display: z.string().optional(),
  })),
]);

export type CellValue = z.infer<typeof CellValueSchema>;

// =============================================================================
// Table Rows
// =============================================================================

/**
 * A row in a table DataSource.
 */
export const TableRowSchema = z.object({
  /** Unique row identifier */
  id: z.string(),
  /** Cell values keyed by column ID */
  cells: z.record(z.string(), CellValueSchema),
  /** Row creation timestamp */
  createdAt: z.string().datetime(),
  /** Last modification timestamp */
  updatedAt: z.string().datetime(),
});

export type TableRow = z.infer<typeof TableRowSchema>;

// =============================================================================
// Filter & Sort Rules
// =============================================================================

/**
 * Filter operator for view filtering.
 */
export const FilterOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'is_empty',
  'is_not_empty',
  'greater_than',
  'less_than',
  'greater_than_or_equal',
  'less_than_or_equal',
  'before',
  'after',
  'is_checked',
  'is_not_checked',
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

/**
 * A single filter rule targeting one column.
 */
export const FilterRuleSchema = z.object({
  /** Column ID to filter on */
  columnId: z.string(),
  /** Filter operator */
  operator: FilterOperatorSchema,
  /** Comparison value (type depends on column type + operator) */
  value: z.unknown().optional(),
});

export type FilterRule = z.infer<typeof FilterRuleSchema>;

/**
 * Compound filter with AND/OR logic.
 */
export const FilterGroupSchema: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    /** Logical connector */
    connector: z.enum(['and', 'or']),
    /** Filter rules or nested groups */
    rules: z.array(z.union([FilterRuleSchema, FilterGroupSchema])),
  }),
);

export type FilterGroup = {
  connector: 'and' | 'or';
  rules: Array<FilterRule | FilterGroup>;
};

/**
 * Sort direction.
 */
export const SortDirectionSchema = z.enum(['asc', 'desc']);

export type SortDirection = z.infer<typeof SortDirectionSchema>;

/**
 * A single sort rule.
 */
export const SortRuleSchema = z.object({
  /** Column ID to sort by */
  columnId: z.string(),
  /** Sort direction */
  direction: SortDirectionSchema,
});

export type SortRule = z.infer<typeof SortRuleSchema>;

// =============================================================================
// Database Views
// =============================================================================

/**
 * View layout type.
 */
export const ViewTypeSchema = z.enum([
  'table',
  'board',
  'gallery',
  'list',
  'calendar',
]);

export type ViewType = z.infer<typeof ViewTypeSchema>;

/**
 * A saved view configuration for a table DataSource.
 */
export const DatabaseViewSchema = z.object({
  /** Unique view identifier */
  id: z.string(),
  /** Display name */
  name: z.string().min(1),
  /** Layout type */
  type: ViewTypeSchema,
  /** Active filters */
  filters: z.array(FilterRuleSchema).optional(),
  /** Filter group (for compound filters) */
  filterGroup: FilterGroupSchema.optional(),
  /** Active sorts */
  sorts: z.array(SortRuleSchema).optional(),
  /** Column ID to group by (board view, etc.) */
  groupBy: z.string().optional(),
  /** Ordered list of visible column IDs */
  visibleColumns: z.array(z.string()).optional(),
  /** Column widths in pixels, keyed by column ID */
  columnWidths: z.record(z.string(), z.number()).optional(),
  /** Calendar date column ID (for calendar view) */
  calendarDateColumn: z.string().optional(),
  /** Gallery cover image column ID */
  galleryCoverColumn: z.string().optional(),
});

export type DatabaseView = z.infer<typeof DatabaseViewSchema>;

// =============================================================================
// Table Schema (stored in DataSource.schema)
// =============================================================================

/**
 * The complete schema stored in a table DataSource's `schema` field.
 * Contains column definitions and saved views.
 */
export const TableSchemaSchema = z.object({
  /** Column definitions */
  columns: z.array(TableColumnSchema),
  /** Saved view configurations */
  views: z.array(DatabaseViewSchema).optional(),
  /** ID of the primary/title column */
  primaryColumnId: z.string().optional(),
});

export type TableSchema = z.infer<typeof TableSchemaSchema>;

/**
 * The content payload stored in a table DataSource's `content` field.
 * Contains row data.
 */
export const TableContentSchema = z.object({
  /** Row data */
  rows: z.array(TableRowSchema),
});

export type TableContent = z.infer<typeof TableContentSchema>;

// =============================================================================
// AI Operation Schemas
// =============================================================================

/**
 * AI operation types available for database management.
 */
export const AIOperationTypeSchema = z.enum([
  'generate_schema',
  'autofill',
  'suggest_column',
  'natural_language_query',
  'extract_data',
]);

export type AIOperationType = z.infer<typeof AIOperationTypeSchema>;

/**
 * Request: Generate a database schema from natural language.
 */
export const AISchemaGenerateRequestSchema = z.object({
  type: z.literal('generate_schema'),
  /** Natural language description of the desired database */
  prompt: z.string().min(1),
  /** Optional context about how the database will be used */
  context: z.string().optional(),
});

export type AISchemaGenerateRequest = z.infer<typeof AISchemaGenerateRequestSchema>;

/**
 * Response: Generated schema from AI.
 */
export const AISchemaGenerateResponseSchema = z.object({
  /** Generated column definitions */
  columns: z.array(TableColumnSchema),
  /** Suggested database name */
  name: z.string().optional(),
  /** Suggested description */
  description: z.string().optional(),
  /** Sample rows to pre-populate */
  sampleRows: z.array(z.record(z.string(), CellValueSchema)).optional(),
});

export type AISchemaGenerateResponse = z.infer<typeof AISchemaGenerateResponseSchema>;

/**
 * Request: Autofill cell values using AI.
 */
export const AIAutofillRequestSchema = z.object({
  type: z.literal('autofill'),
  /** DataSource to operate on */
  dataSourceId: z.string().uuid(),
  /** Column to fill */
  columnId: z.string(),
  /** Rows to fill (empty = all rows with empty values in this column) */
  rowIds: z.array(z.string()).optional(),
});

export type AIAutofillRequest = z.infer<typeof AIAutofillRequestSchema>;

/**
 * Response: Autofilled values.
 */
export const AIAutofillResponseSchema = z.object({
  /** Filled values keyed by row ID */
  fills: z.record(z.string(), CellValueSchema),
});

export type AIAutofillResponse = z.infer<typeof AIAutofillResponseSchema>;

/**
 * Request: AI suggests a new column based on existing data.
 */
export const AISuggestColumnRequestSchema = z.object({
  type: z.literal('suggest_column'),
  /** DataSource to analyze */
  dataSourceId: z.string().uuid(),
  /** What the user wants the column to do */
  prompt: z.string().min(1),
});

export type AISuggestColumnRequest = z.infer<typeof AISuggestColumnRequestSchema>;

/**
 * Response: Suggested column definition with sample values.
 */
export const AISuggestColumnResponseSchema = z.object({
  /** Suggested column definition */
  column: TableColumnSchema,
  /** Preview of computed values for existing rows */
  sampleValues: z.record(z.string(), CellValueSchema).optional(),
});

export type AISuggestColumnResponse = z.infer<typeof AISuggestColumnResponseSchema>;

/**
 * Request: Convert natural language to filter/sort configuration.
 */
export const AINaturalLanguageQueryRequestSchema = z.object({
  type: z.literal('natural_language_query'),
  /** DataSource to query */
  dataSourceId: z.string().uuid(),
  /** Natural language query (e.g., "Show high priority items due this week") */
  query: z.string().min(1),
});

export type AINaturalLanguageQueryRequest = z.infer<typeof AINaturalLanguageQueryRequestSchema>;

/**
 * Response: Structured filter/sort from natural language.
 */
export const AINaturalLanguageQueryResponseSchema = z.object({
  /** Generated filter rules */
  filters: z.array(FilterRuleSchema).optional(),
  /** Generated sort rules */
  sorts: z.array(SortRuleSchema).optional(),
  /** Human-readable explanation of the interpretation */
  explanation: z.string().optional(),
});

export type AINaturalLanguageQueryResponse = z.infer<typeof AINaturalLanguageQueryResponseSchema>;

/**
 * Request: Extract structured data from unstructured text.
 */
export const AIExtractDataRequestSchema = z.object({
  type: z.literal('extract_data'),
  /** DataSource to add rows to */
  dataSourceId: z.string().uuid(),
  /** Unstructured text (pasted content, CSV, etc.) */
  text: z.string().min(1),
});

export type AIExtractDataRequest = z.infer<typeof AIExtractDataRequestSchema>;

/**
 * Response: Extracted rows from text.
 */
export const AIExtractDataResponseSchema = z.object({
  /** Extracted rows */
  rows: z.array(z.record(z.string(), CellValueSchema)),
  /** Columns that were detected/created if schema was empty */
  detectedColumns: z.array(TableColumnSchema).optional(),
});

export type AIExtractDataResponse = z.infer<typeof AIExtractDataResponseSchema>;

/**
 * Union of all AI request types.
 */
export const AIDataRequestSchema = z.discriminatedUnion('type', [
  AISchemaGenerateRequestSchema,
  AIAutofillRequestSchema,
  AISuggestColumnRequestSchema,
  AINaturalLanguageQueryRequestSchema,
  AIExtractDataRequestSchema,
]);

export type AIDataRequest = z.infer<typeof AIDataRequestSchema>;

// =============================================================================
// Database Templates
// =============================================================================

/**
 * Template category.
 */
export const TemplateCategorySchema = z.enum([
  'project_management',
  'engineering',
  'marketing',
  'sales',
  'hr',
  'finance',
  'education',
  'personal',
  'other',
]);

export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;

/**
 * A pre-built database template.
 */
export const DatabaseTemplateSchema = z.object({
  /** Unique template identifier */
  id: z.string(),
  /** Display name */
  name: z.string(),
  /** Short description */
  description: z.string(),
  /** Icon identifier or emoji */
  icon: z.string(),
  /** Template category */
  category: TemplateCategorySchema,
  /** Column definitions */
  columns: z.array(TableColumnSchema),
  /** Default views */
  views: z.array(DatabaseViewSchema).optional(),
  /** Sample rows for preview */
  sampleRows: z.array(z.record(z.string(), CellValueSchema)).optional(),
});

export type DatabaseTemplate = z.infer<typeof DatabaseTemplateSchema>;

// =============================================================================
// Notion Sync Schemas
// =============================================================================

/**
 * Notion sync status for a DataSource.
 */
export const NotionSyncStatusSchema = z.enum([
  'idle',
  'syncing',
  'synced',
  'error',
]);

export type NotionSyncStatus = z.infer<typeof NotionSyncStatusSchema>;

/**
 * Notion sync configuration stored in DataSource metadata.
 */
export const NotionSyncConfigSchema = z.object({
  /** The Notion database ID this DataSource syncs with */
  notionDatabaseId: z.string(),
  /** Column mapping: local column ID → Notion property name */
  columnMapping: z.record(z.string(), z.string()),
  /** Last sync timestamp */
  lastSyncedAt: z.string().datetime().optional(),
  /** Sync direction */
  syncDirection: z.enum(['import', 'export', 'bidirectional']),
  /** Current sync status */
  status: NotionSyncStatusSchema,
});

export type NotionSyncConfig = z.infer<typeof NotionSyncConfigSchema>;

// =============================================================================
// JSON Schema Exports
// =============================================================================

export const TableColumnJSONSchema = TableColumnSchema.toJSONSchema();
export const TableRowJSONSchema = TableRowSchema.toJSONSchema();
export const DatabaseViewJSONSchema = DatabaseViewSchema.toJSONSchema();
export const TableSchemaJSONSchema = TableSchemaSchema.toJSONSchema();
export const DatabaseTemplateJSONSchema = DatabaseTemplateSchema.toJSONSchema();
