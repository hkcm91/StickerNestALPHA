/**
 * DataSource — Barrel Export
 * @module kernel/datasource
 */

// Core CRUD
export {
  createDataSource,
  readDataSource,
  updateDataSource,
  deleteDataSource,
  listDataSources,
  type DataSourceResult,
  type DataSourceError,
  type ListDataSourcesOptions,
} from './datasource';

// ACL
export {
  getEffectiveRole,
  canWrite,
  canDelete,
  canManageACL,
  grantAccess,
  revokeAccess,
  type ACLResult,
  type ACLError,
} from './acl';

// Table Operations
export {
  getTableSchema,
  getTableRows,
  queryTableRows,
  addColumn,
  updateColumn,
  removeColumn,
  reorderColumns,
  addRow,
  updateRow,
  deleteRow,
  addRows,
  createView,
  updateView,
  deleteView,
} from './table-ops';

// AI-Assisted Operations
export {
  generateSchema,
  autofill,
  suggestColumn,
  naturalLanguageQuery,
  extractData,
  createDatabaseFromPrompt,
  type AIServiceOptions,
} from './ai-service';

// Notion Sync
export {
  listNotionDatabases,
  importNotionDatabase,
  resyncNotionDatabase,
  type NotionImportResult,
  type NotionDatabaseSummary,
} from './notion-sync';

// Templates
export {
  getTemplates,
  getTemplatesByCategory,
  getTemplate,
  applyTemplate,
} from './templates';
