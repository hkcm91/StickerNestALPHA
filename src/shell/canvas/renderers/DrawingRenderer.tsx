/**
 * Drawing (pen stroke) entity renderer.
 * Uses Catmull-Rom to cubic bezier conversion for smooth curves.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React from 'react';

import type { DrawingEntity, Point2D } from '@sn/types';

import { entityTransformStyle } from './entity-style';

/**
 * Convert points to a smooth SVG path using Catmull-Rom spline interpolation.
 */
function pointsToSmoothPath(points: Point2D[], smoothing: number): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  const t = Math.max(0, Math.min(1, smoothing));
  if (t === 0) {
    return 'M' + points.map((p) => `${p.x},${p.y}`).join(' L');
  }

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * t;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * t;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * t;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * t;

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export interface DrawingRendererProps {
  entity: DrawingEntity;
  isSelected: boolean;
}

export const DrawingRenderer: React.FC<DrawingRendererProps> = ({ entity, isSelected }) => {
  const style = entityTransformStyle(entity);
  const { width, height } = entity.transform.size;
  const d = pointsToSmoothPath(entity.points, entity.smoothing);

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="drawing"
      style={{
        ...style,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        overflow: 'visible',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block' }}
      >
        <path
          d={d}
          fill="none"
          stroke={entity.stroke}
          strokeWidth={entity.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
