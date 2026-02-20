/**
 * DataSource schemas
 * @module @sn/types/data-source
 */

import { z } from 'zod';

/**
 * DataSource type enum
 *
 * @remarks
 * - `doc` - Rich text document (uses Yjs CRDT for conflict resolution)
 * - `table` - Structured tabular data (uses revision-based conflict detection)
 * - `note` - Simple text note (uses LWW conflict resolution)
 * - `folder` - Container for organizing other DataSources
 * - `file` - Binary file reference (image, video, etc.)
 * - `custom` - Widget-defined custom data structure
 */
export const DataSourceTypeSchema = z.enum([
  'doc',
  'table',
  'note',
  'folder',
  'file',
  'custom',
]);

export type DataSourceType = z.infer<typeof DataSourceTypeSchema>;

/**
 * DataSource scope enum
 *
 * @remarks
 * Scope controls VISIBILITY, not write permission. ACL role controls write permission.
 *
 * - `canvas` - Visible only within the canvas where it was created
 * - `user` - Visible only to the owning user across all their canvases
 * - `shared` - Visible to specific users/groups via ACL
 * - `public` - Visible to anyone with the link
 */
export const DataSourceScopeSchema = z.enum([
  'canvas',
  'user',
  'shared',
  'public',
]);

export type DataSourceScope = z.infer<typeof DataSourceScopeSchema>;

/**
 * ACL role enum
 *
 * @remarks
 * ACL roles are INDEPENDENT of canvas roles. A user may be a canvas viewer
 * but a DataSource editor — both must be respected separately.
 *
 * - `owner` - Full control including ACL management and deletion
 * - `editor` - Full read/write on source data
 * - `commenter` - Can annotate but cannot mutate source data
 * - `viewer` - Read-only, cannot write under any code path
 */
export const DataSourceACLRoleSchema = z.enum([
  'owner',
  'editor',
  'commenter',
  'viewer',
]);

export type DataSourceACLRole = z.infer<typeof DataSourceACLRoleSchema>;

/**
 * DataSource ACL entry schema
 */
export const DataSourceACLEntrySchema = z.object({
  /** User ID granted access */
  userId: z.string().uuid(),
  /** Role assigned to this user */
  role: DataSourceACLRoleSchema,
  /** When the ACL entry was created */
  grantedAt: z.string().datetime(),
  /** Who granted this access (null for owner) */
  grantedBy: z.string().uuid().nullable(),
});

export type DataSourceACLEntry = z.infer<typeof DataSourceACLEntrySchema>;

/**
 * DataSource metadata schema
 */
export const DataSourceMetadataSchema = z.object({
  /** Display name */
  name: z.string().optional(),
  /** Description */
  description: z.string().optional(),
  /** Icon identifier */
  icon: z.string().optional(),
  /** Color for UI representation */
  color: z.string().optional(),
  /** Tags for organization */
  tags: z.array(z.string()).optional(),
  /** Custom metadata from widgets */
  custom: z.record(z.string(), z.unknown()).optional(),
});

export type DataSourceMetadata = z.infer<typeof DataSourceMetadataSchema>;

/**
 * DataSource schema
 *
 * @remarks
 * DataSources are persistent data records independent of widgets.
 * Multiple widgets can reference the same DataSource.
 */
export const DataSourceSchema = z.object({
  /** Unique identifier */
  id: z.string().uuid(),
  /** Type of data source */
  type: DataSourceTypeSchema,
  /** User ID of the owner */
  ownerId: z.string().uuid(),
  /** Visibility scope */
  scope: DataSourceScopeSchema,
  /** Canvas ID if scope is 'canvas' */
  canvasId: z.string().uuid().optional(),
  /**
   * JSON Schema defining the data structure.
   * Required for 'table' and 'custom' types.
   */
  schema: z.record(z.string(), z.unknown()).optional(),
  /** Metadata for display and organization */
  metadata: DataSourceMetadataSchema.optional(),
  /** Creation timestamp */
  createdAt: z.string().datetime(),
  /** Last update timestamp */
  updatedAt: z.string().datetime(),
  /**
   * Revision number for conflict detection.
   * Used by 'table' and 'custom' types.
   */
  revision: z.number().int().nonnegative().optional(),
});

export type DataSource = z.infer<typeof DataSourceSchema>;

/**
 * DataSource creation input schema
 */
export const CreateDataSourceInputSchema = DataSourceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  revision: true,
});

export type CreateDataSourceInput = z.infer<typeof CreateDataSourceInputSchema>;

/**
 * DataSource update input schema
 */
export const UpdateDataSourceInputSchema = DataSourceSchema.partial().omit({
  id: true,
  ownerId: true,
  createdAt: true,
}).extend({
  /** Required for revision-based conflict detection */
  lastSeenRevision: z.number().int().nonnegative().optional(),
});

export type UpdateDataSourceInput = z.infer<typeof UpdateDataSourceInputSchema>;

/**
 * JSON Schema exports for external validation
 */
export const DataSourceJSONSchema = DataSourceSchema.toJSONSchema();
export const DataSourceACLEntryJSONSchema = DataSourceACLEntrySchema.toJSONSchema();
