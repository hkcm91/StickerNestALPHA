/**
 * Desktop Layout Mode
 *
 * Window-based layout with docking zones and cascading placement.
 * Mimics traditional desktop windowing behavior.
 *
 * @module canvas/core/layout
 * @layer L4A-1
 */

import type { Point2D, Size2D, BoundingBox2D } from '@sn/types';

import type { LayoutMode, ConstraintContext, ConstraintResult, SnapPoint } from './layout-mode';

/**
 * Default desktop configuration
 */
export const DEFAULT_DESKTOP_CONFIG = {
  minWidth: 200,
  minHeight: 150,
  maxWidth: 1600,
  maxHeight: 1200,
  snapThreshold: 12,
  cascadeOffset: 30,
  dockingZoneSize: 50,
  edgeSnapEnabled: true,
  cascadeEnabled: true,
};

/**
 * Desktop configuration
 */
export interface DesktopConfig {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  snapThreshold: number;
  cascadeOffset: number;
  dockingZoneSize: number;
  edgeSnapEnabled: boolean;
  cascadeEnabled: boolean;
}

/**
 * Docking zone definitions
 */
export type DockingZone = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'none';

/**
 * Detect which docking zone a position is in
 */
function detectDockingZone(
  position: Point2D,
  viewportBounds: BoundingBox2D,
  dockingZoneSize: number
): DockingZone {
  const relX = position.x - viewportBounds.x;
  const relY = position.y - viewportBounds.y;

  // Check if near edges
  const nearLeft = relX < dockingZoneSize;
  const nearRight = relX > viewportBounds.width - dockingZoneSize;
  const nearTop = relY < dockingZoneSize;
  const nearBottom = relY > viewportBounds.height - dockingZoneSize;

  // Corners are treated as edge docks
  if (nearLeft) return 'left';
  if (nearRight) return 'right';
  if (nearTop) return 'top';
  if (nearBottom) return 'bottom';

  return 'none';
}

/**
 * Get docked position and size
 */
function getDockedBounds(
  zone: DockingZone,
  viewportBounds: BoundingBox2D,
  originalSize: Size2D
): { position: Point2D; size: Size2D } | null {
  switch (zone) {
    case 'left':
      return {
        position: { x: viewportBounds.x, y: viewportBounds.y },
        size: { width: viewportBounds.width / 2, height: viewportBounds.height },
      };
    case 'right':
      return {
        position: { x: viewportBounds.x + viewportBounds.width / 2, y: viewportBounds.y },
        size: { width: viewportBounds.width / 2, height: viewportBounds.height },
      };
    case 'top':
      return {
        position: { x: viewportBounds.x, y: viewportBounds.y },
        size: { width: viewportBounds.width, height: viewportBounds.height / 2 },
      };
    case 'bottom':
      return {
        position: { x: viewportBounds.x, y: viewportBounds.y + viewportBounds.height / 2 },
        size: { width: viewportBounds.width, height: viewportBounds.height / 2 },
      };
    case 'center':
      // Maximize
      return {
        position: { x: viewportBounds.x, y: viewportBounds.y },
        size: { width: viewportBounds.width, height: viewportBounds.height },
      };
    default:
      return null;
  }
}

/**
 * Create a desktop layout mode
 */
export function createDesktopLayout(config: Partial<DesktopConfig> = {}): LayoutMode {
  const mergedConfig: DesktopConfig = { ...DEFAULT_DESKTOP_CONFIG, ...config };

  return {
    name: 'desktop',
    displayName: 'Desktop',
    description: 'Window-based layout with docking and cascading',

    applyMoveConstraints(
      newPosition: Point2D,
      ctx: ConstraintContext
    ): ConstraintResult<Point2D> {
      let { x, y } = newPosition;
      let wasConstrained = false;
      const activeSnaps: SnapPoint[] = [];

      // Edge snapping to other entities
      if (mergedConfig.edgeSnapEnabled && ctx.otherEntities) {
        for (const other of ctx.otherEntities) {
          // Snap to left edge of other
          if (Math.abs(x - other.x) < mergedConfig.snapThreshold) {
            x = other.x;
            wasConstrained = true;
            activeSnaps.push({ value: x, axis: 'x', type: 'edge' });
          }
          // Snap to right edge of other
          if (Math.abs(x - (other.x + other.width)) < mergedConfig.snapThreshold) {
            x = other.x + other.width;
            wasConstrained = true;
            activeSnaps.push({ value: x, axis: 'x', type: 'edge' });
          }
          // Snap our right edge to other's left edge
          if (Math.abs((x + ctx.currentBounds.width) - other.x) < mergedConfig.snapThreshold) {
            x = other.x - ctx.currentBounds.width;
            wasConstrained = true;
            activeSnaps.push({ value: other.x, axis: 'x', type: 'edge' });
          }
          // Snap to top edge of other
          if (Math.abs(y - other.y) < mergedConfig.snapThreshold) {
            y = other.y;
            wasConstrained = true;
            activeSnaps.push({ value: y, axis: 'y', type: 'edge' });
          }
          // Snap to bottom edge of other
          if (Math.abs(y - (other.y + other.height)) < mergedConfig.snapThreshold) {
            y = other.y + other.height;
            wasConstrained = true;
            activeSnaps.push({ value: y, axis: 'y', type: 'edge' });
          }
          // Snap our bottom edge to other's top edge
          if (Math.abs((y + ctx.currentBounds.height) - other.y) < mergedConfig.snapThreshold) {
            y = other.y - ctx.currentBounds.height;
            wasConstrained = true;
            activeSnaps.push({ value: other.y, axis: 'y', type: 'edge' });
          }
          // Center alignment
          const ourCenterX = x + ctx.currentBounds.width / 2;
          const otherCenterX = other.x + other.width / 2;
          if (Math.abs(ourCenterX - otherCenterX) < mergedConfig.snapThreshold) {
            x = otherCenterX - ctx.currentBounds.width / 2;
            wasConstrained = true;
            activeSnaps.push({ value: otherCenterX, axis: 'x', type: 'center' });
          }
          const ourCenterY = y + ctx.currentBounds.height / 2;
          const otherCenterY = other.y + other.height / 2;
          if (Math.abs(ourCenterY - otherCenterY) < mergedConfig.snapThreshold) {
            y = otherCenterY - ctx.currentBounds.height / 2;
            wasConstrained = true;
            activeSnaps.push({ value: otherCenterY, axis: 'y', type: 'center' });
          }
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
      _ctx: ConstraintContext
    ): ConstraintResult<Size2D> {
      let { width, height } = newSize;
      let wasConstrained = false;

      // Enforce min/max size
      if (width < mergedConfig.minWidth) {
        width = mergedConfig.minWidth;
        wasConstrained = true;
      }
      if (width > mergedConfig.maxWidth) {
        width = mergedConfig.maxWidth;
        wasConstrained = true;
      }
      if (height < mergedConfig.minHeight) {
        height = mergedConfig.minHeight;
        wasConstrained = true;
      }
      if (height > mergedConfig.maxHeight) {
        height = mergedConfig.maxHeight;
        wasConstrained = true;
      }

      return {
        value: { width, height },
        wasConstrained,
      };
    },

    getSnapPoints(ctx: ConstraintContext): SnapPoint[] {
      const snapPoints: SnapPoint[] = [];

      if (ctx.otherEntities) {
        for (const other of ctx.otherEntities) {
          // Add edge snap points
          snapPoints.push(
            { value: other.x, axis: 'x', type: 'edge' },
            { value: other.x + other.width, axis: 'x', type: 'edge' },
            { value: other.x + other.width / 2, axis: 'x', type: 'center' },
            { value: other.y, axis: 'y', type: 'edge' },
            { value: other.y + other.height, axis: 'y', type: 'edge' },
            { value: other.y + other.height / 2, axis: 'y', type: 'center' }
          );
        }
      }

      return snapPoints;
    },

    isValidPosition(position: Point2D, _ctx: ConstraintContext): boolean {
      // Desktop mode: all positions are valid (windows can go anywhere)
      return position.x >= -1000000 && position.y >= -1000000;
    },

    getNearestValidPosition(position: Point2D, ctx: ConstraintContext): Point2D {
      // Apply snap constraints
      const result = this.applyMoveConstraints(position, ctx);
      return result.value;
    },
  };
}

/**
 * Default desktop layout instance
 */
export const desktopLayout = createDesktopLayout();

/**
 * Calculate cascaded position for new window
 */
export function getCascadedPosition(
  existingWindows: BoundingBox2D[],
  config: Partial<DesktopConfig> = {}
): Point2D {
  const mergedConfig = { ...DEFAULT_DESKTOP_CONFIG, ...config };
  const baseX = 50;
  const baseY = 50;

  if (existingWindows.length === 0) {
    return { x: baseX, y: baseY };
  }

  // Find the last window position and cascade from there
  const lastWindow = existingWindows[existingWindows.length - 1];
  return {
    x: lastWindow.x + mergedConfig.cascadeOffset,
    y: lastWindow.y + mergedConfig.cascadeOffset,
  };
}

/**
 * Utility exports
 */
export { detectDockingZone, getDockedBounds };
