/**
 * Docker schemas for shell-level dockable container system
 * @module @sn/types/docker
 *
 * @remarks
 * Dockers are shell-level UI panels that host widgets. They are user-level
 * preferences that persist across sessions and canvases. This is distinct
 * from DockerEntity (canvas entity) which groups widgets on the canvas.
 *
 * Key features:
 * - Floating or docked (left/right) positioning
 * - Tabbed interface for organizing widgets
 * - Shared widget instances (same instance can appear in Docker and on canvas)
 * - User-level persistence (follows user across canvases)
 */

import { z } from 'zod';

import { Point2DSchema, Size2DSchema } from './spatial';

// =============================================================================
// Docker Widget Slot Schema
// =============================================================================

/**
 * Widget slot within a docker tab.
 * Each slot references a widget instance and optionally specifies a fixed height.
 */
export const DockerWidgetSlotSchema = z.object({
  /** ID of the widget instance to display */
  widgetInstanceId: z.string().uuid(),
  /** Fixed height in pixels. If null/undefined, widget auto-sizes based on content. */
  height: z.number().positive().optional(),
});

export type DockerWidgetSlot = z.infer<typeof DockerWidgetSlotSchema>;

// =============================================================================
// Docker Tab Schema
// =============================================================================

/**
 * Tab within a docker container.
 * Each tab has a name and can contain multiple stacked widgets.
 */
export const DockerTabSchema = z.object({
  /** Unique identifier for the tab */
  id: z.string().uuid(),
  /** Display name for the tab */
  name: z.string().min(1).max(50).default('Tab'),
  /** Widgets stacked vertically within this tab */
  widgets: z.array(DockerWidgetSlotSchema).default([]),
});

export type DockerTab = z.infer<typeof DockerTabSchema>;

// =============================================================================
// Docker Dock Mode Schema
// =============================================================================

/**
 * Docking mode for a docker container.
 * - 'floating': Freely positioned anywhere on screen
 * - 'docked-left': Attached to left edge of viewport
 * - 'docked-right': Attached to right edge of viewport
 */
export const DockerDockModeSchema = z.enum(['floating', 'docked-left', 'docked-right']);

export type DockerDockMode = z.infer<typeof DockerDockModeSchema>;

// =============================================================================
// Docker Schema
// =============================================================================

/**
 * Docker container — a movable, resizable panel with tabs for hosting widgets.
 *
 * @remarks
 * Dockers are shell-level UI elements, not canvas entities. They overlay
 * the canvas and persist across canvas switches within the same session.
 * User configuration is saved to backend and restored on login.
 */
export const DockerSchema = z.object({
  /** Unique identifier for the docker */
  id: z.string().uuid(),
  /** Display name for the docker */
  name: z.string().min(1).max(100).default('Docker'),

  /** Docking mode — floating or docked to edge */
  dockMode: DockerDockModeSchema.default('floating'),

  /**
   * Position in screen coordinates.
   * Only used when dockMode === 'floating'.
   * For docked modes, position is determined by dock order.
   */
  position: Point2DSchema.optional(),

  /** Size of the docker container (width x height) */
  size: Size2DSchema,

  /** Whether the docker is currently visible */
  visible: z.boolean().default(true),

  /**
   * Pinned state — when true, docker stays visible even when
   * clicking elsewhere. When false, docker may auto-hide.
   */
  pinned: z.boolean().default(false),

  /** Tabs within the docker (at least one required) */
  tabs: z.array(DockerTabSchema).min(1),

  /** Index of the currently active tab */
  activeTabIndex: z.number().int().nonnegative().default(0),

  /** Timestamp when docker was created */
  createdAt: z.string().datetime(),

  /** Timestamp of last update */
  updatedAt: z.string().datetime(),
});

export type Docker = z.infer<typeof DockerSchema>;

// =============================================================================
// User Docker Config Schema
// =============================================================================

/**
 * User's complete docker configuration.
 * Persisted to backend and restored on login.
 */
export const UserDockerConfigSchema = z.object({
  /** User ID this configuration belongs to */
  userId: z.string().uuid(),
  /** All docker containers for this user */
  dockers: z.array(DockerSchema).default([]),
  /** Timestamp of last configuration update */
  updatedAt: z.string().datetime(),
});

export type UserDockerConfig = z.infer<typeof UserDockerConfigSchema>;

// =============================================================================
// Input Schemas for Creating/Updating Dockers
// =============================================================================

/**
 * Input for creating a new docker container.
 * Omits auto-generated fields (id, timestamps).
 *
 * @remarks
 * Fields with defaults are marked optional for TypeScript compatibility.
 * Zod will apply defaults at runtime for any omitted optional fields.
 */
export const CreateDockerInputSchema = z.object({
  name: z.string().min(1).max(100).optional().default('Docker'),
  dockMode: DockerDockModeSchema.optional().default('floating'),
  position: Point2DSchema.optional(),
  size: Size2DSchema,
  visible: z.boolean().optional().default(true),
  pinned: z.boolean().optional().default(false),
  tabs: z.array(DockerTabSchema).min(1).optional(),
});

/**
 * Input type for CreateDockerInputSchema.
 * Uses z.input to correctly infer optional fields for defaulted values.
 */
export type CreateDockerInput = z.input<typeof CreateDockerInputSchema>;

/**
 * Input for updating an existing docker container.
 * All fields are optional — only provided fields are updated.
 */
export const UpdateDockerInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dockMode: DockerDockModeSchema.optional(),
  position: Point2DSchema.optional(),
  size: Size2DSchema.optional(),
  visible: z.boolean().optional(),
  pinned: z.boolean().optional(),
  activeTabIndex: z.number().int().nonnegative().optional(),
});

export type UpdateDockerInput = z.infer<typeof UpdateDockerInputSchema>;

// =============================================================================
// JSON Schema exports for external validation
// =============================================================================

export const DockerWidgetSlotJSONSchema = DockerWidgetSlotSchema.toJSONSchema();
export const DockerTabJSONSchema = DockerTabSchema.toJSONSchema();
export const DockerDockModeJSONSchema = DockerDockModeSchema.toJSONSchema();
export const DockerJSONSchema = DockerSchema.toJSONSchema();
export const UserDockerConfigJSONSchema = UserDockerConfigSchema.toJSONSchema();
