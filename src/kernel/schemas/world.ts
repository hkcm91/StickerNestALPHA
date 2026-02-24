/**
 * World Instance Schemas
 *
 * @module @sn/types/world
 *
 * @remarks
 * A World is an isolated instance of a canvas/room with its own:
 * - Canvas state (metadata, sharing settings)
 * - Widget instances (scoped to this world)
 * - History stack (undo/redo)
 * - Presence map (who's here)
 * - Scoped event bus (events routed only to this world)
 *
 * This enables multi-canvas scenarios where each room operates
 * independently without state leakage.
 */

import { z } from 'zod';

// =============================================================================
// World Mode
// =============================================================================

/**
 * World operating mode
 *
 * - `dashboard`: Event-driven, no tick loop (default, low overhead)
 * - `game`: Tick-based with optional physics/animation systems
 */
export const WorldModeSchema = z.enum(['dashboard', 'game']);

export type WorldMode = z.infer<typeof WorldModeSchema>;

// =============================================================================
// World Status
// =============================================================================

/**
 * World lifecycle status
 */
export const WorldStatusSchema = z.enum([
  'initializing', // World is being created
  'ready',        // World is ready for use
  'running',      // World is actively being used (has focus)
  'suspended',    // World is in background (tab switch, etc.)
  'destroying',   // World is being torn down
  'destroyed',    // World has been destroyed
]);

export type WorldStatus = z.infer<typeof WorldStatusSchema>;

// =============================================================================
// World Options
// =============================================================================

/**
 * Options for creating a world instance
 */
export const WorldOptionsSchema = z.object({
  /** Operating mode */
  mode: WorldModeSchema.default('dashboard'),

  /** Tick rate in Hz (only for game mode) */
  tickRate: z.number().int().min(1).max(144).default(60),

  /** Maximum history entries to retain */
  maxHistorySize: z.number().int().min(10).max(10000).default(100),

  /** Whether to enable presence tracking */
  enablePresence: z.boolean().default(true),

  /** Whether to preload widget instances */
  preloadWidgets: z.boolean().default(true),
});

export type WorldOptions = z.infer<typeof WorldOptionsSchema>;

// =============================================================================
// World State Snapshots (for serialization/debugging)
// =============================================================================

/**
 * Snapshot of presence state
 */
export const PresenceSnapshotSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  color: z.string(),
  cursorPosition: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  joinedAt: z.string().datetime(),
});

export type PresenceSnapshot = z.infer<typeof PresenceSnapshotSchema>;

/**
 * Snapshot of a widget instance
 */
export const WidgetInstanceSnapshotSchema = z.object({
  instanceId: z.string().uuid(),
  widgetId: z.string(),
  state: z.record(z.string(), z.unknown()),
  config: z.record(z.string(), z.unknown()),
});

export type WidgetInstanceSnapshot = z.infer<typeof WidgetInstanceSnapshotSchema>;

/**
 * Snapshot of history state
 */
export const HistorySnapshotSchema = z.object({
  undoCount: z.number().int().nonnegative(),
  redoCount: z.number().int().nonnegative(),
  canUndo: z.boolean(),
  canRedo: z.boolean(),
});

export type HistorySnapshot = z.infer<typeof HistorySnapshotSchema>;

/**
 * Full world state snapshot (for debugging/serialization)
 */
export const WorldSnapshotSchema = z.object({
  id: z.string().uuid(),
  canvasId: z.string().uuid(),
  status: WorldStatusSchema,
  mode: WorldModeSchema,
  createdAt: z.string().datetime(),
  presence: z.array(PresenceSnapshotSchema),
  widgetInstances: z.array(WidgetInstanceSnapshotSchema),
  history: HistorySnapshotSchema,
});

export type WorldSnapshot = z.infer<typeof WorldSnapshotSchema>;

// =============================================================================
// World Events (bus event types for world lifecycle)
// =============================================================================

/**
 * World-specific event types
 */
export const WorldEvents = {
  /** World has been created and is initializing */
  CREATED: 'world.created',
  /** World is ready for use */
  READY: 'world.ready',
  /** World has gained focus (is now active) */
  FOCUSED: 'world.focused',
  /** World has lost focus (moved to background) */
  BLURRED: 'world.blurred',
  /** World is being suspended (minimize, tab switch) */
  SUSPENDED: 'world.suspended',
  /** World is being resumed from suspension */
  RESUMED: 'world.resumed',
  /** World is being destroyed */
  DESTROYING: 'world.destroying',
  /** World has been destroyed */
  DESTROYED: 'world.destroyed',
  /** World encountered an error */
  ERROR: 'world.error',
} as const;

// =============================================================================
// JSON Schema Exports
// =============================================================================

export const WorldModeJSONSchema = WorldModeSchema.toJSONSchema();
export const WorldStatusJSONSchema = WorldStatusSchema.toJSONSchema();
export const WorldOptionsJSONSchema = WorldOptionsSchema.toJSONSchema();
export const WorldSnapshotJSONSchema = WorldSnapshotSchema.toJSONSchema();
