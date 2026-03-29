/**
 * Leaderboard API — kernel service for score submission, ranking, and real-time updates
 * @module kernel/leaderboard
 *
 * @remarks
 * L0 code — imports only from `src/kernel/**`.
 * Scores are upserted (only if new score is higher).
 * Real-time updates via Supabase Realtime subscriptions.
 */

import {
  LeaderboardEvents,
  SubmitScoreInputSchema,
} from '@sn/types';
import type {
  LeaderboardEntry,
  LeaderboardScope,
  RankedLeaderboardEntry,
  UserRankResponse,
} from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Result type for leaderboard operations */
export type LeaderboardResult<T> =
  | { success: true; data: T }
  | { success: false; error: LeaderboardError };

/** Error returned by leaderboard operations */
export interface LeaderboardError {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNKNOWN';
  message: string;
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

function mapRow(row: Record<string, unknown>): LeaderboardEntry {
  return {
    id: row.id as string,
    widgetId: row.widget_id as string,
    canvasId: (row.canvas_id as string) ?? null,
    userId: row.user_id as string,
    displayName: row.display_name as string,
    score: Number(row.score),
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// submitScore
// ---------------------------------------------------------------------------

/**
 * Submit (upsert) a score. Only updates when the new score is higher than
 * the existing one for the same user + widget + scope.
 *
 * @param widgetId - Widget type ID from manifest
 * @param canvasId - Canvas ID for canvas-scoped boards, or null for global
 * @param userId - Authenticated user ID
 * @param displayName - Display name at time of submission
 * @param score - The score value
 * @param metadata - Optional metadata (level, time, etc.)
 */
export async function submitScore(
  widgetId: string,
  canvasId: string | null,
  userId: string,
  displayName: string,
  score: number,
  metadata?: Record<string, unknown>,
): Promise<LeaderboardResult<LeaderboardEntry>> {
  // Validate input subset
  const parsed = SubmitScoreInputSchema.safeParse({ score, metadata });
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    };
  }

  // Check for existing entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not yet in generated Database types
  let query = (supabase.from('leaderboard_entries') as any)
    .select('*')
    .eq('widget_id', widgetId)
    .eq('user_id', userId);

  if (canvasId) {
    query = query.eq('canvas_id', canvasId);
  } else {
    query = query.is('canvas_id', null);
  }

  const { data: existing, error: fetchError } = await query.maybeSingle();

  if (fetchError) {
    return { success: false, error: { code: 'UNKNOWN', message: fetchError.message } };
  }

  // If existing score is higher or equal, no-op — return existing entry
  if (existing && Number((existing as Record<string, unknown>).score) >= score) {
    const entry = mapRow(existing as Record<string, unknown>);
    bus.emit(LeaderboardEvents.SCORE_SUBMITTED, {
      entry,
      isNewHighScore: false,
    });
    return { success: true, data: entry };
  }

  // Upsert: insert or update
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not yet in generated Database types
  let result: { data: unknown; error: { message: string } | null };
  if (existing) {
    // Update existing entry with higher score
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
    result = await (supabase.from('leaderboard_entries') as any)
      .update({
        score,
        display_name: displayName,
        metadata: metadata ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existing as Record<string, unknown>).id)
      .select('*')
      .single();
  } else {
    // Insert new entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
    result = await (supabase.from('leaderboard_entries') as any)
      .insert({
        widget_id: widgetId,
        canvas_id: canvasId,
        user_id: userId,
        display_name: displayName,
        score,
        metadata: metadata ?? {},
      })
      .select('*')
      .single();
  }

  if (result.error) {
    return { success: false, error: { code: 'UNKNOWN', message: result.error.message } };
  }

  const entry = mapRow(result.data as Record<string, unknown>);

  bus.emit(LeaderboardEvents.SCORE_SUBMITTED, {
    entry,
    isNewHighScore: true,
  });

  return { success: true, data: entry };
}

// ---------------------------------------------------------------------------
// getTopScores
// ---------------------------------------------------------------------------

/**
 * Retrieve top scores for a widget, ranked by score descending.
 *
 * @param widgetId - Widget type ID
 * @param scope - 'canvas' or 'global'
 * @param canvasId - Required when scope is 'canvas'
 * @param limit - Max entries to return (default 10, max 100)
 * @param offset - Pagination offset (default 0)
 */
export async function getTopScores(
  widgetId: string,
  scope: LeaderboardScope,
  canvasId?: string,
  limit: number = 10,
  offset: number = 0,
): Promise<LeaderboardResult<RankedLeaderboardEntry[]>> {
  const clampedLimit = Math.min(Math.max(1, limit), 100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not yet in generated Database types
  let query = (supabase.from('leaderboard_entries') as any)
    .select('*')
    .eq('widget_id', widgetId)
    .order('score', { ascending: false })
    .range(offset, offset + clampedLimit - 1);

  if (scope === 'canvas') {
    if (!canvasId) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'canvasId is required for canvas scope' },
      };
    }
    query = query.eq('canvas_id', canvasId);
  } else {
    query = query.is('canvas_id', null);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: { code: 'UNKNOWN', message: error.message } };
  }

  const entries: RankedLeaderboardEntry[] = ((data as Record<string, unknown>[]) ?? []).map(
    (row, index) => ({
      ...mapRow(row),
      rank: offset + index + 1,
    }),
  );

  return { success: true, data: entries };
}

// ---------------------------------------------------------------------------
// getUserRank
// ---------------------------------------------------------------------------

/**
 * Get a specific user's rank and score on a leaderboard.
 *
 * @param widgetId - Widget type ID
 * @param scope - 'canvas' or 'global'
 * @param canvasId - Required when scope is 'canvas'
 * @param userId - The user to look up
 */
export async function getUserRank(
  widgetId: string,
  scope: LeaderboardScope,
  canvasId: string | undefined,
  userId: string,
): Promise<LeaderboardResult<UserRankResponse>> {
  // First, get the user's entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not yet in generated Database types
  let userQuery = (supabase.from('leaderboard_entries') as any)
    .select('*')
    .eq('widget_id', widgetId)
    .eq('user_id', userId);

  if (scope === 'canvas') {
    if (!canvasId) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'canvasId is required for canvas scope' },
      };
    }
    userQuery = userQuery.eq('canvas_id', canvasId);
  } else {
    userQuery = userQuery.is('canvas_id', null);
  }

  const { data: userData, error: userError } = await userQuery.maybeSingle();

  if (userError) {
    return { success: false, error: { code: 'UNKNOWN', message: userError.message } };
  }

  if (!userData) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'User has no entry on this leaderboard' } };
  }

  const userScore = Number((userData as Record<string, unknown>).score);

  // Count entries with a higher score to determine rank
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not yet in generated Database types
  let countQuery = (supabase.from('leaderboard_entries') as any)
    .select('id', { count: 'exact', head: true })
    .eq('widget_id', widgetId)
    .gt('score', userScore);

  if (scope === 'canvas') {
    countQuery = countQuery.eq('canvas_id', canvasId!);
  } else {
    countQuery = countQuery.is('canvas_id', null);
  }

  const { count: higherCount, error: countError } = await countQuery;

  if (countError) {
    return { success: false, error: { code: 'UNKNOWN', message: countError.message } };
  }

  // Get total count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not yet in generated Database types
  let totalQuery = (supabase.from('leaderboard_entries') as any)
    .select('id', { count: 'exact', head: true })
    .eq('widget_id', widgetId);

  if (scope === 'canvas') {
    totalQuery = totalQuery.eq('canvas_id', canvasId!);
  } else {
    totalQuery = totalQuery.is('canvas_id', null);
  }

  const { count: totalCount, error: totalError } = await totalQuery;

  if (totalError) {
    return { success: false, error: { code: 'UNKNOWN', message: totalError.message } };
  }

  return {
    success: true,
    data: {
      rank: (higherCount ?? 0) + 1,
      score: userScore,
      total: totalCount ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// subscribeToUpdates
// ---------------------------------------------------------------------------

/**
 * Subscribe to real-time leaderboard changes via Supabase Realtime.
 * Emits LeaderboardEvents.UPDATED on the event bus whenever the table changes.
 *
 * @param widgetId - Widget type ID to filter updates
 * @param scope - 'canvas' or 'global'
 * @param canvasId - Required when scope is 'canvas'
 * @returns Unsubscribe function to remove the Realtime subscription
 */
export function subscribeToUpdates(
  widgetId: string,
  scope: LeaderboardScope,
  canvasId?: string,
): () => void {
  const channelName = canvasId
    ? `leaderboard:${widgetId}:${canvasId}`
    : `leaderboard:${widgetId}:global`;

  const filter = canvasId
    ? `widget_id=eq.${widgetId},canvas_id=eq.${canvasId}`
    : `widget_id=eq.${widgetId},canvas_id=is.null`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as 'system',
      {
        event: '*',
        schema: 'public',
        table: 'leaderboard_entries',
        filter,
      } as Record<string, unknown>,
      (payload: Record<string, unknown>) => {
        bus.emit(LeaderboardEvents.UPDATED, {
          widgetId,
          scope,
          canvasId: canvasId ?? null,
          payload,
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
