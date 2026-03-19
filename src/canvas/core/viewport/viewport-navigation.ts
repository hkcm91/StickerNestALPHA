/**
 * Viewport Navigation — compute target viewport states for navigation actions
 *
 * Pure functions that calculate where the viewport should go.
 * The ViewportAnimator handles the actual transition.
 *
 * @module canvas/core/viewport
 * @layer L4A-1
 */

import type { Point2D, BoundingBox2D } from '@sn/types';

import type { ViewportState } from './viewport';
import { createViewport } from './viewport';

// ---------------------------------------------------------------------------
// Zoom to Fit
// ---------------------------------------------------------------------------

/**
 * Compute a viewport state that frames all given entity bounding boxes
 * with configurable padding.
 *
 * @param entityBounds  Array of entity bounding boxes in canvas space
 * @param viewportWidth  Current viewport pixel width
 * @param viewportHeight Current viewport pixel height
 * @param padding        Pixel padding around the framed content (default: 48)
 * @returns Target ViewportState, or a default viewport if no entities
 */
export function computeZoomToFit(
  entityBounds: BoundingBox2D[],
  viewportWidth: number,
  viewportHeight: number,
  padding = 48,
): ViewportState {
  if (entityBounds.length === 0) {
    return createViewport(viewportWidth, viewportHeight);
  }

  const combined = computeCombinedBounds(entityBounds);
  return computeFitBounds(combined, viewportWidth, viewportHeight, padding);
}

// ---------------------------------------------------------------------------
// Center on Entity
// ---------------------------------------------------------------------------

/**
 * Compute a viewport state centered on a single entity.
 *
 * @param entityBounds  The entity's bounding box in canvas space
 * @param viewportWidth  Current viewport pixel width
 * @param viewportHeight Current viewport pixel height
 * @param zoom           Optional zoom level (defaults to current-equivalent 1)
 */
export function computeCenterOnEntity(
  entityBounds: BoundingBox2D,
  viewportWidth: number,
  viewportHeight: number,
  zoom = 1,
): ViewportState {
  const center = boundsCenter(entityBounds);
  return computeCenterOnPoint(center, viewportWidth, viewportHeight, zoom);
}

// ---------------------------------------------------------------------------
// Center on Selection
// ---------------------------------------------------------------------------

/**
 * Compute a viewport state that frames a selection of entities.
 *
 * @param selectedBounds  Array of selected entity bounding boxes
 * @param viewportWidth   Current viewport pixel width
 * @param viewportHeight  Current viewport pixel height
 * @param padding         Pixel padding (default: 48)
 */
export function computeCenterOnSelection(
  selectedBounds: BoundingBox2D[],
  viewportWidth: number,
  viewportHeight: number,
  padding = 48,
): ViewportState {
  if (selectedBounds.length === 0) {
    return createViewport(viewportWidth, viewportHeight);
  }

  const combined = computeCombinedBounds(selectedBounds);
  return computeFitBounds(combined, viewportWidth, viewportHeight, padding);
}

// ---------------------------------------------------------------------------
// Center on Point
// ---------------------------------------------------------------------------

/**
 * Compute a viewport state centered on a specific canvas-space point.
 *
 * @param point          Canvas-space point to center on
 * @param viewportWidth  Current viewport pixel width
 * @param viewportHeight Current viewport pixel height
 * @param zoom           Zoom level (default: 1)
 */
export function computeCenterOnPoint(
  point: Point2D,
  viewportWidth: number,
  viewportHeight: number,
  zoom = 1,
): ViewportState {
  const clamped = Math.min(10, Math.max(0.1, zoom));
  return {
    offset: {
      x: viewportWidth / (2 * clamped) - point.x,
      y: viewportHeight / (2 * clamped) - point.y,
    },
    zoom: clamped,
    minZoom: 0.1,
    maxZoom: 10,
    viewportWidth,
    viewportHeight,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the combined bounding box of multiple bounding boxes */
function computeCombinedBounds(bounds: BoundingBox2D[]): BoundingBox2D {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of bounds) {
    if (b.min.x < minX) minX = b.min.x;
    if (b.min.y < minY) minY = b.min.y;
    if (b.max.x > maxX) maxX = b.max.x;
    if (b.max.y > maxY) maxY = b.max.y;
  }

  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

/** Get the center point of a bounding box */
function boundsCenter(b: BoundingBox2D): Point2D {
  return {
    x: (b.min.x + b.max.x) / 2,
    y: (b.min.y + b.max.y) / 2,
  };
}

/**
 * Compute viewport state that frames a bounding box with padding.
 * Zoom is clamped to [0.1, 10].
 */
function computeFitBounds(
  bounds: BoundingBox2D,
  viewportWidth: number,
  viewportHeight: number,
  padding: number,
): ViewportState {
  const contentWidth = bounds.max.x - bounds.min.x;
  const contentHeight = bounds.max.y - bounds.min.y;

  // Available screen space after padding
  const availW = Math.max(viewportWidth - padding * 2, 1);
  const availH = Math.max(viewportHeight - padding * 2, 1);

  // Compute zoom to fit content in available space
  let zoom: number;
  if (contentWidth <= 0 && contentHeight <= 0) {
    zoom = 1;
  } else if (contentWidth <= 0) {
    zoom = availH / contentHeight;
  } else if (contentHeight <= 0) {
    zoom = availW / contentWidth;
  } else {
    zoom = Math.min(availW / contentWidth, availH / contentHeight);
  }

  // Clamp zoom
  zoom = Math.min(10, Math.max(0.1, zoom));

  // Center the content in the viewport
  const center = boundsCenter(bounds);

  return {
    offset: {
      x: viewportWidth / (2 * zoom) - center.x,
      y: viewportHeight / (2 * zoom) - center.y,
    },
    zoom,
    minZoom: 0.1,
    maxZoom: 10,
    viewportWidth,
    viewportHeight,
  };
}
