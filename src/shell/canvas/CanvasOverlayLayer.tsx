/**
 * Overlay Layer — HTML5 Canvas 2D overlay for grid, selection box, and guides.
 * Renders on top of entities, below the tool interaction layer.
 *
 * @module shell/canvas
 * @layer L6
 */

import React, { useEffect, useRef } from 'react';

import type { BackgroundSpec, GridConfig } from '@sn/types';
import { DEFAULT_BACKGROUND } from '@sn/types';

import {
  createBackgroundRenderer,
  createGridRenderer,
  createGridCellStore,
  DEFAULT_GRID_CONFIG,
} from '../../canvas/core';
import type { ViewportState, GridCellStore, BackgroundRenderer, GridRenderer } from '../../canvas/core';

export interface CanvasOverlayLayerProps {
  viewport: ViewportState;
  background?: BackgroundSpec;
  gridConfig?: GridConfig;
  /** Selection rectangle in canvas space (during marquee select) */
  selectionRect?: { x: number; y: number; width: number; height: number } | null;
  /** Canvas background opacity (0-1) — only affects background rendering */
  canvasOpacity?: number;
}

/**
 * Canvas2D overlay for background, grid lines, selection rectangle, and guides.
 */
export const CanvasOverlayLayer: React.FC<CanvasOverlayLayerProps> = ({
  viewport,
  background = DEFAULT_BACKGROUND,
  gridConfig = DEFAULT_GRID_CONFIG,
  selectionRect,
  canvasOpacity = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRendererRef = useRef<BackgroundRenderer | null>(null);
  const gridRendererRef = useRef<GridRenderer | null>(null);
  const cellStoreRef = useRef<GridCellStore | null>(null);

  // Initialize renderers
  useEffect(() => {
    bgRendererRef.current = createBackgroundRenderer(background);
    cellStoreRef.current = createGridCellStore();
    gridRendererRef.current = createGridRenderer(cellStoreRef.current);

    return () => {
      bgRendererRef.current?.dispose();
    };
  }, []);

  // Update and render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resize canvas to fill viewport
    canvas.width = viewport.viewportWidth;
    canvas.height = viewport.viewportHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background (with canvas opacity applied only to background, not grid)
    const bgR = bgRendererRef.current;
    if (bgR) {
      ctx.save();
      ctx.globalAlpha = canvasOpacity;
      bgR.setBackground(background);
      bgR.setViewport(viewport);
      bgR.render(ctx);
      ctx.restore();
    }

    // Grid
    const gridR = gridRendererRef.current;
    if (gridR && gridConfig.enabled) {
      gridR.setCanvas(canvas);
      gridR.setViewport(viewport);
      gridR.setConfig(gridConfig);
      gridR.invalidate();
      gridR.render();
    }

    // Selection rectangle
    if (selectionRect) {
      ctx.save();
      // Transform to screen space
      const sx = (selectionRect.x + viewport.offset.x) * viewport.zoom;
      const sy = (selectionRect.y + viewport.offset.y) * viewport.zoom;
      const sw = selectionRect.width * viewport.zoom;
      const sh = selectionRect.height * viewport.zoom;

      ctx.strokeStyle = 'var(--sn-accent, #3b82f6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.restore();
    }
  }, [viewport, background, gridConfig, selectionRect, canvasOpacity]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="canvas-overlay-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
};
