/**
 * Activity Feed Widget Events
 *
 * @module runtime/widgets/activity-feed
 * @layer L3
 */

import { z } from 'zod';

export const FEED_EVENTS = {
  emits: {
    READY: 'widget.activity-feed.ready',
    POST_CREATED: 'widget.activity-feed.post.created',
    POST_REACTED: 'widget.activity-feed.post.reacted',
    COMMENT_CREATED: 'widget.activity-feed.comment.created',
    FEED_REFRESHED: 'widget.activity-feed.refreshed',
  },
  subscribes: {
    REFRESH: 'widget.activity-feed.command.refresh',
  },
} as const;

export const FeedEventPayloads = {
  emits: {
    [FEED_EVENTS.emits.READY]: z.object({
      instanceId: z.string(),
      timestamp: z.number(),
    }),
    [FEED_EVENTS.emits.POST_CREATED]: z.object({
      instanceId: z.string(),
      postId: z.string(),
      timestamp: z.number(),
    }),
    [FEED_EVENTS.emits.POST_REACTED]: z.object({
      instanceId: z.string(),
      postId: z.string(),
      reactionType: z.string(),
      timestamp: z.number(),
    }),
    [FEED_EVENTS.emits.COMMENT_CREATED]: z.object({
      instanceId: z.string(),
      postId: z.string(),
      commentId: z.string(),
      timestamp: z.number(),
    }),
    [FEED_EVENTS.emits.FEED_REFRESHED]: z.object({
      instanceId: z.string(),
      feedType: z.string(),
      count: z.number(),
      timestamp: z.number(),
    }),
  },
  subscribes: {
    [FEED_EVENTS.subscribes.REFRESH]: z.object({}).optional(),
  },
};
