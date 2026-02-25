/**
 * Entity Layer — renders all entities from the scene graph.
 * Sits inside the viewport layer so entities pan/zoom with the viewport.
 *
 * @module shell/canvas
 * @layer L6
 */

import React from 'react';

import type { CanvasEntity } from '@sn/types';

import { EntityRenderer } from './renderers';

export interface CanvasEntityLayerProps {
  entities: CanvasEntity[];
  selectedIds: Set<string>;
  /** Widget HTML lookup: widgetInstanceId → html string */
  widgetHtmlMap?: Map<string, string>;
  theme?: Record<string, string>;
  interactionMode?: 'edit' | 'preview';
}

/**
 * Renders positioned entity divs in z-order.
 */
export const CanvasEntityLayer: React.FC<CanvasEntityLayerProps> = ({
  entities,
  selectedIds,
  widgetHtmlMap,
  theme,
  interactionMode = 'edit',
}) => (
  <div data-testid="canvas-entity-layer" style={{ position: 'absolute', inset: 0 }}>
    {entities.map((entity) => (
      <EntityRenderer
        key={entity.id}
        entity={entity}
        isSelected={selectedIds.has(entity.id)}
        widgetHtml={
          entity.type === 'widget'
            ? widgetHtmlMap?.get(entity.widgetInstanceId)
            : undefined
        }
        theme={theme}
        interactionMode={interactionMode}
      />
    ))}
  </div>
);
