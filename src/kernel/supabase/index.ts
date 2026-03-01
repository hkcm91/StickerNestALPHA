export { supabase } from './client';
export type { Database, Json } from './types';

// Database Architect - Schema and Migration Builders
export {
  // Types
  type ColumnDefinition,
  type TableDefinition,
  type IndexDefinition,
  type RLSPolicy,
  type TriggerDefinition,
  type FunctionDefinition,
  type EnumDefinition,
  type MigrationBuilder,
  // SQL Generators
  generateCreateTableSQL,
  generateCreateIndexSQL,
  generateRLSPolicySQL,
  generateCreateTriggerSQL,
  generateCreateFunctionSQL,
  generateCreateEnumSQL,
  // Migration Builder
  createMigration,
  addTable,
  addIndex,
  addPolicy,
  addTrigger,
  addFunction,
  addEnum,
  addRawSQL,
  compileMigration,
  // Common Templates
  withAuditColumns,
  withOwnerColumn,
  uuidPrimaryKey,
  metadataColumn,
  generateOwnerPolicies,
  generatePublicReadPolicy,
  generateUpdatedAtTrigger,
  UPDATED_AT_FUNCTION,
  // Zod Integration
  zodToTableDefinition,
} from './db-architect';

// SQL Builder - Fluent Query API
export {
  // Builders
  SelectBuilder,
  InsertBuilder,
  UpdateBuilder,
  DeleteBuilder,
  // Factory Functions
  select,
  insert,
  update,
  deleteFrom,
  // Utilities
  escapeValue,
  quoteIdent,
  raw,
  isRaw,
} from './sql-builder';

// MCP Database Integration
export {
  // Project Info
  STICKERNEST_PROJECT_ID,
  DATABASE_INFO,
  // Type Definitions
  type ExecuteSQLParams,
  type ApplyMigrationParams,
  type ListTablesParams,
  type ListExtensionsParams,
  type GetAdvisorsParams,
  // RLS Templates
  RLS_OWNER_POLICY,
  RLS_PUBLIC_READ_OWNER_WRITE,
  UPDATED_AT_TRIGGER,
  // Introspection Queries
  QUERY_TABLES,
  QUERY_COLUMNS,
  QUERY_INDEXES,
  QUERY_CONSTRAINTS,
  QUERY_RLS_POLICIES,
  QUERY_TRIGGERS,
  QUERY_ENUMS,
  QUERY_FUNCTIONS,
  QUERY_RLS_ENABLED,
  QUERY_ROW_COUNT_ESTIMATE,
  QUERY_DATABASE_SIZE,
  QUERY_TABLE_SIZES,
  // Migration Templates
  generateStandardTableMigration,
  generateAddColumnMigration,
  generateIndexMigration,
} from './mcp-database';
