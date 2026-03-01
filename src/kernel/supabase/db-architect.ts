/**
 * Database Architect - High-level API for creating custom database schemas
 *
 * This module provides type-safe utilities for:
 * - Creating tables with full column definitions
 * - Generating RLS policies
 * - Creating indexes, triggers, and functions
 * - Building migrations
 *
 * Used in conjunction with Supabase MCP tools for execution.
 */

// ============================================================================
// Column Type Definitions
// ============================================================================

export type PostgresDataType =
  // Numeric types
  | 'smallint'
  | 'integer'
  | 'bigint'
  | 'decimal'
  | 'numeric'
  | 'real'
  | 'double precision'
  | 'serial'
  | 'bigserial'
  // Character types
  | 'char'
  | 'varchar'
  | 'text'
  // Binary types
  | 'bytea'
  // Date/time types
  | 'timestamp'
  | 'timestamptz'
  | 'date'
  | 'time'
  | 'timetz'
  | 'interval'
  // Boolean type
  | 'boolean'
  // UUID type
  | 'uuid'
  // JSON types
  | 'json'
  | 'jsonb'
  // Array types (handled separately)
  | 'array'
  // Geometric types
  | 'point'
  | 'line'
  | 'lseg'
  | 'box'
  | 'path'
  | 'polygon'
  | 'circle'
  // Network types
  | 'cidr'
  | 'inet'
  | 'macaddr'
  // Other types
  | 'money'
  | 'tsvector'
  | 'tsquery';

// ============================================================================
// Column Definition
// ============================================================================

export interface ColumnDefinition {
  name: string;
  type: PostgresDataType;
  length?: number; // For varchar(n), char(n)
  precision?: number; // For decimal/numeric
  scale?: number; // For decimal/numeric
  arrayOf?: PostgresDataType; // For array types
  nullable?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  default?: string; // SQL expression for default
  check?: string; // CHECK constraint
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
  };
  comment?: string;
}

// ============================================================================
// Table Definition
// ============================================================================

export interface TableDefinition {
  name: string;
  schema?: string;
  columns: ColumnDefinition[];
  primaryKey?: string[]; // For composite primary keys
  uniqueConstraints?: Array<{
    name?: string;
    columns: string[];
  }>;
  checkConstraints?: Array<{
    name?: string;
    expression: string;
  }>;
  comment?: string;
  enableRLS?: boolean;
}

// ============================================================================
// Index Definition
// ============================================================================

export interface IndexDefinition {
  name?: string;
  table: string;
  schema?: string;
  columns: string[];
  unique?: boolean;
  method?: 'btree' | 'hash' | 'gist' | 'spgist' | 'gin' | 'brin';
  where?: string; // Partial index condition
  include?: string[]; // INCLUDE columns for covering indexes
  concurrently?: boolean;
}

// ============================================================================
// RLS Policy Definition
// ============================================================================

export interface RLSPolicy {
  name: string;
  table: string;
  schema?: string;
  operation: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  role?: string;
  using?: string; // USING clause (for SELECT, UPDATE, DELETE)
  withCheck?: string; // WITH CHECK clause (for INSERT, UPDATE)
}

// ============================================================================
// Trigger Definition
// ============================================================================

export interface TriggerDefinition {
  name: string;
  table: string;
  schema?: string;
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  events: Array<'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE'>;
  forEach?: 'ROW' | 'STATEMENT';
  when?: string; // Conditional trigger
  function: string; // Function to call
  functionArgs?: string[];
}

// ============================================================================
// Function Definition
// ============================================================================

export interface FunctionDefinition {
  name: string;
  schema?: string;
  args?: Array<{
    name: string;
    type: string;
    default?: string;
    mode?: 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';
  }>;
  returns?: string;
  language?: 'plpgsql' | 'sql' | 'plv8';
  volatility?: 'VOLATILE' | 'STABLE' | 'IMMUTABLE';
  security?: 'INVOKER' | 'DEFINER';
  body: string;
  comment?: string;
}

// ============================================================================
// Enum Definition
// ============================================================================

export interface EnumDefinition {
  name: string;
  schema?: string;
  values: string[];
  comment?: string;
}

// ============================================================================
// SQL Generators
// ============================================================================

/**
 * Generate column type SQL including length/precision
 */
function generateColumnType(col: ColumnDefinition): string {
  let typeStr: string = col.type;

  if (col.type === 'array' && col.arrayOf) {
    typeStr = `${col.arrayOf}[]`;
  } else if ((col.type === 'varchar' || col.type === 'char') && col.length) {
    typeStr = `${col.type}(${col.length})`;
  } else if ((col.type === 'decimal' || col.type === 'numeric') && col.precision) {
    typeStr = col.scale ? `${col.type}(${col.precision}, ${col.scale})` : `${col.type}(${col.precision})`;
  }

  return typeStr;
}

/**
 * Generate SQL for a single column definition
 */
function generateColumnSQL(col: ColumnDefinition): string {
  const parts: string[] = [`"${col.name}"`, generateColumnType(col)];

  if (col.nullable === false) {
    parts.push('NOT NULL');
  }

  if (col.primaryKey) {
    parts.push('PRIMARY KEY');
  }

  if (col.unique && !col.primaryKey) {
    parts.push('UNIQUE');
  }

  if (col.default !== undefined) {
    parts.push(`DEFAULT ${col.default}`);
  }

  if (col.check) {
    parts.push(`CHECK (${col.check})`);
  }

  if (col.references) {
    const ref = col.references;
    parts.push(`REFERENCES "${ref.table}"("${ref.column}")`);
    if (ref.onDelete && ref.onDelete !== 'NO ACTION') {
      parts.push(`ON DELETE ${ref.onDelete}`);
    }
    if (ref.onUpdate && ref.onUpdate !== 'NO ACTION') {
      parts.push(`ON UPDATE ${ref.onUpdate}`);
    }
  }

  return parts.join(' ');
}

/**
 * Generate CREATE TABLE SQL
 */
export function generateCreateTableSQL(table: TableDefinition): string {
  const lines: string[] = [];
  const schema = table.schema ?? 'public';
  const schemaTable = `"${schema}"."${table.name}"`;

  lines.push(`CREATE TABLE IF NOT EXISTS ${schemaTable} (`);

  // Column definitions
  const columnDefs = table.columns.map((col) => '  ' + generateColumnSQL(col));

  // Composite primary key
  if (table.primaryKey && table.primaryKey.length > 0) {
    const pkCols = table.primaryKey.map((c) => `"${c}"`).join(', ');
    columnDefs.push(`  PRIMARY KEY (${pkCols})`);
  }

  // Unique constraints
  if (table.uniqueConstraints) {
    for (const uc of table.uniqueConstraints) {
      const cols = uc.columns.map((c) => `"${c}"`).join(', ');
      const name = uc.name ? `CONSTRAINT "${uc.name}" ` : '';
      columnDefs.push(`  ${name}UNIQUE (${cols})`);
    }
  }

  // Check constraints
  if (table.checkConstraints) {
    for (const cc of table.checkConstraints) {
      const name = cc.name ? `CONSTRAINT "${cc.name}" ` : '';
      columnDefs.push(`  ${name}CHECK (${cc.expression})`);
    }
  }

  lines.push(columnDefs.join(',\n'));
  lines.push(');');

  // Enable RLS
  if (table.enableRLS !== false) {
    lines.push('');
    lines.push(`ALTER TABLE ${schemaTable} ENABLE ROW LEVEL SECURITY;`);
  }

  // Table comment
  if (table.comment) {
    lines.push('');
    lines.push(`COMMENT ON TABLE ${schemaTable} IS '${table.comment.replace(/'/g, "''")}';`);
  }

  // Column comments
  for (const col of table.columns) {
    if (col.comment) {
      lines.push(`COMMENT ON COLUMN ${schemaTable}."${col.name}" IS '${col.comment.replace(/'/g, "''")}';`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate CREATE INDEX SQL
 */
export function generateCreateIndexSQL(index: IndexDefinition): string {
  const schema = index.schema ?? 'public';
  const tableName = `"${schema}"."${index.table}"`;
  const method = index.method ?? 'btree';
  const indexName =
    index.name || `idx_${index.table}_${index.columns.join('_')}${index.unique ? '_unique' : ''}`;

  const parts: string[] = ['CREATE'];

  if (index.unique) {
    parts.push('UNIQUE');
  }

  parts.push('INDEX');

  if (index.concurrently) {
    parts.push('CONCURRENTLY');
  }

  parts.push(`IF NOT EXISTS "${indexName}"`);
  parts.push(`ON ${tableName}`);

  if (method !== 'btree') {
    parts.push(`USING ${method}`);
  }

  const cols = index.columns.map((c) => `"${c}"`).join(', ');
  parts.push(`(${cols})`);

  if (index.include && index.include.length > 0) {
    const includeCols = index.include.map((c) => `"${c}"`).join(', ');
    parts.push(`INCLUDE (${includeCols})`);
  }

  if (index.where) {
    parts.push(`WHERE ${index.where}`);
  }

  return parts.join(' ') + ';';
}

/**
 * Generate RLS Policy SQL
 */
export function generateRLSPolicySQL(policy: RLSPolicy): string {
  const schema = policy.schema ?? 'public';
  const role = policy.role ?? 'authenticated';
  const tableName = `"${schema}"."${policy.table}"`;
  const parts: string[] = [];

  parts.push(`CREATE POLICY "${policy.name}"`);
  parts.push(`ON ${tableName}`);
  parts.push(`FOR ${policy.operation}`);
  parts.push(`TO ${role}`);

  if (policy.using) {
    parts.push(`USING (${policy.using})`);
  }

  if (policy.withCheck) {
    parts.push(`WITH CHECK (${policy.withCheck})`);
  }

  return parts.join('\n') + ';';
}

/**
 * Generate CREATE TRIGGER SQL
 */
export function generateCreateTriggerSQL(trigger: TriggerDefinition): string {
  const schema = trigger.schema ?? 'public';
  const forEach = trigger.forEach ?? 'ROW';
  const tableName = `"${schema}"."${trigger.table}"`;
  const events = trigger.events.join(' OR ');

  const parts: string[] = [];

  parts.push(`CREATE TRIGGER "${trigger.name}"`);
  parts.push(`${trigger.timing} ${events}`);
  parts.push(`ON ${tableName}`);
  parts.push(`FOR EACH ${forEach}`);

  if (trigger.when) {
    parts.push(`WHEN (${trigger.when})`);
  }

  const args = trigger.functionArgs ? trigger.functionArgs.join(', ') : '';
  parts.push(`EXECUTE FUNCTION ${trigger.function}(${args});`);

  return parts.join('\n');
}

/**
 * Generate CREATE FUNCTION SQL
 */
export function generateCreateFunctionSQL(func: FunctionDefinition): string {
  const schema = func.schema ?? 'public';
  const returns = func.returns ?? 'void';
  const language = func.language ?? 'plpgsql';
  const volatility = func.volatility ?? 'VOLATILE';
  const security = func.security ?? 'INVOKER';
  const funcArgs = func.args ?? [];

  const funcName = `"${schema}"."${func.name}"`;
  const args = funcArgs
    .map((a) => {
      const mode = a.mode ?? 'IN';
      let argStr = mode !== 'IN' ? `${mode} ` : '';
      argStr += `${a.name} ${a.type}`;
      if (a.default) {
        argStr += ` DEFAULT ${a.default}`;
      }
      return argStr;
    })
    .join(', ');

  const lines: string[] = [];

  lines.push(`CREATE OR REPLACE FUNCTION ${funcName}(${args})`);
  lines.push(`RETURNS ${returns}`);
  lines.push(`LANGUAGE ${language}`);
  lines.push(`${volatility}`);
  lines.push(`SECURITY ${security}`);
  lines.push('AS $$');
  lines.push(func.body);
  lines.push('$$;');

  if (func.comment) {
    lines.push('');
    lines.push(`COMMENT ON FUNCTION ${funcName} IS '${func.comment.replace(/'/g, "''")}';`);
  }

  return lines.join('\n');
}

/**
 * Generate CREATE TYPE (enum) SQL
 */
export function generateCreateEnumSQL(enumDef: EnumDefinition): string {
  const schema = enumDef.schema ?? 'public';
  const typeName = `"${schema}"."${enumDef.name}"`;
  const values = enumDef.values.map((v) => `'${v}'`).join(', ');

  let sql = `DO $$ BEGIN\n`;
  sql += `  CREATE TYPE ${typeName} AS ENUM (${values});\n`;
  sql += `EXCEPTION\n`;
  sql += `  WHEN duplicate_object THEN null;\n`;
  sql += `END $$;`;

  if (enumDef.comment) {
    sql += `\n\nCOMMENT ON TYPE ${typeName} IS '${enumDef.comment.replace(/'/g, "''")}';`;
  }

  return sql;
}

// ============================================================================
// Migration Builder
// ============================================================================

export interface MigrationBuilder {
  name: string;
  statements: string[];
}

/**
 * Create a new migration builder
 */
export function createMigration(name: string): MigrationBuilder {
  return {
    name,
    statements: [],
  };
}

/**
 * Add a table to the migration
 */
export function addTable(migration: MigrationBuilder, table: TableDefinition): MigrationBuilder {
  migration.statements.push(generateCreateTableSQL(table));
  return migration;
}

/**
 * Add an index to the migration
 */
export function addIndex(migration: MigrationBuilder, index: IndexDefinition): MigrationBuilder {
  migration.statements.push(generateCreateIndexSQL(index));
  return migration;
}

/**
 * Add an RLS policy to the migration
 */
export function addPolicy(migration: MigrationBuilder, policy: RLSPolicy): MigrationBuilder {
  migration.statements.push(generateRLSPolicySQL(policy));
  return migration;
}

/**
 * Add a trigger to the migration
 */
export function addTrigger(migration: MigrationBuilder, trigger: TriggerDefinition): MigrationBuilder {
  migration.statements.push(generateCreateTriggerSQL(trigger));
  return migration;
}

/**
 * Add a function to the migration
 */
export function addFunction(migration: MigrationBuilder, func: FunctionDefinition): MigrationBuilder {
  migration.statements.push(generateCreateFunctionSQL(func));
  return migration;
}

/**
 * Add an enum type to the migration
 */
export function addEnum(migration: MigrationBuilder, enumDef: EnumDefinition): MigrationBuilder {
  migration.statements.push(generateCreateEnumSQL(enumDef));
  return migration;
}

/**
 * Add raw SQL to the migration
 */
export function addRawSQL(migration: MigrationBuilder, sql: string): MigrationBuilder {
  migration.statements.push(sql);
  return migration;
}

/**
 * Compile the migration to a single SQL string
 */
export function compileMigration(migration: MigrationBuilder): string {
  const header = `-- Migration: ${migration.name}\n-- Generated: ${new Date().toISOString()}\n\n`;
  return header + migration.statements.join('\n\n');
}

// ============================================================================
// Common Table Templates
// ============================================================================

/**
 * Standard columns for auditable tables
 */
export function withAuditColumns(columns: ColumnDefinition[]): ColumnDefinition[] {
  return [
    ...columns,
    {
      name: 'created_at',
      type: 'timestamptz',
      nullable: false,
      default: 'now()',
    },
    {
      name: 'updated_at',
      type: 'timestamptz',
      nullable: false,
      default: 'now()',
    },
  ];
}

/**
 * Standard columns for user-owned tables
 */
export function withOwnerColumn(columns: ColumnDefinition[]): ColumnDefinition[] {
  return [
    ...columns,
    {
      name: 'owner_id',
      type: 'uuid',
      nullable: false,
      references: {
        table: 'users',
        column: 'id',
        onDelete: 'CASCADE',
      },
    },
  ];
}

/**
 * Standard UUID primary key column
 */
export function uuidPrimaryKey(name = 'id'): ColumnDefinition {
  return {
    name,
    type: 'uuid',
    nullable: false,
    primaryKey: true,
    default: 'gen_random_uuid()',
  };
}

/**
 * Standard JSONB metadata column
 */
export function metadataColumn(name = 'metadata'): ColumnDefinition {
  return {
    name,
    type: 'jsonb',
    nullable: false,
    default: "'{}'::jsonb",
  };
}

// ============================================================================
// Common RLS Policy Templates
// ============================================================================

/**
 * Generate owner-only policies for a table
 */
export function generateOwnerPolicies(tableName: string, ownerColumn = 'owner_id'): RLSPolicy[] {
  return [
    {
      name: `${tableName}_select_owner`,
      table: tableName,
      operation: 'SELECT',
      using: `auth.uid() = ${ownerColumn}`,
    },
    {
      name: `${tableName}_insert_owner`,
      table: tableName,
      operation: 'INSERT',
      withCheck: `auth.uid() = ${ownerColumn}`,
    },
    {
      name: `${tableName}_update_owner`,
      table: tableName,
      operation: 'UPDATE',
      using: `auth.uid() = ${ownerColumn}`,
      withCheck: `auth.uid() = ${ownerColumn}`,
    },
    {
      name: `${tableName}_delete_owner`,
      table: tableName,
      operation: 'DELETE',
      using: `auth.uid() = ${ownerColumn}`,
    },
  ];
}

/**
 * Generate public read policy
 */
export function generatePublicReadPolicy(tableName: string, condition?: string): RLSPolicy {
  return {
    name: `${tableName}_public_read`,
    table: tableName,
    operation: 'SELECT',
    role: 'anon',
    using: condition || 'true',
  };
}

// ============================================================================
// Common Trigger Templates
// ============================================================================

/**
 * Generate updated_at trigger for a table
 */
export function generateUpdatedAtTrigger(tableName: string, schema = 'public'): string {
  return `
CREATE OR REPLACE TRIGGER set_updated_at
BEFORE UPDATE ON "${schema}"."${tableName}"
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
`.trim();
}

/**
 * The handle_updated_at function (add once to your database)
 */
export const UPDATED_AT_FUNCTION = `
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`.trim();

// ============================================================================
// Type Generation from Zod (simplified without Zod import)
// ============================================================================

/**
 * Convert a simple schema object to a table definition
 * Each key becomes a column, type is inferred from value type
 */
export function objectToTableDefinition(
  tableName: string,
  schemaObj: Record<string, 'string' | 'number' | 'boolean' | 'json' | 'uuid' | 'timestamp'>,
  options?: {
    schema?: string;
    enableRLS?: boolean;
    includeAuditColumns?: boolean;
    primaryKey?: string;
  }
): TableDefinition {
  const columns: ColumnDefinition[] = [];
  const pkName = options?.primaryKey ?? 'id';

  for (const [key, valueType] of Object.entries(schemaObj)) {
    let type: PostgresDataType;

    switch (valueType) {
      case 'string':
        type = 'text';
        break;
      case 'number':
        type = 'numeric';
        break;
      case 'boolean':
        type = 'boolean';
        break;
      case 'json':
        type = 'jsonb';
        break;
      case 'uuid':
        type = 'uuid';
        break;
      case 'timestamp':
        type = 'timestamptz';
        break;
      default:
        type = 'text';
    }

    columns.push({
      name: key,
      type,
      nullable: key !== pkName,
      primaryKey: key === pkName,
      default: key === pkName && valueType === 'uuid' ? 'gen_random_uuid()' : undefined,
    });
  }

  if (options?.includeAuditColumns !== false) {
    if (!columns.find((c) => c.name === 'created_at')) {
      columns.push({
        name: 'created_at',
        type: 'timestamptz',
        nullable: false,
        default: 'now()',
      });
    }
    if (!columns.find((c) => c.name === 'updated_at')) {
      columns.push({
        name: 'updated_at',
        type: 'timestamptz',
        nullable: false,
        default: 'now()',
      });
    }
  }

  return {
    name: tableName,
    schema: options?.schema ?? 'public',
    columns,
    enableRLS: options?.enableRLS !== false,
  };
}

// Alias for backwards compatibility
export const zodToTableDefinition = objectToTableDefinition;
