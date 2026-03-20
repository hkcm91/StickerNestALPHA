/**
 * Platform-aware transform resolution utilities.
 * Pure functions — no store or bus dependencies.
 *
 * @module canvas/core/transforms/platformTransform
 * @layer L4A-1
 */

import type { CanvasEntityBase, CanvasPlatform, Transform2D } from '@sn/types';

/**
 * Resolve the effective 2D transform for the active platform.
 * Falls back to the entity's default `transform` (web) when
 * no platform-specific override exists.
 */
export function resolveEntityTransform(
  entity: CanvasEntityBase,
  platform: CanvasPlatform,
): Transform2D {
  if (platform !== 'web' && entity.platformTransforms?.[platform]) {
    return entity.platformTransforms[platform] as Transform2D;
  }
  return entity.transform;
}

/**
 * Return a new entity with the given transform written to the
 * correct location for the specified platform.
 *
 * - `web` → writes directly to `entity.transform`
 * - other platforms → writes to `entity.platformTransforms[platform]`
 */
export function setEntityPlatformTransform(
  entity: CanvasEntityBase,
  platform: CanvasPlatform,
  transform: Transform2D,
): CanvasEntityBase {
  if (platform === 'web') {
    return { ...entity, transform };
  }
  return {
    ...entity,
    platformTransforms: {
      ...entity.platformTransforms,
      [platform]: transform,
    },
  };
}
