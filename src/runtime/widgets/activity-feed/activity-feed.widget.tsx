/**
 * Activity Feed Widget
 *
 * Built-in inline widget that renders a social media feed on the canvas.
 * Displays posts from followed users (Home), trending posts (Explore),
 * and posts mentioning the current user (Mentions).
 *
 * Supports composing posts, reacting, commenting, and infinite scroll.
 * Backed by the social graph API with real-time updates via bus events.
 *
 * @module runtime/widgets/activity-feed
 * @layer L3
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

import type { WidgetManifest, Post, FeedResponse, FeedType } from '@sn/types';
import { SocialGraphEvents } from '@sn/types';

import * as social from '../../../kernel/social-graph';
import { useAuthStore } from '../../../kernel/stores/auth/auth.store';
import { useEmit, useSubscribe, useWidgetState } from '../../hooks';

import { FEED_EVENTS } from './activity-feed.events';
import type { FeedTab } from './activity-feed.schema';
import { FEED_TAB_LABELS } from './activity-feed.schema';

// ── Inline SVG Icons ─────────────────────────────────────────────

const HeartIcon: React.FC<{ filled?: boolean; size?: number }> = ({ filled, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 14s-5.5-3.5-5.5-7A3.5 3.5 0 0 1 8 4a3.5 3.5 0 0 1 5.5 3c0 3.5-5.5 7-5.5 7z" />
  </svg>
);

const CommentIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 10c0 .55-.45 1-1 1H4l-3 3V3c0-.55.45-1 1-1h11c.55 0 1 .45 1 1v7z" />
  </svg>
);

const RefreshIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 1v5h5M15 15v-5h-5" />
    <path d="M13.5 6A6 6 0 0 0 3 3l-2 2M2.5 10A6 6 0 0 0 13 13l2-2" />
  </svg>
);

const SendIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 1L7.5 8.5M15 1l-5 14-2.5-6.5L1 6l14-5z" />
  </svg>
);

// ── Helpers ──────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function truncateId(id: string): string {
  return id.slice(0, 8);
}

// ── CSS variable helpers ─────────────────────────────────────────

const v = {
  bg: 'var(--sn-bg, #181825)',
  surface: 'var(--sn-surface, #1e1e2e)',
  accent: 'var(--sn-accent, #cba6f7)',
  text: 'var(--sn-text, #cdd6f4)',
  textMuted: 'var(--sn-text-muted, #6c7086)',
  border: 'var(--sn-border, #313244)',
  radius: 'var(--sn-radius, 8px)',
  font: 'var(--sn-font-family, system-ui, -apple-system, sans-serif)',
};

// ── Feed tab to FeedType mapping ─────────────────────────────────

const TAB_TO_FEED_TYPE: Record<FeedTab, FeedType> = {
  home: 'home',
  explore: 'explore',
  mentions: 'mentions',
};

// ── Widget Manifest ──────────────────────────────────────────────

export const activityFeedManifest: WidgetManifest = {
  id: 'sn.builtin.activity-feed',
  name: 'Activity Feed',
  version: '1.0.0',
  description: 'Social media feed widget. View posts from people you follow, explore trending content, compose posts, react, and comment — all on your canvas.',
  author: { name: 'StickerNest', url: 'https://stickernest.com' },
  category: 'social',
  tags: ['social', 'feed', 'posts', 'timeline', 'activity'],
  permissions: ['integrations'],
  size: {
    defaultWidth: 400,
    defaultHeight: 600,
    minWidth: 320,
    minHeight: 400,
    aspectLocked: false,
  },
  license: 'MIT',
  config: { fields: [] },
  spatialSupport: false,
  entry: 'inline',
  crossCanvasChannels: [],
  events: {
    emits: [
      { name: FEED_EVENTS.emits.READY },
      { name: FEED_EVENTS.emits.POST_CREATED },
      { name: FEED_EVENTS.emits.POST_REACTED },
      { name: FEED_EVENTS.emits.COMMENT_CREATED },
      { name: FEED_EVENTS.emits.FEED_REFRESHED },
    ],
    subscribes: [
      { name: FEED_EVENTS.subscribes.REFRESH },
    ],
  },
};

// ── Sub-components ───────────────────────────────────────────────

interface PostCardProps {
  post: Post;
  onReact: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  expandedComments: Set<string>;
  onSubmitComment: (postId: string, content: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onReact, onToggleComments, expandedComments, onSubmitComment }) => {
  const [commentText, setCommentText] = useState('');
  const showComments = expandedComments.has(post.id);

  const handleSubmitComment = () => {
    const text = commentText.trim();
    if (!text) return;
    onSubmitComment(post.id, text);
    setCommentText('');
  };

  return (
    <div style={{
      padding: '14px',
      borderRadius: v.radius,
      background: v.surface,
      border: `1px solid ${v.border}`,
    }}>
      {/* Author + timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: v.accent, opacity: 0.7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff',
        }}>
          {truncateId(post.authorId).slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: v.text }}>
            {truncateId(post.authorId)}
          </span>
          <span style={{ fontSize: 11, color: v.textMuted, marginLeft: 8 }}>
            {relativeTime(post.createdAt)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ fontSize: 13, lineHeight: 1.5, color: v.text, marginBottom: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {post.content}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <button
          onClick={() => onReact(post.id)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
            display: 'flex', alignItems: 'center', gap: 4,
            color: v.textMuted, fontSize: 12,
          }}
        >
          <HeartIcon size={14} />
          <span>{post.reactionCount}</span>
        </button>
        <button
          onClick={() => onToggleComments(post.id)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
            display: 'flex', alignItems: 'center', gap: 4,
            color: v.textMuted, fontSize: 12,
          }}
        >
          <CommentIcon size={14} />
          <span>{post.replyCount}</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${v.border}` }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitComment(); }}
              placeholder="Write a comment..."
              style={{
                flex: 1, padding: '6px 10px', borderRadius: '6px',
                background: v.bg, color: v.text, border: `1px solid ${v.border}`,
                fontSize: 12, outline: 'none', fontFamily: v.font,
              }}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
              style={{
                background: v.accent, border: 'none', borderRadius: '6px',
                padding: '6px 10px', cursor: 'pointer', color: '#fff',
                opacity: commentText.trim() ? 1 : 0.4,
              }}
            >
              <SendIcon size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────

export const ActivityFeedWidget: React.FC<{ instanceId: string }> = ({ instanceId }) => {
  const emit = useEmit();
  const [state, persistState] = useWidgetState(instanceId);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  // ── State ─────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<FeedTab>(() => {
    return (state.activeTab as FeedTab) || 'home';
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [composeText, setComposeText] = useState('');
  const [composing, setComposing] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newPostCount, setNewPostCount] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // ── Persist active tab ────────────────────────────────────────

  useEffect(() => {
    persistState('activeTab', activeTab);
  }, [activeTab, persistState]);

  // ── Fetch feed ────────────────────────────────────────────────

  const fetchFeed = useCallback(async (tab: FeedTab, nextCursor?: string) => {
    if (!userId || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const feedType = TAB_TO_FEED_TYPE[tab];
      const result = await social.getFeed(feedType, userId, {
        limit: 20,
        cursor: nextCursor,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      const data = result.data as FeedResponse;
      if (nextCursor) {
        setPosts((prev) => [...prev, ...data.items]);
      } else {
        setPosts(data.items);
      }
      setCursor(data.nextCursor?.afterId);
      setHasMore(data.hasMore);

      emit(FEED_EVENTS.emits.FEED_REFRESHED, {
        instanceId,
        feedType,
        count: data.items.length,
        timestamp: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [userId, instanceId, emit]);

  // ── Initial load + tab switch ─────────────────────────────────

  useEffect(() => {
    setPosts([]);
    setCursor(undefined);
    setHasMore(true);
    setNewPostCount(0);
    fetchFeed(activeTab);
  }, [activeTab, fetchFeed]);

  // ── Emit READY on mount ───────────────────────────────────────

  useEffect(() => {
    emit(FEED_EVENTS.emits.READY, { instanceId, timestamp: Date.now() });
  }, [instanceId, emit]);

  // ── Real-time new post indicator ──────────────────────────────

  useSubscribe(SocialGraphEvents.POST_CREATED, useCallback((payload: unknown) => {
    const p = payload as { post?: Post } | null;
    if (p?.post && p.post.authorId !== userId) {
      setNewPostCount((c) => c + 1);
    }
  }, [userId]));

  // ── Refresh command from bus ───────────────────────────────────

  useSubscribe(FEED_EVENTS.subscribes.REFRESH, useCallback(() => {
    setPosts([]);
    setCursor(undefined);
    setHasMore(true);
    setNewPostCount(0);
    fetchFeed(activeTab);
  }, [activeTab, fetchFeed]));

  // ── Infinite scroll ───────────────────────────────────────────

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore || loadingRef.current) return;
    const threshold = 100;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
      fetchFeed(activeTab, cursor);
    }
  }, [activeTab, cursor, hasMore, fetchFeed]);

  // ── Compose post ──────────────────────────────────────────────

  const handleCompose = useCallback(async () => {
    const text = composeText.trim();
    if (!text || !userId || composing) return;
    setComposing(true);

    try {
      const result = await social.createPost(
        { content: text, contentType: 'text', visibility: 'public' },
        userId,
      );
      if (result.success && result.data) {
        setPosts((prev) => [result.data!, ...prev]);
        setComposeText('');
        emit(FEED_EVENTS.emits.POST_CREATED, {
          instanceId,
          postId: result.data.id,
          timestamp: Date.now(),
        });
      }
    } catch {
      // Silent fail — post stays in compose box for retry
    } finally {
      setComposing(false);
    }
  }, [composeText, userId, composing, instanceId, emit]);

  // ── React to post ─────────────────────────────────────────────

  const handleReact = useCallback(async (postId: string) => {
    if (!userId) return;
    try {
      await social.addReaction('post', postId, 'like', userId);
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, reactionCount: p.reactionCount + 1 } : p,
      ));
      emit(FEED_EVENTS.emits.POST_REACTED, {
        instanceId, postId, reactionType: 'like', timestamp: Date.now(),
      });
    } catch {
      // Silently ignore — likely already reacted
    }
  }, [userId, instanceId, emit]);

  // ── Toggle comments ───────────────────────────────────────────

  const handleToggleComments = useCallback((postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  // ── Submit comment ────────────────────────────────────────────

  const handleSubmitComment = useCallback(async (postId: string, content: string) => {
    if (!userId) return;
    try {
      const result = await social.createComment(
        { targetType: 'post', targetId: postId, content },
        userId,
      );
      if (result.success && result.data) {
        setPosts((prev) => prev.map((p) =>
          p.id === postId ? { ...p, replyCount: p.replyCount + 1 } : p,
        ));
        emit(FEED_EVENTS.emits.COMMENT_CREATED, {
          instanceId, postId, commentId: result.data.id, timestamp: Date.now(),
        });
      }
    } catch {
      // Silent fail
    }
  }, [userId, instanceId, emit]);

  // ── Show new posts ────────────────────────────────────────────

  const handleShowNewPosts = useCallback(() => {
    setNewPostCount(0);
    setPosts([]);
    setCursor(undefined);
    setHasMore(true);
    fetchFeed(activeTab);
  }, [activeTab, fetchFeed]);

  // ── Auth guard ────────────────────────────────────────────────

  if (!userId) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: v.surface, color: v.textMuted, fontFamily: v.font,
        borderRadius: v.radius, fontSize: 14,
      }}>
        Sign in to view your feed
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: v.surface, color: v.text, fontFamily: v.font,
      borderRadius: v.radius, overflow: 'hidden',
    }}>
      {/* Header + tabs */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${v.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>Feed</span>
          <button
            onClick={() => { setPosts([]); setCursor(undefined); setNewPostCount(0); fetchFeed(activeTab); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: v.textMuted, padding: '4px',
            }}
            title="Refresh feed"
          >
            <RefreshIcon />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 14px' }}>
          {(Object.keys(FEED_TAB_LABELS) as FeedTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 12px', fontSize: 13, fontWeight: 500,
                color: activeTab === tab ? v.accent : v.textMuted,
                borderBottom: activeTab === tab ? `2px solid ${v.accent}` : '2px solid transparent',
                fontFamily: v.font,
              }}
            >
              {FEED_TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Compose box (home tab only) */}
      {activeTab === 'home' && (
        <div style={{
          flexShrink: 0, padding: '10px 14px',
          borderBottom: `1px solid ${v.border}`,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              placeholder="What's happening?"
              rows={2}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: '8px',
                background: v.bg, color: v.text, border: `1px solid ${v.border}`,
                fontSize: 13, resize: 'none', outline: 'none', fontFamily: v.font,
              }}
            />
            <button
              onClick={handleCompose}
              disabled={!composeText.trim() || composing}
              style={{
                alignSelf: 'flex-end', background: v.accent, border: 'none',
                borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
                color: '#fff', fontWeight: 600, fontSize: 13,
                opacity: composeText.trim() && !composing ? 1 : 0.4,
                fontFamily: v.font,
              }}
            >
              {composing ? '...' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {/* New posts banner */}
      {newPostCount > 0 && (
        <button
          onClick={handleShowNewPosts}
          style={{
            flexShrink: 0, width: '100%', padding: '8px',
            background: v.accent, border: 'none', cursor: 'pointer',
            color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: v.font,
          }}
        >
          {newPostCount} new {newPostCount === 1 ? 'post' : 'posts'} — tap to refresh
        </button>
      )}

      {/* Feed content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: 'auto', padding: '8px 10px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        {error && (
          <div style={{ padding: 16, textAlign: 'center', color: '#f38ba8', fontSize: 13 }}>
            {error}
          </div>
        )}

        {!loading && posts.length === 0 && !error && (
          <div style={{ padding: 32, textAlign: 'center', color: v.textMuted, fontSize: 13 }}>
            {activeTab === 'home'
              ? 'No posts yet. Follow some people or write your first post!'
              : activeTab === 'explore'
                ? 'Nothing trending right now.'
                : 'No one has mentioned you yet.'}
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onReact={handleReact}
            onToggleComments={handleToggleComments}
            expandedComments={expandedComments}
            onSubmitComment={handleSubmitComment}
          />
        ))}

        {loading && (
          <div style={{ padding: 16, textAlign: 'center', color: v.textMuted, fontSize: 12 }}>
            Loading...
          </div>
        )}

        {!hasMore && posts.length > 0 && (
          <div style={{ padding: 12, textAlign: 'center', color: v.textMuted, fontSize: 11 }}>
            You're all caught up
          </div>
        )}
      </div>
    </div>
  );
};
