/**
 * Followers/Following Panel — popout that shows follower and following lists.
 *
 * Opened by clicking the Followers or Following stat on a profile.
 * Tabs switch between the two lists.
 *
 * @module shell/profile
 * @layer L6
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { UserProfile } from '@sn/types';

import { getFollowers, getFollowing } from '../../kernel/social-graph';
import { palette, themeVar } from '../theme/theme-vars';

export interface FollowersPanelProps {
  userId: string;
  initialTab: 'followers' | 'following';
  onClose: () => void;
}

export const FollowersPanel: React.FC<FollowersPanelProps> = ({
  userId,
  initialTab,
  onClose,
}) => {
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [fResult, gResult] = await Promise.all([
        getFollowers(userId, { limit: 100 }),
        getFollowing(userId, { limit: 100 }),
      ]);
      if (cancelled) return;
      if (fResult.success) setFollowers(fResult.data.items);
      if (gResult.success) setFollowing(gResult.data.items);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const list = tab === 'followers' ? followers : following;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          zIndex: 9000,
        }}
      />

      {/* Panel */}
      <div
        data-testid="followers-panel"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 380,
          maxHeight: '70vh',
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: '12px',
          zIndex: 9001,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: themeVar('--sn-font-family'),
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header with tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <TabButton
            label="Followers"
            count={followers.length}
            active={tab === 'followers'}
            onClick={() => setTab('followers')}
          />
          <TabButton
            label="Following"
            count={following.length}
            active={tab === 'following'}
            onClick={() => setTab('following')}
          />
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              marginLeft: 'auto',
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: palette.textMuted,
            }}
          >
            x
          </button>
        </div>

        {/* List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
          }}
        >
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: palette.textMuted }}>
              Loading...
            </div>
          ) : list.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: palette.textMuted }}>
              {tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </div>
          ) : (
            list.map((user) => (
              <UserRow key={user.userId} user={user} onClose={onClose} />
            ))
          )}
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const TabButton: React.FC<{
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}> = ({ label, count, active, onClick }) => (
  <button
    data-testid={`tab-${label.toLowerCase()}`}
    onClick={onClick}
    style={{
      flex: 1,
      padding: '14px 0',
      background: 'none',
      border: 'none',
      borderBottom: active ? `2px solid ${palette.opal}` : '2px solid transparent',
      cursor: 'pointer',
      fontFamily: themeVar('--sn-font-family'),
      fontSize: '14px',
      fontWeight: active ? 700 : 500,
      color: active ? palette.text : palette.textMuted,
      transition: 'all 0.15s ease',
    }}
  >
    {label} <span style={{ opacity: 0.6 }}>({count})</span>
  </button>
);

const UserRow: React.FC<{ user: UserProfile; onClose: () => void }> = ({ user, onClose }) => (
  <Link
    to={`/profile/${user.username}`}
    onClick={onClose}
    data-testid={`user-row-${user.username}`}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 16px',
      textDecoration: 'none',
      color: 'inherit',
      transition: 'background 0.12s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = palette.surfaceRaised;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
    }}
  >
    {/* Avatar */}
    {user.avatarUrl ? (
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
      />
    ) : (
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: palette.storm,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {user.displayName.charAt(0).toUpperCase()}
      </div>
    )}

    {/* Name + username */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontWeight: 600,
          fontSize: '14px',
          color: palette.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {user.displayName}
      </div>
      <div style={{ fontSize: '13px', color: palette.textMuted }}>
        @{user.username}
      </div>
    </div>

    {/* Bio snippet */}
    {user.bio && (
      <div
        style={{
          fontSize: '12px',
          color: palette.textMuted,
          maxWidth: 120,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {user.bio}
      </div>
    )}
  </Link>
);
