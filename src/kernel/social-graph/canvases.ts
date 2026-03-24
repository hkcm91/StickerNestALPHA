/**
 * Social Graph Canvases API
 * @module kernel/social-graph/canvases
 *
 * Manages canvas membership, access control, and public canvas queries.
 * Used for profile pages to showcase a user's work and for
 * multi-user canvas collaboration management.
 */

import { SocialGraphEvents } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import type { SocialResult, PaginationOptions, Paginated, QueryResult } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CanvasRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface PublicCanvas {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasMember {
  canvasId: string;
  userId: string;
  role: CanvasRole;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mappers
// ─────────────────────────────────────────────────────────────────────────────

function mapCanvasRow(row: Record<string, unknown>): PublicCanvas {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: (row.slug as string) ?? null,
    description: (row.description as string) ?? null,
    thumbnailUrl: (row.thumbnail_url as string) ?? null,
    ownerId: row.owner_id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapMemberRow(row: Record<string, unknown>): CanvasMember {
  return {
    canvasId: row.canvas_id as string,
    userId: row.user_id as string,
    role: row.role as CanvasRole,
    invitedBy: (row.invited_by as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up the owner of a canvas. Returns owner_id or null if canvas not found.
 */
async function getCanvasOwnerId(canvasId: string): Promise<string | null> {
  const { data } = (await supabase
    .from('canvases')
    .select('owner_id')
    .eq('id', canvasId)
    .single()) as QueryResult<{ owner_id: string }>;
  return data?.owner_id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Canvas Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get public canvases owned by a user.
 */
export async function getUserPublicCanvases(
  userId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<Paginated<PublicCanvas>>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('canvases')
    .select('id, name, slug, description, thumbnail_url, owner_id, created_at, updated_at')
    .eq('owner_id', userId)
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt('updated_at', options.cursor);
  }

  const { data, error } = (await query) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const items = (data ?? []).slice(0, limit);
  const hasMore = (data ?? []).length > limit;
  const nextCursor =
    hasMore && items.length > 0
      ? (items[items.length - 1].updated_at as string)
      : undefined;

  return {
    success: true,
    data: {
      items: items.map(mapCanvasRow),
      nextCursor,
      hasMore,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas Member Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a member to a canvas. Caller must be the canvas owner.
 */
export async function addCanvasMember(
  canvasId: string,
  userId: string,
  role: CanvasRole,
  callerId: string,
): Promise<SocialResult<CanvasMember>> {
  // Cannot add yourself
  if (userId === callerId) {
    return {
      success: false,
      error: { code: 'SELF_ACTION', message: 'Cannot add yourself as a member.' },
    };
  }

  // Cannot assign owner role via this function
  if (role === 'owner') {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Cannot assign owner role. Transfer ownership instead.' },
    };
  }

  // Check caller is canvas owner
  const ownerId = await getCanvasOwnerId(canvasId);
  if (!ownerId) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Canvas not found.' },
    };
  }
  if (ownerId !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Only canvas owner can add members.' },
    };
  }

  // Insert member
  const { data, error } = (await supabase
    .from('canvas_members')
    .insert({
      canvas_id: canvasId,
      user_id: userId,
      role,
      invited_by: callerId,
    })
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    if (error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
      return {
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'User is already a member of this canvas.' },
      };
    }
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to add canvas member.' },
    };
  }

  const member = mapMemberRow(data);

  bus.emit(SocialGraphEvents.CANVAS_MEMBER_ADDED, {
    canvasId,
    userId,
    role,
    invitedBy: callerId,
  });

  return { success: true, data: member };
}

/**
 * Remove a member from a canvas. Caller must be the canvas owner.
 * Cannot remove the canvas owner.
 */
export async function removeCanvasMember(
  canvasId: string,
  userId: string,
  callerId: string,
): Promise<SocialResult<{ removed: true }>> {
  // Check caller is canvas owner
  const ownerId = await getCanvasOwnerId(canvasId);
  if (!ownerId) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Canvas not found.' },
    };
  }
  if (ownerId !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Only canvas owner can remove members.' },
    };
  }

  // Cannot remove the canvas owner
  if (userId === ownerId) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Cannot remove the canvas owner.' },
    };
  }

  const { error, data } = (await supabase
    .from('canvas_members')
    .delete()
    .eq('canvas_id', canvasId)
    .eq('user_id', userId)
    .select('user_id')) as QueryResult<Array<{ user_id: string }>>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'User is not a member of this canvas.' },
    };
  }

  bus.emit(SocialGraphEvents.CANVAS_MEMBER_REMOVED, {
    canvasId,
    userId,
    removedBy: callerId,
  });

  return { success: true, data: { removed: true } };
}

/**
 * Update a canvas member's role. Caller must be the canvas owner.
 */
export async function updateCanvasMemberRole(
  canvasId: string,
  userId: string,
  role: CanvasRole,
  callerId: string,
): Promise<SocialResult<CanvasMember>> {
  // Cannot set owner role
  if (role === 'owner') {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Cannot assign owner role. Transfer ownership instead.' },
    };
  }

  // Check caller is canvas owner
  const ownerId = await getCanvasOwnerId(canvasId);
  if (!ownerId) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Canvas not found.' },
    };
  }
  if (ownerId !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Only canvas owner can change member roles.' },
    };
  }

  const { data, error } = (await supabase
    .from('canvas_members')
    .update({ role })
    .eq('canvas_id', canvasId)
    .eq('user_id', userId)
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Member not found.' },
    };
  }

  const member = mapMemberRow(data);

  bus.emit(SocialGraphEvents.CANVAS_MEMBER_ROLE_CHANGED, {
    canvasId,
    userId,
    role,
    changedBy: callerId,
  });

  return { success: true, data: member };
}

/**
 * Get all members of a canvas. Caller must be a member or the owner.
 */
export async function getCanvasMembers(
  canvasId: string,
  callerId: string,
): Promise<SocialResult<CanvasMember[]>> {
  // Verify caller has access (is owner or member)
  const ownerId = await getCanvasOwnerId(canvasId);
  if (!ownerId) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Canvas not found.' },
    };
  }

  if (ownerId !== callerId) {
    const { data: membership } = (await supabase
      .from('canvas_members')
      .select('user_id')
      .eq('canvas_id', canvasId)
      .eq('user_id', callerId)
      .single()) as QueryResult<{ user_id: string }>;

    if (!membership) {
      return {
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'Must be a canvas member to view members.' },
      };
    }
  }

  const { data, error } = (await supabase
    .from('canvas_members')
    .select('*')
    .eq('canvas_id', canvasId)
    .order('created_at', { ascending: true })) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  return { success: true, data: (data ?? []).map(mapMemberRow) };
}

/**
 * Get a user's role on a canvas.
 * Returns 'owner' for canvas owners even if not in canvas_members.
 * Returns null if the user has no role.
 */
export async function getCanvasRole(
  canvasId: string,
  userId: string,
): Promise<SocialResult<CanvasRole | null>> {
  // Check ownership first
  const ownerId = await getCanvasOwnerId(canvasId);
  if (!ownerId) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Canvas not found.' },
    };
  }

  if (ownerId === userId) {
    return { success: true, data: 'owner' };
  }

  // Check membership
  const { data } = (await supabase
    .from('canvas_members')
    .select('role')
    .eq('canvas_id', canvasId)
    .eq('user_id', userId)
    .single()) as QueryResult<{ role: CanvasRole }>;

  return { success: true, data: data?.role ?? null };
}

/**
 * Get canvases shared with a user (where they are a member, not the owner).
 */
export async function getSharedCanvases(
  userId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<Paginated<CanvasMember>>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('canvas_members')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt('created_at', options.cursor);
  }

  const { data, error } = (await query) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const items = (data ?? []).slice(0, limit).map(mapMemberRow);
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}
