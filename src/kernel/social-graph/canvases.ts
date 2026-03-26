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
  tags: string[];
  memberCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Derived canvas category based on visibility and membership */
export type CanvasCategory = 'public' | 'private' | 'collaborative';

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
    tags: (row.tags as string[]) ?? [],
    memberCount: typeof row.member_count === 'number' ? row.member_count : 0,
    isPublic: (row.is_public as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Derive category from canvas data */
export function deriveCanvasCategory(canvas: PublicCanvas): CanvasCategory {
  if (canvas.isPublic) return 'public';
  if (canvas.memberCount > 0) return 'collaborative';
  return 'private';
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
    .select('id, name, slug, description, thumbnail_url, owner_id, tags, is_public, created_at, updated_at')
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
 * Returns canvas metadata joined from the canvases table.
 */
export async function getSharedCanvases(
  userId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<Paginated<PublicCanvas>>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('canvas_members')
    .select('canvas_id, role, created_at, canvases(id, name, slug, description, thumbnail_url, owner_id, tags, is_public, created_at, updated_at)')
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

  const rows = (data ?? []).slice(0, limit);
  const hasMore = (data ?? []).length > limit;
  const items = rows
    .map((row) => {
      const canvas = row.canvases as Record<string, unknown> | null;
      if (!canvas) return null;
      return mapCanvasRow(canvas);
    })
    .filter((c): c is PublicCanvas => c !== null);
  const nextCursor = hasMore && rows.length > 0 ? (rows[rows.length - 1].created_at as string) : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Owner Canvas Queries (for profile+gallery page)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get ALL canvases owned by a user (public + private).
 * Only the owner can call this — used for the unified profile+gallery page.
 */
export async function getUserCanvases(
  userId: string,
  callerId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<Paginated<PublicCanvas>>> {
  if (userId !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Can only view your own full canvas list.' },
    };
  }

  const limit = Math.min(options.limit ?? 50, 100);

  let query = supabase
    .from('canvases')
    .select('id, name, slug, description, thumbnail_url, owner_id, tags, is_public, created_at, updated_at')
    .eq('owner_id', userId)
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

  const rows = (data ?? []).slice(0, limit);
  const hasMore = (data ?? []).length > limit;
  const items = rows.map(mapCanvasRow);

  // Fetch member counts for all canvases in a single query
  const canvasIds = items.map((c) => c.id);
  if (canvasIds.length > 0) {
    const { data: memberCounts } = (await supabase
      .from('canvas_members')
      .select('canvas_id')
      .in('canvas_id', canvasIds)) as QueryResult<Array<{ canvas_id: string }>>;

    if (memberCounts) {
      const countMap = new Map<string, number>();
      for (const row of memberCounts) {
        countMap.set(row.canvas_id, (countMap.get(row.canvas_id) ?? 0) + 1);
      }
      for (const item of items) {
        item.memberCount = countMap.get(item.id) ?? 0;
      }
    }
  }

  const nextCursor =
    hasMore && items.length > 0
      ? items[items.length - 1].updatedAt
      : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas Metadata Updates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update tags on a canvas. Caller must be the canvas owner.
 */
export async function updateCanvasTags(
  canvasId: string,
  tags: string[],
  callerId: string,
): Promise<SocialResult<{ tags: string[] }>> {
  // Validate tags
  if (tags.length > 20) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Maximum 20 tags allowed.' },
    };
  }
  for (const tag of tags) {
    if (tag.length > 50) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Tag "${tag}" exceeds 50 character limit.` },
      };
    }
  }

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
      error: { code: 'PERMISSION_DENIED', message: 'Only canvas owner can update tags.' },
    };
  }

  const { error } = (await supabase
    .from('canvases')
    .update({ tags } as Record<string, unknown>)
    .eq('id', canvasId)) as QueryResult<null>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  bus.emit(SocialGraphEvents.CANVAS_TAGS_UPDATED, { canvasId, tags, updatedBy: callerId });

  return { success: true, data: { tags } };
}

/**
 * Update thumbnail URL on a canvas. Caller must be the canvas owner or an editor.
 */
export async function updateCanvasThumbnail(
  canvasId: string,
  thumbnailUrl: string,
  callerId: string,
): Promise<SocialResult<{ thumbnailUrl: string }>> {
  const ownerId = await getCanvasOwnerId(canvasId);
  if (!ownerId) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Canvas not found.' },
    };
  }

  // Allow owner or editor
  if (ownerId !== callerId) {
    const { data: membership } = (await supabase
      .from('canvas_members')
      .select('role')
      .eq('canvas_id', canvasId)
      .eq('user_id', callerId)
      .single()) as QueryResult<{ role: CanvasRole }>;

    if (!membership || (membership.role !== 'editor')) {
      return {
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'Only canvas owner or editor can update thumbnail.' },
      };
    }
  }

  const { error } = (await supabase
    .from('canvases')
    .update({ thumbnail_url: thumbnailUrl })
    .eq('id', canvasId)) as QueryResult<null>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  bus.emit(SocialGraphEvents.CANVAS_THUMBNAIL_UPDATED, { canvasId, thumbnailUrl, updatedBy: callerId });

  return { success: true, data: { thumbnailUrl } };
}
