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
 * Get the effective ACL role for a user on a DataSource.
 * Owner of the DataSource always has 'owner' role.
 * Returns null if user has no access.
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
 * Check if a role can perform a write operation.
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
 * Grant or update ACL for a user on a DataSource.
 * Requires 'owner' role on the DataSource.
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
 * Revoke a user's access to a DataSource.
 * Requires 'owner' role.
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
