/**
 * User Profile Page
 *
 * Displays user profile information, public/shared canvases,
 * and social actions (follow/unfollow, block, message).
 *
 * @module shell/profile
 * @layer L6
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { UserProfile } from '@sn/types';

import {
  getProfile,
  getProfileByUsername,
  getUserPublicCanvases,
  followUser,
  unfollowUser,
  isFollowing as checkIsFollowing,
  blockUser,
  unblockUser,
  isBlocked as checkIsBlocked,
  canMessage,
} from '../../kernel/social-graph';
import type { PublicCanvas } from '../../kernel/social-graph';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';

import { FollowersPanel } from './FollowersPanel';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const ProfileBanner: React.FC<{ bannerUrl?: string }> = ({ bannerUrl }) => (
  <div
    data-testid="profile-banner"
    style={{
      height: 200,
      background: bannerUrl
        ? `url(${bannerUrl}) center/cover no-repeat`
        : 'linear-gradient(135deg, var(--sn-accent, #3B82F6) 0%, #8B5CF6 100%)',
      borderRadius: 'var(--sn-radius, 8px) var(--sn-radius, 8px) 0 0',
    }}
  />
);

const ProfileAvatar: React.FC<{ avatarUrl?: string; displayName: string }> = ({
  avatarUrl,
  displayName,
}) => (
  <div
    data-testid="profile-avatar"
    style={{
      width: 120,
      height: 120,
      borderRadius: '50%',
      border: '4px solid var(--sn-surface, #fff)',
      background: avatarUrl
        ? `url(${avatarUrl}) center/cover no-repeat`
        : 'var(--sn-accent, #3B82F6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: 40,
      fontWeight: 700,
      marginTop: -60,
      position: 'relative' as const,
    }}
  >
    {!avatarUrl && displayName.charAt(0).toUpperCase()}
  </div>
);

const StatItem: React.FC<{
  label: string;
  value: number;
  onClick?: () => void;
}> = ({ label, value, onClick }) => (
  <div
    style={{
      textAlign: 'center',
      cursor: onClick ? 'pointer' : 'default',
    }}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--sn-text, #111827)' }}>
      {value}
    </div>
    <div style={{ fontSize: 12, color: 'var(--sn-text-muted, #6b7280)' }}>{label}</div>
  </div>
);

const CanvasCard: React.FC<{ canvas: PublicCanvas }> = ({ canvas }) => (
  <Link
    to={canvas.slug ? `/canvas/${canvas.slug}` : `/canvas/${canvas.id}`}
    data-testid="canvas-card"
    style={{
      display: 'block',
      background: 'var(--sn-surface, #f9fafb)',
      border: '1px solid var(--sn-border, #e5e7eb)',
      borderRadius: 'var(--sn-radius, 8px)',
      padding: 16,
      textDecoration: 'none',
      color: 'inherit',
      transition: 'box-shadow 0.15s',
    }}
  >
    {canvas.thumbnailUrl && (
      <div
        style={{
          height: 120,
          background: `url(${canvas.thumbnailUrl}) center/cover no-repeat`,
          borderRadius: 4,
          marginBottom: 12,
        }}
      />
    )}
    <div style={{ fontWeight: 600, color: 'var(--sn-text, #111827)', marginBottom: 4 }}>
      {canvas.name}
    </div>
    {canvas.description && (
      <div
        style={{
          fontSize: 13,
          color: 'var(--sn-text-muted, #6b7280)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {canvas.description}
      </div>
    )}
  </Link>
);

// ---------------------------------------------------------------------------
// Action Button styles
// ---------------------------------------------------------------------------

const btnBase: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 'var(--sn-radius, 8px)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid var(--sn-border, #e5e7eb)',
  fontFamily: 'var(--sn-font-family, system-ui)',
  transition: 'opacity 0.15s',
};

const primaryBtn: React.CSSProperties = {
  ...btnBase,
  background: 'var(--sn-accent, #3B82F6)',
  color: '#fff',
  border: 'none',
};

const secondaryBtn: React.CSSProperties = {
  ...btnBase,
  background: 'var(--sn-surface, #f9fafb)',
  color: 'var(--sn-text, #111827)',
};

const dangerBtn: React.CSSProperties = {
  ...btnBase,
  background: '#EF4444',
  color: '#fff',
  border: 'none',
};

// ---------------------------------------------------------------------------
// ProfilePage
// ---------------------------------------------------------------------------

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [canvases, setCanvases] = useState<PublicCanvas[]>([]);
  const [following, setFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [messagingAllowed, setMessagingAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [followersPanel, setFollowersPanel] = useState<'followers' | 'following' | null>(null);

  const isOwnProfile = currentUser?.id != null && profile?.userId === currentUser.id;

  // Fetch profile data
  useEffect(() => {
    if (!username) return;
    if (username === 'me' && !currentUser?.id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // Handle "/profile/me" — resolve to the current user's profile by ID
      const profileResult = username === 'me' && currentUser?.id
        ? await getProfile(currentUser.id)
        : await getProfileByUsername(username!);

      if (cancelled) return;

      if (!profileResult.success) {
        setError(profileResult.error.message);
        setLoading(false);
        return;
      }

      const p = profileResult.data;
      setProfile(p);

      // Fetch public canvases
      const canvasResult = await getUserPublicCanvases(p.userId);
      if (!cancelled && canvasResult.success) {
        setCanvases(canvasResult.data.items);
      }

      // Check relationship status (only if viewing another user's profile)
      if (currentUser?.id && currentUser.id !== p.userId) {
        const [isFollowingResult, isBlockedResult, canMsg] = await Promise.all([
          checkIsFollowing(currentUser.id, p.userId),
          checkIsBlocked(currentUser.id, p.userId),
          canMessage(currentUser.id, p.userId),
        ]);
        if (!cancelled) {
          setFollowing(isFollowingResult);
          setBlocked(isBlockedResult);
          setMessagingAllowed(canMsg);
        }
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [username, currentUser?.id]);

  // Action handlers
  const handleFollow = useCallback(async () => {
    if (!currentUser?.id || !profile) return;
    setActionLoading(true);
    const result = await followUser(profile.userId, currentUser.id);
    if (result.success) {
      setFollowing(true);
      setProfile((prev) =>
        prev ? { ...prev, followerCount: prev.followerCount + 1 } : prev,
      );
    }
    setActionLoading(false);
  }, [currentUser?.id, profile]);

  const handleUnfollow = useCallback(async () => {
    if (!currentUser?.id || !profile) return;
    setActionLoading(true);
    const result = await unfollowUser(profile.userId, currentUser.id);
    if (result.success) {
      setFollowing(false);
      setProfile((prev) =>
        prev ? { ...prev, followerCount: Math.max(0, prev.followerCount - 1) } : prev,
      );
    }
    setActionLoading(false);
  }, [currentUser?.id, profile]);

  const handleBlock = useCallback(async () => {
    if (!currentUser?.id || !profile) return;
    setActionLoading(true);
    const result = await blockUser(profile.userId, currentUser.id);
    if (result.success) {
      setBlocked(true);
      setFollowing(false);
      setMessagingAllowed(false);
    }
    setActionLoading(false);
  }, [currentUser?.id, profile]);

  const handleUnblock = useCallback(async () => {
    if (!currentUser?.id || !profile) return;
    setActionLoading(true);
    const result = await unblockUser(profile.userId, currentUser.id);
    if (result.success) {
      setBlocked(false);
      setMessagingAllowed(true);
    }
    setActionLoading(false);
  }, [currentUser?.id, profile]);

  // Loading state
  if (loading) {
    return (
      <div data-testid="profile-loading" style={{ padding: 40, textAlign: 'center' }}>
        Loading profile...
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <div data-testid="profile-error" style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ color: 'var(--sn-text, #111827)' }}>Profile Not Found</h2>
        <p style={{ color: 'var(--sn-text-muted, #6b7280)' }}>
          {error ?? 'The user you are looking for does not exist.'}
        </p>
        <Link to="/" style={{ color: 'var(--sn-accent, #3B82F6)' }}>
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div
      data-testid="page-profile"
      style={{
        maxWidth: 800,
        margin: '0 auto',
        fontFamily: 'var(--sn-font-family, system-ui)',
        color: 'var(--sn-text, #111827)',
        paddingBottom: 40,
      }}
    >
      {/* Banner */}
      <ProfileBanner bannerUrl={profile.bannerUrl} />

      {/* Header section */}
      <div
        style={{
          padding: '0 24px',
          background: 'var(--sn-surface, #f9fafb)',
          borderLeft: '1px solid var(--sn-border, #e5e7eb)',
          borderRight: '1px solid var(--sn-border, #e5e7eb)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <ProfileAvatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} />

          {/* Action buttons */}
          {currentUser && !isOwnProfile && (
            <div
              data-testid="profile-actions"
              style={{ display: 'flex', gap: 8, marginTop: 16 }}
            >
              {!blocked && (
                <>
                  {following ? (
                    <button
                      data-testid="btn-unfollow"
                      style={secondaryBtn}
                      disabled={actionLoading}
                      onClick={handleUnfollow}
                    >
                      Following
                    </button>
                  ) : (
                    <button
                      data-testid="btn-follow"
                      style={primaryBtn}
                      disabled={actionLoading}
                      onClick={handleFollow}
                    >
                      Follow
                    </button>
                  )}

                  {messagingAllowed && (
                    <button data-testid="btn-message" style={secondaryBtn} disabled={actionLoading}>
                      Message
                    </button>
                  )}
                </>
              )}

              {blocked ? (
                <button
                  data-testid="btn-unblock"
                  style={secondaryBtn}
                  disabled={actionLoading}
                  onClick={handleUnblock}
                >
                  Unblock
                </button>
              ) : (
                <button
                  data-testid="btn-block"
                  style={dangerBtn}
                  disabled={actionLoading}
                  onClick={handleBlock}
                >
                  Block
                </button>
              )}
            </div>
          )}

          {/* Edit profile link for own profile */}
          {isOwnProfile && (
            <div style={{ marginTop: 16 }}>
              <Link to="/settings" data-testid="btn-edit-profile" style={{ ...secondaryBtn, textDecoration: 'none' }}>
                Edit Profile
              </Link>
            </div>
          )}
        </div>

        {/* Name and username */}
        <div style={{ marginTop: 12 }}>
          <h1
            data-testid="profile-display-name"
            style={{ margin: 0, fontSize: 24, fontWeight: 700 }}
          >
            {profile.displayName}
            {profile.isVerified && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 16,
                  color: 'var(--sn-accent, #3B82F6)',
                }}
                title="Verified"
              >
                &#10003;
              </span>
            )}
          </h1>
          <div
            data-testid="profile-username"
            style={{ color: 'var(--sn-text-muted, #6b7280)', fontSize: 15 }}
          >
            @{profile.username}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p
            data-testid="profile-bio"
            style={{ marginTop: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
          >
            {profile.bio}
          </p>
        )}

        {/* Meta info */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 12,
            fontSize: 14,
            color: 'var(--sn-text-muted, #6b7280)',
          }}
        >
          {profile.location && <span data-testid="profile-location">{profile.location}</span>}
          {profile.websiteUrl && (
            <a
              data-testid="profile-website"
              href={profile.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--sn-accent, #3B82F6)' }}
            >
              {new URL(profile.websiteUrl).hostname}
            </a>
          )}
          <span data-testid="profile-joined">
            Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Stats */}
        <div
          data-testid="profile-stats"
          style={{
            display: 'flex',
            gap: 32,
            marginTop: 20,
            paddingBottom: 20,
            borderBottom: '1px solid var(--sn-border, #e5e7eb)',
          }}
        >
          <StatItem
            label="Followers"
            value={profile.followerCount}
            onClick={() => setFollowersPanel('followers')}
          />
          <StatItem
            label="Following"
            value={profile.followingCount}
            onClick={() => setFollowersPanel('following')}
          />
          <StatItem label="Posts" value={profile.postCount} />
        </div>
      </div>

      {/* Followers/Following popout panel */}
      {followersPanel && (
        <FollowersPanel
          userId={profile.userId}
          initialTab={followersPanel}
          onClose={() => setFollowersPanel(null)}
        />
      )}

      {/* Public canvases section */}
      <div
        style={{
          padding: '24px',
          background: 'var(--sn-surface, #f9fafb)',
          borderLeft: '1px solid var(--sn-border, #e5e7eb)',
          borderRight: '1px solid var(--sn-border, #e5e7eb)',
          borderBottom: '1px solid var(--sn-border, #e5e7eb)',
          borderRadius: '0 0 var(--sn-radius, 8px) var(--sn-radius, 8px)',
        }}
      >
        <h2
          data-testid="canvases-heading"
          style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}
        >
          Public Canvases
        </h2>

        {canvases.length === 0 ? (
          <p
            data-testid="no-canvases"
            style={{ color: 'var(--sn-text-muted, #6b7280)' }}
          >
            No public canvases yet.
          </p>
        ) : (
          <div
            data-testid="canvases-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {canvases.map((c) => (
              <CanvasCard key={c.id} canvas={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
