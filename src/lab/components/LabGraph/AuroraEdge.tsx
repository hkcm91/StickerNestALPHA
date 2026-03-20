/**
 * AuroraEdge -- Animated gradient edge with particle flow for the graph editor.
 *
 * Enhanced version of GlowEdge with:
 * - Animated gradient flow along edges (particles moving output -> input)
 * - Edge color matches event type category
 * - Spring-based snap animation on connection (200ms)
 * - Rejection animation: red pulse + gentle shake on type mismatch
 *
 * @module lab/components/LabGraph
 * @layer L2
 */

import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import React, { useEffect, useState } from 'react';

import { hexToRgb, SPRING } from '../shared/palette';

// ======================================================================
// Event type -> color mapping
// ======================================================================

export type AuroraEdgeState = 'idle' | 'connecting' | 'rejected';

const EVENT_TYPE_COLORS: Record<string, string> = {
  storm:  '#4E7B8E',
  ember:  '#E8806C',
  opal:   '#B0D0D8',
  violet: '#B8A0D8',
  moss:   '#5AA878',
};

const DEFAULT_COLOR = '#4E7B8E'; // Storm fallback

// ======================================================================
// Edge Data
// ======================================================================

export interface AuroraEdgeData {
  /** Color category or hex color for the edge */
  colorCategory?: string;
  /** Direct hex color override */
  color?: string;
  /** Edge state for animations */
  edgeState?: AuroraEdgeState;
  /** Event type label (for particle tooltip) */
  eventType?: string;
  /** Index signature for xyflow */
  [key: string]: unknown;
}

// ======================================================================
// Keyframes (injected once)
// ======================================================================

const AURORA_KEYFRAMES_ID = 'sn-aurora-edge-keyframes';

function ensureAuroraKeyframes(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(AURORA_KEYFRAMES_ID)) return;

  const style = document.createElement('style');
  style.id = AURORA_KEYFRAMES_ID;
  style.textContent = `
    @keyframes sn-aurora-flow {
      0% { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: -36; }
    }
    @keyframes sn-aurora-particle {
      0% { offset-distance: 0%; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { offset-distance: 100%; opacity: 0; }
    }
    @keyframes sn-edge-snap {
      0% { stroke-width: 0; opacity: 0; }
      30% { stroke-width: 4; opacity: 0.8; }
      100% { stroke-width: 2; opacity: 1; }
    }
    @keyframes sn-edge-reject {
      0%, 100% { transform: translateX(0); }
      15% { transform: translateX(3px); }
      30% { transform: translateX(-3px); }
      45% { transform: translateX(2px); }
      60% { transform: translateX(-1px); }
      75% { transform: translateX(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .sn-aurora-edge-animated {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// ======================================================================
// Component
// ======================================================================

export const AuroraEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  style,
}) => {
  const edgeData = data as AuroraEdgeData | undefined;
  const [snapPhase, setSnapPhase] = useState(false);

  // Inject keyframes on mount
  useEffect(() => {
    ensureAuroraKeyframes();
  }, []);

  // Trigger snap animation when edge first mounts (new connection)
  useEffect(() => {
    setSnapPhase(true);
    const timer = setTimeout(() => setSnapPhase(false), 200);
    return () => clearTimeout(timer);
  }, []);

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  // Resolve color
  const colorCat = edgeData?.colorCategory;
  const resolvedColor = edgeData?.color
    ?? (colorCat ? EVENT_TYPE_COLORS[colorCat] : null)
    ?? DEFAULT_COLOR;
  const [r, g, b] = hexToRgb(resolvedColor);

  const edgeState = edgeData?.edgeState ?? 'idle';
  const isRejected = edgeState === 'rejected';
  const glowOpacity = selected ? 0.6 : 0.35;

  // Unique filter ID per edge
  const filterId = `aurora-glow-${id}`;
  const gradientId = `aurora-grad-${id}`;

  return (
    <g
      data-testid={`aurora-edge-${id}`}
      data-edge-state={edgeState}
      data-edge-color={resolvedColor}
      style={isRejected ? { animation: 'sn-edge-reject 300ms ease-out' } : undefined}
    >
      {/* SVG definitions */}
      <defs>
        {/* Glow filter */}
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values={`0 0 0 0 ${(r / 255).toFixed(3)}
                     0 0 0 0 ${(g / 255).toFixed(3)}
                     0 0 0 0 ${(b / 255).toFixed(3)}
                     0 0 0 0.5 0`}
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradient along edge */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={resolvedColor} stopOpacity={0.4} />
          <stop offset="50%" stopColor={resolvedColor} stopOpacity={1} />
          <stop offset="100%" stopColor={resolvedColor} stopOpacity={0.4} />
        </linearGradient>
      </defs>

      {/* Outer glow layer */}
      <path
        d={edgePath}
        fill="none"
        stroke={isRejected ? '#C85858' : resolvedColor}
        strokeWidth={8}
        strokeOpacity={glowOpacity * 0.2}
        filter={`url(#${filterId})`}
        style={{ pointerEvents: 'none' }}
      />

      {/* Main edge with animated dash (particle flow) */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isRejected ? '#C85858' : resolvedColor,
          strokeWidth: snapPhase ? 4 : selected ? 2.5 : 2,
          strokeOpacity: snapPhase ? 0.9 : glowOpacity + 0.3,
          strokeDasharray: '10 5',
          animation: snapPhase
            ? 'sn-edge-snap 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
            : 'sn-aurora-flow 1.8s linear infinite',
          filter: `drop-shadow(0 0 4px rgba(${r},${g},${b},${glowOpacity}))`,
          transition: `stroke-width 200ms ${SPRING}, stroke-opacity 200ms ${SPRING}`,
          ...style,
        }}
      />

      {/* Particle dots traveling along the edge */}
      <circle r="2.5" fill={resolvedColor} opacity={0}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          keyTimes="0;0.1;0.9;1"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Second particle offset by half cycle */}
      <circle r="2" fill={resolvedColor} opacity={0}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="1s" />
        <animate
          attributeName="opacity"
          values="0;0.7;0.7;0"
          keyTimes="0;0.1;0.9;1"
          dur="2s"
          repeatCount="indefinite"
          begin="1s"
        />
      </circle>

      {/* Third particle for density */}
      <circle r="1.5" fill={resolvedColor} opacity={0}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="0.5s" />
        <animate
          attributeName="opacity"
          values="0;0.5;0.5;0"
          keyTimes="0;0.1;0.9;1"
          dur="2s"
          repeatCount="indefinite"
          begin="0.5s"
        />
      </circle>
    </g>
  );
};

// ======================================================================
// Exports
// ======================================================================

export { EVENT_TYPE_COLORS, DEFAULT_COLOR };
