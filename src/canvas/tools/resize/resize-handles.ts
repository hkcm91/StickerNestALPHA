/**
 * Resize Handles — handle positions and resize computation
 *
 * @module canvas/tools/resize
 * @layer L4A-2
 */

import type { Point2D, Size2D, BoundingBox2D } from '@sn/types';

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
