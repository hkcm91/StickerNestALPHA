/**
 * Leaderboard schemas
 * @module @sn/types/leaderboard
 *
 * @remarks
 * Leaderboards track per-widget-type scores at two scopes:
 * - `canvas`: scores scoped to a single canvas (local competition)
 * - `global`: scores across all canvases platform-wide
 *
 * Persisted in Supabase `leaderboard_entries` table with RLS.
 * Real-time updates via Supabase Realtime subscriptions.
 */

import { z } from 'zod';

/**
 * Leaderboard scope
 */
export const LeaderboardScopeSchema = z.enum(['canvas', 'global']);

export type LeaderboardScope = z.infer<typeof LeaderboardScopeSchema>;

/**
 * A single leaderboard entry (one per user per widget per scope)
 */
export const LeaderboardEntrySchema = z.object({
  /** Entry ID */
  id: z.string().uuid(),
  /** Widget type ID (from manifest) — determines which game's leaderboard */
  widgetId: z.string().min(1),
  /** Canvas ID (null = global leaderboard) */
  canvasId: z.string().uuid().nullable(),
  /** User who achieved the score */
  userId: z.string().uuid(),
  /** Display name at time of submission */
  displayName: z.string().min(1),
  /** The score value */
  score: z.number(),
  /** Optional metadata (level reached, time taken, etc.) */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** When the entry was first created */
  createdAt: z.string().datetime(),
  /** When the score was last updated */
  updatedAt: z.string().datetime(),
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

/**
 * Input schema for submitting a score (used by SDK → bridge)
 * widgetId and canvasId are injected by the bridge — not provided by the widget.
 */
export const SubmitScoreInputSchema = z.object({
  score: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SubmitScoreInput = z.infer<typeof SubmitScoreInputSchema>;

/**
 * Leaderboard query options
 */
export const LeaderboardQueryOptionsSchema = z.object({
  scope: LeaderboardScopeSchema,
  limit: z.number().int().positive().max(100).optional().default(10),
  offset: z.number().int().nonnegative().optional().default(0),
});

export type LeaderboardQueryOptions = z.infer<typeof LeaderboardQueryOptionsSchema>;

/**
 * Ranked leaderboard entry (includes rank position)
 */
export const RankedLeaderboardEntrySchema = LeaderboardEntrySchema.extend({
  /** 1-based rank position */
  rank: z.number().int().positive(),
});

export type RankedLeaderboardEntry = z.infer<typeof RankedLeaderboardEntrySchema>;

/**
 * User rank response
 */
export const UserRankResponseSchema = z.object({
  rank: z.number().int().positive(),
  score: z.number(),
  total: z.number().int().nonnegative(),
});

export type UserRankResponse = z.infer<typeof UserRankResponseSchema>;

/**
 * JSON Schema exports for external validation
 */
export const LeaderboardEntryJSONSchema = LeaderboardEntrySchema.toJSONSchema();
export const RankedLeaderboardEntryJSONSchema = RankedLeaderboardEntrySchema.toJSONSchema();
