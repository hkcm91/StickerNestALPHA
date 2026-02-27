/**
 * Social Graph Posts API
 * @module kernel/social-graph/posts
 */

import { SocialGraphEvents, CreatePostInputSchema } from '@sn/types';
import type { Post, CreatePostInput, FeedResponse, FeedType } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import type { SocialResult, PaginationOptions, QueryResult } from './types';

/**
 * Map a database row to a Post type.
 */
function mapPostRow(row: Record<string, unknown>): Post {
  return {
    id: row.id as string,
    authorId: row.author_id as string,
    contentType: row.content_type as Post['contentType'],
    content: row.content as string,
    visibility: row.visibility as Post['visibility'],
    attachments: (row.attachments as Post['attachments']) ?? undefined,
    canvasId: (row.canvas_id as string) ?? undefined,
    widgetId: (row.widget_id as string) ?? undefined,
    replyToId: (row.reply_to_id as string) ?? undefined,
    repostOfId: (row.repost_of_id as string) ?? undefined,
    mentionedUserIds: (row.mentioned_user_ids as string[]) ?? undefined,
    replyCount: row.reply_count as number,
    repostCount: row.repost_count as number,
    reactionCount: row.reaction_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    isDeleted: row.is_deleted as boolean,
  };
}

/**
 * Create a new post.
 */
export async function createPost(
  input: CreatePostInput,
  callerId: string,
): Promise<SocialResult<Post>> {
  // Validate input
  const parsed = CreatePostInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    };
  }

  const { data, error } = (await supabase
    .from('posts')
    .insert({
      author_id: callerId,
      content_type: input.contentType ?? 'text',
      content: input.content,
      visibility: input.visibility ?? 'public',
      attachments: input.attachments ?? [],
      canvas_id: input.canvasId ?? null,
      widget_id: input.widgetId ?? null,
      reply_to_id: input.replyToId ?? null,
      repost_of_id: input.repostOfId ?? null,
      mentioned_user_ids: input.mentionedUserIds ?? [],
    } as any)
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to create post.' },
    };
  }

  const post = mapPostRow(data);

  bus.emit(SocialGraphEvents.POST_CREATED, { post });

  return { success: true, data: post };
}

/**
 * Get a single post by ID.
 */
export async function getPost(postId: string): Promise<SocialResult<Post>> {
  const { data, error } = (await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .eq('is_deleted', false)
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Post not found.' },
    };
  }

  return { success: true, data: mapPostRow(data) };
}

/**
 * Update a post.
 */
export async function updatePost(
  postId: string,
  content: string,
  callerId: string,
): Promise<SocialResult<Post>> {
  // Check ownership
  const { data: existing } = (await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single()) as QueryResult<{ author_id: string }>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Post not found.' },
    };
  }

  if (existing.author_id !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Cannot update another user\'s post.' },
    };
  }

  const { data, error } = (await supabase
    .from('posts')
    .update({ content })
    .eq('id', postId)
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to update post.' },
    };
  }

  const post = mapPostRow(data);

  bus.emit(SocialGraphEvents.POST_UPDATED, { post });

  return { success: true, data: post };
}

/**
 * Delete a post (soft delete).
 */
export async function deletePost(
  postId: string,
  callerId: string,
): Promise<SocialResult<{ id: string }>> {
  // Check ownership
  const { data: existing } = (await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single()) as QueryResult<{ author_id: string }>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Post not found.' },
    };
  }

  if (existing.author_id !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Cannot delete another user\'s post.' },
    };
  }

  const { error } = await supabase
    .from('posts')
    .update({ is_deleted: true })
    .eq('id', postId);

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  bus.emit(SocialGraphEvents.POST_DELETED, { postId });

  return { success: true, data: { id: postId } };
}

/**
 * Get posts by a specific user.
 */
export async function getUserPosts(
  userId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<FeedResponse>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('posts')
    .select('*')
    .eq('author_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt('id', options.cursor);
  }

  const { data, error } = (await query) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const items = (data ?? []).slice(0, limit).map(mapPostRow);
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0
    ? { afterId: items[items.length - 1].id, limit }
    : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Get replies to a post.
 */
export async function getPostReplies(
  postId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<FeedResponse>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('posts')
    .select('*')
    .eq('reply_to_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.gt('id', options.cursor);
  }

  const { data, error } = (await query) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const items = (data ?? []).slice(0, limit).map(mapPostRow);
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0
    ? { afterId: items[items.length - 1].id, limit }
    : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Get the home feed for a user (posts from followed users).
 */
export async function getHomeFeed(
  callerId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<FeedResponse>> {
  const limit = Math.min(options.limit ?? 20, 100);

  // Get IDs of users the caller follows
  const { data: followingData } = (await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', callerId)
    .eq('status', 'active')) as QueryResult<Array<{ following_id: string }>>;

  const followingIds = (followingData ?? []).map((f) => f.following_id);

  // Include own posts in feed
  followingIds.push(callerId);

  if (followingIds.length === 0) {
    return {
      success: true,
      data: { items: [], hasMore: false },
    };
  }

  let query = supabase
    .from('posts')
    .select('*')
    .in('author_id', followingIds)
    .eq('is_deleted', false)
    .in('visibility', ['public', 'followers'])
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt('id', options.cursor);
  }

  const { data, error } = (await query) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const items = (data ?? []).slice(0, limit).map(mapPostRow);
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0
    ? { afterId: items[items.length - 1].id, limit }
    : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Get the explore feed (trending/popular public posts).
 */
export async function getExploreFeed(
  options: PaginationOptions = {},
): Promise<SocialResult<FeedResponse>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('posts')
    .select('*')
    .eq('visibility', 'public')
    .eq('is_deleted', false)
    .order('reaction_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt('id', options.cursor);
  }

  const { data, error } = (await query) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const items = (data ?? []).slice(0, limit).map(mapPostRow);
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0
    ? { afterId: items[items.length - 1].id, limit }
    : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Get feed by type.
 */
export async function getFeed(
  feedType: FeedType,
  callerId: string,
  options: PaginationOptions & { userId?: string } = {},
): Promise<SocialResult<FeedResponse>> {
  switch (feedType) {
    case 'home':
      return getHomeFeed(callerId, options);
    case 'explore':
      return getExploreFeed(options);
    case 'user':
      if (!options.userId) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'userId required for user feed.' },
        };
      }
      return getUserPosts(options.userId, options);
    case 'mentions':
      return getMentionsFeed(callerId, options);
    case 'bookmarks':
      return getBookmarksFeed(callerId, options);
    default:
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid feed type.' },
      };
  }
}

/**
 * Get posts that mention the caller.
 */
async function getMentionsFeed(
  callerId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<FeedResponse>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('posts')
    .select('*')
    .contains('mentioned_user_ids', [callerId])
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt('id', options.cursor);
  }

  const { data, error } = (await query) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const items = (data ?? []).slice(0, limit).map(mapPostRow);
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0
    ? { afterId: items[items.length - 1].id, limit }
    : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Get bookmarked posts.
 */
async function getBookmarksFeed(
  callerId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<FeedResponse>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('bookmarks')
    .select('post_id, posts(*)')
    .eq('user_id', callerId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt('post_id', options.cursor);
  }

  const { data, error } = (await query) as QueryResult<
    Array<{ post_id: string; posts: Record<string, unknown> }>
  >;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const items = (data ?? [])
    .slice(0, limit)
    .filter((row) => row.posts && !(row.posts.is_deleted as boolean))
    .map((row) => mapPostRow(row.posts));
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0
    ? { afterId: items[items.length - 1].id, limit }
    : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Search posts by content.
 */
export async function searchPosts(
  query: string,
  options: PaginationOptions = {},
): Promise<SocialResult<FeedResponse>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let dbQuery = supabase
    .from('posts')
    .select('*')
    .textSearch('content', query)
    .eq('visibility', 'public')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    dbQuery = dbQuery.lt('id', options.cursor);
  }

  const { data, error } = (await dbQuery) as QueryResult<Record<string, unknown>[]>;

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  const items = (data ?? []).slice(0, limit).map(mapPostRow);
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0
    ? { afterId: items[items.length - 1].id, limit }
    : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Bookmark a post.
 */
export async function bookmarkPost(
  postId: string,
  callerId: string,
): Promise<SocialResult<{ postId: string }>> {
  const { error } = await supabase.from('bookmarks').insert({
    user_id: callerId,
    post_id: postId,
  });

  if (error) {
    if (error.message.includes('duplicate')) {
      return {
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Post already bookmarked.' },
      };
    }
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  return { success: true, data: { postId } };
}

/**
 * Remove a bookmark.
 */
export async function unbookmarkPost(
  postId: string,
  callerId: string,
): Promise<SocialResult<{ postId: string }>> {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', callerId)
    .eq('post_id', postId);

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  return { success: true, data: { postId } };
}
