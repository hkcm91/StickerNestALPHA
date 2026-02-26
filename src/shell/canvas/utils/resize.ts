/**
 * Resize computation utilities — pure geometry functions for resize handles.
 *
 * Duplicated from `canvas/tools/resize/resize-handles.ts` (L4A-2) because
 * Shell (L6) cannot import from canvas-tools per the layer boundary rules.
 * These are pure math with no tool dependencies.
 *
 * @module shell/canvas/utils
 * @layer L6
 */

import type { Point2D, Size2D, BoundingBox2D, CanvasEntity } from '@sn/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HandlePosition =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

export interface ResizeHandle {
  position: HandlePosition;
  cursor: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine if an entity should have its aspect ratio locked by default.
 * Most visual assets (stickers, SVG, Lottie) lock by default.
 */
export function shouldLockAspectRatio(entity: CanvasEntity): boolean {
  switch (entity.type) {
    case 'sticker':
    case 'lottie':
    case 'svg':
      return (entity as any).aspectLocked !== false;
    case 'widget':
      // Widgets with an intrinsic size often want to stay proportional
      return !!(entity as any).intrinsicSize;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Handle definitions
// ---------------------------------------------------------------------------

/** Returns the 8 resize handle definitions with their cursor styles. */
export function getResizeHandles(): ResizeHandle[] {
  return [
    { position: 'top-left', cursor: 'nwse-resize' },
    { position: 'top', cursor: 'ns-resize' },
    { position: 'top-right', cursor: 'nesw-resize' },
    { position: 'right', cursor: 'ew-resize' },
    { position: 'bottom-right', cursor: 'nwse-resize' },
    { position: 'bottom', cursor: 'ns-resize' },
    { position: 'bottom-left', cursor: 'nesw-resize' },
    { position: 'left', cursor: 'ew-resize' },
  ];
}

// ---------------------------------------------------------------------------
// Resize computation
// ---------------------------------------------------------------------------

/**
 * Computes the new position and size after a resize drag operation.
 *
 * @param handle - Which handle is being dragged
 * @param delta - Pointer movement delta from drag start
 * @param originalBounds - Entity bounding box at drag start
 * @param options.aspectLock - Constrain aspect ratio (Shift key)
 * @param options.centerResize - Resize from center (Alt key)
 */
export function computeResize(
  handle: HandlePosition,
  delta: Point2D,
  originalBounds: BoundingBox2D,
  options: { aspectLock: boolean; centerResize: boolean },
): { position: Point2D; size: Size2D } {
  let minX = originalBounds.min.x;
  let minY = originalBounds.min.y;
  let maxX = originalBounds.max.x;
  let maxY = originalBounds.max.y;

  const adjustX = (dx: number, side: 'min' | 'max') => {
    if (side === 'min') minX += dx;
    else maxX += dx;
    if (options.centerResize) {
      if (side === 'min') maxX -= dx;
      else minX -= dx;
    }
  };

  const adjustY = (dy: number, side: 'min' | 'max') => {
    if (side === 'min') minY += dy;
    else maxY += dy;
    if (options.centerResize) {
      if (side === 'min') maxY -= dy;
      else minY -= dy;
    }
  };

  switch (handle) {
    case 'top-left':
      adjustX(delta.x, 'min');
      adjustY(delta.y, 'min');
      break;
    case 'top':
      adjustY(delta.y, 'min');
      break;
    case 'top-right':
      adjustX(delta.x, 'max');
      adjustY(delta.y, 'min');
      break;
    case 'right':
      adjustX(delta.x, 'max');
      break;
    case 'bottom-right':
      adjustX(delta.x, 'max');
      adjustY(delta.y, 'max');
      break;
    case 'bottom':
      adjustY(delta.y, 'max');
      break;
    case 'bottom-left':
      adjustX(delta.x, 'min');
      adjustY(delta.y, 'max');
      break;
    case 'left':
      adjustX(delta.x, 'min');
      break;
  }

  let width = Math.max(1, maxX - minX);
  let height = Math.max(1, maxY - minY);

  if (options.aspectLock) {
    const origW = originalBounds.max.x - originalBounds.min.x;
    const origH = originalBounds.max.y - originalBounds.min.y;
    if (origW > 0 && origH > 0) {
      const ratio = origW / origH;
      if (width / height > ratio) {
        width = height * ratio;
      } else {
        height = width / ratio;
      }
    }
  }

  return {
    position: { x: minX, y: minY },
    size: { width, height },
  };
}
