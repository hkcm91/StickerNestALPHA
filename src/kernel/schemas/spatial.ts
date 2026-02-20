/**
 * Spatial schemas for 3D/VR context
 * @module @sn/types/spatial
 */

import { z } from 'zod';

/**
 * 3D Vector with x, y, z components
 */
export const Vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export type Vector3 = z.infer<typeof Vector3Schema>;

/**
 * Quaternion for 3D rotation (x, y, z, w)
 */
export const QuaternionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  w: z.number(),
});

export type Quaternion = z.infer<typeof QuaternionSchema>;

/**
 * 2D Point for canvas coordinates
 */
export const Point2DSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Point2D = z.infer<typeof Point2DSchema>;

/**
 * 2D Size dimensions
 */
export const Size2DSchema = z.object({
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
});

export type Size2D = z.infer<typeof Size2DSchema>;

/**
 * 2D Bounding box
 */
export const BoundingBox2DSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
});

export type BoundingBox2D = z.infer<typeof BoundingBox2DSchema>;

/**
 * SpatialContext for VR/3D events
 *
 * @remarks
 * This is ALWAYS optional on BusEvents. Only populate when
 * the event originates from a spatial interaction (VR controller,
 * 3D scene click, etc.). Never default to zero vectors.
 */
export const SpatialContextSchema = z.object({
  /** World-space position where the interaction occurred */
  position: Vector3Schema,
  /** Orientation of the interaction source (e.g., controller) */
  rotation: QuaternionSchema,
  /** Surface normal at the interaction point */
  normal: Vector3Schema,
});

export type SpatialContext = z.infer<typeof SpatialContextSchema>;

/**
 * JSON Schema exports for external validation
 * Used by widget manifests and external tooling.
 */
export const Vector3JSONSchema = Vector3Schema.toJSONSchema();
export const QuaternionJSONSchema = QuaternionSchema.toJSONSchema();
export const Point2DJSONSchema = Point2DSchema.toJSONSchema();
export const Size2DJSONSchema = Size2DSchema.toJSONSchema();
export const BoundingBox2DJSONSchema = BoundingBox2DSchema.toJSONSchema();
export const SpatialContextJSONSchema = SpatialContextSchema.toJSONSchema();
