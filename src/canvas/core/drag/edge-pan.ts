/**
 * Edge Pan — auto-pan viewport when dragging entities near viewport edges
 *
 * During an entity drag, if the cursor enters a zone near the viewport edge,
 * the viewport automatically pans in that direction. Speed ramps linearly
 * from 0 at the zone boundary to max speed at the viewport edge.
 *
 * @module canvas/core/drag
 * @layer L4A-1
 */

import type { Point2D } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { ViewportState } from '../viewport/viewport';
import { panBy } from '../viewport/viewport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EdgePanOptions {
  /** Width of the edge zone in pixels (default: 40) */
  edgeZone?: number;
  /** Maximum pan speed in px/frame (default: 8) */
  maxSpeed?: number;
}

export interface EdgePanController {
  /** Activate edge panning (call on drag start) */
  activate(cursorGetter: () => Point2D): void;
  /** Deactivate edge panning (call on drag end) */
  deactivate(): void;
  /** Whether edge panning is currently active */
  isActive(): boolean;
}

export interface EdgePanDeps {
  getViewport: () => ViewportState;
  setViewport: (vp: ViewportState) => void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createEdgePanController(
  deps: EdgePanDeps,
  options?: EdgePanOptions,
  rafFn?: typeof requestAnimationFrame,
  cancelRafFn?: typeof cancelAnimationFrame,
): EdgePanController {
  const edgeZone = options?.edgeZone ?? 40;
  const maxSpeed = options?.maxSpeed ?? 8;
  const raf = rafFn ?? requestAnimationFrame;
  const cancelRaf = cancelRafFn ?? cancelAnimationFrame;

  let active = false;
  let rafId = 0;
  let getCursor: (() => Point2D) | null = null;

  function tick() {
    if (!active || !getCursor) return;

    const vp = deps.getViewport();
    const cursor = getCursor();
    const pan = computeEdgePan(cursor, vp.viewportWidth, vp.viewportHeight, edgeZone, maxSpeed);

    if (pan.x !== 0 || pan.y !== 0) {
      // Convert screen-space pan speed to canvas-space offset delta
      const next = panBy(vp, { x: pan.x / vp.zoom, y: pan.y / vp.zoom });
      deps.setViewport(next);
      bus.emit('canvas.viewport.changed', { offset: next.offset, zoom: next.zoom });
    }

    rafId = raf(tick);
  }

  return {
    activate(cursorGetter: () => Point2D) {
      if (active) return;
      getCursor = cursorGetter;
      active = true;
      rafId = raf(tick);
    },

    deactivate() {
      if (!active) return;
      active = false;
      if (rafId) cancelRaf(rafId);
      rafId = 0;
      getCursor = null;
    },

    isActive() {
      return active;
    },
  };
}

// ---------------------------------------------------------------------------
// Pure computation
// ---------------------------------------------------------------------------

/**
 * Compute the edge-pan vector based on cursor position.
 *
 * Returns a Point2D with the pan speed in each axis (positive = pan viewport
 * in that direction, i.e., content appears to move opposite).
 *
 * @param cursor          Screen-space cursor position
 * @param viewportWidth   Viewport width in pixels
 * @param viewportHeight  Viewport height in pixels
 * @param edgeZone        Edge zone width in pixels
 * @param maxSpeed        Max pan speed in px/frame
 */
export function computeEdgePan(
  cursor: Point2D,
  viewportWidth: number,
  viewportHeight: number,
  edgeZone: number,
  maxSpeed: number,
): Point2D {
  let dx = 0;
  let dy = 0;

  // Left edge
  if (cursor.x < edgeZone) {
    dx = maxSpeed * ((edgeZone - cursor.x) / edgeZone);
  }
  // Right edge
  else if (cursor.x > viewportWidth - edgeZone) {
    dx = -maxSpeed * ((cursor.x - (viewportWidth - edgeZone)) / edgeZone);
  }

  // Top edge
  if (cursor.y < edgeZone) {
    dy = maxSpeed * ((edgeZone - cursor.y) / edgeZone);
  }
  // Bottom edge
  else if (cursor.y > viewportHeight - edgeZone) {
    dy = -maxSpeed * ((cursor.y - (viewportHeight - edgeZone)) / edgeZone);
  }

  return { x: dx, y: dy };
}
