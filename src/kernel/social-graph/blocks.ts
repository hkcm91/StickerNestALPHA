/**
 * Social Graph Blocks API
 * @module kernel/social-graph/blocks
 */

import { SocialGraphEvents } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import type { SocialResult, QueryResult } from './types';

/**
 * Block a user.
 */
export async function blockUser(
  blockedId: string,
  callerId: string,
): Promise<SocialResult<{ blockerId: string; blockedId: string }>> {
  if (blockedId === callerId) {
    return {
      success: false,
      error: { code: 'SELF_ACTION', message: 'Cannot block yourself.' },
    };
  }

  // Check if already blocked
  const { data: existing } = (await supabase
    .from('blocks')
    .select('blocker_id')
    .eq('blocker_id', callerId)
    .eq('blocked_id', blockedId)
    .single()) as QueryResult<{ blocker_id: string }>;

  if (existing) {
    return {
      success: false,
      error: { code: 'ALREADY_EXISTS', message: 'User is already blocked.' },
    };
  }

  const { error } = await supabase.from('blocks').insert({
    blocker_id: callerId,
    blocked_id: blockedId,
  });

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  // Also remove any follow relationship in both directions
  await supabase
    .from('follows')
    .delete()
    .or(`and(follower_id.eq.${callerId},following_id.eq.${blockedId}),and(follower_id.eq.${blockedId},following_id.eq.${callerId})`);

  bus.emit(SocialGraphEvents.USER_BLOCKED, { blockerId: callerId, blockedId });

  return { success: true, data: { blockerId: callerId, blockedId } };
}

/**
 * Unblock a user.
 */
export async function unblockUser(
  blockedId: string,
  callerId: string,
): Promise<SocialResult<{ blockerId: string; blockedId: string }>> {
  const { data: existing } = (await supabase
    .from('blocks')
    .select('blocker_id')
    .eq('blocker_id', callerId)
    .eq('blocked_id', blockedId)
    .single()) as QueryResult<{ blocker_id: string }>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'User is not blocked.' },
    };
  }

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', callerId)
    .eq('blocked_id', blockedId);

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  bus.emit(SocialGraphEvents.USER_UNBLOCKED, { blockerId: callerId, blockedId });

  return { success: true, data: { blockerId: callerId, blockedId } };
}

/**
 * Check if a user has blocked another user.
 */
export async function isBlocked(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const { data } = (await supabase
    .from('blocks')
    .select('blocker_id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .single()) as QueryResult<{ blocker_id: string }>;

  return !!data;
}

/**
 * Check if either user has blocked the other (bidirectional check).
 */
export async function isBlockedEitherWay(
  userA: string,
  userB: string,
): Promise<boolean> {
  const { data } = (await supabase
    .from('blocks')
    .select('blocker_id')
    .or(`and(blocker_id.eq.${userA},blocked_id.eq.${userB}),and(blocker_id.eq.${userB},blocked_id.eq.${userA})`)
    .limit(1)) as QueryResult<Array<{ blocker_id: string }>>;

  return Array.isArray(data) && data.length > 0;
}
