/**
 * PortDot — Visible port handle for graph nodes.
 *
 * Wraps xyflow's Handle with a glowing dot indicator.
 * - Connected: steady soft glow matching edge color
 * - Hoverable: glow intensifies, radius expands
 * - Compatible target during drag: pulses storm
 * - Incompatible target: stays dim
 *
 * @module lab/components/LabGraph
 * @layer L2
 */

import { Handle, Position } from '@xyflow/react';
import type { HandleType } from '@xyflow/react';
import React, { useState } from 'react';

import { SPRING } from '../shared/palette';

export interface PortDotProps {
  /** Unique port ID within the node */
  portId: string;
  /** Handle type: source (output) or target (input) */
  type: HandleType;
  /** Position on node edge */
  position: Position;
  /** Port label (event name) */
  label?: string;
  /** Accent color hex */
  color?: string;
  /** Whether this port has a connection */
  connected?: boolean;
  /** Vertical offset for stacking multiple ports */
  index?: number;
  /** Total number of ports on this side */
  total?: number;
}

export const PortDot: React.FC<PortDotProps> = ({
  portId,
  type,
  position,
  label,
  color = '#4E7B8E',
  connected = false,
  index = 0,
  total = 1,
}) => {
  const [hovered, setHovered] = useState(false);

  const size = hovered ? 10 : 8;
  const glowSize = connected ? 8 : hovered ? 6 : 0;
  const isLeft = position === Position.Left;

  // Calculate vertical position for stacking ports
  // Distribute evenly with padding
  const spacing = 20;
  const totalHeight = (total - 1) * spacing;
  const topOffset = 50 - (totalHeight / 2) + (index * spacing);

  return (
    <div
      style={{
        position: 'absolute',
        [isLeft ? 'left' : 'right']: -4,
        top: `${topOffset}%`,
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        flexDirection: isLeft ? 'row' : 'row-reverse',
        gap: 4,
        zIndex: 5,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The actual xyflow handle (invisible, covers the dot area) */}
      <Handle
        type={type}
        position={position}
        id={portId}
        style={{
          width: 16,
          height: 16,
          background: 'transparent',
          border: 'none',
          position: 'absolute',
          [isLeft ? 'left' : 'right']: -4,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
        }}
      />

      {/* Visible glowing dot */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: connected || hovered
            ? color
            : `${color}66`,
          boxShadow: glowSize > 0
            ? [
                `0 0 ${glowSize}px ${color}66`,
                `0 0 ${glowSize * 2}px ${color}33`,
              ].join(', ')
            : 'none',
          transition: `all 300ms ${SPRING}`,
          flexShrink: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Port label */}
      {label && (
        <span
          style={{
            fontSize: 8,
            color: hovered ? color : 'rgba(255,255,255,0.35)',
            fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
            whiteSpace: 'nowrap',
            transition: `color 200ms ${SPRING}`,
            pointerEvents: 'none',
            maxWidth: 60,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};
