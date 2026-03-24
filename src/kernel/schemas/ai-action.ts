/**
 * AI Canvas Action Schemas
 *
 * Defines the structured actions AI can request on the canvas.
 * Each action maps to an existing CanvasEvent bus emission.
 *
 * @module @sn/types/ai-action
 */

import { z } from 'zod';

import { CanvasEntityTypeSchema } from './canvas-entity';
import { Point2DSchema, Size2DSchema } from './spatial';

/**
 * Create a new entity on the canvas.
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
 * Update an existing entity's properties.
 */
export const AIUpdateEntityActionSchema = z.object({
  type: z.literal('update-entity'),
  entityId: z.string().min(1),
  updates: z.record(z.string(), z.unknown()),
});

/**
 * Delete an entity from the canvas.
 */
export const AIDeleteEntityActionSchema = z.object({
  type: z.literal('delete-entity'),
  entityId: z.string().min(1),
});

/**
 * Move an entity to a new position.
 */
export const AIMoveEntityActionSchema = z.object({
  type: z.literal('move-entity'),
  entityId: z.string().min(1),
  position: Point2DSchema,
});

/**
 * Emit an arbitrary bus event (gated by permission).
 */
export const AIEmitEventActionSchema = z.object({
  type: z.literal('emit-event'),
  eventType: z.string().min(1),
  payload: z.unknown(),
});

/**
 * Discriminated union of all AI canvas actions.
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
 * Batch of AI actions with rate limiting metadata.
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

/**
 * JSON Schema exports for external validation (widget manifests, etc.)
 */
export const AICanvasActionJSONSchema = AICanvasActionSchema.toJSONSchema();
export const AICanvasActionBatchJSONSchema = AICanvasActionBatchSchema.toJSONSchema();
