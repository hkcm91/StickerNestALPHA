/**
 * Social Graph Canvases API
 * @module kernel/social-graph/canvases
 *
 * Queries for public/shared canvases owned by a user,
 * used on profile pages to showcase a user's work.
 */

import { supabase } from '../supabase';

import type { SocialResult, PaginationOptions, Paginated, QueryResult } from './types';

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
