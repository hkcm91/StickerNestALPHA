/**
 * Activity Feed Widget Schemas
 *
 * Local types for feed widget state management.
 *
 * @module runtime/widgets/activity-feed
 * @layer L3
 */

import { z } from 'zod';

export const feedTabSchema = z.enum(['home', 'explore', 'mentions']);
export type FeedTab = z.infer<typeof feedTabSchema>;

export const FEED_TAB_LABELS: Record<FeedTab, string> = {
  home: 'Home',
  explore: 'Explore',
  mentions: 'Mentions',
};

export const feedConfigSchema = z.object({
  defaultTab: feedTabSchema.default('home'),
  postsPerPage: z.number().int().min(5).max(50).default(20),
});

export type FeedConfig = z.infer<typeof feedConfigSchema>;

export const DEFAULT_FEED_CONFIG: FeedConfig = feedConfigSchema.parse({});
