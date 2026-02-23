/**
 * Marketplace reviews — CRUD for widget ratings and reviews
 * Extracted from marketplace-api.ts
 *
 * @module marketplace/api
 * @layer L5
 */

import { supabase } from '../../kernel/supabase';

import { rowToReview } from './mappers';
import type { WidgetReview, PaginatedResult } from './types';

export async function getReviews(
  widgetId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<WidgetReview>> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('widget_reviews')
    .select('*', { count: 'exact' })
    .eq('widget_id', widgetId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to fetch reviews: ${error.message}`);

  const total = count ?? 0;
  const items = (data ?? []).map((row) => rowToReview(row as Record<string, unknown>));

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: from + items.length < total,
  };
}

export async function addReview(
  widgetId: string,
  userId: string,
  rating: number,
  text?: string,
): Promise<void> {
  const { error } = await supabase.from('widget_reviews').insert({
    widget_id: widgetId,
    user_id: userId,
    rating,
    review_text: text ?? null,
  });

  if (error) throw new Error(`Failed to add review: ${error.message}`);
}

export async function updateReview(
  widgetId: string,
  userId: string,
  rating: number,
  text?: string,
): Promise<void> {
  const { error } = await supabase
    .from('widget_reviews')
    .update({
      rating,
      review_text: text ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('widget_id', widgetId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to update review: ${error.message}`);
}

export async function deleteReview(widgetId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('widget_reviews')
    .delete()
    .eq('widget_id', widgetId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete review: ${error.message}`);
}
