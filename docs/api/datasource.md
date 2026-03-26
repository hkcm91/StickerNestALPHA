# DataSource API Reference

> **Layer:** L0-kernel
> **Path:** `src/kernel/datasource/`
> **Role:** Persistent data records independent of widgets — CRUD, ACL enforcement, table operations, AI, Notion sync, and templates

## Overview

DataSources are persistent data records that exist independently of widgets. Multiple widgets can reference the same DataSource, enabling shared state and collaborative data editing. The DataSource API enforces access control at the API boundary — every write operation checks the caller's ACL role before proceeding.

DataSources support six types, each with its own conflict resolution strategy handled by Layer 1 (Social):

| Type | Purpose | Conflict Strategy |
|------|---------|-------------------|
| `doc` | Rich text document | Yjs CRDT (no keystroke loss) |
| `table` | Structured tabular data | Revision-based + LWW fallback |
| `note` | Simple text note | Last-write-wins (silent) |
| `folder` | Container for organizing others | Last-write-wins (silent) |
| `file` | Binary file reference | Last-write-wins (silent) |
| `custom` | Widget-defined data structure | Revision-based + LWW fallback |

---

## Schema Types

### `DataSource`

```ts
interface DataSource {
  id: string;              // UUID
  type: 'doc' | 'table' | 'note' | 'folder' | 'file' | 'custom';
  ownerId: string;         // UUID of the creating user
  scope: 'canvas' | 'user' | 'shared' | 'public';
  canvasId?: string;       // Required when scope is 'canvas'
  schema?: Record<string, unknown>;   // Data structure (required for table/custom)
  metadata?: DataSourceMetadata;
  createdAt: string;       // ISO datetime
  updatedAt: string;       // ISO datetime
  revision?: number;       // For conflict detection (table/custom types)
}
```

### `DataSourceMetadata`

```ts
interface DataSourceMetadata {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  tags?: string[];
  custom?: Record<string, unknown>;
}
```

### Scope

Scope controls **visibility**, not write permission. ACL role controls write permission.

| Scope | Visibility |
|-------|-----------|
| `canvas` | Only within the canvas where created |
| `user` | Only to the owning user across all canvases |
| `shared` | To specific users/groups via ACL |
| `public` | Anyone with the link |

### ACL Roles

ACL roles are **independent of canvas roles**. A user may be a canvas viewer but a DataSource editor — both are respected separately.

| Role | Read | Write | Annotate | Delete | Manage ACL |
|------|------|-------|----------|--------|------------|
| `owner` | Yes | Yes | Yes | Yes | Yes |
| `editor` | Yes | Yes | Yes | No | No |
| `commenter` | Yes | No | Yes | No | No |
| `viewer` | Yes | No | No | No | No |

---

## Result Types

All API functions return a discriminated union:

```ts
type DataSourceResult<T> =
  | { success: true; data: T }
  | { success: false; error: DataSourceError };

interface DataSourceError {
  code: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION_ERROR' | 'UNKNOWN';
  message: string;
  currentRevision?: number;  // Present on CONFLICT errors
}
```

---

## CRUD Operations

### `createDataSource(input, callerId)`

Creates a new DataSource. The `ownerId` in input must match `callerId`.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `input` | `CreateDataSourceInput` | DataSource fields (type, ownerId, scope, canvasId?, schema?, metadata?) |
| `callerId` | `string` | UUID of the requesting user |

**Returns:** `Promise<DataSourceResult<DataSource>>`

**Bus event:** Emits `kernel.datasource.created` on success.

**Errors:** `VALIDATION_ERROR` if input is invalid. `PERMISSION_DENIED` if ownerId ≠ callerId.

---

### `readDataSource(id, callerId)`

Reads a single DataSource by ID. Checks ownership, public scope, and ACL.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | DataSource UUID |
| `callerId` | `string` | UUID of the requesting user |

**Returns:** `Promise<DataSourceResult<DataSource>>`

**Errors:** `NOT_FOUND` if DataSource doesn't exist. `PERMISSION_DENIED` if caller has no access.

---

### `updateDataSource(id, input, callerId)`

Updates a DataSource. Requires `editor` or `owner` role. For `table`/`custom` types, supports revision-based conflict detection.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | DataSource UUID |
| `input` | `UpdateDataSourceInput` | Partial update fields + optional `lastSeenRevision` |
| `callerId` | `string` | UUID of the requesting user |

**Returns:** `Promise<DataSourceResult<DataSource>>`

**Bus event:** Emits `kernel.datasource.updated` on success.

**Conflict detection:** If `lastSeenRevision` is provided and the server's current revision has advanced, returns `{ code: 'CONFLICT', currentRevision: N }`. The client should re-fetch and retry.

**Errors:** `PERMISSION_DENIED` if role < editor. `CONFLICT` if revision mismatch. `VALIDATION_ERROR` if input is invalid.

---

### `deleteDataSource(id, callerId)`

Deletes a DataSource. Requires `owner` role.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | DataSource UUID |
| `callerId` | `string` | UUID of the requesting user |

**Returns:** `Promise<DataSourceResult<{ id: string }>>`

**Bus event:** Emits `kernel.datasource.deleted` on success.

**Errors:** `PERMISSION_DENIED` if role ≠ owner.

---

### `listDataSources(callerId, options?)`

Lists DataSources visible to the caller with filtering and pagination.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `callerId` | `string` | UUID of the requesting user |
| `options` | `ListDataSourcesOptions` | Optional filters |

**ListDataSourcesOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `scope` | `DataSource['scope']` | — | Filter by scope |
| `type` | `DataSource['type']` | — | Filter by type |
| `canvasId` | `string` | — | Filter by canvas |
| `offset` | `number` | `0` | Pagination offset |
| `limit` | `number` | `50` | Page size (max 100) |

**Returns:** `Promise<DataSourceResult<DataSource[]>>`

---

## ACL Operations

### `getEffectiveRole(dataSourceId, userId)`

Returns the effective ACL role for a user. Owner of the DataSource always gets `'owner'`. Returns `null` if no access.

**Returns:** `Promise<DataSourceACLRole | null>`

### `grantAccess(dataSourceId, targetUserId, role, granterId)`

Grants or updates ACL for a user. Requires `owner` role on the DataSource.

**Returns:** `Promise<ACLResult<DataSourceACLEntry>>`

### `revokeAccess(dataSourceId, targetUserId, revokerId)`

Removes a user's ACL entry. Requires `owner` role.

**Returns:** `Promise<ACLResult<{ userId: string }>>`

### Permission Helpers

```ts
canWrite(role: DataSourceACLRole): boolean    // true for owner, editor
canDelete(role: DataSourceACLRole): boolean   // true for owner only
canManageACL(role: DataSourceACLRole): boolean // true for owner only
```

---

## Table Operations

Table operations work on `table` and `custom` type DataSources. They operate on the DataSource's `schema` (columns, views) and `content` (rows) fields.

### Schema Operations

#### `getTableSchema(dataSourceId, callerId)`
Returns the table's column definitions and views.
**Returns:** `Promise<DataSourceResult<TableSchema>>`

#### `addColumn(dataSourceId, column, callerId)`
Adds a column to the table schema. Requires write access.
**Returns:** `Promise<DataSourceResult<TableSchema>>`
**Bus event:** `kernel.datamanager.column.added`

#### `updateColumn(dataSourceId, columnId, updates, callerId)`
Updates a column definition.
**Returns:** `Promise<DataSourceResult<TableSchema>>`
**Bus event:** `kernel.datamanager.column.updated`

#### `removeColumn(dataSourceId, columnId, callerId)`
Removes a column from the schema.
**Returns:** `Promise<DataSourceResult<TableSchema>>`
**Bus event:** `kernel.datamanager.column.removed`

#### `reorderColumns(dataSourceId, columnIds, callerId)`
Reorders columns by providing the new order of column IDs.
**Returns:** `Promise<DataSourceResult<TableSchema>>`
**Bus event:** `kernel.datamanager.column.reordered`

### Row Operations

#### `getTableRows(dataSourceId, callerId)`
Returns all rows in the table.
**Returns:** `Promise<DataSourceResult<TableRow[]>>`

#### `queryTableRows(dataSourceId, options, callerId)`
Queries rows with filtering, sorting, and pagination.
**Returns:** `Promise<DataSourceResult<TableRow[]>>`

#### `addRow(dataSourceId, row, callerId)`
Adds a row to the table. Requires write access.
**Returns:** `Promise<DataSourceResult<TableRow>>`
**Bus event:** `kernel.datamanager.row.added`

#### `addRows(dataSourceId, rows, callerId)`
Batch-adds multiple rows.
**Returns:** `Promise<DataSourceResult<TableRow[]>>`
**Bus event:** `kernel.datamanager.rows.batchAdded`

#### `updateRow(dataSourceId, rowId, updates, callerId)`
Updates a row. Supports `lastSeenRevision` for conflict detection.
**Returns:** `Promise<DataSourceResult<TableRow>>`
**Bus event:** `kernel.datamanager.row.updated`

#### `deleteRow(dataSourceId, rowId, callerId)`
Deletes a row.
**Returns:** `Promise<DataSourceResult<{ rowId: string }>>`
**Bus event:** `kernel.datamanager.row.deleted`

### View Operations

#### `createView(dataSourceId, view, callerId)`
Creates a saved view (filter + sort configuration).
**Returns:** `Promise<DataSourceResult<DatabaseView>>`
**Bus event:** `kernel.datamanager.view.created`

#### `updateView(dataSourceId, viewId, updates, callerId)`
Updates a saved view.
**Returns:** `Promise<DataSourceResult<DatabaseView>>`
**Bus event:** `kernel.datamanager.view.updated`

#### `deleteView(dataSourceId, viewId, callerId)`
Deletes a saved view.
**Returns:** `Promise<DataSourceResult<TableSchema>>`
**Bus event:** `kernel.datamanager.view.deleted`

---

## AI Operations

AI-powered operations for table DataSources. All route through the platform's Anthropic API proxy — no API keys in client code.

#### `generateSchema(prompt, options?)`
Generates a table schema from a natural language prompt.

#### `autofill(dataSourceId, columnId, callerId, options?)`
AI-fills values for a column based on existing data.

#### `suggestColumn(dataSourceId, callerId, options?)`
Suggests a new column based on existing data patterns.

#### `naturalLanguageQuery(dataSourceId, query, callerId, options?)`
Queries the table using natural language.

#### `extractData(source, prompt, options?)`
Extracts structured data from text/URLs into table rows.

#### `createDatabaseFromPrompt(prompt, callerId, options?)`
Creates a complete table DataSource from a natural language description.

---

## Notion Sync

Import and sync Notion databases as table DataSources.

#### `listNotionDatabases(integrationToken)`
Lists available Notion databases for import.

#### `importNotionDatabase(notionDatabaseId, integrationToken, callerId, options?)`
Imports a Notion database as a new table DataSource.

#### `resyncNotionDatabase(dataSourceId, integrationToken, callerId)`
Re-syncs an existing imported DataSource with its Notion source.

---

## Templates

Pre-built table schemas for common use cases.

#### `getTemplates()`
Returns all available templates.

#### `getTemplatesByCategory(category)`
Returns templates filtered by category.

#### `getTemplate(templateId)`
Returns a single template by ID.

#### `applyTemplate(templateId, dataSourceId, callerId)`
Applies a template's schema to an existing DataSource.
**Bus event:** `kernel.datamanager.template.applied`

---

## Supabase Tables

The DataSource system uses these Supabase tables:

| Table | Purpose |
|-------|---------|
| `data_sources` | Core DataSource records (id, type, scope, schema, content, revision, etc.) |
| `data_source_acl` | ACL entries (data_source_id, user_id, role, granted_at, granted_by) |
