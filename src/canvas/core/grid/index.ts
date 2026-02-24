/**
 * Grid Layer — barrel export
 *
 * @module canvas/core/grid
 * @layer L4A-1
 */

// Cell Store
export {
  createGridCellStore,
  cellKey,
  parseKey,
  positionToCell,
  cellToPosition,
  getCellBounds,
  cellCenter,
  getVisibleCellBounds,
  getIsometricCellCorners,
} from './grid-cell-store';
export type { GridCellStore, CellBounds } from './grid-cell-store';

// Renderer
export {
  createGridRenderer,
  countVisibleCells,
  areGridLinesVisible,
} from './grid-renderer';
export type { GridRenderer } from './grid-renderer';

// Grid Layer
export {
  createGridLayer,
  connectToRenderLoop,
  DEFAULT_GRID_CONFIG,
} from './grid-layer';
export type { GridLayer } from './grid-layer';
