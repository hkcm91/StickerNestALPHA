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

// =============================================================================
// Triangular Grid Coordinate Functions
// =============================================================================

const SQRT3 = Math.sqrt(3);

/**
 * Convert canvas position to triangular grid cell coordinates.
 *
 * Uses nearest-centroid algorithm — the Voronoi cells of equilateral
 * triangle centroids exactly match the triangles themselves, so picking
 * the nearest centroid always gives the correct containing triangle.
 *
 * Addressing: even col = UP triangle (▲), odd col = DOWN triangle (▽).
 * col = 2*k for UP at position k, col = 2*k+1 for DOWN at position k.
 */
function triangularPositionToCell(
  x: number,
  y: number,
  config: GridConfig
): { col: number; row: number } {
  const { cellSize, origin } = config;
  const h = cellSize * SQRT3 / 2;

  const tx = x - origin.x;
  const ty = y - origin.y;

  const baseRow = Math.floor(ty / h);
  const baseK = Math.floor(tx / cellSize);

  let bestCol = 0;
  let bestRow = baseRow;
  let bestDist = Infinity;

  for (let rr = baseRow - 1; rr <= baseRow + 1; rr++) {
    for (let dk = -1; dk <= 1; dk++) {
      const k = baseK + dk;

      // UP triangle at col 2*k: center at ((k+0.5)*s, rr*h + 2h/3)
      const upCx = (k + 0.5) * cellSize;
      const upCy = rr * h + 2 * h / 3;
      const upDist = (tx - upCx) * (tx - upCx) + (ty - upCy) * (ty - upCy);
      if (upDist < bestDist) {
        bestDist = upDist;
        bestCol = 2 * k;
        bestRow = rr;
      }

      // DOWN triangle at col 2*k+1: center at ((k+1)*s, rr*h + h/3)
      const downCx = (k + 1) * cellSize;
      const downCy = rr * h + h / 3;
      const downDist = (tx - downCx) * (tx - downCx) + (ty - downCy) * (ty - downCy);
      if (downDist < bestDist) {
        bestDist = downDist;
        bestCol = 2 * k + 1;
        bestRow = rr;
      }
    }
  }

  return { col: bestCol, row: bestRow };
}

/**
 * Convert triangular grid cell to canvas position (center of triangle)
 */
function triangularCellToPosition(
  col: number,
  row: number,
  config: GridConfig
): { x: number; y: number } {
  const { cellSize, origin } = config;
  const h = cellSize * SQRT3 / 2;
  const isUp = (col & 1) === 0;
  const k = Math.floor(col / 2);

  if (isUp) {
    return {
      x: (k + 0.5) * cellSize + origin.x,
      y: row * h + 2 * h / 3 + origin.y,
    };
  } else {
    return {
      x: (k + 1) * cellSize + origin.x,
      y: row * h + h / 3 + origin.y,
    };
  }
}

/**
 * Get the 3 corners of a triangular cell.
 * Returns vertices in order suitable for canvas path drawing.
 * UP (▲): [bottom-left, bottom-right, top]
 * DOWN (▽): [top-left, top-right, bottom]
 */
export function getTriangularCellCorners(
  col: number,
  row: number,
  config: GridConfig
): [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }] {
  const { cellSize, origin } = config;
  const h = cellSize * SQRT3 / 2;
  const isUp = (col & 1) === 0;
  const k = Math.floor(col / 2);

  const baseX = origin.x;
  const baseY = row * h + origin.y;

  if (isUp) {
    return [
      { x: k * cellSize + baseX, y: baseY + h },             // bottom-left
      { x: (k + 1) * cellSize + baseX, y: baseY + h },       // bottom-right
      { x: (k + 0.5) * cellSize + baseX, y: baseY },         // top (apex)
    ];
  } else {
    return [
      { x: (k + 0.5) * cellSize + baseX, y: baseY },         // top-left
      { x: (k + 1.5) * cellSize + baseX, y: baseY },         // top-right
      { x: (k + 1) * cellSize + baseX, y: baseY + h },       // bottom (apex)
    ];
  }
}

// =============================================================================
// Hexagonal Grid Coordinate Functions (Pointy-Top, Axial Coordinates)
// =============================================================================

/**
 * Convert canvas position to hexagonal grid cell coordinates.
 * Uses cube-rounding algorithm for pixel-to-axial conversion.
 * col = q (axial), row = r (axial).
 */
function hexagonalPositionToCell(
  x: number,
  y: number,
  config: GridConfig
): { col: number; row: number } {
  const { cellSize, origin } = config;

  const tx = x - origin.x;
  const ty = y - origin.y;

  // Pixel to fractional axial (inverse of pointy-top forward transform)
  const qFrac = (SQRT3 / 3 * tx - ty / 3) / cellSize;
  const rFrac = (2 / 3 * ty) / cellSize;

  // Cube rounding
  const sFrac = -qFrac - rFrac;

  let rq = Math.round(qFrac);
  let rr = Math.round(rFrac);
  const rs = Math.round(sFrac);

  const qDiff = Math.abs(rq - qFrac);
  const rDiff = Math.abs(rr - rFrac);
  const sDiff = Math.abs(rs - sFrac);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  // else: rs = -rq - rr (we don't need s)

  return { col: rq, row: rr };
}

/**
 * Convert hexagonal grid cell to canvas position (center of hexagon).
 * Pointy-top layout: x = size * sqrt(3) * (q + r/2), y = size * 3/2 * r
 */
function hexagonalCellToPosition(
  col: number,
  row: number,
  config: GridConfig
): { x: number; y: number } {
  const { cellSize, origin } = config;

  return {
    x: cellSize * SQRT3 * (col + row / 2) + origin.x,
    y: cellSize * 1.5 * row + origin.y,
  };
}

/**
 * Get the 6 corners of a pointy-top hexagonal cell.
 * Returns vertices starting from the upper-right, going clockwise.
 */
export function getHexagonalCellCorners(
  col: number,
  row: number,
  config: GridConfig
): [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] {
  const center = hexagonalCellToPosition(col, row, config);
  const size = config.cellSize;

  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30; // pointy-top: -30, 30, 90, 150, 210, 270
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: center.x + size * Math.cos(angleRad),
      y: center.y + size * Math.sin(angleRad),
    });
  }

  return corners as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
}

/**
 * Convert canvas position to grid cell coordinates.
 * Handles all projection modes.
 */
export function positionToCell(
  x: number,
  y: number,
  config: GridConfig
): { col: number; row: number } {
  switch (config.projection) {
    case 'isometric':
      return isometricPositionToCell(x, y, config);
    case 'triangular':
      return triangularPositionToCell(x, y, config);
    case 'hexagonal':
      return hexagonalPositionToCell(x, y, config);
    default:
      return orthogonalPositionToCell(x, y, config);
  }
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
 * For isometric/triangular/hexagonal: returns center
 */
export function cellToPosition(
  col: number,
  row: number,
  config: GridConfig
): { x: number; y: number } {
  switch (config.projection) {
    case 'isometric':
      return isometricCellToPosition(col, row, config);
    case 'triangular':
      return triangularCellToPosition(col, row, config);
    case 'hexagonal':
      return hexagonalCellToPosition(col, row, config);
    default:
      return orthogonalCellToPosition(col, row, config);
  }
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
  switch (config.projection) {
    case 'isometric': {
      const corners = getIsometricCellCorners(col, row, config);
      return {
        x: corners.left.x,
        y: corners.top.y,
        width: config.cellSize,
        height: config.cellSize / config.isometricRatio,
      };
    }
    case 'triangular': {
      const triCorners = getTriangularCellCorners(col, row, config);
      const xs = triCorners.map(c => c.x);
      const ys = triCorners.map(c => c.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(...xs) - minX,
        height: Math.max(...ys) - minY,
      };
    }
    case 'hexagonal': {
      const hexCorners = getHexagonalCellCorners(col, row, config);
      const hxs = hexCorners.map(c => c.x);
      const hys = hexCorners.map(c => c.y);
      const hMinX = Math.min(...hxs);
      const hMinY = Math.min(...hys);
      return {
        x: hMinX,
        y: hMinY,
        width: Math.max(...hxs) - hMinX,
        height: Math.max(...hys) - hMinY,
      };
    }
    default: {
      const pos = orthogonalCellToPosition(col, row, config);
      return {
        x: pos.x,
        y: pos.y,
        width: config.cellSize,
        height: config.cellSize,
      };
    }
  }
}

/**
 * Get the center point of a cell in canvas coordinates
 */
export function cellCenter(
  col: number,
  row: number,
  config: GridConfig
): { x: number; y: number } {
  switch (config.projection) {
    case 'isometric':
      return isometricCellToPosition(col, row, config);
    case 'triangular':
      return triangularCellToPosition(col, row, config);
    case 'hexagonal':
      return hexagonalCellToPosition(col, row, config);
    default: {
      const pos = orthogonalCellToPosition(col, row, config);
      return {
        x: pos.x + config.cellSize / 2,
        y: pos.y + config.cellSize / 2,
      };
    }
  }
}

/**
 * Calculate which cells are visible within a viewport bounds
 */
export function getVisibleCellBounds(
  visibleBounds: { min: { x: number; y: number }; max: { x: number; y: number } },
  config: GridConfig,
  buffer: number = 1
): CellBounds {
  // Non-orthogonal projections need larger buffers due to non-axis-aligned cells
  const needsCornerCheck =
    config.projection === 'isometric' ||
    config.projection === 'triangular' ||
    config.projection === 'hexagonal';
  const effectiveBuffer = needsCornerCheck ? buffer + 2 : buffer;

  const minCell = positionToCell(visibleBounds.min.x, visibleBounds.min.y, config);
  const maxCell = positionToCell(visibleBounds.max.x, visibleBounds.max.y, config);

  if (needsCornerCheck) {
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
