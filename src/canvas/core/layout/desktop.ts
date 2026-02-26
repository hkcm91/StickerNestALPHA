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
  iconGridWidth: 100,
  iconGridHeight: 120,
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
  iconGridWidth: number;
  iconGridHeight: number;
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
  const boundsWidth = viewportBounds.max.x - viewportBounds.min.x;
  const boundsHeight = viewportBounds.max.y - viewportBounds.min.y;
  const relX = position.x - viewportBounds.min.x;
  const relY = position.y - viewportBounds.min.y;

  // Check if near edges
  const nearLeft = relX < dockingZoneSize;
  const nearRight = relX > boundsWidth - dockingZoneSize;
  const nearTop = relY < dockingZoneSize;
  const nearBottom = relY > boundsHeight - dockingZoneSize;

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
  _originalSize: Size2D
): { position: Point2D; size: Size2D } | null {
  const boundsWidth = viewportBounds.max.x - viewportBounds.min.x;
  const boundsHeight = viewportBounds.max.y - viewportBounds.min.y;

  switch (zone) {
    case 'left':
      return {
        position: { x: viewportBounds.min.x, y: viewportBounds.min.y },
        size: { width: boundsWidth / 2, height: boundsHeight },
      };
    case 'right':
      return {
        position: { x: viewportBounds.min.x + boundsWidth / 2, y: viewportBounds.min.y },
        size: { width: boundsWidth / 2, height: boundsHeight },
      };
    case 'top':
      return {
        position: { x: viewportBounds.min.x, y: viewportBounds.min.y },
        size: { width: boundsWidth, height: boundsHeight / 2 },
      };
    case 'bottom':
      return {
        position: { x: viewportBounds.min.x, y: viewportBounds.min.y + boundsHeight / 2 },
        size: { width: boundsWidth, height: boundsHeight / 2 },
      };
    case 'center':
      // Maximize
      return {
        position: { x: viewportBounds.min.x, y: viewportBounds.min.y },
        size: { width: boundsWidth, height: boundsHeight },
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
      const currentWidth = ctx.currentBounds.max.x - ctx.currentBounds.min.x;
      const currentHeight = ctx.currentBounds.max.y - ctx.currentBounds.min.y;

      // Icon/Folder grid snapping
      if (ctx.entityType === 'folder' || ctx.entityType === 'sticker') {
        const gridX = Math.round(x / mergedConfig.iconGridWidth) * mergedConfig.iconGridWidth;
        const gridY = Math.round(y / mergedConfig.iconGridHeight) * mergedConfig.iconGridHeight;
        
        if (Math.abs(gridX - x) < mergedConfig.snapThreshold) {
          x = gridX;
          wasConstrained = true;
          activeSnaps.push({ value: x, axis: 'x', type: 'grid' });
        }
        if (Math.abs(gridY - y) < mergedConfig.snapThreshold) {
          y = gridY;
          wasConstrained = true;
          activeSnaps.push({ value: y, axis: 'y', type: 'grid' });
        }
        
        // Return early for icons - they don't edge snap to windows
        return { value: { x, y }, wasConstrained, activeSnaps };
      }

      // Edge snapping to other entities
      if (mergedConfig.edgeSnapEnabled && ctx.otherEntities) {
        for (const other of ctx.otherEntities) {
          const otherWidth = other.max.x - other.min.x;
          const otherHeight = other.max.y - other.min.y;
          // Snap to left edge of other
          if (Math.abs(x - other.min.x) < mergedConfig.snapThreshold) {
            x = other.min.x;
            wasConstrained = true;
            activeSnaps.push({ value: x, axis: 'x', type: 'edge' });
          }
          // Snap to right edge of other
          if (Math.abs(x - other.max.x) < mergedConfig.snapThreshold) {
            x = other.max.x;
            wasConstrained = true;
            activeSnaps.push({ value: x, axis: 'x', type: 'edge' });
          }
          // Snap our right edge to other's left edge
          if (Math.abs((x + currentWidth) - other.min.x) < mergedConfig.snapThreshold) {
            x = other.min.x - currentWidth;
            wasConstrained = true;
            activeSnaps.push({ value: other.min.x, axis: 'x', type: 'edge' });
          }
          // Snap to top edge of other
          if (Math.abs(y - other.min.y) < mergedConfig.snapThreshold) {
            y = other.min.y;
            wasConstrained = true;
            activeSnaps.push({ value: y, axis: 'y', type: 'edge' });
          }
          // Snap to bottom edge of other
          if (Math.abs(y - other.max.y) < mergedConfig.snapThreshold) {
            y = other.max.y;
            wasConstrained = true;
            activeSnaps.push({ value: y, axis: 'y', type: 'edge' });
          }
          // Snap our bottom edge to other's top edge
          if (Math.abs((y + currentHeight) - other.min.y) < mergedConfig.snapThreshold) {
            y = other.min.y - currentHeight;
            wasConstrained = true;
            activeSnaps.push({ value: other.min.y, axis: 'y', type: 'edge' });
          }
          // Center alignment
          const ourCenterX = x + currentWidth / 2;
          const otherCenterX = other.min.x + otherWidth / 2;
          if (Math.abs(ourCenterX - otherCenterX) < mergedConfig.snapThreshold) {
            x = otherCenterX - currentWidth / 2;
            wasConstrained = true;
            activeSnaps.push({ value: otherCenterX, axis: 'x', type: 'center' });
          }
          const ourCenterY = y + currentHeight / 2;
          const otherCenterY = other.min.y + otherHeight / 2;
          if (Math.abs(ourCenterY - otherCenterY) < mergedConfig.snapThreshold) {
            y = otherCenterY - currentHeight / 2;
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
          const otherWidth = other.max.x - other.min.x;
          const otherHeight = other.max.y - other.min.y;
          // Add edge snap points
          snapPoints.push(
            { value: other.min.x, axis: 'x', type: 'edge' },
            { value: other.max.x, axis: 'x', type: 'edge' },
            { value: other.min.x + otherWidth / 2, axis: 'x', type: 'center' },
            { value: other.min.y, axis: 'y', type: 'edge' },
            { value: other.max.y, axis: 'y', type: 'edge' },
            { value: other.min.y + otherHeight / 2, axis: 'y', type: 'center' }
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
    x: lastWindow.min.x + mergedConfig.cascadeOffset,
    y: lastWindow.min.y + mergedConfig.cascadeOffset,
  };
}

/**
 * Utility exports
 */
export { detectDockingZone, getDockedBounds };
