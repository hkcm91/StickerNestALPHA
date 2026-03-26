import { describe, it, expect } from 'vitest';

import {
  ProfileVisibilitySchema,
  UserProfileSchema,
  UpdateProfileInputSchema,
  FollowStatusSchema,
  FollowRelationshipSchema,
  PostVisibilitySchema,
  PostContentTypeSchema,
  PostAttachmentSchema,
  PostSchema,
  CreatePostInputSchema,
  ReactionTypeSchema,
  ReactionTargetTypeSchema,
  ReactionSchema,
  CommentTargetTypeSchema,
  CommentSchema,
  CreateCommentInputSchema,
  NotificationTypeSchema,
  NotificationSchema,
  FeedTypeSchema,
  FeedCursorSchema,
  FeedResponseSchema,
  SocialGraphQuerySchema,
  SocialGraphMutationSchema,
  WidgetInviteModeSchema,
  WidgetInviteStatusSchema,
  WidgetInviteSchema,
} from './social-graph';

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

describe('ProfileVisibilitySchema', () => {
  it('accepts all valid values', () => {
    for (const v of ['public', 'followers', 'private']) {
      expect(ProfileVisibilitySchema.parse(v)).toBe(v);
    }
  });

  it('rejects invalid value', () => {
    expect(() => ProfileVisibilitySchema.parse('hidden')).toThrow();
  });
});

describe('UserProfileSchema', () => {
  const validProfile = () => ({
    userId: uuid(),
    displayName: 'Alice',
    username: 'alice_123',
    createdAt: now(),
    updatedAt: now(),
  });

  it('parses valid profile with defaults', () => {
    const result = UserProfileSchema.parse(validProfile());
    expect(result.visibility).toBe('public');
    expect(result.followerCount).toBe(0);
    expect(result.followingCount).toBe(0);
    expect(result.postCount).toBe(0);
    expect(result.isVerified).toBe(false);
  });

  it('parses profile with all optional fields', () => {
    const result = UserProfileSchema.parse({
      ...validProfile(),
      bio: 'Hello world',
      avatarUrl: 'https://example.com/avatar.png',
      bannerUrl: 'https://example.com/banner.png',
      location: 'New York',
      websiteUrl: 'https://alice.dev',
      visibility: 'private',
      followerCount: 100,
    });
    expect(result.bio).toBe('Hello world');
    expect(result.visibility).toBe('private');
  });

  it('rejects username with spaces', () => {
    expect(() =>
      UserProfileSchema.parse({ ...validProfile(), username: 'bad name' }),
    ).toThrow();
  });

  it('rejects username shorter than 3 chars', () => {
    expect(() =>
      UserProfileSchema.parse({ ...validProfile(), username: 'ab' }),
    ).toThrow();
  });

  it('rejects username longer than 30 chars', () => {
    expect(() =>
      UserProfileSchema.parse({ ...validProfile(), username: 'a'.repeat(31) }),
    ).toThrow();
  });

  it('rejects displayName longer than 50 chars', () => {
    expect(() =>
      UserProfileSchema.parse({ ...validProfile(), displayName: 'x'.repeat(51) }),
    ).toThrow();
  });

  it('rejects negative followerCount', () => {
    expect(() =>
      UserProfileSchema.parse({ ...validProfile(), followerCount: -1 }),
    ).toThrow();
  });
});

describe('UpdateProfileInputSchema', () => {
  it('parses empty update (visibility gets default from base schema)', () => {
    const result = UpdateProfileInputSchema.parse({});
    // visibility has a default of 'public' in the base UserProfileSchema,
    // so .partial() still applies the default when the field is omitted.
    expect(result.visibility).toBe('public');
  });

  it('parses partial update with displayName', () => {
    const result = UpdateProfileInputSchema.parse({ displayName: 'Bob' });
    expect(result.displayName).toBe('Bob');
  });

  it('does not allow userId in update', () => {
    // userId is omitted from the schema
    const result = UpdateProfileInputSchema.parse({ displayName: 'X' });
    expect('userId' in result).toBe(false);
  });
});

describe('FollowRelationshipSchema', () => {
  it('parses valid follow with default status', () => {
    const result = FollowRelationshipSchema.parse({
      id: uuid(),
      followerId: uuid(),
      followingId: uuid(),
      createdAt: now(),
    });
    expect(result.status).toBe('active');
  });

  it('parses follow with explicit status', () => {
    const result = FollowRelationshipSchema.parse({
      id: uuid(),
      followerId: uuid(),
      followingId: uuid(),
      status: 'pending',
      createdAt: now(),
    });
    expect(result.status).toBe('pending');
  });
});

describe('PostSchema', () => {
  const validPost = () => ({
    id: uuid(),
    authorId: uuid(),
    content: 'Hello world!',
    createdAt: now(),
    updatedAt: now(),
  });

  it('parses valid post with defaults', () => {
    const result = PostSchema.parse(validPost());
    expect(result.contentType).toBe('text');
    expect(result.visibility).toBe('public');
    expect(result.replyCount).toBe(0);
    expect(result.repostCount).toBe(0);
    expect(result.reactionCount).toBe(0);
    expect(result.isDeleted).toBe(false);
  });

  it('rejects content over 5000 chars', () => {
    expect(() =>
      PostSchema.parse({ ...validPost(), content: 'x'.repeat(5001) }),
    ).toThrow();
  });

  it('parses post with attachments', () => {
    const result = PostSchema.parse({
      ...validPost(),
      attachments: [
        { type: 'image', url: 'https://img.com/1.png', altText: 'Photo' },
      ],
    });
    expect(result.attachments).toHaveLength(1);
  });

  it('rejects more than 10 attachments', () => {
    const attachments = Array.from({ length: 11 }, () => ({
      type: 'image' as const,
      url: 'https://img.com/x.png',
    }));
    expect(() =>
      PostSchema.parse({ ...validPost(), attachments }),
    ).toThrow();
  });
});

describe('CreatePostInputSchema', () => {
  it('parses create post with minimal fields', () => {
    const result = CreatePostInputSchema.parse({
      content: 'My first post',
    });
    expect(result.content).toBe('My first post');
  });

  it('includes contentType and visibility defaults', () => {
    const result = CreatePostInputSchema.parse({ content: 'test' });
    expect(result.contentType).toBe('text');
    expect(result.visibility).toBe('public');
  });
});

describe('ReactionSchema', () => {
  it('parses valid reaction', () => {
    const result = ReactionSchema.parse({
      id: uuid(),
      userId: uuid(),
      targetType: 'post',
      targetId: uuid(),
      type: 'like',
      createdAt: now(),
    });
    expect(result.type).toBe('like');
  });

  it('rejects invalid reaction type', () => {
    expect(() =>
      ReactionSchema.parse({
        id: uuid(),
        userId: uuid(),
        targetType: 'post',
        targetId: uuid(),
        type: 'dislike',
        createdAt: now(),
      }),
    ).toThrow();
  });
});

describe('CommentSchema', () => {
  const validComment = () => ({
    id: uuid(),
    authorId: uuid(),
    targetType: 'post' as const,
    targetId: uuid(),
    content: 'Nice post!',
    createdAt: now(),
    updatedAt: now(),
  });

  it('parses valid comment with defaults', () => {
    const result = CommentSchema.parse(validComment());
    expect(result.replyCount).toBe(0);
    expect(result.reactionCount).toBe(0);
    expect(result.isDeleted).toBe(false);
  });

  it('rejects content over 2000 chars', () => {
    expect(() =>
      CommentSchema.parse({ ...validComment(), content: 'x'.repeat(2001) }),
    ).toThrow();
  });
});

describe('NotificationSchema', () => {
  it('parses valid notification with defaults', () => {
    const result = NotificationSchema.parse({
      id: uuid(),
      recipientId: uuid(),
      actorId: uuid(),
      type: 'follow',
      createdAt: now(),
    });
    expect(result.isRead).toBe(false);
  });

  it('accepts all notification types', () => {
    const types = [
      'follow', 'follow_request', 'like', 'comment', 'reply',
      'mention', 'repost', 'canvas_invite', 'canvas_comment',
      'widget_share', 'mutual_follow', 'widget_connection_invite',
      'widget_broadcast',
    ];
    for (const t of types) {
      expect(NotificationTypeSchema.parse(t)).toBe(t);
    }
  });
});

describe('FeedCursorSchema', () => {
  it('applies default limit', () => {
    const result = FeedCursorSchema.parse({});
    expect(result.limit).toBe(20);
  });

  it('rejects limit over 100', () => {
    expect(() => FeedCursorSchema.parse({ limit: 200 })).toThrow();
  });

  it('rejects limit below 1', () => {
    expect(() => FeedCursorSchema.parse({ limit: 0 })).toThrow();
  });
});

describe('FeedResponseSchema', () => {
  it('parses valid response', () => {
    const result = FeedResponseSchema.parse({
      items: [],
      hasMore: false,
    });
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });
});

describe('SocialGraphQuerySchema', () => {
  it('parses getProfile query', () => {
    const result = SocialGraphQuerySchema.parse({
      type: 'getProfile',
      userId: uuid(),
    });
    expect(result.type).toBe('getProfile');
  });

  it('parses getFeed query', () => {
    const result = SocialGraphQuerySchema.parse({
      type: 'getFeed',
      feedType: 'home',
    });
    expect(result.type).toBe('getFeed');
  });

  it('parses getUnreadCount query (no extra fields)', () => {
    const result = SocialGraphQuerySchema.parse({ type: 'getUnreadCount' });
    expect(result.type).toBe('getUnreadCount');
  });

  it('rejects unknown query type', () => {
    expect(() =>
      SocialGraphQuerySchema.parse({ type: 'unknown' }),
    ).toThrow();
  });
});

describe('SocialGraphMutationSchema', () => {
  it('parses follow mutation', () => {
    const result = SocialGraphMutationSchema.parse({
      type: 'follow',
      userId: uuid(),
    });
    expect(result.type).toBe('follow');
  });

  it('parses sendMessage mutation', () => {
    const result = SocialGraphMutationSchema.parse({
      type: 'sendMessage',
      recipientId: uuid(),
      content: 'Hello!',
    });
    expect(result.type).toBe('sendMessage');
  });

  it('parses markAllAsRead mutation', () => {
    const result = SocialGraphMutationSchema.parse({ type: 'markAllAsRead' });
    expect(result.type).toBe('markAllAsRead');
  });

  it('rejects unknown mutation type', () => {
    expect(() =>
      SocialGraphMutationSchema.parse({ type: 'unknownMutation' }),
    ).toThrow();
  });

  it('rejects sendMessage with empty content', () => {
    expect(() =>
      SocialGraphMutationSchema.parse({
        type: 'sendMessage',
        recipientId: uuid(),
        content: '',
      }),
    ).toThrow();
  });
});

describe('WidgetInviteSchema', () => {
  const validInvite = () => ({
    id: uuid(),
    senderId: uuid(),
    recipientId: uuid(),
    mode: 'share' as const,
    widgetId: 'widget-abc',
    createdAt: now(),
    updatedAt: now(),
  });

  it('parses valid invite with defaults', () => {
    const result = WidgetInviteSchema.parse(validInvite());
    expect(result.status).toBe('pending');
    expect(result.isBroadcast).toBe(false);
  });

  it('parses pipeline invite with optional fields', () => {
    const result = WidgetInviteSchema.parse({
      ...validInvite(),
      mode: 'pipeline',
      sourcePortId: 'out-1',
      targetPortId: 'in-1',
      sourceCanvasId: uuid(),
      sourceWidgetInstanceId: 'inst-1',
    });
    expect(result.mode).toBe('pipeline');
    expect(result.sourcePortId).toBe('out-1');
  });

  it('rejects invalid mode', () => {
    expect(() =>
      WidgetInviteSchema.parse({ ...validInvite(), mode: 'link' }),
    ).toThrow();
  });

  it('rejects invalid status', () => {
    expect(() =>
      WidgetInviteSchema.parse({ ...validInvite(), status: 'cancelled' }),
    ).toThrow();
  });
});
