/**
 * AI Action Schema
 *
 * Defines the structured action types that an AI agent can execute
 * on the canvas. Each action maps to bus events that the canvas core
 * and other layers already handle.
 *
 * @module @sn/types/ai-action
 */

import { z } from 'zod';

import { CanvasEntityTypeSchema } from './canvas-entity';
import { Point2DSchema, Size2DSchema } from './spatial';

// ---------------------------------------------------------------------------
// Generic AI Canvas Action Schemas (branch: HEAD)
// ---------------------------------------------------------------------------

/**
 * Create a new entity on the canvas (generic).
 */
export const AICreateEntityActionSchema = z.object({
  type: z.literal('create-entity'),
  entityType: CanvasEntityTypeSchema,
  name: z.string().optional(),
  position: Point2DSchema,
  size: Size2DSchema.optional(),
  /** Type-specific properties (e.g., text content, sticker URL, widget ID) */
  properties: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Update an existing entity's properties (generic).
 */
export const AIUpdateEntityActionSchema = z.object({
  type: z.literal('update-entity'),
  entityId: z.string().min(1),
  updates: z.record(z.string(), z.unknown()),
});

/**
 * Delete an entity from the canvas (generic).
 */
export const AIDeleteEntityActionSchema = z.object({
  type: z.literal('delete-entity'),
  entityId: z.string().min(1),
});

/**
 * Move an entity to a new position (generic).
 */
export const AIMoveEntityActionSchema = z.object({
  type: z.literal('move-entity'),
  entityId: z.string().min(1),
  position: Point2DSchema,
});

/**
 * Emit an arbitrary bus event (gated by permission, generic).
 */
export const AIEmitEventActionSchema = z.object({
  type: z.literal('emit-event'),
  eventType: z.string().min(1),
  payload: z.unknown(),
});

/**
 * Discriminated union of all generic AI canvas actions (type-discriminated).
 */
export const AICanvasActionSchema = z.discriminatedUnion('type', [
  AICreateEntityActionSchema,
  AIUpdateEntityActionSchema,
  AIDeleteEntityActionSchema,
  AIMoveEntityActionSchema,
  AIEmitEventActionSchema,
]);

export type AICanvasAction = z.infer<typeof AICanvasActionSchema>;
export type AICreateEntityAction = z.infer<typeof AICreateEntityActionSchema>;
export type AIUpdateEntityAction = z.infer<typeof AIUpdateEntityActionSchema>;
export type AIDeleteEntityAction = z.infer<typeof AIDeleteEntityActionSchema>;
export type AIMoveEntityAction = z.infer<typeof AIMoveEntityActionSchema>;
export type AIEmitEventAction = z.infer<typeof AIEmitEventActionSchema>;

/**
 * Batch of generic AI actions with rate limiting metadata.
 */
export const AICanvasActionBatchSchema = z.object({
  actions: z.array(AICanvasActionSchema).max(20, 'Maximum 20 actions per batch'),
});

export type AICanvasActionBatch = z.infer<typeof AICanvasActionBatchSchema>;

/**
 * Result of executing a batch of AI actions.
 */
export interface AIActionExecutionResult {
  succeeded: number;
  failed: Array<{ action: AICanvasAction; error: string }>;
}

// ---------------------------------------------------------------------------
// Specific AI Action Schemas (origin/main — action-discriminated)
// ---------------------------------------------------------------------------

/** Create a sticker entity on the canvas */
export const AICreateStickerActionSchema = z.object({
  action: z.literal('create_sticker'),
  assetUrl: z.string().url(),
  assetType: z.enum(['image', 'gif', 'video']).default('image'),
  position: z.object({ x: z.number(), y: z.number() }),
  size: z.object({ width: z.number().positive(), height: z.number().positive() }).optional(),
  name: z.string().optional(),
});

/** Create a widget entity on the canvas */
export const AICreateWidgetActionSchema = z.object({
  action: z.literal('create_widget'),
  widgetId: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  size: z.object({ width: z.number().positive(), height: z.number().positive() }).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  name: z.string().optional(),
});

/** Create a text entity on the canvas */
export const AICreateTextActionSchema = z.object({
  action: z.literal('create_text'),
  content: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  fontSize: z.number().positive().optional(),
  fontFamily: z.string().optional(),
  color: z.string().optional(),
  name: z.string().optional(),
});

/** Create a shape entity on the canvas */
export const AICreateShapeActionSchema = z.object({
  action: z.literal('create_shape'),
  shapeType: z.enum(['rectangle', 'ellipse', 'line', 'polygon']),
  position: z.object({ x: z.number(), y: z.number() }),
  size: z.object({ width: z.number().positive(), height: z.number().positive() }),
  fill: z.string().nullable().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  name: z.string().optional(),
});

/** Move an entity to a new position (specific) */
export const AIMoveEntitySpecificActionSchema = z.object({
  action: z.literal('move_entity'),
  entityId: z.string().uuid(),
  position: z.object({ x: z.number(), y: z.number() }),
});

/** Update entity properties (specific) */
export const AIUpdateEntitySpecificActionSchema = z.object({
  action: z.literal('update_entity'),
  entityId: z.string().uuid(),
  updates: z.record(z.string(), z.unknown()),
});

/** Delete an entity from the canvas (specific) */
export const AIDeleteEntitySpecificActionSchema = z.object({
  action: z.literal('delete_entity'),
  entityId: z.string().uuid(),
});

/** Trigger AI image generation and place result on canvas */
export const AITriggerGenerationActionSchema = z.object({
  action: z.literal('trigger_generation'),
  prompt: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  size: z.object({ width: z.number().positive(), height: z.number().positive() }).optional(),
});

/** Emit a bus event (specific) */
export const AIEmitEventSpecificActionSchema = z.object({
  action: z.literal('emit_event'),
  eventType: z.string().min(1),
  payload: z.unknown(),
});

// ---------------------------------------------------------------------------
// Discriminated union of all specific AI actions (action-discriminated)
// ---------------------------------------------------------------------------

export const AIActionSchema = z.discriminatedUnion('action', [
  AICreateStickerActionSchema,
  AICreateWidgetActionSchema,
  AICreateTextActionSchema,
  AICreateShapeActionSchema,
  AIMoveEntitySpecificActionSchema,
  AIUpdateEntitySpecificActionSchema,
  AIDeleteEntitySpecificActionSchema,
  AITriggerGenerationActionSchema,
  AIEmitEventSpecificActionSchema,
]);

export type AIAction = z.infer<typeof AIActionSchema>;

/** A batch of specific AI actions to execute in order */
export const AIActionBatchSchema = z.object({
  actions: z.array(AIActionSchema),
  /** Optional reasoning from the AI about why these actions were chosen */
  reasoning: z.string().optional(),
});

export type AIActionBatch = z.infer<typeof AIActionBatchSchema>;

// ---------------------------------------------------------------------------
// AI Canvas Context — compact snapshot for AI reasoning
// ---------------------------------------------------------------------------

/** Compact entity representation for AI context (token-efficient) */
export const AIEntitySnapshotSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  z: z.number(),
  /** Type-specific properties (widget config, text content, sticker URL, etc.) */
  props: z.record(z.string(), z.unknown()).optional(),
});

export type AIEntitySnapshot = z.infer<typeof AIEntitySnapshotSchema>;

/** Spatial relationship between two entities */
export const AISpatialRelationSchema = z.object({
  from: z.string(),
  to: z.string(),
  relation: z.enum([
    'overlaps',
    'contains',
    'contained_by',
    'adjacent_left',
    'adjacent_right',
    'adjacent_above',
    'adjacent_below',
    'nearby',
  ]),
  distance: z.number().optional(),
});

export type AISpatialRelation = z.infer<typeof AISpatialRelationSchema>;

/** Canvas viewport state for AI context */
export const AIViewportSnapshotSchema = z.object({
  centerX: z.number(),
  centerY: z.number(),
  zoom: z.number(),
  visibleWidth: z.number(),
  visibleHeight: z.number(),
});

export type AIViewportSnapshot = z.infer<typeof AIViewportSnapshotSchema>;

/** Full AI-readable canvas context */
export const AICanvasContextSchema = z.object({
  canvasId: z.string(),
  canvasName: z.string().optional(),
  viewport: AIViewportSnapshotSchema,
  entities: z.array(AIEntitySnapshotSchema),
  relations: z.array(AISpatialRelationSchema),
  /** Available widget types that can be placed */
  availableWidgets: z.array(z.object({
    widgetId: z.string(),
    name: z.string(),
    category: z.string().optional(),
  })).optional(),
  /** Total entity count (may differ from entities.length if viewport-scoped) */
  totalEntities: z.number(),
  timestamp: z.string(),
});

export type AICanvasContext = z.infer<typeof AICanvasContextSchema>;

// ---------------------------------------------------------------------------
// JSON Schema exports
// ---------------------------------------------------------------------------

export const AICanvasActionJSONSchema = AICanvasActionSchema.toJSONSchema();
export const AICanvasActionBatchJSONSchema = AICanvasActionBatchSchema.toJSONSchema();
export const AIActionJSONSchema = AIActionSchema.toJSONSchema();
export const AIActionBatchJSONSchema = AIActionBatchSchema.toJSONSchema();
export const AICanvasContextJSONSchema = AICanvasContextSchema.toJSONSchema();
