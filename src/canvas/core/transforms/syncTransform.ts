/**
 * 2D ↔ 3D transform projection utilities.
 * Pure functions — no store or bus dependencies.
 *
 * Mapping convention:
 * - 2D x → 3D x (horizontal)
 * - 2D y → 3D -z (depth, inverted so +y goes "into" the scene)
 * - 3D y is the height plane (defaults to 0)
 *
 * Scale factor: 1 canvas unit = 0.01 world units (100px = 1m)
 *
 * @module canvas/core/transforms/syncTransform
 * @layer L4A-1
 */

import type { Transform2D, Transform3D } from '@sn/types';

/** Canvas units per world unit */
const SCALE = 100;

/**
 * Project a 2D canvas transform into 3D world space.
 * Height (y) defaults to 0 (ground plane).
 */
export function project2Dto3D(transform2d: Transform2D): Transform3D {
  return {
    position: {
      x: transform2d.position.x / SCALE,
      y: 0,
      z: -transform2d.position.y / SCALE,
    },
    rotation: { x: 0, y: 0, z: 0, w: 1 }, // identity quaternion
    scale: {
      x: transform2d.size.width / SCALE,
      y: 1,
      z: transform2d.size.height / SCALE,
    },
  };
}

/**
 * Project a 3D world transform back to 2D canvas space.
 * Ignores 3D height (y). Reconstructs size from scale.
 */
export function project3Dto2D(
  transform3d: Transform3D,
  fallbackSize = { width: 100, height: 100 },
): Transform2D {
  return {
    position: {
      x: transform3d.position.x * SCALE,
      y: -transform3d.position.z * SCALE,
    },
    size: {
      width: transform3d.scale.x * SCALE || fallbackSize.width,
      height: transform3d.scale.z * SCALE || fallbackSize.height,
    },
    rotation: 0,
    scale: 1,
  };
}
