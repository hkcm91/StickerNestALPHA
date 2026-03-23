/**
 * DockerDockZone — edge drop zone overlay shown during docker drag.
 *
 * @remarks
 * Renders translucent storm-colored strips at left/right viewport edges
 * that glow brighter as a docker panel approaches. Only visible when
 * a docker is being dragged.
 *
 * @module shell/components/docker
 * @layer L6
 */

import React from 'react';

import { DOCK_TRANSITION, SNAP_THRESHOLD, STORM_RGB } from './docker-palette';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerDockZoneProps {
  /** Which side this zone is on */
  side: 'left' | 'right';
  /** Whether a docker is currently being dragged */
  active: boolean;
  /** How close the cursor is (0 = far, 1 = at edge). Drives glow intensity. */
  proximity?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DockerDockZone: React.FC<DockerDockZoneProps> = ({
  side,
  active,
  proximity = 0,
}) => {
  if (!active) return null;

  const glowAlpha = (0.03 + proximity * 0.12).toFixed(2);
  const borderAlpha = (0.06 + proximity * 0.2).toFixed(2);

  return (
    <div
      data-testid={`docker-dock-zone-${side}`}
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side]: 0,
        width: SNAP_THRESHOLD,
        background: `rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},${glowAlpha})`,
        borderRight: side === 'left'
          ? `1px solid rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},${borderAlpha})`
          : 'none',
        borderLeft: side === 'right'
          ? `1px solid rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},${borderAlpha})`
          : 'none',
        boxShadow: side === 'left'
          ? `inset -8px 0 24px rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},${(proximity * 0.08).toFixed(2)})`
          : `inset 8px 0 24px rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},${(proximity * 0.08).toFixed(2)})`,
        pointerEvents: 'none',
        transition: DOCK_TRANSITION,
        opacity: active ? 1 : 0,
        zIndex: 49, // Below docker panels (50+)
      }}
    />
  );
};
