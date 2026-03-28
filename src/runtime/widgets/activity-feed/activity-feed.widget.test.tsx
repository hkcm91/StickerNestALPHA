/**
 * Activity Feed Widget - Test Suite
 *
 * @module runtime/widgets/activity-feed
 * @layer L3
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import { FEED_EVENTS } from './activity-feed.events';
import { feedTabSchema, feedConfigSchema, DEFAULT_FEED_CONFIG } from './activity-feed.schema';
import { ActivityFeedWidget, activityFeedManifest } from './activity-feed.widget';

// Mock hooks
const mockEmit = vi.fn();
vi.mock('../../hooks', () => ({
  useEmit: vi.fn(() => mockEmit),
  useSubscribe: vi.fn(),
  useWidgetState: vi.fn(() => [{}, vi.fn()]),
}));

// Mock auth store
const mockUserId = 'test-user-123';
vi.mock('../../../kernel/stores/auth/auth.store', () => ({
  useAuthStore: vi.fn((selector: any) => selector({ user: { id: 'test-user-123' } })),
}));

// Mock social graph API
vi.mock('../../../kernel/social-graph', () => ({
  getFeed: vi.fn().mockResolvedValue({
    success: true,
    data: {
      items: [
        {
          id: 'post-1',
          authorId: 'author-abc',
          contentType: 'text',
          content: 'Hello world, this is my first post!',
          visibility: 'public',
          replyCount: 3,
          repostCount: 0,
          reactionCount: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'post-2',
          authorId: 'author-def',
          contentType: 'text',
          content: 'Second post in the feed',
          visibility: 'public',
          replyCount: 0,
          repostCount: 1,
          reactionCount: 2,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      hasMore: false,
    },
  }),
  createPost: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 'new-post-1',
      authorId: 'test-user-123',
      contentType: 'text',
      content: 'New test post',
      visibility: 'public',
      replyCount: 0,
      repostCount: 0,
      reactionCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }),
  addReaction: vi.fn().mockResolvedValue({ success: true, data: {} }),
  createComment: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 'comment-1', content: 'Test comment' },
  }),
}));

describe('Activity Feed Widget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Manifest', () => {
    it('should have correct widget ID', () => {
      expect(activityFeedManifest.id).toBe('sn.builtin.activity-feed');
    });

    it('should have required manifest fields', () => {
      expect(activityFeedManifest.name).toBe('Activity Feed');
      expect(activityFeedManifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(activityFeedManifest.category).toBe('social');
    });

    it('should require integrations permission', () => {
      expect(activityFeedManifest.permissions).toContain('integrations');
    });

    it('should declare emit events', () => {
      const emitNames = activityFeedManifest.events.emits.map((e: any) => e.name);
      expect(emitNames).toContain(FEED_EVENTS.emits.READY);
      expect(emitNames).toContain(FEED_EVENTS.emits.POST_CREATED);
      expect(emitNames).toContain(FEED_EVENTS.emits.POST_REACTED);
      expect(emitNames).toContain(FEED_EVENTS.emits.COMMENT_CREATED);
      expect(emitNames).toContain(FEED_EVENTS.emits.FEED_REFRESHED);
    });

    it('should declare subscribe events', () => {
      const subNames = activityFeedManifest.events.subscribes.map((e: any) => e.name);
      expect(subNames).toContain(FEED_EVENTS.subscribes.REFRESH);
    });

    it('should be configured as inline entry', () => {
      expect(activityFeedManifest.entry).toBe('inline');
    });
  });

  describe('Component Rendering', () => {
    it('should render the feed header', async () => {
      render(<ActivityFeedWidget instanceId="test-inst-1" />);
      await waitFor(() => {
        expect(screen.getByText('Feed')).toBeInTheDocument();
      });
    });

    it('should render feed tabs', async () => {
      render(<ActivityFeedWidget instanceId="test-inst-1" />);
      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Explore')).toBeInTheDocument();
        expect(screen.getByText('Mentions')).toBeInTheDocument();
      });
    });

    it('should render posts from the feed', async () => {
      render(<ActivityFeedWidget instanceId="test-inst-1" />);
      await waitFor(() => {
        expect(screen.getByText('Hello world, this is my first post!')).toBeInTheDocument();
        expect(screen.getByText('Second post in the feed')).toBeInTheDocument();
      });
    });

    it('should show compose box on home tab', async () => {
      render(<ActivityFeedWidget instanceId="test-inst-1" />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText("What's happening?")).toBeInTheDocument();
      });
    });

    it('should display reaction and comment counts', async () => {
      render(<ActivityFeedWidget instanceId="test-inst-1" />);
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // reaction count
        expect(screen.getByText('3')).toBeInTheDocument(); // reply count
      });
    });

    it('should emit READY on mount', async () => {
      render(<ActivityFeedWidget instanceId="test-inst-1" />);
      await waitFor(() => {
        expect(mockEmit).toHaveBeenCalledWith(
          FEED_EVENTS.emits.READY,
          expect.objectContaining({ instanceId: 'test-inst-1' }),
        );
      });
    });
  });

  describe('Tab Switching', () => {
    it('should switch tabs when clicked', async () => {
      const { getFeed } = await import('../../../kernel/social-graph');
      render(<ActivityFeedWidget instanceId="test-inst-1" />);

      await waitFor(() => {
        expect(screen.getByText('Explore')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Explore'));

      await waitFor(() => {
        expect(getFeed).toHaveBeenCalledWith('explore', mockUserId, expect.any(Object));
      });
    });
  });

  describe('Unauthenticated State', () => {
    it('should show sign-in message when not authenticated', async () => {
      const { useAuthStore } = await import('../../../kernel/stores/auth/auth.store');
      (useAuthStore as any).mockImplementation((selector: any) => selector({ user: null }));

      render(<ActivityFeedWidget instanceId="test-inst-1" />);
      expect(screen.getByText('Sign in to view your feed')).toBeInTheDocument();

      // Restore mock
      (useAuthStore as any).mockImplementation((selector: any) => selector({ user: { id: mockUserId } }));
    });
  });
});

describe('Activity Feed Schema', () => {
  it('should validate feed tab values', () => {
    expect(feedTabSchema.parse('home')).toBe('home');
    expect(feedTabSchema.parse('explore')).toBe('explore');
    expect(feedTabSchema.parse('mentions')).toBe('mentions');
  });

  it('should reject invalid tab values', () => {
    expect(() => feedTabSchema.parse('invalid')).toThrow();
  });

  it('should provide default config', () => {
    expect(DEFAULT_FEED_CONFIG.defaultTab).toBe('home');
    expect(DEFAULT_FEED_CONFIG.postsPerPage).toBe(20);
  });

  it('should validate config with custom values', () => {
    const config = feedConfigSchema.parse({ defaultTab: 'explore', postsPerPage: 10 });
    expect(config.defaultTab).toBe('explore');
    expect(config.postsPerPage).toBe(10);
  });
});

describe('Activity Feed Events', () => {
  it('should have correct event namespace', () => {
    expect(FEED_EVENTS.emits.READY).toMatch(/^widget\.activity-feed\./);
    expect(FEED_EVENTS.emits.POST_CREATED).toMatch(/^widget\.activity-feed\./);
    expect(FEED_EVENTS.subscribes.REFRESH).toMatch(/^widget\.activity-feed\./);
  });
});
