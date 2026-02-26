/**
 * Artboard Layout Mode
 *
 * Special layout mode for managing multiple artboards (pages).
 * Artboards themselves are positioned freely, but can be snapped to each other.
 *
 * @module canvas/core/layout
 * @layer L4A-1
 */

import type { Point2D, Size2D } from '@sn/types';

import { freeformLayout } from './freeform';
import type { LayoutMode, ConstraintContext, ConstraintResult, SnapPoint } from './layout-mode';

const ARTBOARD_GAP = 100;
const SNAP_THRESHOLD = 12;

/**
 * Artboard layout mode
 *
 * Extends freeform layout but with specialized snapping for artboard alignment.
 */
export const artboardLayout: LayoutMode = {
  ...freeformLayout,
  name: 'artboard',
  displayName: 'Artboard',
  description: 'Layout for multiple artboards and pages',

  applyResizeConstraints(
    newSize: Size2D,
    ctx: ConstraintContext
  ): ConstraintResult<Size2D> {
    // For artboards, we might want to snap to common device sizes
    // For now, let's just use freeform resize
    return freeformLayout.applyResizeConstraints(newSize, ctx);
  },

  applyMoveConstraints(
    newPosition: Point2D,
    ctx: ConstraintContext
  ): ConstraintResult<Point2D> {
    let { x, y } = newPosition;
    let wasConstrained = false;
    const activeSnaps: SnapPoint[] = [];

    const currentWidth = ctx.currentBounds.max.x - ctx.currentBounds.min.x;
    const currentHeight = ctx.currentBounds.max.y - ctx.currentBounds.min.y;

    if (ctx.otherEntities) {
      for (const other of ctx.otherEntities) {
        // Align tops
        if (Math.abs(y - other.min.y) < SNAP_THRESHOLD) {
          y = other.min.y;
          wasConstrained = true;
          activeSnaps.push({ value: y, axis: 'y', type: 'edge', sourceEntityId: ctx.entityId });
        }
        // Align lefts
        if (Math.abs(x - other.min.x) < SNAP_THRESHOLD) {
          x = other.min.x;
          wasConstrained = true;
          activeSnaps.push({ value: x, axis: 'x', type: 'edge', sourceEntityId: ctx.entityId });
        }

        // Snap our left to their right + gap
        if (Math.abs(x - (other.max.x + ARTBOARD_GAP)) < SNAP_THRESHOLD) {
          x = other.max.x + ARTBOARD_GAP;
          wasConstrained = true;
          activeSnaps.push({ value: x, axis: 'x', type: 'edge', sourceEntityId: ctx.entityId });
        }
        // Snap our right to their left - gap
        if (Math.abs((x + currentWidth) - (other.min.x - ARTBOARD_GAP)) < SNAP_THRESHOLD) {
          x = other.min.x - ARTBOARD_GAP - currentWidth;
          wasConstrained = true;
          activeSnaps.push({ value: x + currentWidth, axis: 'x', type: 'edge', sourceEntityId: ctx.entityId });
        }
        // Snap our top to their bottom + gap
        if (Math.abs(y - (other.max.y + ARTBOARD_GAP)) < SNAP_THRESHOLD) {
          y = other.max.y + ARTBOARD_GAP;
          wasConstrained = true;
          activeSnaps.push({ value: y, axis: 'y', type: 'edge', sourceEntityId: ctx.entityId });
        }
        // Snap our bottom to their top - gap
        if (Math.abs((y + currentHeight) - (other.min.y - ARTBOARD_GAP)) < SNAP_THRESHOLD) {
          y = other.min.y - ARTBOARD_GAP - currentHeight;
          wasConstrained = true;
          activeSnaps.push({ value: y + currentHeight, axis: 'y', type: 'edge', sourceEntityId: ctx.entityId });
        }
      }
    }

    if (!wasConstrained) {
      return freeformLayout.applyMoveConstraints(newPosition, ctx);
    }

    return {
      value: { x, y },
      wasConstrained,
      activeSnaps,
    };
  },
};

/**
 * Create an artboard layout mode
 */
export function createArtboardLayout(): LayoutMode {
  return artboardLayout;
}
