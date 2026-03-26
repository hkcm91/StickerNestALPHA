/**
 * Grid Renderer — HTML5 Canvas 2D rendering for the grid layer
 *
 * @module canvas/core/grid
 * @layer L4A-1
 *
 * @remarks
 * Renders the paintable grid layer using the 2D Canvas API.
 * Performs viewport culling for efficient rendering of large grids.
 */

import type { GridCell, GridConfig } from '@sn/types';

import type { ViewportState } from '../viewport';
import { canvasToScreen, getVisibleBounds } from '../viewport';

import {
  type GridCellStore,
  type CellBounds,
  getVisibleCellBounds,
  cellToPosition,
  getIsometricCellCorners,
  getTriangularCellCorners,
  getHexagonalCellCorners,
} from './grid-cell-store';

/**
 * Grid Renderer interface
 */
export interface GridRenderer {
  /** Set the canvas element to render to */
  setCanvas(canvas: HTMLCanvasElement): void;

  /** Update the viewport state */
  setViewport(viewport: ViewportState): void;

  /** Update the grid configuration */
  setConfig(config: GridConfig): void;

  /** Render the grid (called on each frame) */
  render(): void;

  /** Force a full redraw */
  invalidate(): void;

  /** Get the current canvas element */
  getCanvas(): HTMLCanvasElement | null;
}

/**
 * Create a grid renderer
 */
export function createGridRenderer(cellStore: GridCellStore): GridRenderer {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let viewport: ViewportState | null = null;
  let config: GridConfig | null = null;
  let needsRedraw = true;

  function ensureContext(): CanvasRenderingContext2D | null {
    if (!canvas) return null;
    if (!ctx) {
      ctx = canvas.getContext('2d');
    }
    return ctx;
  }

  function clearCanvas(): void {
    const context = ensureContext();
    if (!context || !canvas || !config) return;

    // Fill with default background
    context.fillStyle = config.defaultBackground;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * Render an orthogonal (square) cell
   */
  function renderOrthogonalCell(
    context: CanvasRenderingContext2D,
    cell: GridCell,
    _viewport: ViewportState,
    _config: GridConfig
  ): void {
    const canvasPos = cellToPosition(cell.col, cell.row, _config);
    const screenPos = canvasToScreen(canvasPos, _viewport);
    const screenSize = _config.cellSize * _viewport.zoom;

    context.fillRect(screenPos.x, screenPos.y, screenSize, screenSize);
  }

  /**
   * Render an isometric (diamond) cell
   */
  function renderIsometricCell(
    context: CanvasRenderingContext2D,
    cell: GridCell,
    _viewport: ViewportState,
    _config: GridConfig
  ): void {
    const corners = getIsometricCellCorners(cell.col, cell.row, _config);

    // Transform canvas coords to screen coords
    const top = canvasToScreen(corners.top, _viewport);
    const right = canvasToScreen(corners.right, _viewport);
    const bottom = canvasToScreen(corners.bottom, _viewport);
    const left = canvasToScreen(corners.left, _viewport);

    // Draw diamond path
    context.beginPath();
    context.moveTo(top.x, top.y);
    context.lineTo(right.x, right.y);
    context.lineTo(bottom.x, bottom.y);
    context.lineTo(left.x, left.y);
    context.closePath();
    context.fill();
  }

  /**
   * Render a triangular cell
   */
  function renderTriangularCell(
    context: CanvasRenderingContext2D,
    cell: GridCell,
    _viewport: ViewportState,
    _config: GridConfig
  ): void {
    const corners = getTriangularCellCorners(cell.col, cell.row, _config);
    const [a, b, c] = corners.map(p => canvasToScreen(p, _viewport));

    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.lineTo(c.x, c.y);
    context.closePath();
    context.fill();
  }

  /**
   * Render a hexagonal cell
   */
  function renderHexagonalCell(
    context: CanvasRenderingContext2D,
    cell: GridCell,
    _viewport: ViewportState,
    _config: GridConfig
  ): void {
    const corners = getHexagonalCellCorners(cell.col, cell.row, _config);
    const screenCorners = corners.map(p => canvasToScreen(p, _viewport));

    context.beginPath();
    context.moveTo(screenCorners[0].x, screenCorners[0].y);
    for (let i = 1; i < 6; i++) {
      context.lineTo(screenCorners[i].x, screenCorners[i].y);
    }
    context.closePath();
    context.fill();
  }

  function renderCells(visibleCellBounds: CellBounds): void {
    const context = ensureContext();
    if (!context || !viewport || !config) return;

    const cells = cellStore.getCellsInBounds(visibleCellBounds);
    const projection = config.projection;

    // Group cells by color for batched rendering
    const colorGroups = new Map<string, GridCell[]>();
    for (const cell of cells) {
      const color = cell.color ?? config.defaultBackground;
      let group = colorGroups.get(color);
      if (!group) {
        group = [];
        colorGroups.set(color, group);
      }
      group.push(cell);
    }

    // Render each color group
    for (const [color, groupCells] of colorGroups) {
      context.fillStyle = color;
      for (const cell of groupCells) {
        switch (projection) {
          case 'isometric':
            renderIsometricCell(context, cell, viewport, config);
            break;
          case 'triangular':
            renderTriangularCell(context, cell, viewport, config);
            break;
          case 'hexagonal':
            renderHexagonalCell(context, cell, viewport, config);
            break;
          default:
            renderOrthogonalCell(context, cell, viewport, config);
            break;
        }
      }
    }
  }

  /**
   * Render orthogonal grid lines (horizontal and vertical)
   */
  function renderOrthogonalGridLines(
    context: CanvasRenderingContext2D,
    visibleCellBounds: CellBounds,
    _viewport: ViewportState,
    _config: GridConfig,
    _canvas: HTMLCanvasElement
  ): void {
    context.beginPath();

    // Vertical lines
    for (let col = visibleCellBounds.minCol; col <= visibleCellBounds.maxCol + 1; col++) {
      const canvasPos = cellToPosition(col, 0, _config);
      const screenX = canvasToScreen({ x: canvasPos.x, y: 0 }, _viewport).x;

      // Skip if outside canvas
      if (screenX < 0 || screenX > _canvas.width) continue;

      context.moveTo(screenX, 0);
      context.lineTo(screenX, _canvas.height);
    }

    // Horizontal lines
    for (let row = visibleCellBounds.minRow; row <= visibleCellBounds.maxRow + 1; row++) {
      const canvasPos = cellToPosition(0, row, _config);
      const screenY = canvasToScreen({ x: 0, y: canvasPos.y }, _viewport).y;

      // Skip if outside canvas
      if (screenY < 0 || screenY > _canvas.height) continue;

      context.moveTo(0, screenY);
      context.lineTo(_canvas.width, screenY);
    }

    context.stroke();
  }

  /**
   * Render isometric grid lines (diagonal)
   */
  function renderIsometricGridLines(
    context: CanvasRenderingContext2D,
    visibleCellBounds: CellBounds,
    _viewport: ViewportState,
    _config: GridConfig,
    _canvas: HTMLCanvasElement
  ): void {
    context.beginPath();

    // In isometric, we draw lines along the two diagonal directions
    // Lines going from top-left to bottom-right (constant col)
    for (let col = visibleCellBounds.minCol; col <= visibleCellBounds.maxCol + 1; col++) {
      // Start at the top of the visible area
      const startCorners = getIsometricCellCorners(col, visibleCellBounds.minRow, _config);
      const endCorners = getIsometricCellCorners(col, visibleCellBounds.maxRow + 1, _config);

      const start = canvasToScreen(startCorners.top, _viewport);
      const end = canvasToScreen(endCorners.top, _viewport);

      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
    }

    // Lines going from top-right to bottom-left (constant row)
    for (let row = visibleCellBounds.minRow; row <= visibleCellBounds.maxRow + 1; row++) {
      const startCorners = getIsometricCellCorners(visibleCellBounds.minCol, row, _config);
      const endCorners = getIsometricCellCorners(visibleCellBounds.maxCol + 1, row, _config);

      const start = canvasToScreen(startCorners.top, _viewport);
      const end = canvasToScreen(endCorners.top, _viewport);

      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
    }

    context.stroke();
  }

  /**
   * Render triangular grid lines as 3 sets of parallel lines:
   * horizontal, +60deg diagonal, and -60deg diagonal.
   *
   * The vertex lattice sits at (n * s/2, m * h) where s = cellSize,
   * h = s * sqrt(3) / 2, and (n + m) is even.
   *
   * Line families:
   *   1. Horizontal: y = m * h, one per integer m
   *   2. Down-right (+60deg): slope +sqrt(3), indexed by n - m = const
   *   3. Down-left (-60deg): slope -sqrt(3), indexed by n + m = const
   */
  function renderTriangularGridLines(
    context: CanvasRenderingContext2D,
    visibleCellBounds: CellBounds,
    _viewport: ViewportState,
    _config: GridConfig,
    _canvas: HTMLCanvasElement
  ): void {
    const { cellSize, origin } = _config;
    const h = cellSize * Math.sqrt(3) / 2;
    const halfS = cellSize / 2;

    // Determine row/k ranges with padding
    const minRow = visibleCellBounds.minRow - 1;
    const maxRow = visibleCellBounds.maxRow + 2;
    const minK = Math.floor(visibleCellBounds.minCol / 2) - 1;
    const maxK = Math.ceil(visibleCellBounds.maxCol / 2) + 2;

    // Convert k range to n range (n = vertex index along x, at x = n * s/2)
    const minN = minK * 2 - 2;
    const maxN = maxK * 2 + 2;
    // m range (vertex index along y, at y = m * h)
    const minM = minRow - 1;
    const maxM = maxRow + 2;

    context.beginPath();

    // --- Line Set 1: Horizontal lines at y = m * h/2 (twice the density) ---
    for (let m = minM * 2; m <= maxM * 2 + 1; m++) {
      const canvasY = m * h / 2 + origin.y;
      const left = canvasToScreen({ x: minN * halfS + origin.x, y: canvasY }, _viewport);
      const right = canvasToScreen({ x: maxN * halfS + origin.x, y: canvasY }, _viewport);
      context.moveTo(left.x, left.y);
      context.lineTo(right.x, right.y);
    }

    // --- Line Set 2: Down-right diagonals (+60deg, slope +sqrt(3)) ---
    // Lines connect vertices where (n - m) = constant.
    // Each step along the line: n+1, m+1 (so x += s/2, y += h).
    for (let d = minN - maxM; d <= maxN - minM; d++) {
      const n0 = d + minM;
      const n1 = d + maxM;
      const start = canvasToScreen(
        { x: n0 * halfS + origin.x, y: minM * h + origin.y },
        _viewport
      );
      const end = canvasToScreen(
        { x: n1 * halfS + origin.x, y: maxM * h + origin.y },
        _viewport
      );
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
    }

    // --- Line Set 3: Down-left diagonals (-60deg, slope -sqrt(3)) ---
    // Lines connect vertices where (n + m) = constant.
    // Each step along the line: n-1, m+1 (so x -= s/2, y += h).
    for (let s = minN + minM; s <= maxN + maxM; s++) {
      const n0 = s - minM;
      const n1 = s - maxM;
      const start = canvasToScreen(
        { x: n0 * halfS + origin.x, y: minM * h + origin.y },
        _viewport
      );
      const end = canvasToScreen(
        { x: n1 * halfS + origin.x, y: maxM * h + origin.y },
        _viewport
      );
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
    }

    context.stroke();
  }

  /**
   * Render hexagonal grid lines
   * Draws outlines of each hexagon in the visible range.
   */
  function renderHexagonalGridLines(
    context: CanvasRenderingContext2D,
    visibleCellBounds: CellBounds,
    _viewport: ViewportState,
    _config: GridConfig,
    _canvas: HTMLCanvasElement
  ): void {
    context.beginPath();

    for (let row = visibleCellBounds.minRow; row <= visibleCellBounds.maxRow; row++) {
      for (let col = visibleCellBounds.minCol; col <= visibleCellBounds.maxCol; col++) {
        const corners = getHexagonalCellCorners(col, row, _config);
        const screenCorners = corners.map(p => canvasToScreen(p, _viewport));

        context.moveTo(screenCorners[0].x, screenCorners[0].y);
        for (let i = 1; i < 6; i++) {
          context.lineTo(screenCorners[i].x, screenCorners[i].y);
        }
        context.closePath();
      }
    }

    context.stroke();
  }

  /**
   * Collect all grid intersection points for the visible bounds.
   * Returns screen-space coordinates.
   */
  function collectIntersectionPoints(
    visibleCellBounds: CellBounds,
    _viewport: ViewportState,
    _config: GridConfig
  ): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];

    switch (_config.projection) {
      case 'isometric':
        for (let col = visibleCellBounds.minCol; col <= visibleCellBounds.maxCol + 1; col++) {
          for (let row = visibleCellBounds.minRow; row <= visibleCellBounds.maxRow + 1; row++) {
            const corners = getIsometricCellCorners(col, row, _config);
            points.push(canvasToScreen(corners.top, _viewport));
          }
        }
        break;
      case 'triangular':
        for (let col = visibleCellBounds.minCol; col <= visibleCellBounds.maxCol + 1; col++) {
          for (let row = visibleCellBounds.minRow; row <= visibleCellBounds.maxRow + 1; row++) {
            const corners = getTriangularCellCorners(col, row, _config);
            for (const corner of corners) {
              points.push(canvasToScreen(corner, _viewport));
            }
          }
        }
        break;
      case 'hexagonal':
        for (let col = visibleCellBounds.minCol; col <= visibleCellBounds.maxCol; col++) {
          for (let row = visibleCellBounds.minRow; row <= visibleCellBounds.maxRow; row++) {
            const corners = getHexagonalCellCorners(col, row, _config);
            for (const corner of corners) {
              points.push(canvasToScreen(corner, _viewport));
            }
          }
        }
        break;
      default: // orthogonal
        for (let col = visibleCellBounds.minCol; col <= visibleCellBounds.maxCol + 1; col++) {
          for (let row = visibleCellBounds.minRow; row <= visibleCellBounds.maxRow + 1; row++) {
            const canvasPos = cellToPosition(col, row, _config);
            points.push(canvasToScreen(canvasPos, _viewport));
          }
        }
        break;
    }

    return points;
  }

  /**
   * Render dots at grid intersection points
   */
  function renderDots(
    context: CanvasRenderingContext2D,
    visibleCellBounds: CellBounds,
    _viewport: ViewportState,
    _config: GridConfig
  ): void {
    const points = collectIntersectionPoints(visibleCellBounds, _viewport, _config);
    const radius = _config.dotSize ?? _config.gridLineWidth;

    context.beginPath();
    for (const p of points) {
      context.moveTo(p.x + radius, p.y);
      context.arc(p.x, p.y, radius, 0, Math.PI * 2);
    }
    context.fill();
  }

  /**
   * Render cross marks at grid intersection points
   */
  function renderCrosses(
    context: CanvasRenderingContext2D,
    visibleCellBounds: CellBounds,
    _viewport: ViewportState,
    _config: GridConfig
  ): void {
    const points = collectIntersectionPoints(visibleCellBounds, _viewport, _config);
    const arm = Math.max(3, _config.gridLineWidth * 3);

    context.beginPath();
    for (const p of points) {
      context.moveTo(p.x - arm, p.y);
      context.lineTo(p.x + arm, p.y);
      context.moveTo(p.x, p.y - arm);
      context.lineTo(p.x, p.y + arm);
    }
    context.stroke();
  }

  function renderGridLines(visibleCellBounds: CellBounds): void {
    const context = ensureContext();
    if (!context || !viewport || !config || !canvas) return;

    // Skip grid lines if cells are too small on screen
    const screenCellSize = config.cellSize * viewport.zoom;
    if (screenCellSize < config.minCellScreenSize) return;

    const style = config.gridLineStyle ?? 'line';

    // Apply opacity
    const prevAlpha = context.globalAlpha;
    context.globalAlpha = config.gridLineOpacity ?? 0.1;

    if (style === 'dot') {
      context.fillStyle = config.gridLineColor;
      renderDots(context, visibleCellBounds, viewport, config);
    } else if (style === 'cross') {
      context.strokeStyle = config.gridLineColor;
      context.lineWidth = config.gridLineWidth;
      renderCrosses(context, visibleCellBounds, viewport, config);
    } else {
      // 'line' — existing behavior
      context.strokeStyle = config.gridLineColor;
      context.lineWidth = config.gridLineWidth;

      switch (config.projection) {
        case 'isometric':
          renderIsometricGridLines(context, visibleCellBounds, viewport, config, canvas);
          break;
        case 'triangular':
          renderTriangularGridLines(context, visibleCellBounds, viewport, config, canvas);
          break;
        case 'hexagonal':
          renderHexagonalGridLines(context, visibleCellBounds, viewport, config, canvas);
          break;
        default:
          renderOrthogonalGridLines(context, visibleCellBounds, viewport, config, canvas);
          break;
      }
    }

    context.globalAlpha = prevAlpha;
  }

  return {
    setCanvas(c: HTMLCanvasElement): void {
      canvas = c;
      ctx = null; // Reset context
      needsRedraw = true;
    },

    setViewport(vp: ViewportState): void {
      viewport = vp;
      needsRedraw = true;
    },

    setConfig(cfg: GridConfig): void {
      config = cfg;
      needsRedraw = true;
    },

    render(): void {
      if (!needsRedraw) return;
      if (!canvas || !viewport || !config) return;

      const context = ensureContext();
      if (!context) return;

      // Clear canvas
      clearCanvas();

      if (!config.enabled) {
        needsRedraw = false;
        return;
      }

      // Calculate visible bounds
      const visibleBounds = getVisibleBounds(viewport);
      const visibleCellBounds = getVisibleCellBounds(visibleBounds, config);

      // Render painted cells
      renderCells(visibleCellBounds);

      // Render grid lines (on top of cells)
      if (config.showGridLines) {
        renderGridLines(visibleCellBounds);
      }

      needsRedraw = false;
    },

    invalidate(): void {
      needsRedraw = true;
    },

    getCanvas(): HTMLCanvasElement | null {
      return canvas;
    },
  };
}

// =============================================================================
// Utility Functions for Grid Rendering
// =============================================================================

/**
 * Calculate the number of cells visible in the viewport
 */
export function countVisibleCells(viewport: ViewportState, config: GridConfig): number {
  const visibleBounds = getVisibleBounds(viewport);
  const cellBounds = getVisibleCellBounds(visibleBounds, config);

  const cols = cellBounds.maxCol - cellBounds.minCol + 1;
  const rows = cellBounds.maxRow - cellBounds.minRow + 1;

  return cols * rows;
}

/**
 * Check if grid lines should be visible at the current zoom level
 */
export function areGridLinesVisible(viewport: ViewportState, config: GridConfig): boolean {
  const screenCellSize = config.cellSize * viewport.zoom;
  return screenCellSize >= config.minCellScreenSize;
}
