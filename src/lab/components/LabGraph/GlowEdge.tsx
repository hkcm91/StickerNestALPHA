/**
 * GlowEdge — Custom edge with bioluminescent glow for the graph editor.
 *
 * Connected/active: Animated gradient line with soft glow blur.
 * - SVG path with drop-shadow filters
 * - Animated dash pattern traveling along the edge (data flowing)
 * - Glow intensity = soft, bioluminescent, not neon
 *
 * @module lab/components/LabGraph
 * @layer L2
 */

import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import React from 'react';

export const GlowEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style,
}) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const filterId = `glow-${id}`;
  const glowOpacity = selected ? 0.6 : 0.35;
  const strokeColor = '#4E7B8E'; // Storm

  return (
    <>
      {/* SVG filter for glow */}
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.306
                    0 0 0 0 0.482
                    0 0 0 0 0.557
                    0 0 0 0.5 0"
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow layer */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={6}
        strokeOpacity={glowOpacity * 0.3}
        filter={`url(#${filterId})`}
        style={{ pointerEvents: 'none' }}
      />

      {/* Main edge with animated dash */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 2.5 : 2,
          strokeOpacity: glowOpacity + 0.3,
          strokeDasharray: '8 4',
          animation: 'sn-edge-flow 1.5s linear infinite',
          filter: `drop-shadow(0 0 4px rgba(78,123,142,${glowOpacity}))`,
          ...style,
        }}
      />

      {/* Inject the edge flow animation if not already present */}
      <foreignObject width={0} height={0}>
        <style>{`
          @keyframes sn-edge-flow {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -24; }
          }
        `}</style>
      </foreignObject>
    </>
  );
};
