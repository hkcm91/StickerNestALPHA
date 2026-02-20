/**
 * DataSource — Barrel Export
 * @module kernel/datasource
 */

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
