/**
 * PulseIndicator — Animated status dot with glow.
 *
 * Idle: dim. Active: soft pulse. Error: ember steady glow.
 * Used for save state, connection status, generation status.
 *
 * @module lab/components/shared
 * @layer L2
 */

import React from 'react';

export type PulseState = 'idle' | 'active' | 'success' | 'error';

export interface PulseIndicatorProps {
  state: PulseState;
  /** Size in px (default 8) */
  size?: number;
  /** Optional label for screen readers */
  label?: string;
}

const STATE_COLORS: Record<PulseState, string> = {
  idle: 'var(--sn-text-faint)',
  active: 'var(--sn-storm)',
  success: 'var(--sn-moss)',
  error: 'var(--sn-ember)',
};

export const PulseIndicator: React.FC<PulseIndicatorProps> = ({
  state,
  size = 8,
  label,
}) => {
  const color = STATE_COLORS[state];
  const shouldPulse = state === 'active';

  return (
    <span
      role="status"
      aria-label={label ?? state}
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: color,
        boxShadow: state !== 'idle' ? `0 0 ${size}px ${color}66` : 'none',
        animation: shouldPulse ? 'sn-pulse 2s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }}
    >
      {shouldPulse && (
        <style>{`
          @keyframes sn-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(0.85); }
          }
        `}</style>
      )}
    </span>
  );
};
