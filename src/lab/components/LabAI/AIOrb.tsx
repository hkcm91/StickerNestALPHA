/**
 * AIOrb — Floating glow indicator for the AI Companion.
 *
 * Idle: 24px warm glow, slow breathing pulse (8s sine wave).
 * Generating: faster pulse, intensified glow.
 * Hover: glow intensifies, slight scale up.
 * Click: expands into AIThread panel.
 *
 * @module lab/components/LabAI
 * @layer L2
 */

import React, { useState } from 'react';

import { SPRING } from '../shared/palette';

export interface AIOrbProps {
  generating?: boolean;
  onClick?: () => void;
}

export const AIOrb: React.FC<AIOrbProps> = ({
  generating = false,
  onClick,
}) => {
  const [hovered, setHovered] = useState(false);

  const size = hovered ? 28 : 24;
  const glowSize = generating ? 20 : hovered ? 14 : 8;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={generating ? 'AI generating...' : 'Open AI Companion'}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        background: `radial-gradient(circle, rgba(78,123,142,0.6), rgba(176,208,216,0.3))`,
        boxShadow: [
          `0 0 ${glowSize}px rgba(78,123,142,0.4)`,
          `0 0 ${glowSize * 2}px rgba(176,208,216,0.15)`,
          `0 0 ${glowSize * 3}px rgba(78,123,142,0.08)`,
        ].join(', '),
        animation: generating
          ? `sn-ai-pulse 1.5s ease-in-out infinite`
          : `sn-ai-breathe 8s ease-in-out infinite`,
        transition: `all 400ms ${SPRING}`,
        transform: hovered ? 'scale(1.15)' : 'scale(1)',
        outline: 'none',
        position: 'relative',
      }}
    >
      {/* Inner bright core */}
      <div style={{
        position: 'absolute', inset: '30%',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.3)',
        filter: 'blur(2px)',
      }} />

      {/* Inject breathing animations */}
      <style>{`
        @keyframes sn-ai-breathe {
          0%, 100% { opacity: 0.7; transform: scale(${hovered ? 1.15 : 1}); }
          50% { opacity: 1; transform: scale(${hovered ? 1.2 : 1.05}); }
        }
        @keyframes sn-ai-pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
      `}</style>
    </button>
  );
};
