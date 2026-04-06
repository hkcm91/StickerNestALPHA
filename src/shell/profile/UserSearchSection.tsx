/**
 * User Search Section — "Find People" search on the profile page.
 *
 * Two tabs: "All Users" (platform-wide search) and "Following" (filter followed users).
 * Each result row shows avatar, name, @username, bio snippet, and a Follow/Unfollow button.
 *
 * @module shell/profile
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { UserProfile } from '@sn/types';

import {
  searchProfiles,
  getFollowing,
  followUser,
  unfollowUser,
  isFollowing as checkIsFollowing,
} from '../../kernel/social-graph';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { palette, themeVar } from '../theme/theme-vars';

import { TabButton } from './TabButton';
import { UserRow } from './UserRow';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchTab = 'all' | 'following';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const btnBase: React.CSSProperties = {
  padding: '6px 16px',
  borderRadius: 'var(--sn-radius, 8px)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid var(--sn-border, #e5e7eb)',
  fontFamily: 'var(--sn-font-family, system-ui)',
  transition: 'opacity 0.15s',
  whiteSpace: 'nowrap',
};

const followBtn: React.CSSProperties = {
  ...btnBase,
  background: 'var(--sn-accent, #3B82F6)',
  color: '#fff',
  border: 'none',
};

const followingBtn: React.CSSProperties = {
  ...btnBase,
  background: 'var(--sn-surface, #f9fafb)',
  color: 'var(--sn-text, #111827)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const UserSearchSection: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<SearchTab>('all');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [followingList, setFollowingList] = useState<UserProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the user's following list once
  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;

    async function loadFollowing() {
      const result = await getFollowing(currentUser!.id, { limit: 100 });
      if (cancelled) return;
      if (result.success) {
        setFollowingList(result.data.items);
        setFollowingIds(new Set(result.data.items.map((u) => u.userId)));
      }
      setFollowingLoaded(true);
    }

    loadFollowing();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  // Debounced search for "All Users" tab
  useEffect(() => {
    if (tab !== 'all') return;
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const result = await searchProfiles(query.trim(), 20);
      if (result.success) {
        // Exclude current user from results
        const filtered = result.data.filter((u) => u.userId !== currentUser?.id);
        setResults(filtered);

        // Batch-check follow status for results
        if (currentUser?.id) {
          const checks = await Promise.all(
            filtered.map((u) => checkIsFollowing(currentUser!.id, u.userId)),
          );
          const ids = new Set(followingIds);
          filtered.forEach((u, i) => {
            if (checks[i]) ids.add(u.userId);
            else ids.delete(u.userId);
          });
          setFollowingIds(ids);
        }
      }
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tab, currentUser?.id]);

  // Filtered following list for the "Following" tab
  const filteredFollowing = query.trim()
    ? followingList.filter((u) => {
        const q = query.trim().toLowerCase();
        return (
          u.displayName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.bio?.toLowerCase().includes(q) ?? false)
        );
      })
    : followingList;

  const displayedResults = tab === 'all' ? results : filteredFollowing;

  // Follow/unfollow handler
  const handleToggleFollow = useCallback(
    async (userId: string) => {
      if (!currentUser?.id) return;
      const isCurrentlyFollowing = followingIds.has(userId);

      // Optimistic update
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFollowing) next.delete(userId);
        else next.add(userId);
        return next;
      });

      if (isCurrentlyFollowing) {
        const result = await unfollowUser(userId, currentUser.id);
        if (!result.success) {
          // Revert on failure
          setFollowingIds((prev) => new Set([...prev, userId]));
        } else {
          // Remove from following list
          setFollowingList((prev) => prev.filter((u) => u.userId !== userId));
        }
      } else {
        const result = await followUser(userId, currentUser.id);
        if (!result.success) {
          // Revert on failure
          setFollowingIds((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        } else {
          // Add to following list if we have the profile data
          const profile = results.find((u) => u.userId === userId);
          if (profile) {
            setFollowingList((prev) => [profile, ...prev]);
          }
        }
      }
    },
    [currentUser?.id, followingIds, results],
  );

  return (
    <div
      data-testid="user-search-section"
      style={{
        marginTop: 24,
        padding: '0 24px',
      }}
    >
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: palette.text,
          fontFamily: themeVar('--sn-font-family'),
          margin: '0 0 16px 0',
        }}
      >
        Find People
      </h2>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: palette.textMuted,
            pointerEvents: 'none',
            fontSize: 14,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="10" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          data-testid="user-search-input"
          type="text"
          placeholder="Search by name, username, or bio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 34px',
            borderRadius: 'var(--sn-radius, 8px)',
            border: `1px solid ${palette.border}`,
            background: palette.surface,
            color: palette.text,
            fontSize: 14,
            fontFamily: themeVar('--sn-font-family'),
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${palette.border}`,
          marginBottom: 8,
        }}
      >
        <TabButton
          label="All Users"
          active={tab === 'all'}
          onClick={() => setTab('all')}
        />
        <TabButton
          label="Following"
          count={followingList.length}
          active={tab === 'following'}
          onClick={() => setTab('following')}
        />
      </div>

      {/* Results */}
      <div
        data-testid="user-search-results"
        style={{
          maxHeight: 400,
          overflowY: 'auto',
        }}
      >
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: palette.textMuted }}>
            Searching...
          </div>
        ) : !query.trim() && tab === 'all' ? (
          <div
            data-testid="user-search-empty"
            style={{ padding: 20, textAlign: 'center', color: palette.textMuted }}
          >
            Search for users by name, username, or bio
          </div>
        ) : !query.trim() && tab === 'following' && !followingLoaded ? (
          <div style={{ padding: 20, textAlign: 'center', color: palette.textMuted }}>
            Loading...
          </div>
        ) : displayedResults.length === 0 ? (
          <div
            data-testid="user-search-no-results"
            style={{ padding: 20, textAlign: 'center', color: palette.textMuted }}
          >
            {query.trim() ? 'No results found' : 'Not following anyone yet'}
          </div>
        ) : (
          displayedResults.map((user) => (
            <UserRow
              key={user.userId}
              user={user}
              trailing={
                <button
                  data-testid={`btn-follow-${user.username}`}
                  style={followingIds.has(user.userId) ? followingBtn : followBtn}
                  onClick={() => handleToggleFollow(user.userId)}
                >
                  {followingIds.has(user.userId) ? 'Following' : 'Follow'}
                </button>
              }
            />
          ))
        )}
      </div>
    </div>
  );
};
