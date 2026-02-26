/**
 * Bento Layout Mode
 *
 * Grid-based layout where entities snap to grid slots.
 * Inspired by bento box layouts - entities occupy discrete cells.
 *
 * @module canvas/core/layout
 * @layer L4A-1
 */

import type { Point2D, Size2D } from '@sn/types';

import type { LayoutMode, ConstraintContext, ConstraintResult, SnapPoint } from './layout-mode';

/**
 * Default bento grid configuration
 */
export const DEFAULT_BENTO_CONFIG = {
  cellWidth: 100,
  cellHeight: 100,
  gap: 8,
  padding: 16,
  minCellSpan: 1,
  maxCellSpan: 10,
};

/**
 * Bento grid configuration
 */
export interface BentoConfig {
  cellWidth: number;
  cellHeight: number;
  gap: number;
  padding: number;
  minCellSpan: number;
  maxCellSpan: number;
}

/**
 * Get the grid cell for a canvas position
 */
function positionToCell(
  position: Point2D,
  config: BentoConfig
): { col: number; row: number } {
  const effectiveCellWidth = config.cellWidth + config.gap;
  const effectiveCellHeight = config.cellHeight + config.gap;

  const col = Math.floor((position.x - config.padding) / effectiveCellWidth);
  const row = Math.floor((position.y - config.padding) / effectiveCellHeight);

  return { col: Math.max(0, col), row: Math.max(0, row) };
}

/**
 * Get the canvas position for a grid cell
 */
function cellToPosition(
  col: number,
  row: number,
  config: BentoConfig
): Point2D {
  const effectiveCellWidth = config.cellWidth + config.gap;
  const effectiveCellHeight = config.cellHeight + config.gap;

  return {
    x: config.padding + col * effectiveCellWidth,
    y: config.padding + row * effectiveCellHeight,
  };
}

/**
 * Get the size for a given cell span
 */
function cellSpanToSize(
  colSpan: number,
  rowSpan: number,
  config: BentoConfig
): Size2D {
  return {
    width: colSpan * config.cellWidth + (colSpan - 1) * config.gap,
    height: rowSpan * config.cellHeight + (rowSpan - 1) * config.gap,
  };
}

/**
 * Get the cell span for a given size
 */
function sizeToCellSpan(
  size: Size2D,
  config: BentoConfig
): { colSpan: number; rowSpan: number } {
  const effectiveCellWidth = config.cellWidth + config.gap;
  const effectiveCellHeight = config.cellHeight + config.gap;

  const colSpan = Math.max(
    config.minCellSpan,
    Math.min(
      config.maxCellSpan,
      Math.round((size.width + config.gap) / effectiveCellWidth)
    )
  );

  const rowSpan = Math.max(
    config.minCellSpan,
    Math.min(
      config.maxCellSpan,
      Math.round((size.height + config.gap) / effectiveCellHeight)
    )
  );

  return { colSpan, rowSpan };
}

/**
 * Create a bento layout mode
 */
export function createBentoLayout(config: Partial<BentoConfig> = {}): LayoutMode {
  const mergedConfig: BentoConfig = { ...DEFAULT_BENTO_CONFIG, ...config };

  return {
    name: 'bento',
    displayName: 'Bento Grid',
    description: 'Grid-based layout with discrete cell slots',

    applyMoveConstraints(
      newPosition: Point2D,
      _ctx: ConstraintContext
    ): ConstraintResult<Point2D> {
      // Snap to nearest cell
      const cell = positionToCell(newPosition, mergedConfig);
      const snappedPosition = cellToPosition(cell.col, cell.row, mergedConfig);

      const wasConstrained =
        snappedPosition.x !== newPosition.x ||
        snappedPosition.y !== newPosition.y;

      return {
        value: snappedPosition,
        wasConstrained,
        activeSnaps: wasConstrained
          ? [
              { value: snappedPosition.x, axis: 'x', type: 'grid' },
              { value: snappedPosition.y, axis: 'y', type: 'grid' },
            ]
          : [],
      };
    },

    applyResizeConstraints(
      newSize: Size2D,
      _ctx: ConstraintContext
    ): ConstraintResult<Size2D> {
      // Snap to cell span
      const span = sizeToCellSpan(newSize, mergedConfig);
      const snappedSize = cellSpanToSize(span.colSpan, span.rowSpan, mergedConfig);

      const wasConstrained =
        snappedSize.width !== newSize.width ||
        snappedSize.height !== newSize.height;

      return {
        value: snappedSize,
        wasConstrained,
      };
    },

    getSnapPoints(ctx: ConstraintContext): SnapPoint[] {
      const snapPoints: SnapPoint[] = [];
      const effectiveCellWidth = mergedConfig.cellWidth + mergedConfig.gap;
      const effectiveCellHeight = mergedConfig.cellHeight + mergedConfig.gap;

      // Calculate visible grid range
      const viewportLeft = -ctx.viewport.pan.x / ctx.viewport.zoom;
      const viewportTop = -ctx.viewport.pan.y / ctx.viewport.zoom;
      const viewportRight = viewportLeft + 1920 / ctx.viewport.zoom;
      const viewportBottom = viewportTop + 1080 / ctx.viewport.zoom;

      const startCol = Math.max(0, Math.floor((viewportLeft - mergedConfig.padding) / effectiveCellWidth));
      const endCol = Math.ceil((viewportRight - mergedConfig.padding) / effectiveCellWidth);
      const startRow = Math.max(0, Math.floor((viewportTop - mergedConfig.padding) / effectiveCellHeight));
      const endRow = Math.ceil((viewportBottom - mergedConfig.padding) / effectiveCellHeight);

      // Add grid cell positions
      for (let col = startCol; col <= endCol; col++) {
        const x = mergedConfig.padding + col * effectiveCellWidth;
        snapPoints.push({ value: x, axis: 'x', type: 'grid' });
      }
      for (let row = startRow; row <= endRow; row++) {
        const y = mergedConfig.padding + row * effectiveCellHeight;
        snapPoints.push({ value: y, axis: 'y', type: 'grid' });
      }

      return snapPoints;
    },

    isValidPosition(position: Point2D, ctx: ConstraintContext): boolean {
      // Position is valid if it aligns to a cell
      const cell = positionToCell(position, mergedConfig);
      const snappedPosition = cellToPosition(cell.col, cell.row, mergedConfig);

      const tolerance = 1; // 1px tolerance
      const isAligned = (
        Math.abs(position.x - snappedPosition.x) <= tolerance &&
        Math.abs(position.y - snappedPosition.y) <= tolerance
      );

      if (!isAligned) return false;

      // Check for overlaps if other entities exist
      if (ctx.otherEntities && ctx.otherEntities.length > 0) {
        const width = ctx.currentBounds.max.x - ctx.currentBounds.min.x;
        const height = ctx.currentBounds.max.y - ctx.currentBounds.min.y;
        
        for (const other of ctx.otherEntities) {
          const overlaps = !(
            position.x + width - tolerance <= other.min.x ||
            position.x + tolerance >= other.max.x ||
            position.y + height - tolerance <= other.min.y ||
            position.y + tolerance >= other.max.y
          );
          if (overlaps) return false;
        }
      }

      return true;
    },

    getNearestValidPosition(position: Point2D, ctx: ConstraintContext): Point2D {
      const startCell = positionToCell(position, mergedConfig);
      
      if (!ctx.otherEntities || ctx.otherEntities.length === 0) {
        return cellToPosition(startCell.col, startCell.row, mergedConfig);
      }

      const width = ctx.currentBounds.max.x - ctx.currentBounds.min.x;
      const height = ctx.currentBounds.max.y - ctx.currentBounds.min.y;
      const tolerance = 1;
      
      // Spiral search for nearest empty cell
      let radius = 0;
      const maxRadius = 20; // Limit search space
      
      while (radius <= maxRadius) {
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            // Only check perimeter of current radius to ensure spiral outward
            if (Math.abs(dx) !== radius && Math.abs(dy) !== radius && radius !== 0) continue;
            
            const col = Math.max(0, startCell.col + dx);
            const row = Math.max(0, startCell.row + dy);
            const testPos = cellToPosition(col, row, mergedConfig);
            
            let overlaps = false;
            for (const other of ctx.otherEntities) {
              if (!(
                testPos.x + width - tolerance <= other.min.x ||
                testPos.x + tolerance >= other.max.x ||
                testPos.y + height - tolerance <= other.min.y ||
                testPos.y + tolerance >= other.max.y
              )) {
                overlaps = true;
                break;
              }
            }
            
            if (!overlaps) {
              return testPos;
            }
          }
        }
        radius++;
      }
      
      return cellToPosition(startCell.col, startCell.row, mergedConfig);
    },
  };
}

/**
 * Default bento layout instance
 */
export const bentoLayout = createBentoLayout();

/**
 * Utility exports for external use
 */
export {
  positionToCell as bentoPositionToCell,
  cellToPosition as bentoCellToPosition,
  cellSpanToSize as bentoCellSpanToSize,
  sizeToCellSpan as bentoSizeToCellSpan,
};
