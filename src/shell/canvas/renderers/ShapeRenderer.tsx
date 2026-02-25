/**
 * Shape entity renderer — rect, ellipse, line, polygon via SVG.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React from 'react';

import type { ShapeEntity } from '@sn/types';

import { entityTransformStyle } from './entity-style';

export interface ShapeRendererProps {
  entity: ShapeEntity;
  isSelected: boolean;
}

function renderShape(entity: ShapeEntity) {
  const { width, height } = entity.transform.size;
  const common = {
    fill: entity.fill ?? 'none',
    stroke: entity.stroke,
    strokeWidth: entity.strokeWidth,
  };

  switch (entity.shapeType) {
    case 'ellipse':
      return (
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2 - entity.strokeWidth / 2}
          ry={height / 2 - entity.strokeWidth / 2}
          {...common}
        />
      );

    case 'line':
      return <line x1={0} y1={height} x2={width} y2={0} {...common} />;

    case 'polygon':
      if (entity.points && entity.points.length > 0) {
        const pts = entity.points.map((p) => `${p.x},${p.y}`).join(' ');
        return <polygon points={pts} {...common} />;
      }
      return null;

    case 'rectangle':
    default:
      return (
        <rect
          x={entity.strokeWidth / 2}
          y={entity.strokeWidth / 2}
          width={width - entity.strokeWidth}
          height={height - entity.strokeWidth}
          rx={entity.cornerRadius}
          ry={entity.cornerRadius}
          {...common}
        />
      );
  }
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({ entity, isSelected }) => {
  const style = entityTransformStyle(entity);
  const { width, height } = entity.transform.size;

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="shape"
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
        {renderShape(entity)}
      </svg>
    </div>
  );
};
