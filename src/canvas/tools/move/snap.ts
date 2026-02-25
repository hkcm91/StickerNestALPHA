/**
 * Snap utilities — grid snapping and alignment guides
 *
 * @module canvas/tools/move
 * @layer L4A-2
 */

import type { Point2D, BoundingBox2D, GridConfig } from '@sn/types';
import { positionToCell, cellCenter } from '../../core/grid';

export function snapToGrid(position: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

// =============================================================================
// Grid Cell Snapping
// =============================================================================

/**
 * Snap a position to a grid cell based on snap mode
 *
 * @param position - The position to snap
 * @param gridConfig - Grid configuration
 * @param widgetSize - Optional widget size for edge/center snapping
 * @returns Snapped position
 */
export function snapToGridCell(
  position: Point2D,
  gridConfig: GridConfig,
  widgetSize?: { width: number; height: number }
): Point2D {
  const { cellSize, origin, snapMode, projection } = gridConfig;

  if (snapMode === 'none') {
    return position;
  }

  // For triangular and hexagonal grids, snap to the nearest cell center
  // since these grids don't have axis-aligned corners or edges
  if (projection === 'triangular' || projection === 'hexagonal') {
    const cell = positionToCell(position.x, position.y, gridConfig);
    const center = cellCenter(cell.col, cell.row, gridConfig);
    if (widgetSize) {
      return {
        x: center.x - widgetSize.width / 2,
        y: center.y - widgetSize.height / 2,
      };
    }
    return center;
  }

  // Orthogonal (and isometric fallback) snapping
  const col = Math.floor((position.x - origin.x) / cellSize);
  const row = Math.floor((position.y - origin.y) / cellSize);

  // Cell top-left corner
  const cellX = col * cellSize + origin.x;
  const cellY = row * cellSize + origin.y;

  switch (snapMode) {
    case 'corner':
      // Snap widget top-left to cell top-left
      return { x: cellX, y: cellY };

    case 'center':
      // Snap widget center to cell center
      if (widgetSize) {
        return {
          x: cellX + cellSize / 2 - widgetSize.width / 2,
          y: cellY + cellSize / 2 - widgetSize.height / 2,
        };
      }
      // Without widget size, snap the point itself to cell center
      return {
        x: cellX + cellSize / 2,
        y: cellY + cellSize / 2,
      };

    case 'edge':
      // Snap to nearest cell edge
      if (widgetSize) {
        return snapToNearestEdge(position, widgetSize, cellX, cellY, cellSize);
      }
      // Without widget size, use corner snap
      return { x: cellX, y: cellY };

    default:
      return position;
  }
}

/**
 * Snap widget to nearest cell edge
 */
function snapToNearestEdge(
  position: Point2D,
  widgetSize: { width: number; height: number },
  cellX: number,
  cellY: number,
  cellSize: number
): Point2D {
  // Calculate distances to each edge
  const distToLeft = Math.abs(position.x - cellX);
  const distToRight = Math.abs((position.x + widgetSize.width) - (cellX + cellSize));
  const distToTop = Math.abs(position.y - cellY);
  const distToBottom = Math.abs((position.y + widgetSize.height) - (cellY + cellSize));

  // Snap X: choose nearest horizontal edge
  let x: number;
  if (distToLeft <= distToRight) {
    x = cellX; // Snap left edge to cell left
  } else {
    x = cellX + cellSize - widgetSize.width; // Snap right edge to cell right
  }

  // Snap Y: choose nearest vertical edge
  let y: number;
  if (distToTop <= distToBottom) {
    y = cellY; // Snap top edge to cell top
  } else {
    y = cellY + cellSize - widgetSize.height; // Snap bottom edge to cell bottom
  }

  return { x, y };
}

/**
 * Get the grid cell for a canvas position
 */
export function positionToGridCell(
  position: Point2D,
  gridConfig: GridConfig
): { col: number; row: number } {
  const { cellSize, origin } = gridConfig;
  return {
    col: Math.floor((position.x - origin.x) / cellSize),
    row: Math.floor((position.y - origin.y) / cellSize),
  };
}

/**
 * Get the canvas position (top-left) for a grid cell
 */
export function gridCellToPosition(
  col: number,
  row: number,
  gridConfig: GridConfig
): Point2D {
  const { cellSize, origin } = gridConfig;
  return {
    x: col * cellSize + origin.x,
    y: row * cellSize + origin.y,
  };
}

/**
 * Get the bounding box of a grid cell in canvas coordinates
 */
export function getGridCellBounds(
  col: number,
  row: number,
  gridConfig: GridConfig
): { min: Point2D; max: Point2D } {
  const pos = gridCellToPosition(col, row, gridConfig);
  return {
    min: pos,
    max: {
      x: pos.x + gridConfig.cellSize,
      y: pos.y + gridConfig.cellSize,
    },
  };
}

/**
 * Get the center point of a grid cell
 */
export function getGridCellCenter(
  col: number,
  row: number,
  gridConfig: GridConfig
): Point2D {
  const pos = gridCellToPosition(col, row, gridConfig);
  return {
    x: pos.x + gridConfig.cellSize / 2,
    y: pos.y + gridConfig.cellSize / 2,
  };
}

/**
 * Check if a widget would fit within a single grid cell
 */
export function widgetFitsInCell(
  widgetSize: { width: number; height: number },
  gridConfig: GridConfig
): boolean {
  return widgetSize.width <= gridConfig.cellSize && widgetSize.height <= gridConfig.cellSize;
}

/**
 * Calculate how many cells a widget spans
 */
export function widgetCellSpan(
  widgetSize: { width: number; height: number },
  gridConfig: GridConfig
): { cols: number; rows: number } {
  return {
    cols: Math.ceil(widgetSize.width / gridConfig.cellSize),
    rows: Math.ceil(widgetSize.height / gridConfig.cellSize),
  };
}

export interface AlignmentGuide {
  axis: 'x' | 'y';
  position: number;
}

export function findAlignmentGuides(
  entityBounds: BoundingBox2D,
  allBounds: BoundingBox2D[],
  threshold: number = 5,
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];
  const entityCenterX = (entityBounds.min.x + entityBounds.max.x) / 2;
  const entityCenterY = (entityBounds.min.y + entityBounds.max.y) / 2;

  for (const other of allBounds) {
    const otherCenterX = (other.min.x + other.max.x) / 2;
    const otherCenterY = (other.min.y + other.max.y) / 2;

    // Left edge alignment
    if (Math.abs(entityBounds.min.x - other.min.x) < threshold) {
      guides.push({ axis: 'x', position: other.min.x });
    }
    // Right edge alignment
    if (Math.abs(entityBounds.max.x - other.max.x) < threshold) {
      guides.push({ axis: 'x', position: other.max.x });
    }
    // Center X alignment
    if (Math.abs(entityCenterX - otherCenterX) < threshold) {
      guides.push({ axis: 'x', position: otherCenterX });
    }
    // Top edge alignment
    if (Math.abs(entityBounds.min.y - other.min.y) < threshold) {
      guides.push({ axis: 'y', position: other.min.y });
    }
    // Bottom edge alignment
    if (Math.abs(entityBounds.max.y - other.max.y) < threshold) {
      guides.push({ axis: 'y', position: other.max.y });
    }
    // Center Y alignment
    if (Math.abs(entityCenterY - otherCenterY) < threshold) {
      guides.push({ axis: 'y', position: otherCenterY });
    }
  }

  return guides;
}
