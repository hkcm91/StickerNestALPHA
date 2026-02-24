/**
 * Social Integration Handler
 *
 * Proxies social graph requests from widgets to the kernel social-graph API.
 * Widgets access the social layer through StickerNest.integration('social').
 *
 * @module runtime/integrations
 * @layer L3
 */

import {
  SocialGraphQuerySchema,
  SocialGraphMutationSchema,
} from '@sn/types';

import * as social from '../../kernel/social-graph';

import type { IntegrationHandler } from './integration-proxy';

/**
 * Creates a social integration handler that proxies requests
 * to the kernel social-graph API.
 *
 * @param getUserId - Function that returns the current authenticated user's ID
 */
export function createSocialHandler(getUserId: () => string | null): IntegrationHandler {
  return {
    async query(params: unknown): Promise<unknown> {
      const userId = getUserId();

      const parsed = SocialGraphQuerySchema.safeParse(params);
      if (!parsed.success) {
        throw new Error(
          `Invalid social query params: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        );
      }

      const { type } = parsed.data;

      switch (type) {
        // Profile queries
        case 'getProfile': {
          const result = await social.getProfile(parsed.data.userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'getProfileByUsername': {
          const result = await social.getProfileByUsername(parsed.data.username);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'searchProfiles': {
          const result = await social.searchProfiles(
            parsed.data.query,
            { limit: parsed.data.limit, cursor: parsed.data.cursor },
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'isUsernameAvailable': {
          return social.isUsernameAvailable(parsed.data.username);
        }

        // Follow queries
        case 'getFollowers': {
          const result = await social.getFollowers(
            parsed.data.userId,
            { limit: parsed.data.limit, cursor: parsed.data.cursor },
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'getFollowing': {
          const result = await social.getFollowing(
            parsed.data.userId,
            { limit: parsed.data.limit, cursor: parsed.data.cursor },
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'isFollowing': {
          if (!userId) throw new Error('Authentication required');
          return social.isFollowing(userId, parsed.data.userId);
        }

        case 'getPendingFollowRequests': {
          if (!userId) throw new Error('Authentication required');
          const result = await social.getPendingFollowRequests(
            userId,
            { limit: parsed.data.limit, cursor: parsed.data.cursor },
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        // Feed queries
        case 'getFeed': {
          if (!userId) throw new Error('Authentication required');
          const result = await social.getFeed(
            parsed.data.feedType,
            userId,
            {
              limit: parsed.data.limit,
              cursor: parsed.data.cursor,
              userId: parsed.data.userId,
            },
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'getPost': {
          const result = await social.getPost(parsed.data.postId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'getPostReplies': {
          const result = await social.getPostReplies(
            parsed.data.postId,
            { limit: parsed.data.limit, cursor: parsed.data.cursor },
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'searchPosts': {
          const result = await social.searchPosts(
            parsed.data.query,
            { limit: parsed.data.limit, cursor: parsed.data.cursor },
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        // Reaction queries
        case 'getReactions': {
          const result = await social.getReactions(
            parsed.data.targetType,
            parsed.data.targetId,
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'getReactionCounts': {
          const result = await social.getReactionCounts(
            parsed.data.targetType,
            parsed.data.targetId,
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'getUserReaction': {
          if (!userId) throw new Error('Authentication required');
          const result = await social.getUserReaction(
            parsed.data.targetType,
            parsed.data.targetId,
            userId,
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        // Comment queries
        case 'getComments': {
          const result = await social.getComments(
            parsed.data.targetType,
            parsed.data.targetId,
            { limit: parsed.data.limit, cursor: parsed.data.cursor },
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'getCommentReplies': {
          const result = await social.getCommentReplies(
            parsed.data.parentId,
            { limit: parsed.data.limit, cursor: parsed.data.cursor },
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'getCommentCount': {
          const result = await social.getCommentCount(
            parsed.data.targetType,
            parsed.data.targetId,
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        // Notification queries
        case 'getNotifications': {
          if (!userId) throw new Error('Authentication required');
          const result = await social.getNotifications(
            userId,
            {
              limit: parsed.data.limit,
              cursor: parsed.data.cursor,
              unreadOnly: parsed.data.unreadOnly,
            },
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'getUnreadCount': {
          if (!userId) throw new Error('Authentication required');
          const result = await social.getUnreadCount(userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        default: {
          const _exhaustive: never = type;
          throw new Error(`Unknown social query type: ${String(_exhaustive)}`);
        }
      }
    },

    async mutate(params: unknown): Promise<unknown> {
      const userId = getUserId();
      if (!userId) {
        throw new Error('Authentication required for social mutations');
      }

      const parsed = SocialGraphMutationSchema.safeParse(params);
      if (!parsed.success) {
        throw new Error(
          `Invalid social mutation params: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        );
      }

      const { type } = parsed.data;

      switch (type) {
        // Profile mutations
        case 'createProfile': {
          const result = await social.createProfile(parsed.data.profile, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'updateProfile': {
          const result = await social.updateProfile(parsed.data.updates, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        // Follow mutations
        case 'follow': {
          const result = await social.followUser(parsed.data.userId, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'unfollow': {
          const result = await social.unfollowUser(parsed.data.userId, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'acceptFollowRequest': {
          const result = await social.acceptFollowRequest(parsed.data.followerId, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'rejectFollowRequest': {
          const result = await social.rejectFollowRequest(parsed.data.followerId, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        // Post mutations
        case 'createPost': {
          const result = await social.createPost(parsed.data.post, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'updatePost': {
          const result = await social.updatePost(
            parsed.data.postId,
            parsed.data.content,
            userId,
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'deletePost': {
          const result = await social.deletePost(parsed.data.postId, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'bookmark': {
          const result = await social.bookmarkPost(parsed.data.postId, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'unbookmark': {
          const result = await social.unbookmarkPost(parsed.data.postId, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        // Reaction mutations
        case 'react': {
          const result = await social.addReaction(
            parsed.data.targetType,
            parsed.data.targetId,
            parsed.data.reactionType,
            userId,
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'unreact': {
          const result = await social.removeReaction(
            parsed.data.targetType,
            parsed.data.targetId,
            userId,
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        // Comment mutations
        case 'createComment': {
          const result = await social.createComment(parsed.data.comment, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'updateComment': {
          const result = await social.updateComment(
            parsed.data.commentId,
            parsed.data.content,
            userId,
          );
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'deleteComment': {
          const result = await social.deleteComment(parsed.data.commentId, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        // Notification mutations
        case 'markAsRead': {
          const result = await social.markAsRead(parsed.data.notificationId, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'markAllAsRead': {
          const result = await social.markAllAsRead(userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'deleteNotification': {
          const result = await social.deleteNotification(parsed.data.notificationId, userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        case 'deleteReadNotifications': {
          const result = await social.deleteReadNotifications(userId);
          if (!result.success) throw new Error(result.error.message);
          return result.data;
        }

        default: {
          const _exhaustive: never = type;
          throw new Error(`Unknown social mutation type: ${String(_exhaustive)}`);
        }
      }
    },
  };
}
