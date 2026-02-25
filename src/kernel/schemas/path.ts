/**
 * Path sub-schemas — Bezier anchor points and path fill rules.
 *
 * @remarks
 * PathEntitySchema itself lives in `canvas-entity.ts` alongside all other
 * entity schemas to avoid circular imports (it extends CanvasEntityBaseSchema).
 * This file defines the supporting schemas that PathEntitySchema depends on.
 *
 * @module @sn/types/path
 */

import { z } from 'zod';

import { Point2DSchema } from './spatial';

/**
 * Anchor point type — controls how handles behave relative to each other.
 *
 * @remarks
 * - `corner`: Handles are fully independent (sharp angle possible).
 * - `smooth`: Handles are collinear (same angle, independent lengths).
 * - `symmetric`: Handles are collinear and equal length.
 */
export const AnchorPointTypeSchema = z.enum(['corner', 'smooth', 'symmetric']);

export type AnchorPointType = z.infer<typeof AnchorPointTypeSchema>;

/**
 * Single anchor point on a Bezier path.
 *
 * @remarks
 * `handleIn` and `handleOut` are **relative offsets** from `position`.
 * To get the absolute handle position: `{ x: position.x + handleOut.x, y: position.y + handleOut.y }`.
 * Storing handles as offsets means moving an anchor automatically moves its handles.
 */
export const AnchorPointSchema = z.object({
  /** Anchor position in entity-local coordinates */
  position: Point2DSchema,
  /** Incoming control handle offset (relative to position). Undefined for no in-handle. */
  handleIn: Point2DSchema.optional(),
  /** Outgoing control handle offset (relative to position). Undefined for no out-handle. */
  handleOut: Point2DSchema.optional(),
  /** Point type controlling handle constraint behavior */
  pointType: AnchorPointTypeSchema.default('corner'),
});

export type AnchorPoint = z.infer<typeof AnchorPointSchema>;

/**
 * SVG fill-rule for path fill rendering.
 */
export const PathFillRuleSchema = z.enum(['nonzero', 'evenodd']);

export type PathFillRule = z.infer<typeof PathFillRuleSchema>;

/**
 * JSON Schema exports for external validation
 */
export const AnchorPointJSONSchema = AnchorPointSchema.toJSONSchema();
