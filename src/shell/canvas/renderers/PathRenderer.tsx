/**
 * Path (Bezier) entity renderer.
 * Converts anchor points to SVG path data for rendering.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React from 'react';

import type { PathEntity } from '@sn/types';

import { anchorsToSvgPath } from '../../../canvas/core';

import { entityTransformStyle } from './entity-style';

export interface PathRendererProps {
  entity: PathEntity;
  isSelected: boolean;
}

export const PathRenderer: React.FC<PathRendererProps> = ({ entity, isSelected }) => {
  const style = entityTransformStyle(entity);
  const { width, height } = entity.transform.size;
  const d = anchorsToSvgPath(entity.anchors, entity.closed);

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="path"
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
        style={{ display: 'block', overflow: 'visible' }}
      >
        <path
          d={d}
          fill={entity.fill ?? 'none'}
          fillRule={entity.fillRule}
          stroke={entity.stroke}
          strokeWidth={entity.strokeWidth}
          strokeLinecap={entity.strokeLinecap}
          strokeLinejoin={entity.strokeLinejoin}
          strokeDasharray={entity.strokeDasharray}
        />
      </svg>
    </div>
  );
};
