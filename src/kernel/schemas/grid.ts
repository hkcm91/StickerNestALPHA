/**
 * Grid Layer Schemas
 *
 * @module @sn/types/grid
 * @layer L0
 *
 * @remarks
 * Defines the data structures for the paintable grid layer system.
 * Grid cells are the foundation for spatial widget placement and map creation.
 */

import { z } from 'zod';

// =============================================================================
// Grid Cell Types
// =============================================================================

/**
 * Fill type for a grid cell
 */
export const GridCellFillTypeSchema = z.enum(['solid', 'pattern', 'texture']);
export type GridCellFillType = z.infer<typeof GridCellFillTypeSchema>;

/**
 * A single grid cell
 *
 * @remarks
 * Grid cells are stored sparsely — only painted cells exist in storage.
 * Empty cells are rendered with the default background color.
 */
export const GridCellSchema = z.object({
  /** Column index (0-based, can be negative for infinite canvas) */
  col: z.number().int(),
  /** Row index (0-based, can be negative for infinite canvas) */
  row: z.number().int(),
  /** Type of fill applied to this cell */
  fillType: GridCellFillTypeSchema,
  /** Fill color (CSS color string) for solid/pattern fills */
  color: z.string().optional(),
  /** URL of texture image for texture fills */
  textureUrl: z.string().url().optional(),
  /** Optional metadata for custom cell types */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type GridCell = z.infer<typeof GridCellSchema>;

// =============================================================================
// Grid Configuration
// =============================================================================

/**
 * Snap mode for widget placement on the grid
 */
export const GridSnapModeSchema = z.enum(['none', 'center', 'corner', 'edge']);
export type GridSnapMode = z.infer<typeof GridSnapModeSchema>;

/**
 * Grid projection mode
 */
export const GridProjectionModeSchema = z.enum(['orthogonal', 'isometric', 'triangular', 'hexagonal']);
export type GridProjectionMode = z.infer<typeof GridProjectionModeSchema>;

/**
 * Grid configuration options
 */
export const GridConfigSchema = z.object({
  /** Whether the grid system is enabled */
  enabled: z.boolean().default(true),
  /** Size of each grid cell in canvas units (pixels) */
  cellSize: z.number().positive().default(64),
  /** Whether to render grid lines */
  showGridLines: z.boolean().default(true),
  /** Color of grid lines (CSS color string) */
  gridLineColor: z.string().default('rgba(255, 255, 255, 0.1)'),
  /** Width of grid lines in pixels */
  gridLineWidth: z.number().positive().default(1),
  /** Snap mode for widget placement */
  snapMode: GridSnapModeSchema.default('none'),
  /** Grid origin offset (for aligning grid to specific coordinates) */
  origin: z
    .object({
      x: z.number().default(0),
      y: z.number().default(0),
    })
    .default({ x: 0, y: 0 }),
  /** Default background color for empty cells */
  defaultBackground: z.string().default('#0d1117'),
  /** Minimum screen size (px) for grid lines to be visible */
  minCellScreenSize: z.number().positive().default(4),
  /** Grid projection mode (orthogonal or isometric) */
  projection: GridProjectionModeSchema.default('orthogonal'),
  /**
   * Isometric tile width-to-height ratio (default 2:1 for standard isometric)
   * Only applies when projection is 'isometric'
   */
  isometricRatio: z.number().positive().default(2),
});

export type GridConfig = z.infer<typeof GridConfigSchema>;

// =============================================================================
// Grid State (Canvas-level)
// =============================================================================

/**
 * Complete grid state for a canvas
 *
 * @remarks
 * This is the persisted state for the grid layer.
 * Cells are stored as a flat array but accessed via col,row keys at runtime.
 */
export const GridStateSchema = z.object({
  /** Canvas ID this grid belongs to */
  canvasId: z.string().uuid(),
  /** Grid configuration */
  config: GridConfigSchema,
  /** Array of painted cells (sparse — only non-empty cells) */
  cells: z.array(GridCellSchema),
  /** Last update timestamp */
  updatedAt: z.string().datetime(),
});

export type GridState = z.infer<typeof GridStateSchema>;

// =============================================================================
// Grid Event Payloads
// =============================================================================

/**
 * Payload for GRID_CELL_PAINTED event
 */
export const GridCellPaintedPayloadSchema = z.object({
  canvasId: z.string().uuid(),
  cell: GridCellSchema,
});

export type GridCellPaintedPayload = z.infer<typeof GridCellPaintedPayloadSchema>;

/**
 * Payload for GRID_CELL_CLEARED event
 */
export const GridCellClearedPayloadSchema = z.object({
  canvasId: z.string().uuid(),
  col: z.number().int(),
  row: z.number().int(),
});

export type GridCellClearedPayload = z.infer<typeof GridCellClearedPayloadSchema>;

/**
 * Payload for GRID_CELLS_BATCH_PAINTED event (for stroke operations)
 */
export const GridCellsBatchPaintedPayloadSchema = z.object({
  canvasId: z.string().uuid(),
  cells: z.array(GridCellSchema),
});

export type GridCellsBatchPaintedPayload = z.infer<typeof GridCellsBatchPaintedPayloadSchema>;

/**
 * Payload for GRID_CONFIG_CHANGED event
 */
export const GridConfigChangedPayloadSchema = z.object({
  canvasId: z.string().uuid(),
  config: GridConfigSchema.partial(),
});

export type GridConfigChangedPayload = z.infer<typeof GridConfigChangedPayloadSchema>;

/**
 * Payload for GRID_CLEARED event (clear all cells)
 */
export const GridClearedPayloadSchema = z.object({
  canvasId: z.string().uuid(),
});

export type GridClearedPayload = z.infer<typeof GridClearedPayloadSchema>;

// =============================================================================
// JSON Schema Exports (lazy to avoid Zod v4 toJSONSchema issues with nested defaults)
// =============================================================================

/** Get JSON schema for GridCell (lazy-evaluated) */
export function getGridCellJSONSchema(): object {
  return GridCellSchema.toJSONSchema();
}

/** Get JSON schema for GridConfig (lazy-evaluated) */
export function getGridConfigJSONSchema(): object {
  return GridConfigSchema.toJSONSchema();
}

/** Get JSON schema for GridState (lazy-evaluated) */
export function getGridStateJSONSchema(): object {
  return GridStateSchema.toJSONSchema();
}
