/**
 * Property Layer schema
 *
 * A PropertyLayer represents a set of property overrides applied to a canvas
 * entity by a specific widget instance. Layers stack bottom-to-top with
 * last-write-wins semantics per property key.
 *
 * @module @sn/types/property-layer
 */

import { z } from 'zod';

/**
 * Schema for a single property layer on a canvas entity.
 *
 * Each layer tracks which widget instance created it, allowing users to
 * see, reorder, toggle, delete, or re-open the originating widget.
 */
export const PropertyLayerSchema = z.object({
  /** Unique layer identifier */
  id: z.string().uuid(),
  /** Widget instance that created this layer */
  widgetInstanceId: z.string().uuid(),
  /** Widget registry key (for re-launching / alter) */
  widgetId: z.string(),
  /** Human-readable label, e.g. "Drop Shadow (ShadowFX)" */
  label: z.string(),
  /** Toggle on/off without deleting */
  enabled: z.boolean().default(true),
  /** Stack order: 0 = bottom, higher = closer to top */
  order: z.number().int().nonnegative(),
  /** Sparse property overrides (keys match entity property names) */
  properties: z.record(z.string(), z.unknown()),
  /** Creation timestamp */
  createdAt: z.string().datetime(),
});

export type PropertyLayer = z.infer<typeof PropertyLayerSchema>;

export const PropertyLayerJSONSchema = PropertyLayerSchema.toJSONSchema();
