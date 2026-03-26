/**
 * DataSource ACL — access control logic
 * @module kernel/datasource/acl
 */

import type { DataSourceACLRole, DataSourceACLEntry } from '@sn/types';

import { supabase } from '../supabase';

/** Result type for ACL operations */
export type ACLResult<T> =
  | { success: true; data: T }
  | { success: false; error: ACLError };

export interface ACLError {
  code: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'UNKNOWN';
  message: string;
}

/**
 * Resolves the effective ACL role for a user on a DataSource.
 * Hierarchy: owner > editor > commenter > viewer.
 * The DataSource owner always gets 'owner' role regardless of ACL table entries.
 * @param dataSourceId - DataSource UUID to check
 * @param userId - User ID to resolve the role for
 * @returns The user's effective role, or null if they have no access
 */
export async function getEffectiveRole(
  dataSourceId: string,
  userId: string,
): Promise<DataSourceACLRole | null> {
  // Check if the user is the owner
  const { data: ds, error: dsError } = (await supabase
    .from('data_sources')
    .select('owner_id')
    .eq('id', dataSourceId)
    .single()) as { data: { owner_id: string } | null; error: unknown };

  if (dsError || !ds) {
    return null;
  }

  if (ds.owner_id === userId) {
    return 'owner';
  }

  // Check ACL table
  const { data: acl, error: aclError } = (await supabase
    .from('data_source_acl')
    .select('role')
    .eq('data_source_id', dataSourceId)
    .eq('user_id', userId)
    .single()) as { data: { role: string } | null; error: unknown };

  if (aclError || !acl) {
    return null;
  }

  return acl.role as DataSourceACLRole;
}

/**
 * Checks if a role permits write operations (mutating source data).
 * Only 'owner' and 'editor' roles can write. Commenters and viewers cannot.
 * @param role - The ACL role to check
 */
export function canWrite(role: DataSourceACLRole): boolean {
  return role === 'owner' || role === 'editor';
}

/**
 * Check if a role can delete.
 */
export function canDelete(role: DataSourceACLRole): boolean {
  return role === 'owner';
}

/**
 * Check if a role can manage ACL.
 */
export function canManageACL(role: DataSourceACLRole): boolean {
  return role === 'owner';
}

/**
 * Grants or updates ACL for a user on a DataSource. Uses upsert — existing entries are updated.
 * Only the DataSource owner can grant access.
 * @param dataSourceId - DataSource UUID
 * @param targetUserId - User ID to grant access to
 * @param role - ACL role to assign (owner, editor, commenter, viewer)
 * @param granterId - User ID of the granter (must have owner role)
 * @returns ACLResult with the created/updated ACL entry or PERMISSION_DENIED error
 */
export async function grantAccess(
  dataSourceId: string,
  targetUserId: string,
  role: DataSourceACLRole,
  granterId: string,
): Promise<ACLResult<DataSourceACLEntry>> {
  const granterRole = await getEffectiveRole(dataSourceId, granterId);

  if (!granterRole || !canManageACL(granterRole)) {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Only the owner can manage access control.',
      },
    };
  }

  const now = new Date().toISOString();

  interface ACLRow { user_id: string; role: string; created_at: string; granted_by: string | null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (supabase.from('data_source_acl') as any)
    .upsert({
      data_source_id: dataSourceId,
      user_id: targetUserId,
      role,
      granted_by: granterId,
      updated_at: now,
    })
    .select()
    .single()) as { data: ACLRow | null; error: { message: string } | null };

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to grant access' },
    };
  }

  return {
    success: true,
    data: {
      userId: data.user_id,
      role: data.role as DataSourceACLRole,
      grantedAt: data.created_at,
      grantedBy: data.granted_by,
    },
  };
}

/**
 * Revokes a user's access to a DataSource by deleting their ACL entry.
 * Only the DataSource owner can revoke access.
 * @param dataSourceId - DataSource UUID
 * @param targetUserId - User ID whose access is being revoked
 * @param revokerId - User ID of the revoker (must have owner role)
 * @returns ACLResult confirming removal or PERMISSION_DENIED error
 */
export async function revokeAccess(
  dataSourceId: string,
  targetUserId: string,
  revokerId: string,
): Promise<ACLResult<{ removed: boolean }>> {
  const revokerRole = await getEffectiveRole(dataSourceId, revokerId);

  if (!revokerRole || !canManageACL(revokerRole)) {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Only the owner can revoke access.',
      },
    };
  }

  const { error } = await supabase
    .from('data_source_acl')
    .delete()
    .eq('data_source_id', dataSourceId)
    .eq('user_id', targetUserId);

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  return { success: true, data: { removed: true } };
}
