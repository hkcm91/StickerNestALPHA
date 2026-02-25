/**
 * Docker (container widget) entity renderer.
 * Renders a container with a layout indicator for child widgets.
 * Children are managed by the CanvasEntityLayer — this only renders the container chrome.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React from 'react';

import type { DockerEntity } from '@sn/types';

import { entityTransformStyle } from './entity-style';

export interface DockerRendererProps {
  entity: DockerEntity;
  isSelected: boolean;
}

export const DockerRenderer: React.FC<DockerRendererProps> = ({ entity, isSelected }) => {
  const style = entityTransformStyle(entity);

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="docker"
      style={{
        ...style,
        border: `1px solid var(--sn-border, #e5e7eb)`,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        background: 'var(--sn-surface, #ffffff)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: 4,
          fontSize: 10,
          color: 'var(--sn-text-muted, #9ca3af)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {entity.layout}
      </div>
    </div>
  );
};
