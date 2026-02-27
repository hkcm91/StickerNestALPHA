/**
 * Social Handler Tests
 *
 * @module runtime/integrations
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createSocialHandler } from './social-handler';

// Valid UUIDs for testing (must be proper UUID v4 format)
const TEST_USER_ID = '11111111-1111-4111-a111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-a222-222222222222';
const POST_ID = '33333333-3333-4333-a333-333333333333';
const COMMENT_ID = '44444444-4444-4444-a444-444444444444';
// const NOTIFICATION_ID = '55555555-5555-4555-a555-555555555555';

// Mock the social graph API
vi.mock('../../kernel/social-graph', () => ({
  getProfile: vi.fn(),
  getProfileByUsername: vi.fn(),
  searchProfiles: vi.fn(),
  isUsernameAvailable: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  acceptFollowRequest: vi.fn(),
  rejectFollowRequest: vi.fn(),
  getFollowers: vi.fn(),
  getFollowing: vi.fn(),
  isFollowing: vi.fn(),
  getPendingFollowRequests: vi.fn(),
  createPost: vi.fn(),
  getPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  getUserPosts: vi.fn(),
  getPostReplies: vi.fn(),
  getHomeFeed: vi.fn(),
  getExploreFeed: vi.fn(),
  getFeed: vi.fn(),
  searchPosts: vi.fn(),
  bookmarkPost: vi.fn(),
  unbookmarkPost: vi.fn(),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
  getReactions: vi.fn(),
  getReactionCounts: vi.fn(),
  getUserReaction: vi.fn(),
  createComment: vi.fn(),
  getComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  getComments: vi.fn(),
  getCommentReplies: vi.fn(),
  getCommentCount: vi.fn(),
  createNotification: vi.fn(),
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  deleteReadNotifications: vi.fn(),
}));

import * as social from '../../kernel/social-graph';

describe('createSocialHandler', () => {
  const mockGetUserId = vi.fn(() => TEST_USER_ID);
  let handler: ReturnType<typeof createSocialHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserId.mockReturnValue(TEST_USER_ID);
    handler = createSocialHandler(mockGetUserId);
  });

  describe('query', () => {
    it('should reject invalid query params', async () => {
      await expect(handler.query({ invalid: 'params' })).rejects.toThrow('Invalid social query params');
    });

    it('should handle getProfile query', async () => {
      const mockProfile = { userId: OTHER_USER_ID, displayName: 'Test User', username: 'testuser' } as any;
      vi.mocked(social.getProfile).mockResolvedValue({ success: true, data: mockProfile });

      const result = await handler.query({ type: 'getProfile', userId: OTHER_USER_ID });

      expect(social.getProfile).toHaveBeenCalledWith(OTHER_USER_ID);
      expect(result).toEqual(mockProfile);
    });

    it('should handle searchProfiles query with pagination', async () => {
      const mockResult = [] as any;
      vi.mocked(social.searchProfiles).mockResolvedValue({ success: true, data: mockResult });

      const result = await handler.query({ type: 'searchProfiles', query: 'test', limit: 10 });

      expect(social.searchProfiles).toHaveBeenCalledWith('test', 10);
      expect(result).toEqual(mockResult);
    });

    it('should handle getFeed query', async () => {
      const mockFeed = { items: [], hasMore: false };
      vi.mocked(social.getFeed).mockResolvedValue({ success: true, data: mockFeed });

      const result = await handler.query({ type: 'getFeed', feedType: 'home' });

      expect(social.getFeed).toHaveBeenCalledWith('home', TEST_USER_ID, expect.any(Object));
      expect(result).toEqual(mockFeed);
    });

    it('should require authentication for user-specific queries', async () => {
      mockGetUserId.mockReturnValue(null as any);
      handler = createSocialHandler(mockGetUserId);

      await expect(handler.query({ type: 'getFeed', feedType: 'home' })).rejects.toThrow('Authentication required');
    });

    it('should handle getReactionCounts query', async () => {
      const mockCounts = { like: 5, love: 3, laugh: 0, wow: 1, sad: 0, angry: 0 };
      vi.mocked(social.getReactionCounts).mockResolvedValue({ success: true, data: mockCounts });

      const result = await handler.query({ type: 'getReactionCounts', targetType: 'post', targetId: POST_ID });

      expect(social.getReactionCounts).toHaveBeenCalledWith('post', POST_ID);
      expect(result).toEqual(mockCounts);
    });

    it('should handle getNotifications query', async () => {
      const mockNotifications = { items: [], hasMore: false };
      vi.mocked(social.getNotifications).mockResolvedValue({ success: true, data: mockNotifications });

      const result = await handler.query({ type: 'getNotifications', unreadOnly: true });

      expect(social.getNotifications).toHaveBeenCalledWith(TEST_USER_ID, expect.objectContaining({ unreadOnly: true }));
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('mutate', () => {
    it('should reject invalid mutation params', async () => {
      await expect(handler.mutate({ invalid: 'params' })).rejects.toThrow('Invalid social mutation params');
    });

    it('should require authentication for all mutations', async () => {
      mockGetUserId.mockReturnValue(null as any);
      handler = createSocialHandler(mockGetUserId);

      await expect(handler.mutate({ type: 'follow', userId: OTHER_USER_ID })).rejects.toThrow('Authentication required');
    });

    it('should handle follow mutation', async () => {
      const mockFollow = { id: 'follow-1', followerId: TEST_USER_ID, followingId: OTHER_USER_ID, status: 'active', createdAt: new Date().toISOString() } as any;
      vi.mocked(social.followUser).mockResolvedValue({ success: true, data: mockFollow });

      const result = await handler.mutate({ type: 'follow', userId: OTHER_USER_ID });

      expect(social.followUser).toHaveBeenCalledWith(OTHER_USER_ID, TEST_USER_ID);
      expect(result).toEqual(mockFollow);
    });

    it('should handle createPost mutation', async () => {
      const mockPost = { id: POST_ID, authorId: TEST_USER_ID, content: 'Hello world!' } as any;
      vi.mocked(social.createPost).mockResolvedValue({ success: true, data: mockPost });

      const result = await handler.mutate({
        type: 'createPost',
        post: { content: 'Hello world!' },
      });

      // Schema adds default values (contentType: 'text', visibility: 'public')
      expect(social.createPost).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Hello world!' }),
        TEST_USER_ID,
      );
      expect(result).toEqual(mockPost);
    });

    it('should handle react mutation', async () => {
      const mockReaction = { id: 'reaction-1', userId: TEST_USER_ID, targetType: 'post', targetId: POST_ID, type: 'like', createdAt: new Date().toISOString() } as any;
      vi.mocked(social.addReaction).mockResolvedValue({ success: true, data: mockReaction });

      const result = await handler.mutate({
        type: 'react',
        targetType: 'post',
        targetId: POST_ID,
        reactionType: 'like',
      });

      expect(social.addReaction).toHaveBeenCalledWith('post', POST_ID, 'like', TEST_USER_ID);
      expect(result).toEqual(mockReaction);
    });

    it('should handle createComment mutation', async () => {
      const mockComment = { id: COMMENT_ID, authorId: TEST_USER_ID, content: 'Nice!' } as any;
      vi.mocked(social.createComment).mockResolvedValue({ success: true, data: mockComment });

      const result = await handler.mutate({
        type: 'createComment',
        comment: { targetType: 'post', targetId: POST_ID, content: 'Nice!' },
      });

      expect(social.createComment).toHaveBeenCalledWith(
        { targetType: 'post', targetId: POST_ID, content: 'Nice!' },
        TEST_USER_ID,
      );
      expect(result).toEqual(mockComment);
    });

    it('should handle markAllAsRead mutation', async () => {
      vi.mocked(social.markAllAsRead).mockResolvedValue({ success: true, data: { count: 5 } });

      const result = await handler.mutate({ type: 'markAllAsRead' });

      expect(social.markAllAsRead).toHaveBeenCalledWith(TEST_USER_ID);
      expect(result).toEqual({ count: 5 });
    });

    it('should propagate API errors', async () => {
      vi.mocked(social.followUser).mockResolvedValue({
        success: false,
        error: { code: 'BLOCKED', message: 'Cannot follow this user.' },
      });

      await expect(handler.mutate({ type: 'follow', userId: OTHER_USER_ID })).rejects.toThrow('Cannot follow this user.');
    });
  });
});
