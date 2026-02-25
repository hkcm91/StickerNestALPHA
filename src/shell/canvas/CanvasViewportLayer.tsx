/**
 * Viewport Layer — CSS transform container for pan/zoom.
 * All entities are children of this layer and move with the viewport.
 *
 * @module shell/canvas
 * @layer L6
 */

import React from 'react';

import type { ViewportState } from '../../canvas/core';

export interface CanvasViewportLayerProps {
  viewport: ViewportState;
  children: React.ReactNode;
  /** Optional style overrides (e.g. pointer-events: none for handle layers) */
  style?: React.CSSProperties;
}

/**
 * Applies CSS transform to children based on viewport offset and zoom.
 */
export const CanvasViewportLayer: React.FC<CanvasViewportLayerProps> = ({
  viewport,
  children,
  style,
}) => {
  const transform = `scale(${viewport.zoom}) translate(${viewport.offset.x}px, ${viewport.offset.y}px)`;

  return (
    <div
      data-testid="canvas-viewport-layer"
      style={{
        position: 'absolute',
        inset: 0,
        transformOrigin: '0 0',
        transform,
        willChange: 'transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
