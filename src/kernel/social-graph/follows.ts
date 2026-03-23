/**
 * Social Graph Follows API
 * @module kernel/social-graph/follows
 */

import { SocialGraphEvents } from '@sn/types';
import type { FollowRelationship, UserProfile } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import { createNotification } from './notifications';
import type { SocialResult, PaginationOptions, Paginated, QueryResult } from './types';

/**
 * Map a database row to a FollowRelationship type.
 */
function mapFollowRow(row: Record<string, unknown>): FollowRelationship {
  return {
    id: row.id as string,
    followerId: row.follower_id as string,
    followingId: row.following_id as string,
    status: row.status as FollowRelationship['status'],
    createdAt: row.created_at as string,
  };
}

/**
 * Map a profile row to minimal UserProfile for listing.
 */
function mapProfileRow(row: Record<string, unknown>): UserProfile {
  return {
    userId: row.user_id as string,
    displayName: row.display_name as string,
    username: row.username as string,
    bio: (row.bio as string) ?? undefined,
    avatarUrl: (row.avatar_url as string) ?? undefined,
    bannerUrl: (row.banner_url as string) ?? undefined,
    location: (row.location as string) ?? undefined,
    websiteUrl: (row.website_url as string) ?? undefined,
    visibility: row.visibility as UserProfile['visibility'],
    followerCount: row.follower_count as number,
    followingCount: row.following_count as number,
    postCount: row.post_count as number,
    isVerified: row.is_verified as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Follow a user.
 */
export async function followUser(
  followingId: string,
  callerId: string,
): Promise<SocialResult<FollowRelationship>> {
  // Cannot follow yourself
  if (followingId === callerId) {
    return {
      success: false,
      error: { code: 'SELF_ACTION', message: 'Cannot follow yourself.' },
    };
  }

  // Check if already following
  const { data: existing } = (await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', callerId)
    .eq('following_id', followingId)
    .single()) as QueryResult<Record<string, unknown>>;

  if (existing) {
    return {
      success: false,
      error: { code: 'ALREADY_EXISTS', message: 'Already following this user.' },
    };
  }

  // Check if blocked
  const { data: blocked } = (await supabase
    .from('blocks')
    .select('blocker_id')
    .eq('blocker_id', followingId)
    .eq('blocked_id', callerId)
    .single()) as QueryResult<{ blocker_id: string }>;

  if (blocked) {
    return {
      success: false,
      error: { code: 'BLOCKED', message: 'Cannot follow this user.' },
    };
  }

  // Check target user's profile visibility
  const { data: targetProfile } = (await supabase
    .from('user_profiles')
    .select('visibility')
    .eq('user_id', followingId)
    .single()) as QueryResult<{ visibility: string }>;

  // Determine initial status (active or pending for private profiles)
  const status = targetProfile?.visibility === 'private' ? 'pending' : 'active';

  const { data, error } = (await supabase
    .from('follows')
    .insert({
      follower_id: callerId,
      following_id: followingId,
      status,
    })
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to follow user.' },
    };
  }

  const follow = mapFollowRow(data);

  bus.emit(SocialGraphEvents.FOLLOW_CREATED, {
    follow,
    isPending: status === 'pending',
  });

  // Notify the target user they have a new follower (or follow request)
  if (status === 'active') {
    await createNotification(followingId, callerId, 'follow');
  } else {
    await createNotification(followingId, callerId, 'follow_request');
  }

  // Check for mutual follow — does the target already follow the caller?
  if (status === 'active') {
    const { data: reverse } = (await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followingId)
      .eq('following_id', callerId)
      .eq('status', 'active')
      .single()) as QueryResult<{ id: string }>;

    if (reverse) {
      // Mutual follow detected — notify both users
      await createNotification(callerId, followingId, 'mutual_follow');
      await createNotification(followingId, callerId, 'mutual_follow');
      bus.emit(SocialGraphEvents.MUTUAL_FOLLOW_CREATED, {
        userA: callerId,
        userB: followingId,
      });
    }
  }

  return { success: true, data: follow };
}

/**
 * Unfollow a user.
 */
export async function unfollowUser(
  followingId: string,
  callerId: string,
): Promise<SocialResult<{ id: string }>> {
  const { data: existing } = (await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', callerId)
    .eq('following_id', followingId)
    .single()) as QueryResult<{ id: string }>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Not following this user.' },
    };
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('id', existing.id);

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  bus.emit(SocialGraphEvents.FOLLOW_DELETED, {
    followerId: callerId,
    followingId,
  });

  return { success: true, data: { id: existing.id } };
}

/**
 * Accept a pending follow request.
 */
export async function acceptFollowRequest(
  followerId: string,
  callerId: string,
): Promise<SocialResult<FollowRelationship>> {
  const { data: existing } = (await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', followerId)
    .eq('following_id', callerId)
    .eq('status', 'pending')
    .single()) as QueryResult<Record<string, unknown>>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'No pending follow request from this user.' },
    };
  }

  const { data, error } = (await supabase
    .from('follows')
    .update({ status: 'active' })
    .eq('id', existing.id as string)
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to accept follow request.' },
    };
  }

  const follow = mapFollowRow(data);

  bus.emit(SocialGraphEvents.FOLLOW_ACCEPTED, { follow });

  return { success: true, data: follow };
}

/**
 * Reject a pending follow request.
 */
export async function rejectFollowRequest(
  followerId: string,
  callerId: string,
): Promise<SocialResult<{ id: string }>> {
  const { data: existing } = (await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', callerId)
    .eq('status', 'pending')
    .single()) as QueryResult<{ id: string }>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'No pending follow request from this user.' },
    };
  }

  const { error } = await supabase.from('follows').delete().eq('id', existing.id);

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  bus.emit(SocialGraphEvents.FOLLOW_REJECTED, {
    followerId,
    followingId: callerId,
  });

  return { success: true, data: { id: existing.id } };
}

/**
 * Get a user's followers.
 */
export async function getFollowers(
  userId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<Paginated<UserProfile>>> {
  const limit = Math.min(options.limit ?? 20, 100);

  // Step 1: Get follower IDs from follows table
  let query = supabase
    .from('follows')
    .select('follower_id, created_at')
    .eq('following_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt('created_at', options.cursor);
  }

  const { data: followRows, error } = (await query) as QueryResult<
    Array<{ follower_id: string; created_at: string }>
  >;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const rows = (followRows ?? []).slice(0, limit);
  const hasMore = (followRows ?? []).length > limit;
  const nextCursor = hasMore && rows.length > 0 ? rows[rows.length - 1].created_at : undefined;

  if (rows.length === 0) {
    return { success: true, data: { items: [], hasMore: false } };
  }

  // Step 2: Fetch profiles for those follower IDs
  const followerIds = rows.map((r) => r.follower_id);
  const { data: profiles } = (await supabase
    .from('user_profiles')
    .select('*')
    .in('user_id', followerIds)) as QueryResult<Record<string, unknown>[]>;

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id as string, p]));
  const items = rows
    .map((r) => profileMap.get(r.follower_id))
    .filter((p): p is Record<string, unknown> => p != null)
    .map(mapProfileRow);

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Get users that a user is following.
 */
export async function getFollowing(
  userId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<Paginated<UserProfile>>> {
  const limit = Math.min(options.limit ?? 20, 100);

  // Step 1: Get following IDs from follows table
  let query = supabase
    .from('follows')
    .select('following_id, created_at')
    .eq('follower_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt('created_at', options.cursor);
  }

  const { data: followRows, error } = (await query) as QueryResult<
    Array<{ following_id: string; created_at: string }>
  >;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const rows = (followRows ?? []).slice(0, limit);
  const hasMore = (followRows ?? []).length > limit;
  const nextCursor = hasMore && rows.length > 0 ? rows[rows.length - 1].created_at : undefined;

  if (rows.length === 0) {
    return { success: true, data: { items: [], hasMore: false } };
  }

  // Step 2: Fetch profiles for those following IDs
  const followingIds = rows.map((r) => r.following_id);
  const { data: profiles } = (await supabase
    .from('user_profiles')
    .select('*')
    .in('user_id', followingIds)) as QueryResult<Record<string, unknown>[]>;

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id as string, p]));
  const items = rows
    .map((r) => profileMap.get(r.following_id))
    .filter((p): p is Record<string, unknown> => p != null)
    .map(mapProfileRow);

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Check if a user is following another user.
 */
export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { data } = (await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .eq('status', 'active')
    .single()) as QueryResult<{ id: string }>;

  return !!data;
}

/**
 * Get pending follow requests for a user.
 */
export async function getPendingFollowRequests(
  userId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<Paginated<UserProfile>>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('follows')
    .select('follower_id, user_profiles!follows_follower_id_fkey(*)')
    .eq('following_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt('created_at', options.cursor);
  }

  const { data, error } = (await query) as QueryResult<
    Array<{ follower_id: string; user_profiles: Record<string, unknown> }>
  >;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const items = (data ?? []).slice(0, limit);
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0
    ? (items[items.length - 1].user_profiles.created_at as string)
    : undefined;

  return {
    success: true,
    data: {
      items: items.map((row) => mapProfileRow(row.user_profiles)),
      nextCursor,
      hasMore,
    },
  };
}
