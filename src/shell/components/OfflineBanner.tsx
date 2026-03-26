/**
 * Offline Banner — shows a fixed banner when the realtime connection is lost.
 *
 * @module shell/components
 * @layer L6
 */

import React from 'react';

import { useSocialStore } from '../../kernel/stores/social/social.store';

export const OfflineBanner: React.FC = () => {
  const isOnline = useSocialStore((s) => s.isOnline);

  if (isOnline) return null;

  return (
    <div
      data-testid="offline-banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: '#dc2626',
        color: '#fff',
        textAlign: 'center',
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'var(--sn-font-family, system-ui)',
        animation: 'sn-offline-pulse 2s ease-in-out infinite',
      }}
    >
      Connection lost. Reconnecting...
      <style>{`
        @keyframes sn-offline-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};
