/**
 * Grid Paint Tool — paint cells on the grid layer
 *
 * @module canvas/tools/grid-paint
 * @layer L4A-2
 *
 * @remarks
 * Implements cell painting interactions:
 * - Click/tap: Paint single cell
 * - Drag: Paint continuous stroke
 * - Right-click/Alt+click: Erase cell
 *
 * Uses PointerEvents for unified mouse/touch support.
 */

import type { GridLayer } from '../../core/grid';
import type { Tool, CanvasPointerEvent, CanvasKeyEvent } from '../registry';

/**
 * Grid paint tool options
 */
export interface GridPaintToolOptions {
  /** Grid layer instance to paint on */
  gridLayer: GridLayer;
  /** Current paint color */
  color: string;
  /** Whether to erase instead of paint */
  eraseMode: boolean;
}

/**
 * Grid paint tool state
 */
interface GridPaintToolState {
  isPainting: boolean;
  lastCell: { col: number; row: number } | null;
  paintedCellsInStroke: Set<string>;
}

/**
 * Create a cell key for the painted set
 */
function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

/**
 * Create a grid paint tool
 */
export function createGridPaintTool(options: GridPaintToolOptions): Tool {
  const { gridLayer } = options;
  const color = options.color;
  let eraseMode = options.eraseMode;

  const state: GridPaintToolState = {
    isPainting: false,
    lastCell: null,
    paintedCellsInStroke: new Set(),
  };

  /**
   * Paint or erase a single cell
   */
  function paintCell(col: number, row: number): void {
    const key = cellKey(col, row);

    // Skip if already painted in this stroke
    if (state.paintedCellsInStroke.has(key)) {
      return;
    }

    if (eraseMode) {
      gridLayer.clearCell(col, row);
    } else {
      gridLayer.paintCell(col, row, color);
    }

    state.paintedCellsInStroke.add(key);
    state.lastCell = { col, row };
  }

  /**
   * Paint a line of cells between two points (for continuous strokes)
   */
  function paintLine(
    fromCol: number,
    fromRow: number,
    toCol: number,
    toRow: number
  ): void {
    // Bresenham's line algorithm for cell interpolation
    const dx = Math.abs(toCol - fromCol);
    const dy = Math.abs(toRow - fromRow);
    const sx = fromCol < toCol ? 1 : -1;
    const sy = fromRow < toRow ? 1 : -1;
    let err = dx - dy;

    let col = fromCol;
    let row = fromRow;

    while (col !== toCol || row !== toRow) {
      paintCell(col, row);

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        col += sx;
      }
      if (e2 < dx) {
        err += dx;
        row += sy;
      }
    }

    paintCell(toCol, toRow);
  }

  return {
    name: 'grid-paint',

    onActivate(): void {
      // Reset state on activation
      state.isPainting = false;
      state.lastCell = null;
      state.paintedCellsInStroke.clear();
    },

    onDeactivate(): void {
      // Ensure painting ends
      state.isPainting = false;
      state.lastCell = null;
      state.paintedCellsInStroke.clear();
    },

    onPointerDown(event: CanvasPointerEvent): void {
      if (!gridLayer.isEnabled) return;

      // Check for erase mode via modifier key
      const shouldErase = eraseMode || event.altKey;
      const prevEraseMode = eraseMode;
      eraseMode = shouldErase;

      state.isPainting = true;
      state.paintedCellsInStroke.clear();

      // Get cell at pointer position
      const { col, row } = gridLayer.positionToCell(
        event.canvasPosition.x,
        event.canvasPosition.y
      );

      paintCell(col, row);

      // Restore erase mode if it was temporarily changed by modifier
      if (!options.eraseMode) {
        eraseMode = prevEraseMode;
      }
    },

    onPointerMove(event: CanvasPointerEvent): void {
      if (!state.isPainting || !gridLayer.isEnabled) return;

      // Check for erase mode via modifier key during drag
      const shouldErase = eraseMode || event.altKey;
      const prevEraseMode = eraseMode;
      eraseMode = shouldErase;

      // Get cell at pointer position
      const { col, row } = gridLayer.positionToCell(
        event.canvasPosition.x,
        event.canvasPosition.y
      );

      // If we have a previous cell, draw a line to ensure no gaps
      if (state.lastCell && (state.lastCell.col !== col || state.lastCell.row !== row)) {
        paintLine(state.lastCell.col, state.lastCell.row, col, row);
      } else {
        paintCell(col, row);
      }

      // Restore erase mode if it was temporarily changed by modifier
      if (!options.eraseMode) {
        eraseMode = prevEraseMode;
      }
    },

    onPointerUp(_event: CanvasPointerEvent): void {
      state.isPainting = false;
      state.lastCell = null;
      state.paintedCellsInStroke.clear();
    },

    onKeyDown(event: CanvasKeyEvent): void {
      // Toggle erase mode with 'E' key
      if (event.key.toLowerCase() === 'e') {
        eraseMode = !eraseMode;
      }
    },

    cancel(): void {
      state.isPainting = false;
      state.lastCell = null;
      state.paintedCellsInStroke.clear();
    },
  };
}

/**
 * Grid paint tool controller for runtime updates
 */
export interface GridPaintToolController {
  /** Set the paint color */
  setColor(color: string): void;
  /** Get the current paint color */
  getColor(): string;
  /** Set erase mode */
  setEraseMode(erase: boolean): void;
  /** Check if in erase mode */
  isEraseMode(): boolean;
  /** Toggle erase mode */
  toggleEraseMode(): void;
}

/**
 * Create a grid paint tool with external controller
 */
export function createGridPaintToolWithController(
  gridLayer: GridLayer,
  initialColor: string = '#4CAF50'
): { tool: Tool; controller: GridPaintToolController } {
  let color = initialColor;
  let eraseMode = false;

  const controller: GridPaintToolController = {
    setColor(c: string): void {
      color = c;
    },
    getColor(): string {
      return color;
    },
    setEraseMode(erase: boolean): void {
      eraseMode = erase;
    },
    isEraseMode(): boolean {
      return eraseMode;
    },
    toggleEraseMode(): void {
      eraseMode = !eraseMode;
    },
  };

  // Create the tool with a getter for current options
  const tool = createGridPaintToolWithOptions(gridLayer, () => ({
    color,
    eraseMode,
  }));

  return { tool, controller };
}

/**
 * Create a grid paint tool with dynamic options
 */
function createGridPaintToolWithOptions(
  gridLayer: GridLayer,
  getOptions: () => { color: string; eraseMode: boolean }
): Tool {
  const state: GridPaintToolState = {
    isPainting: false,
    lastCell: null,
    paintedCellsInStroke: new Set(),
  };

  function paintCell(col: number, row: number): void {
    const key = cellKey(col, row);
    if (state.paintedCellsInStroke.has(key)) return;

    const { color, eraseMode } = getOptions();
    if (eraseMode) {
      gridLayer.clearCell(col, row);
    } else {
      gridLayer.paintCell(col, row, color);
    }

    state.paintedCellsInStroke.add(key);
    state.lastCell = { col, row };
  }

  function paintLine(
    fromCol: number,
    fromRow: number,
    toCol: number,
    toRow: number
  ): void {
    const dx = Math.abs(toCol - fromCol);
    const dy = Math.abs(toRow - fromRow);
    const sx = fromCol < toCol ? 1 : -1;
    const sy = fromRow < toRow ? 1 : -1;
    let err = dx - dy;

    let col = fromCol;
    let row = fromRow;

    while (col !== toCol || row !== toRow) {
      paintCell(col, row);
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        col += sx;
      }
      if (e2 < dx) {
        err += dx;
        row += sy;
      }
    }

    paintCell(toCol, toRow);
  }

  return {
    name: 'grid-paint',

    onActivate(): void {
      state.isPainting = false;
      state.lastCell = null;
      state.paintedCellsInStroke.clear();
    },

    onDeactivate(): void {
      state.isPainting = false;
      state.lastCell = null;
      state.paintedCellsInStroke.clear();
    },

    onPointerDown(event: CanvasPointerEvent): void {
      if (!gridLayer.isEnabled) return;

      state.isPainting = true;
      state.paintedCellsInStroke.clear();

      const { col, row } = gridLayer.positionToCell(
        event.canvasPosition.x,
        event.canvasPosition.y
      );
      paintCell(col, row);
    },

    onPointerMove(event: CanvasPointerEvent): void {
      if (!state.isPainting || !gridLayer.isEnabled) return;

      const { col, row } = gridLayer.positionToCell(
        event.canvasPosition.x,
        event.canvasPosition.y
      );

      if (state.lastCell && (state.lastCell.col !== col || state.lastCell.row !== row)) {
        paintLine(state.lastCell.col, state.lastCell.row, col, row);
      } else {
        paintCell(col, row);
      }
    },

    onPointerUp(_event: CanvasPointerEvent): void {
      state.isPainting = false;
      state.lastCell = null;
      state.paintedCellsInStroke.clear();
    },

    onKeyDown(_event: CanvasKeyEvent): void {
      // No-op for dynamic version - controller handles mode
    },

    cancel(): void {
      state.isPainting = false;
      state.lastCell = null;
      state.paintedCellsInStroke.clear();
    },
  };
}
