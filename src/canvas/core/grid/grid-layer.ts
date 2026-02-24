/**
 * Grid Layer — integrated grid system for canvas
 *
 * @module canvas/core/grid
 * @layer L4A-1
 *
 * @remarks
 * Orchestrates the grid cell store, renderer, and event bus integration.
 * Provides a high-level API for grid operations.
 */

import {
  type GridConfig,
  type GridCell,
  type GridCellPaintedPayload,
  type GridCellClearedPayload,
  type GridCellsBatchPaintedPayload,
  type GridConfigChangedPayload,
  type GridClearedPayload,
  GridEvents,
  GridConfigSchema,
} from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { DirtyTracker , RenderLoop } from '../renderer';
import type { ViewportState } from '../viewport';

import {
  createGridCellStore,
  type GridCellStore,
  positionToCell,
  cellToPosition,
  getCellBounds,
  cellCenter,
} from './grid-cell-store';
import { createGridRenderer, type GridRenderer } from './grid-renderer';

/**
 * Grid Layer interface
 */
export interface GridLayer {
  /** Initialize the grid layer with a canvas element */
  init(canvas: HTMLCanvasElement): void;

  /** Dispose of the grid layer */
  dispose(): void;

  /** Update the viewport (call on pan/zoom) */
  setViewport(viewport: ViewportState): void;

  /** Update grid configuration */
  setConfig(config: Partial<GridConfig>): void;

  /** Get current grid configuration */
  getConfig(): GridConfig;

  /** Paint a cell at a canvas position */
  paintAtPosition(x: number, y: number, color: string): GridCell;

  /** Paint a cell by col/row */
  paintCell(col: number, row: number, color: string): GridCell;

  /** Paint multiple cells at once */
  paintCells(cells: Array<{ col: number; row: number; color: string }>): GridCell[];

  /** Clear a cell at a canvas position */
  clearAtPosition(x: number, y: number): boolean;

  /** Clear a cell by col/row */
  clearCell(col: number, row: number): boolean;

  /** Clear all cells */
  clearAllCells(): void;

  /** Get the cell at a canvas position */
  getCellAtPosition(x: number, y: number): GridCell | undefined;

  /** Get a cell by col/row */
  getCell(col: number, row: number): GridCell | undefined;

  /** Convert a canvas position to cell coordinates */
  positionToCell(x: number, y: number): { col: number; row: number };

  /** Convert cell coordinates to canvas position */
  cellToPosition(col: number, row: number): { x: number; y: number };

  /** Get cell bounds in canvas coordinates */
  getCellBounds(col: number, row: number): { x: number; y: number; width: number; height: number };

  /** Get cell center in canvas coordinates */
  getCellCenter(col: number, row: number): { x: number; y: number };

  /** Toggle grid visibility */
  toggle(enabled?: boolean): void;

  /** Toggle grid lines visibility */
  toggleGridLines(show?: boolean): void;

  /** Get the cell store for direct access */
  getCellStore(): GridCellStore;

  /** Force a redraw */
  invalidate(): void;

  /** Check if grid is enabled */
  readonly isEnabled: boolean;

  /** Get total cell count */
  readonly cellCount: number;
}

/**
 * Default grid configuration
 */
export const DEFAULT_GRID_CONFIG: GridConfig = GridConfigSchema.parse({});

/**
 * Create a grid layer instance
 */
export function createGridLayer(
  dirtyTracker?: DirtyTracker,
  canvasId?: string
): GridLayer {
  const cellStore = createGridCellStore();
  const renderer = createGridRenderer(cellStore);
  let config: GridConfig = { ...DEFAULT_GRID_CONFIG };
  let currentViewport: ViewportState | null = null;
  let unsubscribeRenderLoop: (() => void) | null = null;

  function emitCellPainted(cell: GridCell): void {
    if (!canvasId) return;
    const payload: GridCellPaintedPayload = { canvasId, cell };
    bus.emit(GridEvents.CELL_PAINTED, payload);
  }

  function emitCellCleared(col: number, row: number): void {
    if (!canvasId) return;
    const payload: GridCellClearedPayload = { canvasId, col, row };
    bus.emit(GridEvents.CELL_CLEARED, payload);
  }

  function emitCellsBatchPainted(cells: GridCell[]): void {
    if (!canvasId) return;
    const payload: GridCellsBatchPaintedPayload = { canvasId, cells };
    bus.emit(GridEvents.CELLS_BATCH_PAINTED, payload);
  }

  function emitConfigChanged(partialConfig: Partial<GridConfig>): void {
    if (!canvasId) return;
    const payload: GridConfigChangedPayload = { canvasId, config: partialConfig };
    bus.emit(GridEvents.CONFIG_CHANGED, payload);
  }

  function emitCleared(): void {
    if (!canvasId) return;
    const payload: GridClearedPayload = { canvasId };
    bus.emit(GridEvents.CLEARED, payload);
  }

  function markDirty(): void {
    if (dirtyTracker && currentViewport) {
      // Mark the entire visible region as dirty
      const bounds = {
        min: { x: -Infinity, y: -Infinity },
        max: { x: Infinity, y: Infinity },
      };
      dirtyTracker.markDirty(bounds);
    }
    renderer.invalidate();
  }

  return {
    init(canvas: HTMLCanvasElement): void {
      renderer.setCanvas(canvas);
      renderer.setConfig(config);
    },

    dispose(): void {
      if (unsubscribeRenderLoop) {
        unsubscribeRenderLoop();
        unsubscribeRenderLoop = null;
      }
      cellStore.clear();
    },

    setViewport(viewport: ViewportState): void {
      currentViewport = viewport;
      renderer.setViewport(viewport);
    },

    setConfig(partialConfig: Partial<GridConfig>): void {
      config = { ...config, ...partialConfig };
      renderer.setConfig(config);
      emitConfigChanged(partialConfig);
      markDirty();
    },

    getConfig(): GridConfig {
      return { ...config };
    },

    paintAtPosition(x: number, y: number, color: string): GridCell {
      const { col, row } = positionToCell(x, y, config);
      return this.paintCell(col, row, color);
    },

    paintCell(col: number, row: number, color: string): GridCell {
      const cell: GridCell = {
        col,
        row,
        fillType: 'solid',
        color,
      };
      cellStore.set(cell);
      emitCellPainted(cell);
      markDirty();
      return cell;
    },

    paintCells(cells: Array<{ col: number; row: number; color: string }>): GridCell[] {
      const paintedCells: GridCell[] = [];
      for (const { col, row, color } of cells) {
        const cell: GridCell = {
          col,
          row,
          fillType: 'solid',
          color,
        };
        cellStore.set(cell);
        paintedCells.push(cell);
      }
      emitCellsBatchPainted(paintedCells);
      markDirty();
      return paintedCells;
    },

    clearAtPosition(x: number, y: number): boolean {
      const { col, row } = positionToCell(x, y, config);
      return this.clearCell(col, row);
    },

    clearCell(col: number, row: number): boolean {
      const deleted = cellStore.delete(col, row);
      if (deleted) {
        emitCellCleared(col, row);
        markDirty();
      }
      return deleted;
    },

    clearAllCells(): void {
      cellStore.clear();
      emitCleared();
      markDirty();
    },

    getCellAtPosition(x: number, y: number): GridCell | undefined {
      const { col, row } = positionToCell(x, y, config);
      return cellStore.get(col, row);
    },

    getCell(col: number, row: number): GridCell | undefined {
      return cellStore.get(col, row);
    },

    positionToCell(x: number, y: number): { col: number; row: number } {
      return positionToCell(x, y, config);
    },

    cellToPosition(col: number, row: number): { x: number; y: number } {
      return cellToPosition(col, row, config);
    },

    getCellBounds(col: number, row: number): { x: number; y: number; width: number; height: number } {
      return getCellBounds(col, row, config);
    },

    getCellCenter(col: number, row: number): { x: number; y: number } {
      return cellCenter(col, row, config);
    },

    toggle(enabled?: boolean): void {
      const newEnabled = enabled ?? !config.enabled;
      this.setConfig({ enabled: newEnabled });
      bus.emit(GridEvents.TOGGLED, { canvasId, enabled: newEnabled });
    },

    toggleGridLines(show?: boolean): void {
      const newShow = show ?? !config.showGridLines;
      this.setConfig({ showGridLines: newShow });
    },

    getCellStore(): GridCellStore {
      return cellStore;
    },

    invalidate(): void {
      renderer.invalidate();
    },

    get isEnabled(): boolean {
      return config.enabled;
    },

    get cellCount(): number {
      return cellStore.size;
    },
  };
}

/**
 * Connect a grid layer to a render loop
 *
 * @remarks
 * Returns an unsubscribe function to disconnect.
 */
export function connectToRenderLoop(
  gridLayer: GridLayer,
  renderLoop: RenderLoop,
  getCanvas: () => HTMLCanvasElement | null
): () => void {
  return renderLoop.onFrame(() => {
    const canvas = getCanvas();
    if (canvas) {
      // Re-initialize if canvas changed
      const renderer = gridLayer as unknown as { renderer?: GridRenderer };
      if (renderer.renderer?.getCanvas() !== canvas) {
        gridLayer.init(canvas);
      }
    }
    // The renderer will handle its own dirty state
    gridLayer.invalidate();
  });
}
