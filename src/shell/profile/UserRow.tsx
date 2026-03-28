/**
 * Reusable user row for profile lists (followers, following, search results).
 *
 * @module shell/profile
 * @layer L6
 */

import React from 'react';
import { Link } from 'react-router-dom';

import type { UserProfile } from '@sn/types';

import { palette } from '../theme/theme-vars';

export interface UserRowProps {
  user: UserProfile;
  /** Called when the row link is clicked (e.g. to close a panel). */
  onNavigate?: () => void;
  /** Optional trailing element (e.g. a follow button). */
  trailing?: React.ReactNode;
}

export const UserRow: React.FC<UserRowProps> = ({ user, onNavigate, trailing }) => (
  <div
    data-testid={`user-row-${user.username}`}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 16px',
      transition: 'background 0.12s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = palette.surfaceRaised;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
    }}
  >
    <Link
      to={`/profile/${user.username}`}
      onClick={onNavigate}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flex: 1,
        minWidth: 0,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      {/* Avatar */}
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.displayName}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
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

    {trailing}
  </div>
);
