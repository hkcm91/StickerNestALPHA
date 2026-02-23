/**
 * Social Graph Reactions API
 * @module kernel/social-graph/reactions
 */

import { SocialGraphEvents } from '@sn/types';
import type { Reaction, ReactionType, ReactionTargetType } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import type { SocialResult, QueryResult } from './types';

/**
 * Map a database row to a Reaction type.
 */
function mapReactionRow(row: Record<string, unknown>): Reaction {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    targetType: row.target_type as ReactionTargetType,
    targetId: row.target_id as string,
    type: row.type as ReactionType,
    createdAt: row.created_at as string,
  };
}

/**
 * Add a reaction to a target.
 */
export async function addReaction(
  targetType: ReactionTargetType,
  targetId: string,
  reactionType: ReactionType,
  callerId: string,
): Promise<SocialResult<Reaction>> {
  // Check if already reacted
  const { data: existing } = (await supabase
    .from('reactions')
    .select('*')
    .eq('user_id', callerId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .single()) as QueryResult<Record<string, unknown>>;

  if (existing) {
    // Update existing reaction if different type
    if (existing.type !== reactionType) {
      const { data, error } = (await supabase
        .from('reactions')
        .update({ type: reactionType })
        .eq('id', existing.id as string)
        .select()
        .single()) as QueryResult<Record<string, unknown>>;

      if (error || !data) {
        return {
          success: false,
          error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to update reaction.' },
        };
      }

      const reaction = mapReactionRow(data);
      bus.emit(SocialGraphEvents.REACTION_ADDED, { reaction });
      return { success: true, data: reaction };
    }

    // Same reaction type - already exists
    return {
      success: false,
      error: { code: 'ALREADY_EXISTS', message: 'Already reacted with this type.' },
    };
  }

  const { data, error } = (await supabase
    .from('reactions')
    .insert({
      user_id: callerId,
      target_type: targetType,
      target_id: targetId,
      type: reactionType,
    })
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to add reaction.' },
    };
  }

  const reaction = mapReactionRow(data);

  bus.emit(SocialGraphEvents.REACTION_ADDED, { reaction });

  return { success: true, data: reaction };
}

/**
 * Remove a reaction from a target.
 */
export async function removeReaction(
  targetType: ReactionTargetType,
  targetId: string,
  callerId: string,
): Promise<SocialResult<{ id: string }>> {
  const { data: existing } = (await supabase
    .from('reactions')
    .select('id')
    .eq('user_id', callerId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .single()) as QueryResult<{ id: string }>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'No reaction to remove.' },
    };
  }

  const { error } = await supabase.from('reactions').delete().eq('id', existing.id);

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  bus.emit(SocialGraphEvents.REACTION_REMOVED, {
    targetType,
    targetId,
    userId: callerId,
  });

  return { success: true, data: { id: existing.id } };
}

/**
 * Get reactions for a target.
 */
export async function getReactions(
  targetType: ReactionTargetType,
  targetId: string,
): Promise<SocialResult<Reaction[]>> {
  const { data, error } = (await supabase
    .from('reactions')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  return { success: true, data: (data ?? []).map(mapReactionRow) };
}

/**
 * Get reaction counts by type for a target.
 */
export async function getReactionCounts(
  targetType: ReactionTargetType,
  targetId: string,
): Promise<SocialResult<Record<ReactionType, number>>> {
  const { data, error } = (await supabase
    .from('reactions')
    .select('type')
    .eq('target_type', targetType)
    .eq('target_id', targetId)) as QueryResult<Array<{ type: ReactionType }>>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const counts: Record<ReactionType, number> = {
    like: 0,
    love: 0,
    laugh: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  };

  for (const row of data ?? []) {
    counts[row.type]++;
  }

  return { success: true, data: counts };
}

/**
 * Check if a user has reacted to a target.
 */
export async function getUserReaction(
  targetType: ReactionTargetType,
  targetId: string,
  userId: string,
): Promise<SocialResult<Reaction | null>> {
  const { data, error } = (await supabase
    .from('reactions')
    .select('*')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .single()) as QueryResult<Record<string, unknown>>;

  if (error && !error.message.includes('No rows')) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  return { success: true, data: data ? mapReactionRow(data) : null };
}
