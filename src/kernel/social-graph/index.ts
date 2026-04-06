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
  markAsRead as markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
} from './notifications';

// Canvas API (public queries + multi-user member management)
export {
  getUserPublicCanvases,
  getUserCanvases,
  addCanvasMember,
  removeCanvasMember,
  updateCanvasMemberRole,
  getCanvasMembers,
  getCanvasRole,
  getSharedCanvases,
  updateCanvasTags,
  updateCanvasThumbnail,
  updateCanvasSlug,
  validateSlug,
  deriveCanvasCategory,
} from './canvases';
export type { PublicCanvas, CanvasMember, CanvasRole, CanvasCategory } from './canvases';

// Block API
export {
  blockUser,
  unblockUser,
  isBlocked,
  isBlockedEitherWay,
} from './blocks';

// Message API
export {
  sendMessage,
  getConversation,
  getConversationList,
  canMessage,
  markAsRead,
  getUnreadMessageCount,
} from './messages';
export type { DirectMessage, ConversationPreview } from './messages';

// Widget Invite API
export {
  sendWidgetInvite,
  broadcastWidget,
  acceptWidgetInvite,
  declineWidgetInvite,
  getPendingWidgetInvites,
  getWidgetInvite,
} from './widget-invites';
export type { WidgetInvitePayload } from './widget-invites';
