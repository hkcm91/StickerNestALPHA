/**
 * Connector Renderer — renders SVG arrows and connecting lines.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React from 'react';

import type { ConnectorEntity } from '@sn/types';

export interface ConnectorRendererProps {
  entity: ConnectorEntity;
  isSelected: boolean;
}

/** SVG arrowhead marker definitions */
function ArrowMarker({ id, type, color }: { id: string; type: string; color: string }) {
  if (type === 'none') return null;

  if (type === 'circle') {
    return (
      <marker id={id} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <circle cx="4" cy="4" r="3" fill={color} />
      </marker>
    );
  }

  if (type === 'diamond') {
    return (
      <marker id={id} markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
        <polygon points="5,0 10,5 5,10 0,5" fill={color} />
      </marker>
    );
  }

  // Default: arrow
  return (
    <marker id={id} markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 Z" fill={color} />
    </marker>
  );
}

/** Compute a quadratic bezier control point for curved lines */
function getCurvedControlPoint(
  sx: number, sy: number, tx: number, ty: number,
): { cx: number; cy: number } {
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const offset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.4;
  // Offset perpendicular to the line
  return {
    cx: mx - (dy / Math.hypot(dx, dy || 1)) * offset,
    cy: my + (dx / Math.hypot(dx, dy || 1)) * offset,
  };
}

/** Compute orthogonal path (right-angle segments) */
function getOrthogonalPath(sx: number, sy: number, tx: number, ty: number): string {
  const mx = (sx + tx) / 2;
  return `M${sx},${sy} L${mx},${sy} L${mx},${ty} L${tx},${ty}`;
}

export const ConnectorRenderer: React.FC<ConnectorRendererProps> = ({ entity, isSelected }) => {
  const { sourcePoint, targetPoint, lineStyle, arrowHead, arrowTail, strokeColor, strokeWidth, label } = entity;

  const sx = sourcePoint.x - entity.transform.position.x;
  const sy = sourcePoint.y - entity.transform.position.y;
  const tx = targetPoint.x - entity.transform.position.x;
  const ty = targetPoint.y - entity.transform.position.y;

  const markerId = `arrow-${entity.id}`;
  const markerStartId = `arrow-start-${entity.id}`;

  // Build path based on line style
  let pathD: string;
  if (lineStyle === 'straight') {
    pathD = `M${sx},${sy} L${tx},${ty}`;
  } else if (lineStyle === 'orthogonal') {
    pathD = getOrthogonalPath(sx, sy, tx, ty);
  } else {
    // curved (default)
    const { cx, cy } = getCurvedControlPoint(sx, sy, tx, ty);
    pathD = `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
  }

  const padding = 20;
  const w = entity.transform.size.width + padding * 2;
  const h = entity.transform.size.height + padding * 2;

  return (
    <svg
      data-testid={`connector-${entity.id}`}
      width={w}
      height={h}
      viewBox={`${-padding} ${-padding} ${w} ${h}`}
      style={{
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <ArrowMarker id={markerId} type={arrowHead} color={strokeColor} />
        <ArrowMarker id={markerStartId} type={arrowTail} color={strokeColor} />
      </defs>

      {/* Selection highlight */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke="var(--sn-accent, #6366f1)"
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.3}
        />
      )}

      {/* Main path */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={arrowHead !== 'none' ? `url(#${markerId})` : undefined}
        markerStart={arrowTail !== 'none' ? `url(#${markerStartId})` : undefined}
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
      />

      {/* Label at midpoint */}
      {label && (
        <text
          x={(sx + tx) / 2}
          y={(sy + ty) / 2 - 8}
          textAnchor="middle"
          fill={strokeColor}
          fontSize={12}
          fontFamily="var(--sn-font-family, system-ui)"
        >
          {label}
        </text>
      )}
    </svg>
  );
};
