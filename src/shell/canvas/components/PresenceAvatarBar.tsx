/**
 * Presence Avatar Bar — shows colored circles for online users in the canvas toolbar.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React from 'react';

import { useSocialStore, type PresenceUser } from '../../../kernel/stores/social/social.store';

const MAX_VISIBLE = 5;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const PresenceAvatarBar: React.FC = () => {
  const presenceMap = useSocialStore((s) => s.presenceMap);
  const users = Object.values(presenceMap).filter(
    (u: PresenceUser) => u.userId !== 'local',
  );

  if (users.length === 0) return null;

  const visible = users.slice(0, MAX_VISIBLE);
  const overflow = users.length - MAX_VISIBLE;

  return (
    <div
      data-testid="presence-avatar-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {visible.map((user) => (
        <div
          key={user.userId}
          title={user.displayName}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: user.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            cursor: 'default',
            border: '2px solid var(--sn-surface, #131317)',
          }}
        >
          {getInitials(user.displayName)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--sn-text-muted, #6b7280)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: '#fff',
            border: '2px solid var(--sn-surface, #131317)',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
};
