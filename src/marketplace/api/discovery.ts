/**
 * Marketplace discovery — search, browse, and fetch widget listings
 * Extracted from marketplace-api.ts
 *
 * @module marketplace/api
 * @layer L5
 */

import { supabase } from '../../kernel/supabase';

import { rowToListing, rowToDetail, LISTING_COLUMNS } from './mappers';
import type {
  SearchParams,
  PaginatedResult,
  MarketplaceWidgetListing,
  MarketplaceWidgetDetail,
} from './types';

export async function search(params: SearchParams): Promise<PaginatedResult<MarketplaceWidgetListing>> {
  const { page, pageSize, query, category, sortBy } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('widgets')
    .select(LISTING_COLUMNS, { count: 'exact' })
    .eq('is_published', true);

  if (query) {
    q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
  }
  if (category) {
    q = q.eq('category', category);
  }
  if (params.tags && params.tags.length > 0) {
    q = q.overlaps('tags', params.tags);
  }

  switch (sortBy) {
    case 'rating':
      q = q.order('rating_average', { ascending: false, nullsFirst: false });
      break;
    case 'installs':
      q = q.order('install_count', { ascending: false });
      break;
    case 'newest':
    default:
      q = q.order('created_at', { ascending: false });
      break;
  }

  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) throw new Error(`Search failed: ${error.message}`);

  const total = count ?? 0;
  const items = (data ?? []).map((row) => rowToListing(row as Record<string, unknown>));

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: from + items.length < total,
  };
}

export async function getFeatured(): Promise<MarketplaceWidgetListing[]> {
  const { data, error } = await supabase
    .from('widgets')
    .select(LISTING_COLUMNS)
    .eq('is_published', true)
    .eq('is_deprecated', false)
    .order('rating_average', { ascending: false, nullsFirst: false })
    .limit(12);

  if (error) throw new Error(`Failed to fetch featured: ${error.message}`);
  return (data ?? []).map((row) => rowToListing(row as Record<string, unknown>));
}

export async function getWidget(widgetId: string): Promise<MarketplaceWidgetDetail | null> {
  const { data, error } = await supabase
    .from('widgets')
    .select('*')
    .eq('id', widgetId)
    .single();

  if (error) return null;
  return rowToDetail(data as Record<string, unknown>);
}

export async function getWidgetBySlug(slug: string): Promise<MarketplaceWidgetDetail | null> {
  const { data, error } = await supabase
    .from('widgets')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return rowToDetail(data as Record<string, unknown>);
}
