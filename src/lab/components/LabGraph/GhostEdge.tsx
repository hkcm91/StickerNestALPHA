/**
 * GhostEdge — AI-suggested connection edge.
 *
 * Renders as a dashed, opal-tinted line at 40% opacity.
 * Click to accept the suggestion (converts to a real GlowEdge).
 *
 * @module lab/components/LabGraph
 * @layer L2
 */

import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import React, { useState } from 'react';

import { SPRING } from '../shared/palette';

export interface GhostEdgeData {
  /** Whether this is an AI suggestion */
  isGhost?: boolean;
  /** Callback to accept the suggestion */
  onAccept?: (edgeId: string) => void;
  [key: string]: unknown;
}

export const GhostEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const [hovered, setHovered] = useState(false);
  const ghostData = data as GhostEdgeData | undefined;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const opalColor = '#B0D0D8';
  const opacity = hovered ? 0.6 : 0.35;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Ghost edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: opalColor,
          strokeWidth: 1.5,
          strokeOpacity: opacity,
          strokeDasharray: '6 4',
          transition: `all 300ms ${SPRING}`,
          cursor: 'pointer',
        }}
      />

      {/* Accept button at midpoint */}
      {hovered && (
        <foreignObject
          x={labelX - 12}
          y={labelY - 12}
          width={24}
          height={24}
          style={{ overflow: 'visible' }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              ghostData?.onAccept?.(id);
            }}
            aria-label="Accept AI suggestion"
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: `1px solid ${opalColor}44`,
              background: 'rgba(20,17,24,0.9)',
              color: opalColor,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `all 200ms ${SPRING}`,
              boxShadow: `0 0 8px ${opalColor}33`,
            }}
          >
            {'\u2713'}
          </button>
        </foreignObject>
      )}
    </g>
  );
};
