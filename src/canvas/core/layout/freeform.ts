/**
 * Freeform Layout Mode
 *
 * No constraints - entities can be positioned and sized freely.
 * This is the default layout mode for the canvas.
 *
 * @module canvas/core/layout
 * @layer L4A-1
 */

import type { Point2D, Size2D } from '@sn/types';

import type { LayoutMode, ConstraintContext, ConstraintResult, SnapPoint } from './layout-mode';

/**
 * Snap threshold in canvas units
 */
const SNAP_THRESHOLD = 8;

/**
 * Freeform layout mode
 *
 * Allows free positioning with optional grid snapping.
 * No slot constraints or mandatory alignment.
 */
export const freeformLayout: LayoutMode = {
  name: 'freeform',
  displayName: 'Freeform',
  description: 'Free positioning with optional grid snapping',

  applyMoveConstraints(
    newPosition: Point2D,
    ctx: ConstraintContext
  ): ConstraintResult<Point2D> {
    let { x, y } = newPosition;
    let wasConstrained = false;
    const activeSnaps: SnapPoint[] = [];

    // Apply grid snapping if enabled
    if (ctx.gridConfig?.snapToGrid) {
      const { cellWidth, cellHeight } = ctx.gridConfig;
      const snappedX = Math.round(x / cellWidth) * cellWidth;
      const snappedY = Math.round(y / cellHeight) * cellHeight;

      if (snappedX !== x || snappedY !== y) {
        x = snappedX;
        y = snappedY;
        wasConstrained = true;
        activeSnaps.push(
          { value: x, axis: 'x', type: 'grid' },
          { value: y, axis: 'y', type: 'grid' }
        );
      }
    }

    return {
      value: { x, y },
      wasConstrained,
      activeSnaps,
    };
  },

  applyResizeConstraints(
    newSize: Size2D,
    ctx: ConstraintContext
  ): ConstraintResult<Size2D> {
    let { width, height } = newSize;
    let wasConstrained = false;

    // Enforce minimum size
    const minWidth = 20;
    const minHeight = 20;

    if (width < minWidth) {
      width = minWidth;
      wasConstrained = true;
    }

    if (height < minHeight) {
      height = minHeight;
      wasConstrained = true;
    }

    // Apply grid snapping to size if enabled
    if (ctx.gridConfig?.snapToGrid) {
      const { cellWidth, cellHeight } = ctx.gridConfig;
      const snappedWidth = Math.round(width / cellWidth) * cellWidth;
      const snappedHeight = Math.round(height / cellHeight) * cellHeight;

      if (snappedWidth >= minWidth && snappedHeight >= minHeight) {
        if (snappedWidth !== width || snappedHeight !== height) {
          width = snappedWidth;
          height = snappedHeight;
          wasConstrained = true;
        }
      }
    }

    return {
      value: { width, height },
      wasConstrained,
    };
  },

  getSnapPoints(ctx: ConstraintContext): SnapPoint[] {
    const snapPoints: SnapPoint[] = [];

    // Add grid snap points if enabled
    if (ctx.gridConfig?.snapToGrid) {
      const { cellWidth, cellHeight } = ctx.gridConfig;
      const viewportBounds = {
        left: -ctx.viewport.pan.x / ctx.viewport.zoom,
        top: -ctx.viewport.pan.y / ctx.viewport.zoom,
        right: (-ctx.viewport.pan.x + 1920) / ctx.viewport.zoom, // Approximate viewport width
        bottom: (-ctx.viewport.pan.y + 1080) / ctx.viewport.zoom, // Approximate viewport height
      };

      // Generate grid lines within viewport
      const startX = Math.floor(viewportBounds.left / cellWidth) * cellWidth;
      const endX = Math.ceil(viewportBounds.right / cellWidth) * cellWidth;
      const startY = Math.floor(viewportBounds.top / cellHeight) * cellHeight;
      const endY = Math.ceil(viewportBounds.bottom / cellHeight) * cellHeight;

      for (let x = startX; x <= endX; x += cellWidth) {
        snapPoints.push({ value: x, axis: 'x', type: 'grid' });
      }
      for (let y = startY; y <= endY; y += cellHeight) {
        snapPoints.push({ value: y, axis: 'y', type: 'grid' });
      }
    }

    // Add snap points from other entities (edges and centers)
    if (ctx.otherEntities) {
      for (const bounds of ctx.otherEntities) {
        const boundsWidth = bounds.max.x - bounds.min.x;
        const boundsHeight = bounds.max.y - bounds.min.y;
        // Left edge
        snapPoints.push({ value: bounds.min.x, axis: 'x', type: 'edge' });
        // Right edge
        snapPoints.push({ value: bounds.max.x, axis: 'x', type: 'edge' });
        // Center X
        snapPoints.push({ value: bounds.min.x + boundsWidth / 2, axis: 'x', type: 'center' });
        // Top edge
        snapPoints.push({ value: bounds.min.y, axis: 'y', type: 'edge' });
        // Bottom edge
        snapPoints.push({ value: bounds.max.y, axis: 'y', type: 'edge' });
        // Center Y
        snapPoints.push({ value: bounds.min.y + boundsHeight / 2, axis: 'y', type: 'center' });
      }
    }

    return snapPoints;
  },

  isValidPosition(_position: Point2D, _ctx: ConstraintContext): boolean {
    // Freeform mode: all positions are valid
    return true;
  },

  getNearestValidPosition(position: Point2D, _ctx: ConstraintContext): Point2D {
    // Freeform mode: position is always valid as-is
    return position;
  },
};

/**
 * Helper: Find the nearest snap point within threshold
 */
export function findNearestSnap(
  value: number,
  axis: 'x' | 'y',
  snapPoints: SnapPoint[],
  threshold: number = SNAP_THRESHOLD
): SnapPoint | null {
  let nearest: SnapPoint | null = null;
  let nearestDistance = threshold;

  for (const snap of snapPoints) {
    if (snap.axis !== axis) continue;
    const distance = Math.abs(snap.value - value);
    if (distance < nearestDistance) {
      nearest = snap;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/**
 * Create a freeform layout mode with custom configuration
 */
export function createFreeformLayout(options?: {
  snapThreshold?: number;
  minWidth?: number;
  minHeight?: number;
}): LayoutMode {
  const snapThreshold = options?.snapThreshold ?? SNAP_THRESHOLD;
  const minWidth = options?.minWidth ?? 20;
  const minHeight = options?.minHeight ?? 20;

  return {
    ...freeformLayout,
    applyMoveConstraints(
      newPosition: Point2D,
      ctx: ConstraintContext
    ): ConstraintResult<Point2D> {
      let { x, y } = newPosition;
      let wasConstrained = false;
      const activeSnaps: SnapPoint[] = [];

      if (ctx.gridConfig?.snapToGrid) {
        const { cellWidth, cellHeight } = ctx.gridConfig;
        const snappedX = Math.round(x / cellWidth) * cellWidth;
        const snappedY = Math.round(y / cellHeight) * cellHeight;

        if (Math.abs(snappedX - x) <= snapThreshold) {
          x = snappedX;
          wasConstrained = true;
          activeSnaps.push({ value: x, axis: 'x', type: 'grid' });
        }
        if (Math.abs(snappedY - y) <= snapThreshold) {
          y = snappedY;
          wasConstrained = true;
          activeSnaps.push({ value: y, axis: 'y', type: 'grid' });
        }
      }

      return { value: { x, y }, wasConstrained, activeSnaps };
    },

    applyResizeConstraints(
      newSize: Size2D,
      ctx: ConstraintContext
    ): ConstraintResult<Size2D> {
      let { width, height } = newSize;
      let wasConstrained = false;

      if (width < minWidth) {
        width = minWidth;
        wasConstrained = true;
      }
      if (height < minHeight) {
        height = minHeight;
        wasConstrained = true;
      }

      if (ctx.gridConfig?.snapToGrid) {
        const { cellWidth, cellHeight } = ctx.gridConfig;
        const snappedWidth = Math.round(width / cellWidth) * cellWidth;
        const snappedHeight = Math.round(height / cellHeight) * cellHeight;

        if (snappedWidth >= minWidth && snappedHeight >= minHeight) {
          width = snappedWidth;
          height = snappedHeight;
          wasConstrained = true;
        }
      }

      return { value: { width, height }, wasConstrained };
    },
  };
}
