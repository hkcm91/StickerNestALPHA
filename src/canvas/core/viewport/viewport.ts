/**
 * Viewport — pan/zoom state and coordinate transforms
 *
 * @module canvas/core/viewport
 * @layer L4A-1
 */

import type { Point2D, BoundingBox2D } from '@sn/types';

export interface ViewportState {
  offset: Point2D;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  viewportWidth: number;
  viewportHeight: number;
}

export function createViewport(width: number, height: number): ViewportState {
  return {
    offset: { x: 0, y: 0 },
    zoom: 1,
    minZoom: 0.1,
    maxZoom: 10,
    viewportWidth: width,
    viewportHeight: height,
  };
}

export function canvasToScreen(point: Point2D, vp: ViewportState): Point2D {
  return {
    x: (point.x + vp.offset.x) * vp.zoom,
    y: (point.y + vp.offset.y) * vp.zoom,
  };
}

export function screenToCanvas(point: Point2D, vp: ViewportState): Point2D {
  return {
    x: point.x / vp.zoom - vp.offset.x,
    y: point.y / vp.zoom - vp.offset.y,
  };
}

export function panBy(vp: ViewportState, delta: Point2D): ViewportState {
  return {
    ...vp,
    offset: { x: vp.offset.x + delta.x, y: vp.offset.y + delta.y },
  };
}

export function zoomTo(vp: ViewportState, zoom: number, anchor: Point2D): ViewportState {
  const clamped = Math.min(vp.maxZoom, Math.max(vp.minZoom, zoom));
  // Keep the anchor point in the same screen position
  const canvasAnchor = screenToCanvas(anchor, vp);
  const newOffset = {
    x: anchor.x / clamped - canvasAnchor.x + vp.offset.x - (anchor.x / clamped - canvasAnchor.x),
    y: anchor.y / clamped - canvasAnchor.y + vp.offset.y - (anchor.y / clamped - canvasAnchor.y),
  };
  // Simplified: anchor stays at same canvas position
  return {
    ...vp,
    zoom: clamped,
    offset: {
      x: anchor.x / clamped - canvasAnchor.x,
      y: anchor.y / clamped - canvasAnchor.y,
    },
  };
}

export function getVisibleBounds(vp: ViewportState): BoundingBox2D {
  const topLeft = screenToCanvas({ x: 0, y: 0 }, vp);
  const bottomRight = screenToCanvas({ x: vp.viewportWidth, y: vp.viewportHeight }, vp);
  return { min: topLeft, max: bottomRight };
}
