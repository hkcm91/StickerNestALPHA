/**
 * Grid Cell Store — sparse storage for painted grid cells
 *
 * @module canvas/core/grid
 * @layer L4A-1
 *
 * @remarks
 * Uses a Map with "col,row" keys for O(1) cell lookups.
 * Only stores non-empty (painted) cells for memory efficiency.
 */

import type { GridCell, GridConfig } from '@sn/types';

/**
 * Key format for cell storage: "col,row"
 */
export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

/**
 * Parse a cell key back to col/row
 */
export function parseKey(key: string): { col: number; row: number } {
  const [col, row] = key.split(',').map(Number);
  return { col, row };
}

/**
 * Bounds for querying cells within a region
 */
export interface CellBounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

/**
 * Grid Cell Store interface
 */
export interface GridCellStore {
  /** Get a cell by position, returns undefined if empty */
  get(col: number, row: number): GridCell | undefined;

  /** Set (paint) a cell at position */
  set(cell: GridCell): void;

  /** Delete (clear) a cell at position */
  delete(col: number, row: number): boolean;

  /** Get all cells within bounds (for viewport culling) */
  getCellsInBounds(bounds: CellBounds): GridCell[];

  /** Get all cells as an array (for serialization) */
  getAll(): GridCell[];

  /** Clear all cells */
  clear(): void;

  /** Get the number of painted cells */
  readonly size: number;

  /** Check if a cell exists (is painted) */
  has(col: number, row: number): boolean;

  /** Iterate over all cells */
  forEach(callback: (cell: GridCell) => void): void;
}

/**
 * Create a new grid cell store
 */
export function createGridCellStore(): GridCellStore {
  const cells = new Map<string, GridCell>();

  return {
    get(col: number, row: number): GridCell | undefined {
      return cells.get(cellKey(col, row));
    },

    set(cell: GridCell): void {
      cells.set(cellKey(cell.col, cell.row), cell);
    },

    delete(col: number, row: number): boolean {
      return cells.delete(cellKey(col, row));
    },

    getCellsInBounds(bounds: CellBounds): GridCell[] {
      const result: GridCell[] = [];
      for (const cell of cells.values()) {
        if (
          cell.col >= bounds.minCol &&
          cell.col <= bounds.maxCol &&
          cell.row >= bounds.minRow &&
          cell.row <= bounds.maxRow
        ) {
          result.push(cell);
        }
      }
      return result;
    },

    getAll(): GridCell[] {
      return Array.from(cells.values());
    },

    clear(): void {
      cells.clear();
    },

    get size(): number {
      return cells.size;
    },

    has(col: number, row: number): boolean {
      return cells.has(cellKey(col, row));
    },

    forEach(callback: (cell: GridCell) => void): void {
      cells.forEach(callback);
    },
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert canvas position to grid cell coordinates (orthogonal)
 */
function orthogonalPositionToCell(
  x: number,
  y: number,
  config: GridConfig
): { col: number; row: number } {
  const { cellSize, origin } = config;
  return {
    col: Math.floor((x - origin.x) / cellSize),
    row: Math.floor((y - origin.y) / cellSize),
  };
}

/**
 * Convert canvas position to grid cell coordinates (isometric)
 *
 * In isometric projection:
 * - Cells are diamond-shaped with configurable width:height ratio
 * - Screen X increases along the diagonal (col + row direction)
 * - Screen Y increases along the other diagonal (row - col direction)
 */
function isometricPositionToCell(
  x: number,
  y: number,
  config: GridConfig
): { col: number; row: number } {
  const { cellSize, origin, isometricRatio } = config;

  // Translate to origin
  const tx = x - origin.x;
  const ty = y - origin.y;

  // Isometric tile dimensions
  const tileWidth = cellSize;
  const tileHeight = cellSize / isometricRatio;
  const halfWidth = tileWidth / 2;
  const halfHeight = tileHeight / 2;

  // Inverse isometric transform
  // Screen coords to grid coords
  const col = Math.floor((tx / halfWidth + ty / halfHeight) / 2);
  const row = Math.floor((ty / halfHeight - tx / halfWidth) / 2);

  return { col, row };
}

/**
 * Convert canvas position to grid cell coordinates
 * Handles both orthogonal and isometric projections
 */
export function positionToCell(
  x: number,
  y: number,
  config: GridConfig
): { col: number; row: number } {
  if (config.projection === 'isometric') {
    return isometricPositionToCell(x, y, config);
  }
  return orthogonalPositionToCell(x, y, config);
}

/**
 * Convert grid cell to canvas position (orthogonal - top-left corner)
 */
function orthogonalCellToPosition(
  col: number,
  row: number,
  config: GridConfig
): { x: number; y: number } {
  const { cellSize, origin } = config;
  return {
    x: col * cellSize + origin.x,
    y: row * cellSize + origin.y,
  };
}

/**
 * Convert grid cell to canvas position (isometric - center of diamond)
 */
function isometricCellToPosition(
  col: number,
  row: number,
  config: GridConfig
): { x: number; y: number } {
  const { cellSize, origin, isometricRatio } = config;

  // Isometric tile dimensions
  const tileWidth = cellSize;
  const tileHeight = cellSize / isometricRatio;
  const halfWidth = tileWidth / 2;
  const halfHeight = tileHeight / 2;

  // Isometric transform: grid coords to screen coords
  // The center of cell (col, row) in screen space
  const x = (col - row) * halfWidth + origin.x;
  const y = (col + row) * halfHeight + origin.y;

  return { x, y };
}

/**
 * Convert grid cell to canvas position
 * For orthogonal: returns top-left corner
 * For isometric: returns center of diamond
 */
export function cellToPosition(
  col: number,
  row: number,
  config: GridConfig
): { x: number; y: number } {
  if (config.projection === 'isometric') {
    return isometricCellToPosition(col, row, config);
  }
  return orthogonalCellToPosition(col, row, config);
}

/**
 * Get the 4 corners of an isometric cell (diamond shape)
 * Returns points in order: top, right, bottom, left
 */
export function getIsometricCellCorners(
  col: number,
  row: number,
  config: GridConfig
): { top: { x: number; y: number }; right: { x: number; y: number }; bottom: { x: number; y: number }; left: { x: number; y: number } } {
  const center = isometricCellToPosition(col, row, config);
  const { cellSize, isometricRatio } = config;

  const halfWidth = cellSize / 2;
  const halfHeight = cellSize / isometricRatio / 2;

  return {
    top: { x: center.x, y: center.y - halfHeight },
    right: { x: center.x + halfWidth, y: center.y },
    bottom: { x: center.x, y: center.y + halfHeight },
    left: { x: center.x - halfWidth, y: center.y },
  };
}

/**
 * Get the bounding box of a cell in canvas coordinates
 */
export function getCellBounds(
  col: number,
  row: number,
  config: GridConfig
): { x: number; y: number; width: number; height: number } {
  if (config.projection === 'isometric') {
    const corners = getIsometricCellCorners(col, row, config);
    return {
      x: corners.left.x,
      y: corners.top.y,
      width: config.cellSize,
      height: config.cellSize / config.isometricRatio,
    };
  }

  const pos = orthogonalCellToPosition(col, row, config);
  return {
    x: pos.x,
    y: pos.y,
    width: config.cellSize,
    height: config.cellSize,
  };
}

/**
 * Get the center point of a cell in canvas coordinates
 */
export function cellCenter(
  col: number,
  row: number,
  config: GridConfig
): { x: number; y: number } {
  if (config.projection === 'isometric') {
    // For isometric, cellToPosition already returns the center
    return isometricCellToPosition(col, row, config);
  }

  const pos = orthogonalCellToPosition(col, row, config);
  return {
    x: pos.x + config.cellSize / 2,
    y: pos.y + config.cellSize / 2,
  };
}

/**
 * Calculate which cells are visible within a viewport bounds
 */
export function getVisibleCellBounds(
  visibleBounds: { min: { x: number; y: number }; max: { x: number; y: number } },
  config: GridConfig,
  buffer: number = 1
): CellBounds {
  // For isometric, we need a larger buffer due to diamond orientation
  const effectiveBuffer = config.projection === 'isometric' ? buffer + 1 : buffer;

  const minCell = positionToCell(visibleBounds.min.x, visibleBounds.min.y, config);
  const maxCell = positionToCell(visibleBounds.max.x, visibleBounds.max.y, config);

  // For isometric, check corners of viewport as well
  if (config.projection === 'isometric') {
    const topRight = positionToCell(visibleBounds.max.x, visibleBounds.min.y, config);
    const bottomLeft = positionToCell(visibleBounds.min.x, visibleBounds.max.y, config);

    return {
      minCol: Math.min(minCell.col, maxCell.col, topRight.col, bottomLeft.col) - effectiveBuffer,
      maxCol: Math.max(minCell.col, maxCell.col, topRight.col, bottomLeft.col) + effectiveBuffer,
      minRow: Math.min(minCell.row, maxCell.row, topRight.row, bottomLeft.row) - effectiveBuffer,
      maxRow: Math.max(minCell.row, maxCell.row, topRight.row, bottomLeft.row) + effectiveBuffer,
    };
  }

  return {
    minCol: minCell.col - effectiveBuffer,
    maxCol: maxCell.col + effectiveBuffer,
    minRow: minCell.row - effectiveBuffer,
    maxRow: maxCell.row + effectiveBuffer,
  };
}
