/**
 * Canvas Entity schemas
 * @module @sn/types/canvas-entity
 */

import { z } from 'zod';

import { Point2DSchema, Size2DSchema, Vector3Schema, QuaternionSchema } from './spatial';

/**
 * Entity type enum
 *
 * @remarks
 * All objects on the canvas extend CanvasEntity with a specific type.
 * - `sticker` - Visual asset (image/GIF/video) that may trigger logic
 * - `text` - Text block entity
 * - `widget` - Interactive program container
 * - `shape` - Vector shape (rect, ellipse, line, etc.)
 * - `drawing` - Freehand pen stroke
 * - `group` - Container for grouped entities
 * - `docker` - Container widget that hosts child widgets
 */
export const CanvasEntityTypeSchema = z.enum([
  'sticker',
  'text',
  'widget',
  'shape',
  'drawing',
  'group',
  'docker',
]);

export type CanvasEntityType = z.infer<typeof CanvasEntityTypeSchema>;

/**
 * Transform schema for 2D canvas positioning
 */
export const Transform2DSchema = z.object({
  /** Position in canvas space (not screen space) */
  position: Point2DSchema,
  /** Size in canvas units */
  size: Size2DSchema,
  /** Rotation in degrees */
  rotation: z.number().default(0),
  /** Scale factor */
  scale: z.number().positive().default(1),
});

export type Transform2D = z.infer<typeof Transform2DSchema>;

/**
 * Optional spatial transform for 3D/VR positioning
 */
export const Transform3DSchema = z.object({
  /** Position in 3D world space */
  position: Vector3Schema,
  /** Rotation as quaternion */
  rotation: QuaternionSchema,
  /** Scale in 3D */
  scale: Vector3Schema,
});

export type Transform3D = z.infer<typeof Transform3DSchema>;

/**
 * Base CanvasEntity schema
 *
 * @remarks
 * All canvas entities extend this base schema. Entity positions are ALWAYS
 * stored in canvas space, never screen space.
 */
export const CanvasEntityBaseSchema = z.object({
  /** Unique entity identifier */
  id: z.string().uuid(),
  /** Entity type discriminator */
  type: CanvasEntityTypeSchema,
  /** Canvas this entity belongs to */
  canvasId: z.string().uuid(),
  /** 2D transform (position, size, rotation, scale) */
  transform: Transform2DSchema,
  /**
   * Optional 3D transform for spatial/VR positioning.
   * When present, entity can be placed in 3D space.
   */
  spatialTransform: Transform3DSchema.optional(),
  /** Z-order index (higher = in front) */
  zIndex: z.number().int(),
  /** Whether entity is visible */
  visible: z.boolean().default(true),
  /** Whether entity is locked from editing */
  locked: z.boolean().default(false),
  /** Optional name for layers panel */
  name: z.string().optional(),
  /** Creation timestamp */
  createdAt: z.string().datetime(),
  /** Last update timestamp */
  updatedAt: z.string().datetime(),
  /** User who created this entity */
  createdBy: z.string().uuid(),
});

export type CanvasEntityBase = z.infer<typeof CanvasEntityBaseSchema>;

/**
 * Sticker entity schema
 */
export const StickerEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal('sticker'),
  /** Asset URL (proxied, never direct bucket URL) */
  assetUrl: z.string().url(),
  /** Asset type */
  assetType: z.enum(['image', 'gif', 'video']),
  /** Alt text for accessibility */
  altText: z.string().optional(),
  /** Aspect ratio lock */
  aspectLocked: z.boolean().default(true),
});

export type StickerEntity = z.infer<typeof StickerEntitySchema>;

/**
 * Text entity schema
 */
export const TextEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal('text'),
  /** Text content (may include basic formatting) */
  content: z.string(),
  /** Font family */
  fontFamily: z.string().default('system-ui'),
  /** Font size in canvas units */
  fontSize: z.number().positive().default(16),
  /** Font weight */
  fontWeight: z.number().int().min(100).max(900).default(400),
  /** Text color */
  color: z.string().default('#000000'),
  /** Text alignment */
  textAlign: z.enum(['left', 'center', 'right']).default('left'),
});

export type TextEntity = z.infer<typeof TextEntitySchema>;

/**
 * Widget container entity schema
 */
export const WidgetContainerEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal('widget'),
  /** Widget instance ID */
  widgetInstanceId: z.string().uuid(),
  /** Widget definition ID (from marketplace/registry) */
  widgetId: z.string(),
  /** Widget configuration (shape defined by widget manifest) */
  config: z.record(z.unknown()).default({}),
});

export type WidgetContainerEntity = z.infer<typeof WidgetContainerEntitySchema>;

/**
 * Shape type enum
 */
export const ShapeTypeSchema = z.enum(['rectangle', 'ellipse', 'line', 'polygon']);

/**
 * Shape entity schema
 */
export const ShapeEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal('shape'),
  /** Shape sub-type */
  shapeType: ShapeTypeSchema,
  /** Fill color (null for transparent) */
  fill: z.string().nullable().default(null),
  /** Stroke color */
  stroke: z.string().default('#000000'),
  /** Stroke width */
  strokeWidth: z.number().nonnegative().default(1),
  /** Corner radius for rectangles */
  cornerRadius: z.number().nonnegative().default(0),
  /** Polygon points (for polygon shape type) */
  points: z.array(Point2DSchema).optional(),
});

export type ShapeEntity = z.infer<typeof ShapeEntitySchema>;

/**
 * Drawing (pen stroke) entity schema
 */
export const DrawingEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal('drawing'),
  /** Path points */
  points: z.array(Point2DSchema),
  /** Stroke color */
  stroke: z.string().default('#000000'),
  /** Stroke width */
  strokeWidth: z.number().positive().default(2),
  /** Smoothing factor */
  smoothing: z.number().min(0).max(1).default(0.5),
});

export type DrawingEntity = z.infer<typeof DrawingEntitySchema>;

/**
 * Group entity schema
 */
export const GroupEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal('group'),
  /** Child entity IDs */
  children: z.array(z.string().uuid()),
});

export type GroupEntity = z.infer<typeof GroupEntitySchema>;

/**
 * Docker (container widget) entity schema
 */
export const DockerEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal('docker'),
  /** Child widget instance IDs */
  children: z.array(z.string().uuid()),
  /** Layout mode */
  layout: z.enum(['free', 'stack', 'grid']).default('free'),
});

export type DockerEntity = z.infer<typeof DockerEntitySchema>;

/**
 * Union of all entity types
 */
export const CanvasEntitySchema = z.discriminatedUnion('type', [
  StickerEntitySchema,
  TextEntitySchema,
  WidgetContainerEntitySchema,
  ShapeEntitySchema,
  DrawingEntitySchema,
  GroupEntitySchema,
  DockerEntitySchema,
]);

export type CanvasEntity = z.infer<typeof CanvasEntitySchema>;

/**
 * JSON Schema exports for external validation
 */
export const CanvasEntityBaseJSONSchema = CanvasEntityBaseSchema.toJSONSchema();
export const CanvasEntityJSONSchema = CanvasEntitySchema.toJSONSchema();
