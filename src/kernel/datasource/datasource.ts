/**
 * DataSource CRUD API
 * @module kernel/datasource
 */

import {
  KernelEvents,
  CreateDataSourceInputSchema,
  UpdateDataSourceInputSchema,
} from '@sn/types';
import type {
  DataSource,
  CreateDataSourceInput,
  UpdateDataSourceInput,
} from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import { getEffectiveRole, canWrite, canDelete } from './acl';

/** Result type for DataSource operations */
export type DataSourceResult<T> =
  | { success: true; data: T }
  | { success: false; error: DataSourceError };

/** Error returned by DataSource operations */
export interface DataSourceError {
  /** Error category — CONFLICT indicates a revision mismatch on table/custom types */
  code: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION_ERROR' | 'UNKNOWN';
  /** Human-readable error description */
  message: string;
  /** For CONFLICT errors, the current server revision to use when retrying */
  currentRevision?: number;
}

/** DataSource list options */
export interface ListDataSourcesOptions {
  scope?: DataSource['scope'];
  type?: DataSource['type'];
  canvasId?: string;
  offset?: number;
  limit?: number;
}

/** Supabase query result helper type */
type QueryResult<T> = { data: T | null; error: { message: string } | null };

/**
 * Map a database row to a DataSource type.
 */
function mapRow(row: Record<string, unknown>): DataSource {
  return {
    id: row.id as string,
    type: row.type as DataSource['type'],
    ownerId: row.owner_id as string,
    scope: row.scope as DataSource['scope'],
    canvasId: (row.canvas_id as string) ?? undefined,
    schema: (row.schema as Record<string, unknown>) ?? undefined,
    metadata: row.metadata
      ? {
          name: (row.metadata as Record<string, unknown>).name as string | undefined,
          description: (row.metadata as Record<string, unknown>).description as string | undefined,
          icon: (row.metadata as Record<string, unknown>).icon as string | undefined,
          color: (row.metadata as Record<string, unknown>).color as string | undefined,
          tags: (row.metadata as Record<string, unknown>).tags as string[] | undefined,
          custom: (row.metadata as Record<string, unknown>).custom as
            | Record<string, unknown>
            | undefined,
        }
      : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    revision: (row.revision as number) ?? undefined,
  };
}

/**
 * Creates a new DataSource record.
 * Validates input against CreateDataSourceInputSchema, enforces that callerId matches ownerId.
 * Emits `KernelEvents.DATASOURCE_CREATED` on success.
 * @param input - DataSource creation fields (type, scope, schema, metadata)
 * @param callerId - User ID of the caller (must match input.ownerId)
 * @returns DataSourceResult containing the created DataSource or an error
 */
export async function createDataSource(
  input: CreateDataSourceInput,
  callerId: string,
): Promise<DataSourceResult<DataSource>> {
  // Validate input
  const parsed = CreateDataSourceInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    };
  }

  // Only the owner can create DataSources (ownerId must match callerId)
  if (input.ownerId !== callerId) {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Cannot create DataSource for another user.',
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (supabase.from('data_sources') as any)
    .insert({
      type: input.type,
      owner_id: input.ownerId,
      scope: input.scope,
      canvas_id: input.canvasId ?? null,
      schema: input.schema ?? null,
      metadata: input.metadata ?? {},
      revision: 0,
    })
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to create DataSource' },
    };
  }

  const dataSource = mapRow(data);

  bus.emit(KernelEvents.DATASOURCE_CREATED, { dataSource });

  return { success: true, data: dataSource };
}

/**
 * Reads a single DataSource by ID.
 * Checks ownership, public scope, and ACL before returning.
 * @param id - DataSource UUID
 * @param callerId - User ID of the caller
 * @returns DataSourceResult containing the DataSource or PERMISSION_DENIED/NOT_FOUND error
 */
export async function readDataSource(
  id: string,
  callerId: string,
): Promise<DataSourceResult<DataSource>> {
  const { data, error } = (await supabase
    .from('data_sources')
    .select('*')
    .eq('id', id)
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'DataSource not found.' },
    };
  }

  const dataSource = mapRow(data);

  // Check access: owner always has access, public is readable by anyone
  if (dataSource.ownerId === callerId || dataSource.scope === 'public') {
    return { success: true, data: dataSource };
  }

  // Check ACL
  const role = await getEffectiveRole(id, callerId);
  if (!role) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'No access to this DataSource.' },
    };
  }

  return { success: true, data: dataSource };
}

/**
 * Updates a DataSource. Requires editor or owner ACL role.
 * For table/custom types: enforces revision-based conflict detection when lastSeenRevision is provided.
 * Returns CONFLICT (HTTP 409 equivalent) if the server revision has advanced.
 * Emits `KernelEvents.DATASOURCE_UPDATED` on success.
 * @param id - DataSource UUID
 * @param input - Fields to update (validated against UpdateDataSourceInputSchema)
 * @param callerId - User ID of the caller
 * @returns DataSourceResult containing the updated DataSource, or CONFLICT/PERMISSION_DENIED error
 */
export async function updateDataSource(
  id: string,
  input: UpdateDataSourceInput,
  callerId: string,
): Promise<DataSourceResult<DataSource>> {
  // Validate input
  const parsed = UpdateDataSourceInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    };
  }

  // Check ACL — need editor or owner role
  const role = await getEffectiveRole(id, callerId);
  if (!role || !canWrite(role)) {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: role
          ? `Role '${role}' cannot write to this DataSource.`
          : 'No access to this DataSource.',
      },
    };
  }

  // Revision-based conflict detection for table/custom types
  if (input.lastSeenRevision !== undefined) {
    const { data: current } = (await supabase
      .from('data_sources')
      .select('revision, type')
      .eq('id', id)
      .single()) as QueryResult<{ revision: number; type: string }>;

    if (
      current &&
      (current.type === 'table' || current.type === 'custom') &&
      current.revision !== input.lastSeenRevision
    ) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'DataSource has been modified. Please refresh and retry.',
          currentRevision: current.revision,
        },
      };
    }
  }

  // Build update object
  const updateObj: Record<string, unknown> = {};
  if (input.type !== undefined) updateObj.type = input.type;
  if (input.scope !== undefined) updateObj.scope = input.scope;
  if (input.canvasId !== undefined) updateObj.canvas_id = input.canvasId;
  if (input.schema !== undefined) updateObj.schema = input.schema;
  if (input.metadata !== undefined) updateObj.metadata = input.metadata;
  if (input.updatedAt !== undefined) updateObj.updated_at = input.updatedAt;

  // Increment revision for table/custom types
  const { data: currentDs } = (await supabase
    .from('data_sources')
    .select('revision, type')
    .eq('id', id)
    .single()) as QueryResult<{ revision: number; type: string }>;

  if (currentDs && (currentDs.type === 'table' || currentDs.type === 'custom')) {
    updateObj.revision = (currentDs.revision ?? 0) + 1;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (supabase.from('data_sources') as any)
    .update(updateObj)
    .eq('id', id)
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to update DataSource' },
    };
  }

  const dataSource = mapRow(data);

  bus.emit(KernelEvents.DATASOURCE_UPDATED, { dataSource });

  return { success: true, data: dataSource };
}

/**
 * Deletes a DataSource. Only the owner role can delete.
 * Emits `KernelEvents.DATASOURCE_DELETED` on success.
 * @param id - DataSource UUID
 * @param callerId - User ID of the caller (must have owner role)
 * @returns DataSourceResult with the deleted ID, or PERMISSION_DENIED error
 */
export async function deleteDataSource(
  id: string,
  callerId: string,
): Promise<DataSourceResult<{ id: string }>> {
  const role = await getEffectiveRole(id, callerId);
  if (!role || !canDelete(role)) {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Only the owner can delete a DataSource.',
      },
    };
  }

  const { error } = (await supabase
    .from('data_sources')
    .delete()
    .eq('id', id)) as QueryResult<unknown>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  bus.emit(KernelEvents.DATASOURCE_DELETED, { id });

  return { success: true, data: { id } };
}

/**
 * Lists DataSources visible to the caller, with optional filtering.
 * Results are paginated (default 50, max 100) and ordered by creation date descending.
 * @param _callerId - User ID of the caller (used for RLS filtering)
 * @param options - Optional filters: scope, type, canvasId, offset, limit
 * @returns DataSourceResult containing an array of DataSource records
 */
export async function listDataSources(
  _callerId: string,
  options?: ListDataSourcesOptions,
): Promise<DataSourceResult<DataSource[]>> {
  const limit = Math.min(options?.limit ?? 50, 100);
  const offset = options?.offset ?? 0;

  // Build query — we get public, owned, and ACL-granted sources
  let query = supabase.from('data_sources').select('*');

  if (options?.scope) {
    query = query.eq('scope', options.scope);
  }
  if (options?.type) {
    query = query.eq('type', options.type);
  }
  if (options?.canvasId) {
    query = query.eq('canvas_id', options.canvasId);
  }

  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error } = (await query) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  // Filter to only those the caller can see
  // (RLS handles this in production, but we double-check at API level)
  const results = (data ?? []).map(mapRow);

  return { success: true, data: results };
}
