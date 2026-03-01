/**
 * MCP Database Integration
 *
 * This module provides documentation and helper types for using
 * Supabase MCP tools to manage databases.
 *
 * MCP Tools Available:
 * - mcp__claude_ai_Supabase__execute_sql - Run queries
 * - mcp__claude_ai_Supabase__apply_migration - Apply DDL changes
 * - mcp__claude_ai_Supabase__list_tables - List tables
 * - mcp__claude_ai_Supabase__list_extensions - List extensions
 * - mcp__claude_ai_Supabase__list_migrations - List migrations
 * - mcp__claude_ai_Supabase__generate_typescript_types - Generate types
 * - mcp__claude_ai_Supabase__get_advisors - Security/performance checks
 *
 * Usage with db-architect:
 *
 * ```typescript
 * import { createMigration, addTable, compileMigration, uuidPrimaryKey } from './db-architect';
 *
 * const migration = createMigration('add_custom_table');
 * addTable(migration, {
 *   name: 'my_custom_table',
 *   columns: [
 *     uuidPrimaryKey(),
 *     { name: 'title', type: 'text', nullable: false },
 *     { name: 'data', type: 'jsonb', nullable: false, default: "'{}'::jsonb" },
 *   ],
 *   enableRLS: true,
 * });
 *
 * const sql = compileMigration(migration);
 * // Then use MCP tool: apply_migration({ project_id, name: migration.name, query: sql })
 * ```
 */

/**
 * StickerNest V5 Supabase Project ID
 * Use this when calling MCP tools
 */
export const STICKERNEST_PROJECT_ID = 'lmewtcluzfzqlzwqunst';

/**
 * Database connection info
 */
export const DATABASE_INFO = {
  projectId: STICKERNEST_PROJECT_ID,
  host: 'db.lmewtcluzfzqlzwqunst.supabase.co',
  region: 'us-west-2',
  postgresVersion: '17.6.1.063',
} as const;

// ============================================================================
// MCP Tool Parameter Types
// ============================================================================

/**
 * Parameters for execute_sql MCP tool
 */
export interface ExecuteSQLParams {
  project_id: string;
  query: string;
}

/**
 * Parameters for apply_migration MCP tool
 */
export interface ApplyMigrationParams {
  project_id: string;
  name: string;
  query: string;
}

/**
 * Parameters for list_tables MCP tool
 */
export interface ListTablesParams {
  project_id: string;
  schemas?: string[];
}

/**
 * Parameters for list_extensions MCP tool
 */
export interface ListExtensionsParams {
  project_id: string;
}

/**
 * Parameters for get_advisors MCP tool
 */
export interface GetAdvisorsParams {
  project_id: string;
  type: 'security' | 'performance';
}

// ============================================================================
// Common Database Patterns
// ============================================================================

/**
 * Standard RLS policy for owner-based access
 */
export const RLS_OWNER_POLICY = (tableName: string, ownerColumn = 'owner_id') => `
-- Enable RLS
ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "${tableName}_owner_all"
ON public."${tableName}"
FOR ALL
TO authenticated
USING (auth.uid() = ${ownerColumn})
WITH CHECK (auth.uid() = ${ownerColumn});
`;

/**
 * Standard RLS policy for public read, owner write
 */
export const RLS_PUBLIC_READ_OWNER_WRITE = (tableName: string, ownerColumn = 'owner_id') => `
-- Enable RLS
ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "${tableName}_public_read"
ON public."${tableName}"
FOR SELECT
TO authenticated, anon
USING (true);

-- Owner can insert/update/delete
CREATE POLICY "${tableName}_owner_write"
ON public."${tableName}"
FOR ALL
TO authenticated
USING (auth.uid() = ${ownerColumn})
WITH CHECK (auth.uid() = ${ownerColumn});
`;

/**
 * Standard updated_at trigger
 */
export const UPDATED_AT_TRIGGER = (tableName: string) => `
CREATE OR REPLACE TRIGGER set_${tableName}_updated_at
BEFORE UPDATE ON public."${tableName}"
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
`;

// ============================================================================
// Schema Introspection Queries
// ============================================================================

/**
 * Get all tables in a schema
 */
export const QUERY_TABLES = `
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
`;

/**
 * Get columns for a table
 */
export const QUERY_COLUMNS = (tableName: string) => `
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = '${tableName}'
ORDER BY ordinal_position;
`;

/**
 * Get all indexes for a table
 */
export const QUERY_INDEXES = (tableName: string) => `
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = '${tableName}';
`;

/**
 * Get all constraints for a table
 */
export const QUERY_CONSTRAINTS = (tableName: string) => `
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.${tableName}'::regclass;
`;

/**
 * Get all RLS policies for a table
 */
export const QUERY_RLS_POLICIES = (tableName: string) => `
SELECT
  polname AS policy_name,
  polcmd AS command,
  polroles AS roles,
  pg_get_expr(polqual, polrelid) AS using_expression,
  pg_get_expr(polwithcheck, polrelid) AS with_check_expression
FROM pg_policy
WHERE polrelid = 'public.${tableName}'::regclass;
`;

/**
 * Get all triggers for a table
 */
export const QUERY_TRIGGERS = (tableName: string) => `
SELECT
  tgname AS trigger_name,
  proname AS function_name,
  tgenabled AS enabled,
  pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.${tableName}'::regclass
  AND NOT tgisinternal;
`;

/**
 * Get all enums in the database
 */
export const QUERY_ENUMS = `
SELECT
  t.typname AS enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = 'public'::regnamespace
GROUP BY t.typname
ORDER BY t.typname;
`;

/**
 * Get all functions in the schema
 */
export const QUERY_FUNCTIONS = `
SELECT
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  pg_get_function_result(oid) AS return_type,
  prosrc AS source
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prokind = 'f'
ORDER BY proname;
`;

/**
 * Check if RLS is enabled on a table
 */
export const QUERY_RLS_ENABLED = (tableName: string) => `
SELECT relrowsecurity
FROM pg_class
WHERE relname = '${tableName}'
  AND relnamespace = 'public'::regnamespace;
`;

/**
 * Get table row count estimate (fast)
 */
export const QUERY_ROW_COUNT_ESTIMATE = (tableName: string) => `
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE relname = '${tableName}'
  AND relnamespace = 'public'::regnamespace;
`;

/**
 * Get database size
 */
export const QUERY_DATABASE_SIZE = `
SELECT pg_size_pretty(pg_database_size(current_database())) AS size;
`;

/**
 * Get table sizes
 */
export const QUERY_TABLE_SIZES = `
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS table_size,
  pg_size_pretty(pg_indexes_size(relid)) AS indexes_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
`;

// ============================================================================
// Migration Templates
// ============================================================================

/**
 * Template for a new table with standard fields
 */
export function generateStandardTableMigration(config: {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    default?: string;
    references?: { table: string; column: string };
  }>;
  rlsType?: 'owner' | 'public-read' | 'none';
  ownerColumn?: string;
  hasTimestamps?: boolean;
}): string {
  const {
    tableName,
    columns,
    rlsType = 'owner',
    ownerColumn = 'owner_id',
    hasTimestamps = true,
  } = config;

  const lines: string[] = [];

  // Create table
  lines.push(`-- Create ${tableName} table`);
  lines.push(`CREATE TABLE IF NOT EXISTS public."${tableName}" (`);

  const columnDefs: string[] = [];

  // ID column
  columnDefs.push('  id uuid PRIMARY KEY DEFAULT gen_random_uuid()');

  // User columns
  for (const col of columns) {
    let def = `  "${col.name}" ${col.type}`;
    if (!col.nullable) def += ' NOT NULL';
    if (col.default) def += ` DEFAULT ${col.default}`;
    if (col.references) {
      def += ` REFERENCES public."${col.references.table}"("${col.references.column}") ON DELETE CASCADE`;
    }
    columnDefs.push(def);
  }

  // Timestamps
  if (hasTimestamps) {
    columnDefs.push('  created_at timestamptz NOT NULL DEFAULT now()');
    columnDefs.push('  updated_at timestamptz NOT NULL DEFAULT now()');
  }

  lines.push(columnDefs.join(',\n'));
  lines.push(');');
  lines.push('');

  // RLS
  if (rlsType !== 'none') {
    lines.push(`-- Enable RLS`);
    lines.push(`ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;`);
    lines.push('');

    if (rlsType === 'owner') {
      lines.push(`-- Owner-only access`);
      lines.push(`CREATE POLICY "${tableName}_owner_all"`);
      lines.push(`ON public."${tableName}"`);
      lines.push(`FOR ALL`);
      lines.push(`TO authenticated`);
      lines.push(`USING (auth.uid() = ${ownerColumn})`);
      lines.push(`WITH CHECK (auth.uid() = ${ownerColumn});`);
    } else if (rlsType === 'public-read') {
      lines.push(`-- Public read access`);
      lines.push(`CREATE POLICY "${tableName}_public_read"`);
      lines.push(`ON public."${tableName}"`);
      lines.push(`FOR SELECT`);
      lines.push(`TO authenticated, anon`);
      lines.push(`USING (true);`);
      lines.push('');
      lines.push(`-- Owner write access`);
      lines.push(`CREATE POLICY "${tableName}_owner_write"`);
      lines.push(`ON public."${tableName}"`);
      lines.push(`FOR ALL`);
      lines.push(`TO authenticated`);
      lines.push(`USING (auth.uid() = ${ownerColumn})`);
      lines.push(`WITH CHECK (auth.uid() = ${ownerColumn});`);
    }
    lines.push('');
  }

  // Updated at trigger
  if (hasTimestamps) {
    lines.push(`-- Updated at trigger`);
    lines.push(`CREATE OR REPLACE TRIGGER set_${tableName}_updated_at`);
    lines.push(`BEFORE UPDATE ON public."${tableName}"`);
    lines.push(`FOR EACH ROW`);
    lines.push(`EXECUTE FUNCTION public.handle_updated_at();`);
  }

  return lines.join('\n');
}

/**
 * Template for adding a column to existing table
 */
export function generateAddColumnMigration(config: {
  tableName: string;
  columnName: string;
  columnType: string;
  nullable?: boolean;
  default?: string;
}): string {
  const { tableName, columnName, columnType, nullable = true, default: defaultVal } = config;

  let sql = `ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS "${columnName}" ${columnType}`;
  if (!nullable) sql += ' NOT NULL';
  if (defaultVal) sql += ` DEFAULT ${defaultVal}`;
  sql += ';';

  return sql;
}

/**
 * Template for creating an index
 */
export function generateIndexMigration(config: {
  tableName: string;
  columns: string[];
  unique?: boolean;
  where?: string;
  method?: 'btree' | 'gin' | 'gist' | 'hash';
}): string {
  const { tableName, columns, unique = false, where, method = 'btree' } = config;

  const indexName = `idx_${tableName}_${columns.join('_')}`;
  const uniqueStr = unique ? 'UNIQUE ' : '';
  const methodStr = method !== 'btree' ? ` USING ${method}` : '';
  const whereStr = where ? ` WHERE ${where}` : '';
  const cols = columns.map((c) => `"${c}"`).join(', ');

  return `CREATE ${uniqueStr}INDEX IF NOT EXISTS "${indexName}" ON public."${tableName}"${methodStr} (${cols})${whereStr};`;
}
