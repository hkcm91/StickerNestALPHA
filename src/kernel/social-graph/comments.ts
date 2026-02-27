/**
 * Social Graph Comments API
 * @module kernel/social-graph/comments
 */

import { SocialGraphEvents, CreateCommentInputSchema } from '@sn/types';
import type { Comment, CreateCommentInput, CommentTargetType } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import type { SocialResult, PaginationOptions, Paginated, QueryResult } from './types';

/**
 * Map a database row to a Comment type.
 */
function mapCommentRow(row: Record<string, unknown>): Comment {
  return {
    id: row.id as string,
    authorId: row.author_id as string,
    targetType: row.target_type as CommentTargetType,
    targetId: row.target_id as string,
    content: row.content as string,
    parentId: (row.parent_id as string) ?? undefined,
    mentionedUserIds: (row.mentioned_user_ids as string[]) ?? undefined,
    replyCount: row.reply_count as number,
    reactionCount: row.reaction_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    isDeleted: row.is_deleted as boolean,
  };
}

/**
 * Create a new comment.
 */
export async function createComment(
  input: CreateCommentInput,
  callerId: string,
): Promise<SocialResult<Comment>> {
  // Validate input
  const parsed = CreateCommentInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    };
  }

  const { data, error } = (await supabase
    .from('comments')
    .insert({
      author_id: callerId,
      target_type: input.targetType,
      target_id: input.targetId,
      content: input.content,
      parent_id: input.parentId ?? null,
      mentioned_user_ids: input.mentionedUserIds ?? [],
    })
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to create comment.' },
    };
  }

  const comment = mapCommentRow(data);

  bus.emit(SocialGraphEvents.COMMENT_CREATED, { comment });

  // Update parent comment reply count if this is a reply
  if (input.parentId) {
    await (supabase.rpc as any)('increment_comment_reply_count', { comment_id: input.parentId });
  }

  return { success: true, data: comment };
}

/**
 * Get a single comment by ID.
 */
export async function getComment(commentId: string): Promise<SocialResult<Comment>> {
  const { data, error } = (await supabase
    .from('comments')
    .select('*')
    .eq('id', commentId)
    .eq('is_deleted', false)
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Comment not found.' },
    };
  }

  return { success: true, data: mapCommentRow(data) };
}

/**
 * Update a comment.
 */
export async function updateComment(
  commentId: string,
  content: string,
  callerId: string,
): Promise<SocialResult<Comment>> {
  // Check ownership
  const { data: existing } = (await supabase
    .from('comments')
    .select('author_id')
    .eq('id', commentId)
    .single()) as QueryResult<{ author_id: string }>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Comment not found.' },
    };
  }

  if (existing.author_id !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Cannot update another user\'s comment.' },
    };
  }

  const { data, error } = (await supabase
    .from('comments')
    .update({ content })
    .eq('id', commentId)
    .select()
    .single()) as QueryResult<Record<string, unknown>>;

  if (error || !data) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error?.message ?? 'Failed to update comment.' },
    };
  }

  const comment = mapCommentRow(data);

  bus.emit(SocialGraphEvents.COMMENT_UPDATED, { comment });

  return { success: true, data: comment };
}

/**
 * Delete a comment (soft delete).
 */
export async function deleteComment(
  commentId: string,
  callerId: string,
): Promise<SocialResult<{ id: string }>> {
  // Check ownership
  const { data: existing } = (await supabase
    .from('comments')
    .select('author_id, parent_id')
    .eq('id', commentId)
    .single()) as QueryResult<{ author_id: string; parent_id: string | null }>;

  if (!existing) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Comment not found.' },
    };
  }

  if (existing.author_id !== callerId) {
    return {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Cannot delete another user\'s comment.' },
    };
  }

  const { error } = await supabase
    .from('comments')
    .update({ is_deleted: true })
    .eq('id', commentId);

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  // Update parent comment reply count if this was a reply
  if (existing.parent_id) {
    await (supabase.rpc as any)('decrement_comment_reply_count', { comment_id: existing.parent_id });
  }

  bus.emit(SocialGraphEvents.COMMENT_DELETED, { commentId });

  return { success: true, data: { id: commentId } };
}

/**
 * Get comments on a target.
 */
export async function getComments(
  targetType: CommentTargetType,
  targetId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<Paginated<Comment>>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('comments')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .is('parent_id', null) // Only top-level comments
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

  const items = (data ?? []).slice(0, limit).map(mapCommentRow);
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Get replies to a comment.
 */
export async function getCommentReplies(
  parentId: string,
  options: PaginationOptions = {},
): Promise<SocialResult<Paginated<Comment>>> {
  const limit = Math.min(options.limit ?? 20, 100);

  let query = supabase
    .from('comments')
    .select('*')
    .eq('parent_id', parentId)
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

  const items = (data ?? []).slice(0, limit).map(mapCommentRow);
  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : undefined;

  return {
    success: true,
    data: { items, nextCursor, hasMore },
  };
}

/**
 * Get comment count for a target.
 */
export async function getCommentCount(
  targetType: CommentTargetType,
  targetId: string,
): Promise<SocialResult<number>> {
  const { count, error } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('is_deleted', false);

  if (error) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: error.message },
    };
  }

  return { success: true, data: count ?? 0 };
}
