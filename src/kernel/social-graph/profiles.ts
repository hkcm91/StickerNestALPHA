/**
 * Social Graph Profiles API
 * @module kernel/social-graph/profiles
 */

import { SocialGraphEvents, UpdateProfileInputSchema } from '@sn/types';
import type { UserProfile, UpdateProfileInput } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import type { SocialResult, QueryResult } from './types';

/**
 * Map a database row to a UserProfile type.
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
 * Get a user profile by user ID.
 */
export async function getProfile(userId: string): Promise<SocialResult<UserProfile>> {
  const { data, error } = (await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Profile not found.' },
    };
  }

  return { success: true, data: mapProfileRow(data) };
}

/**
 * Get a user profile by username.
 */
export async function getProfileByUsername(
  username: string,
): Promise<SocialResult<UserProfile>> {
  const { data, error } = (await supabase
    .from('user_profiles')
    .select('*')
    .ilike('username', username)
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Profile not found.' },
    };
  }

  return { success: true, data: mapProfileRow(data) };
}

/**
 * Create a new profile (called on user signup).
 */
export async function createProfile(
  userId: string,
  displayName: string,
  username: string,
): Promise<SocialResult<UserProfile>> {
  // Check if username is already taken
  const { data: existing } = (await supabase
    .from('user_profiles')
    .select('user_id')
    .ilike('username', username)
    .single()) as QueryResult<{ user_id: string }>;

  if (existing) {
    return {
      success: false,
      error: { code: 'ALREADY_EXISTS', message: 'Username is already taken.' },
    };
  }

  const { data, error } = (await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      display_name: displayName,
      username,
    })
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to create profile.' },
    };
  }

  const profile = mapProfileRow(data);

  bus.emit(SocialGraphEvents.PROFILE_CREATED, { profile });

  return { success: true, data: profile };
}

/**
 * Update a user's profile.
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  callerId: string,
): Promise<SocialResult<UserProfile>> {
  // Only the owner can update their profile
  if (userId !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Cannot update another user\'s profile.' },
    };
  }

  // Validate input
  const parsed = UpdateProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    };
  }

  // Check if new username is taken (if changing username)
  if (input.username) {
    const { data: existing } = (await supabase
      .from('user_profiles')
      .select('user_id')
      .ilike('username', input.username)
      .neq('user_id', userId)
      .single()) as QueryResult<{ user_id: string }>;

    if (existing) {
      return {
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Username is already taken.' },
      };
    }
  }

  // Build update object
  const updateObj: Record<string, unknown> = {};
  if (input.displayName !== undefined) updateObj.display_name = input.displayName;
  if (input.username !== undefined) updateObj.username = input.username;
  if (input.bio !== undefined) updateObj.bio = input.bio;
  if (input.avatarUrl !== undefined) updateObj.avatar_url = input.avatarUrl;
  if (input.bannerUrl !== undefined) updateObj.banner_url = input.bannerUrl;
  if (input.location !== undefined) updateObj.location = input.location;
  if (input.websiteUrl !== undefined) updateObj.website_url = input.websiteUrl;
  if (input.visibility !== undefined) updateObj.visibility = input.visibility;

  const { data, error } = (await supabase
    .from('user_profiles')
    .update(updateObj)
    .eq('user_id', userId)
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to update profile.' },
    };
  }

  const profile = mapProfileRow(data);

  bus.emit(SocialGraphEvents.PROFILE_UPDATED, { profile });

  return { success: true, data: profile };
}

/**
 * Search for profiles by display name or username.
 */
export async function searchProfiles(
  query: string,
  limit: number = 20,
): Promise<SocialResult<UserProfile[]>> {
  const { data, error } = (await supabase
    .from('user_profiles')
    .select('*')
    .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
    .eq('visibility', 'public')
    .limit(Math.min(limit, 100))
    .order('follower_count', { ascending: false })) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  return { success: true, data: (data ?? []).map(mapProfileRow) };
}

/**
 * Check if a username is available.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data } = (await supabase
    .from('user_profiles')
    .select('user_id')
    .ilike('username', username)
    .single()) as QueryResult<{ user_id: string }>;

  return !data;
}
