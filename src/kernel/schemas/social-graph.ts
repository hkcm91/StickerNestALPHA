/**
 * Social Graph schemas
 *
 * @module @sn/types/social-graph
 *
 * @remarks
 * The social graph is a persistent data layer that widgets render.
 * Different widget sets (MySpace-style, AOL-style, Twitter-style) can
 * render the same social data in completely different ways.
 *
 * This is NOT a visible social media layer - it's a data layer that
 * widgets query via the social integration.
 */

import { z } from 'zod';

// =============================================================================
// User Profile
// =============================================================================

/**
 * Profile visibility settings
 */
export const ProfileVisibilitySchema = z.enum([
  'public',   // Anyone can view
  'followers', // Only followers can view
  'private',   // Only the user can view
]);

export type ProfileVisibility = z.infer<typeof ProfileVisibilitySchema>;

/**
 * User profile schema
 *
 * @remarks
 * Extends basic auth user with social-specific fields.
 * This is the public-facing profile that widgets render.
 */
export const UserProfileSchema = z.object({
  /** User ID (same as auth user ID) */
  userId: z.string().uuid(),
  /** Display name */
  displayName: z.string().min(1).max(50),
  /** Username/handle (unique) */
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  /** Bio/description */
  bio: z.string().max(500).optional(),
  /** Avatar URL */
  avatarUrl: z.string().url().optional(),
  /** Banner/header image URL */
  bannerUrl: z.string().url().optional(),
  /** Location (free text) */
  location: z.string().max(100).optional(),
  /** Website URL */
  websiteUrl: z.string().url().optional(),
  /** Profile visibility */
  visibility: ProfileVisibilitySchema.default('public'),
  /** Follower count (denormalized for performance) */
  followerCount: z.number().int().nonnegative().default(0),
  /** Following count (denormalized for performance) */
  followingCount: z.number().int().nonnegative().default(0),
  /** Post count (denormalized for performance) */
  postCount: z.number().int().nonnegative().default(0),
  /** Whether the profile is verified */
  isVerified: z.boolean().default(false),
  /** Account creation timestamp */
  createdAt: z.string().datetime(),
  /** Last update timestamp */
  updatedAt: z.string().datetime(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Profile update input schema
 */
export const UpdateProfileInputSchema = UserProfileSchema.partial().omit({
  userId: true,
  followerCount: true,
  followingCount: true,
  postCount: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

// =============================================================================
// Follow Relationships
// =============================================================================

/**
 * Follow relationship status
 */
export const FollowStatusSchema = z.enum([
  'active',    // Currently following
  'pending',   // Awaiting approval (for private profiles)
  'blocked',   // Blocked by target user
]);

export type FollowStatus = z.infer<typeof FollowStatusSchema>;

/**
 * Follow relationship schema
 */
export const FollowRelationshipSchema = z.object({
  /** Unique follow relationship ID */
  id: z.string().uuid(),
  /** User ID of the follower */
  followerId: z.string().uuid(),
  /** User ID of the followed user */
  followingId: z.string().uuid(),
  /** Relationship status */
  status: FollowStatusSchema.default('active'),
  /** When the follow was created */
  createdAt: z.string().datetime(),
});

export type FollowRelationship = z.infer<typeof FollowRelationshipSchema>;

// =============================================================================
// Posts
// =============================================================================

/**
 * Post visibility settings
 */
export const PostVisibilitySchema = z.enum([
  'public',    // Anyone can view
  'followers', // Only followers can view
  'mentioned', // Only mentioned users can view
  'private',   // Only the author can view (drafts)
]);

export type PostVisibility = z.infer<typeof PostVisibilitySchema>;

/**
 * Post content type
 */
export const PostContentTypeSchema = z.enum([
  'text',      // Plain text post
  'rich',      // Rich text (markdown)
  'canvas',    // Canvas share/embed
  'widget',    // Widget share
  'media',     // Image/video
  'repost',    // Repost of another post
]);

export type PostContentType = z.infer<typeof PostContentTypeSchema>;

/**
 * Post attachment schema
 */
export const PostAttachmentSchema = z.object({
  /** Attachment type */
  type: z.enum(['image', 'video', 'canvas', 'widget', 'link']),
  /** URL or ID reference */
  url: z.string(),
  /** Alt text for accessibility */
  altText: z.string().optional(),
  /** Thumbnail URL for previews */
  thumbnailUrl: z.string().url().optional(),
  /** Metadata (dimensions, duration, etc.) */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type PostAttachment = z.infer<typeof PostAttachmentSchema>;

/**
 * Post schema
 */
export const PostSchema = z.object({
  /** Unique post ID */
  id: z.string().uuid(),
  /** Author user ID */
  authorId: z.string().uuid(),
  /** Content type */
  contentType: PostContentTypeSchema.default('text'),
  /** Text content */
  content: z.string().max(5000),
  /** Visibility setting */
  visibility: PostVisibilitySchema.default('public'),
  /** Attachments */
  attachments: z.array(PostAttachmentSchema).max(10).optional(),
  /** Canvas ID if this is a canvas share */
  canvasId: z.string().uuid().optional(),
  /** Widget ID if this is a widget share */
  widgetId: z.string().uuid().optional(),
  /** Parent post ID if this is a reply */
  replyToId: z.string().uuid().optional(),
  /** Original post ID if this is a repost */
  repostOfId: z.string().uuid().optional(),
  /** Mentioned user IDs */
  mentionedUserIds: z.array(z.string().uuid()).optional(),
  /** Reply count (denormalized) */
  replyCount: z.number().int().nonnegative().default(0),
  /** Repost count (denormalized) */
  repostCount: z.number().int().nonnegative().default(0),
  /** Reaction count (denormalized) */
  reactionCount: z.number().int().nonnegative().default(0),
  /** Creation timestamp */
  createdAt: z.string().datetime(),
  /** Last update timestamp */
  updatedAt: z.string().datetime(),
  /** Whether post is deleted (soft delete) */
  isDeleted: z.boolean().default(false),
});

export type Post = z.infer<typeof PostSchema>;

/**
 * Create post input schema
 */
export const CreatePostInputSchema = PostSchema.omit({
  id: true,
  authorId: true,
  replyCount: true,
  repostCount: true,
  reactionCount: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

// =============================================================================
// Reactions
// =============================================================================

/**
 * Reaction type enum
 *
 * @remarks
 * Intentionally minimal - widgets can map these to any emoji/icon set.
 */
export const ReactionTypeSchema = z.enum([
  'like',
  'love',
  'laugh',
  'wow',
  'sad',
  'angry',
]);

export type ReactionType = z.infer<typeof ReactionTypeSchema>;

/**
 * Reaction target type
 */
export const ReactionTargetTypeSchema = z.enum([
  'post',
  'comment',
  'canvas',
  'widget',
]);

export type ReactionTargetType = z.infer<typeof ReactionTargetTypeSchema>;

/**
 * Reaction schema
 */
export const ReactionSchema = z.object({
  /** Unique reaction ID */
  id: z.string().uuid(),
  /** User ID of reactor */
  userId: z.string().uuid(),
  /** Target type */
  targetType: ReactionTargetTypeSchema,
  /** Target ID (post, comment, canvas, or widget) */
  targetId: z.string().uuid(),
  /** Reaction type */
  type: ReactionTypeSchema,
  /** Creation timestamp */
  createdAt: z.string().datetime(),
});

export type Reaction = z.infer<typeof ReactionSchema>;

// =============================================================================
// Comments
// =============================================================================

/**
 * Comment target type
 */
export const CommentTargetTypeSchema = z.enum([
  'post',
  'canvas',
  'widget',
]);

export type CommentTargetType = z.infer<typeof CommentTargetTypeSchema>;

/**
 * Comment schema
 */
export const CommentSchema = z.object({
  /** Unique comment ID */
  id: z.string().uuid(),
  /** Author user ID */
  authorId: z.string().uuid(),
  /** Target type */
  targetType: CommentTargetTypeSchema,
  /** Target ID */
  targetId: z.string().uuid(),
  /** Comment content */
  content: z.string().max(2000),
  /** Parent comment ID for nested replies */
  parentId: z.string().uuid().optional(),
  /** Mentioned user IDs */
  mentionedUserIds: z.array(z.string().uuid()).optional(),
  /** Reply count (denormalized) */
  replyCount: z.number().int().nonnegative().default(0),
  /** Reaction count (denormalized) */
  reactionCount: z.number().int().nonnegative().default(0),
  /** Creation timestamp */
  createdAt: z.string().datetime(),
  /** Last update timestamp */
  updatedAt: z.string().datetime(),
  /** Whether comment is deleted (soft delete) */
  isDeleted: z.boolean().default(false),
});

export type Comment = z.infer<typeof CommentSchema>;

/**
 * Create comment input schema
 */
export const CreateCommentInputSchema = CommentSchema.omit({
  id: true,
  authorId: true,
  replyCount: true,
  reactionCount: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;

// =============================================================================
// Notifications
// =============================================================================

/**
 * Notification type enum
 */
export const NotificationTypeSchema = z.enum([
  'follow',           // Someone followed you
  'follow_request',   // Someone requested to follow you
  'like',             // Someone liked your post/comment
  'comment',          // Someone commented on your post
  'reply',            // Someone replied to your comment
  'mention',          // Someone mentioned you
  'repost',           // Someone reposted your post
  'canvas_invite',    // Someone invited you to a canvas
  'canvas_comment',   // Someone commented on your canvas
  'widget_share',     // Someone shared a widget with you
]);

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

/**
 * Notification schema
 */
export const NotificationSchema = z.object({
  /** Unique notification ID */
  id: z.string().uuid(),
  /** Recipient user ID */
  recipientId: z.string().uuid(),
  /** Actor user ID (who triggered the notification) */
  actorId: z.string().uuid(),
  /** Notification type */
  type: NotificationTypeSchema,
  /** Target type (post, comment, canvas, etc.) */
  targetType: z.string().optional(),
  /** Target ID */
  targetId: z.string().uuid().optional(),
  /** Whether notification has been read */
  isRead: z.boolean().default(false),
  /** Creation timestamp */
  createdAt: z.string().datetime(),
});

export type Notification = z.infer<typeof NotificationSchema>;

// =============================================================================
// Feed Types
// =============================================================================

/**
 * Feed type enum
 */
export const FeedTypeSchema = z.enum([
  'home',       // Posts from followed users
  'explore',    // Trending/recommended posts
  'user',       // Posts from a specific user
  'mentions',   // Posts mentioning you
  'bookmarks',  // Saved posts
]);

export type FeedType = z.infer<typeof FeedTypeSchema>;

/**
 * Feed cursor for pagination
 */
export const FeedCursorSchema = z.object({
  /** Last item ID for cursor-based pagination */
  afterId: z.string().uuid().optional(),
  /** Page size */
  limit: z.number().int().min(1).max(100).default(20),
});

export type FeedCursor = z.infer<typeof FeedCursorSchema>;

/**
 * Feed response schema
 */
export const FeedResponseSchema = z.object({
  /** Posts in the feed */
  items: z.array(PostSchema),
  /** Next cursor for pagination */
  nextCursor: FeedCursorSchema.optional(),
  /** Whether there are more items */
  hasMore: z.boolean(),
});

export type FeedResponse = z.infer<typeof FeedResponseSchema>;

// =============================================================================
// Social Integration Query Types (for Widget SDK)
// =============================================================================

/**
 * Social query type enum (used by widgets via integration API)
 */
export const SocialQueryTypeSchema = z.enum([
  'profile',          // Get user profile
  'followers',        // Get followers list
  'following',        // Get following list
  'feed',             // Get feed
  'post',             // Get single post
  'posts',            // Get user's posts
  'comments',         // Get comments on target
  'reactions',        // Get reactions on target
  'notifications',    // Get notifications
  'search_users',     // Search users
  'search_posts',     // Search posts
]);

export type SocialQueryType = z.infer<typeof SocialQueryTypeSchema>;

/**
 * Social mutation type enum (used by widgets via integration API)
 */
export const SocialMutationTypeSchema = z.enum([
  'update_profile',   // Update own profile
  'follow',           // Follow a user
  'unfollow',         // Unfollow a user
  'create_post',      // Create a post
  'delete_post',      // Delete a post
  'react',            // Add reaction
  'unreact',          // Remove reaction
  'comment',          // Add comment
  'delete_comment',   // Delete comment
  'mark_read',        // Mark notification as read
  'mark_all_read',    // Mark all notifications as read
]);

export type SocialMutationType = z.infer<typeof SocialMutationTypeSchema>;

// =============================================================================
// Social Graph Query Schema (Discriminated Union)
// =============================================================================

/**
 * All possible query request shapes for the social integration.
 * Widgets call: StickerNest.integration('social').query(params)
 */
export const SocialGraphQuerySchema = z.discriminatedUnion('type', [
  // Profile queries
  z.object({
    type: z.literal('getProfile'),
    userId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('getProfileByUsername'),
    username: z.string(),
  }),
  z.object({
    type: z.literal('searchProfiles'),
    query: z.string(),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  }),
  z.object({
    type: z.literal('isUsernameAvailable'),
    username: z.string(),
  }),

  // Follow queries
  z.object({
    type: z.literal('getFollowers'),
    userId: z.string().uuid(),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  }),
  z.object({
    type: z.literal('getFollowing'),
    userId: z.string().uuid(),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  }),
  z.object({
    type: z.literal('isFollowing'),
    userId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('getPendingFollowRequests'),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  }),

  // Feed queries
  z.object({
    type: z.literal('getFeed'),
    feedType: FeedTypeSchema,
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
    userId: z.string().uuid().optional(),
  }),
  z.object({
    type: z.literal('getPost'),
    postId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('getPostReplies'),
    postId: z.string().uuid(),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  }),
  z.object({
    type: z.literal('searchPosts'),
    query: z.string(),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  }),

  // Reaction queries
  z.object({
    type: z.literal('getReactions'),
    targetType: ReactionTargetTypeSchema,
    targetId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('getReactionCounts'),
    targetType: ReactionTargetTypeSchema,
    targetId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('getUserReaction'),
    targetType: ReactionTargetTypeSchema,
    targetId: z.string().uuid(),
  }),

  // Comment queries
  z.object({
    type: z.literal('getComments'),
    targetType: CommentTargetTypeSchema,
    targetId: z.string().uuid(),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  }),
  z.object({
    type: z.literal('getCommentReplies'),
    parentId: z.string().uuid(),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  }),
  z.object({
    type: z.literal('getCommentCount'),
    targetType: CommentTargetTypeSchema,
    targetId: z.string().uuid(),
  }),

  // Notification queries
  z.object({
    type: z.literal('getNotifications'),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
    unreadOnly: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('getUnreadCount'),
  }),
]);

export type SocialGraphQuery = z.infer<typeof SocialGraphQuerySchema>;

// =============================================================================
// Social Graph Mutation Schema (Discriminated Union)
// =============================================================================

/**
 * Profile creation input (subset of UserProfile for creation)
 */
const CreateProfileInputSchema = z.object({
  displayName: z.string().min(1).max(50),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  location: z.string().max(100).optional(),
  websiteUrl: z.string().url().optional(),
  visibility: ProfileVisibilitySchema.optional(),
});

/**
 * All possible mutation request shapes for the social integration.
 * Widgets call: StickerNest.integration('social').mutate(params)
 */
export const SocialGraphMutationSchema = z.discriminatedUnion('type', [
  // Profile mutations
  z.object({
    type: z.literal('createProfile'),
    profile: CreateProfileInputSchema,
  }),
  z.object({
    type: z.literal('updateProfile'),
    updates: UpdateProfileInputSchema,
  }),

  // Follow mutations
  z.object({
    type: z.literal('follow'),
    userId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('unfollow'),
    userId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('acceptFollowRequest'),
    followerId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('rejectFollowRequest'),
    followerId: z.string().uuid(),
  }),

  // Post mutations
  z.object({
    type: z.literal('createPost'),
    post: CreatePostInputSchema,
  }),
  z.object({
    type: z.literal('updatePost'),
    postId: z.string().uuid(),
    content: z.string().max(5000),
  }),
  z.object({
    type: z.literal('deletePost'),
    postId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('bookmark'),
    postId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('unbookmark'),
    postId: z.string().uuid(),
  }),

  // Reaction mutations
  z.object({
    type: z.literal('react'),
    targetType: ReactionTargetTypeSchema,
    targetId: z.string().uuid(),
    reactionType: ReactionTypeSchema,
  }),
  z.object({
    type: z.literal('unreact'),
    targetType: ReactionTargetTypeSchema,
    targetId: z.string().uuid(),
  }),

  // Comment mutations
  z.object({
    type: z.literal('createComment'),
    comment: CreateCommentInputSchema,
  }),
  z.object({
    type: z.literal('updateComment'),
    commentId: z.string().uuid(),
    content: z.string().max(2000),
  }),
  z.object({
    type: z.literal('deleteComment'),
    commentId: z.string().uuid(),
  }),

  // Notification mutations
  z.object({
    type: z.literal('markAsRead'),
    notificationId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('markAllAsRead'),
  }),
  z.object({
    type: z.literal('deleteNotification'),
    notificationId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('deleteReadNotifications'),
  }),
]);

export type SocialGraphMutation = z.infer<typeof SocialGraphMutationSchema>;

// =============================================================================
// JSON Schema Exports
// =============================================================================

export const UserProfileJSONSchema = UserProfileSchema.toJSONSchema();
export const PostJSONSchema = PostSchema.toJSONSchema();
export const CommentJSONSchema = CommentSchema.toJSONSchema();
export const ReactionJSONSchema = ReactionSchema.toJSONSchema();
export const NotificationJSONSchema = NotificationSchema.toJSONSchema();
export const FeedResponseJSONSchema = FeedResponseSchema.toJSONSchema();
