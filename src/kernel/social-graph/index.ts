/**
 * Social Graph API
 * @module kernel/social-graph
 *
 * Provides the persistent social network layer for StickerNest.
 * Social data is hidden by default and accessed through widgets,
 * allowing different widget sets to render the same underlying data.
 */

// Types
export type {
  SocialResult,
  SocialError,
  PaginationOptions,
  Paginated,
  QueryResult,
} from './types';

// Profile API
export {
  getProfile,
  getProfileByUsername,
  createProfile,
  updateProfile,
  searchProfiles,
  isUsernameAvailable,
} from './profiles';

// Follow API
export {
  followUser,
  unfollowUser,
  acceptFollowRequest,
  rejectFollowRequest,
  getFollowers,
  getFollowing,
  isFollowing,
  getPendingFollowRequests,
} from './follows';

// Post API
export {
  createPost,
  getPost,
  updatePost,
  deletePost,
  getUserPosts,
  getPostReplies,
  getHomeFeed,
  getExploreFeed,
  getFeed,
  searchPosts,
  bookmarkPost,
  unbookmarkPost,
} from './posts';

// Reaction API
export {
  addReaction,
  removeReaction,
  getReactions,
  getReactionCounts,
  getUserReaction,
} from './reactions';

// Comment API
export {
  createComment,
  getComment,
  updateComment,
  deleteComment,
  getComments,
  getCommentReplies,
  getCommentCount,
} from './comments';

// Notification API
export {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
} from './notifications';
