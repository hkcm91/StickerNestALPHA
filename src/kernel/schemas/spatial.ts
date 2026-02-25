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
 * 2D Bounding box (min/max corners)
 */
export const BoundingBox2DSchema = z.object({
  min: Point2DSchema,
  max: Point2DSchema,
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

// =============================================================================
// MR / WebXR Schemas
// =============================================================================

/**
 * XR session mode enum.
 * - `immersive-vr`: Full VR headset experience
 * - `immersive-ar`: Passthrough AR / mixed reality
 * - `inline`: Non-immersive, rendered in the browser page
 */
export const XRSessionModeSchema = z.enum([
  'immersive-vr',
  'immersive-ar',
  'inline',
]);

export type XRSessionMode = z.infer<typeof XRSessionModeSchema>;

/**
 * A detected real-world plane from the XR plane detection API.
 * Used in MR experiences (Quest 3 passthrough) to align virtual
 * content with physical surfaces.
 */
export const DetectedPlaneSchema = z.object({
  /** Unique identifier for the detected plane */
  id: z.string(),
  /** Semantic label (e.g., 'floor', 'wall', 'ceiling', 'table') */
  semanticLabel: z.string().optional(),
  /** World-space position of the plane's center */
  position: Vector3Schema,
  /** Orientation of the plane */
  rotation: QuaternionSchema,
  /** Convex polygon vertices defining the plane boundary (in plane-local space) */
  polygon: z.array(Vector3Schema),
});

export type DetectedPlane = z.infer<typeof DetectedPlaneSchema>;

/**
 * A detected real-world mesh from the XR mesh detection API.
 * Represents scene understanding geometry (e.g., furniture, walls)
 * provided by the XR runtime.
 */
export const DetectedMeshSchema = z.object({
  /** Unique identifier for the detected mesh */
  id: z.string(),
  /** Semantic label (e.g., 'global-mesh', 'table', 'couch') */
  semanticLabel: z.string().optional(),
  /** World-space position of the mesh origin */
  position: Vector3Schema,
  /** Orientation of the mesh */
  rotation: QuaternionSchema,
});

export type DetectedMesh = z.infer<typeof DetectedMeshSchema>;

/**
 * A spatial anchor persisted in the XR session.
 * Anchors maintain their world-space position across session
 * restarts when persistent is true.
 */
export const SpatialAnchorSchema = z.object({
  /** Unique identifier for the anchor */
  id: z.string(),
  /** World-space position of the anchor */
  position: Vector3Schema,
  /** Orientation of the anchor */
  rotation: QuaternionSchema,
  /** Whether this anchor persists across XR sessions */
  persistent: z.boolean(),
});

export type SpatialAnchor = z.infer<typeof SpatialAnchorSchema>;

/**
 * A single hand joint from the XR hand tracking API.
 * Quest 3 provides 25 joints per hand with position,
 * rotation, and radius.
 */
export const HandJointSchema = z.object({
  /** Which hand this joint belongs to */
  hand: z.enum(['left', 'right']),
  /** Joint name (e.g., 'wrist', 'thumb-tip', 'index-finger-tip') */
  joint: z.string(),
  /** World-space position of the joint */
  position: Vector3Schema,
  /** Orientation of the joint */
  rotation: QuaternionSchema,
  /** Approximate radius of the joint (meters) */
  radius: z.number(),
});

export type HandJoint = z.infer<typeof HandJointSchema>;

// =============================================================================
// JSON Schema exports for external validation
// Used by widget manifests and external tooling.
// =============================================================================

export const Vector3JSONSchema = Vector3Schema.toJSONSchema();
export const QuaternionJSONSchema = QuaternionSchema.toJSONSchema();
export const Point2DJSONSchema = Point2DSchema.toJSONSchema();
export const Size2DJSONSchema = Size2DSchema.toJSONSchema();
export const BoundingBox2DJSONSchema = BoundingBox2DSchema.toJSONSchema();
export const SpatialContextJSONSchema = SpatialContextSchema.toJSONSchema();
export const DetectedPlaneJSONSchema = DetectedPlaneSchema.toJSONSchema();
export const DetectedMeshJSONSchema = DetectedMeshSchema.toJSONSchema();
export const SpatialAnchorJSONSchema = SpatialAnchorSchema.toJSONSchema();
export const HandJointJSONSchema = HandJointSchema.toJSONSchema();
export const XRSessionModeJSONSchema = XRSessionModeSchema.toJSONSchema();
