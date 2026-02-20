/**
 * Hit Testing — point-in-entity and region selection using spatial index
 *
 * @module canvas/core/hittest
 * @layer L4A-1
 */

import type { CanvasEntity, Point2D, BoundingBox2D } from '@sn/types';

import type { SceneGraph } from '../scene';

export function entityBounds(entity: CanvasEntity): BoundingBox2D {
  const { position, size } = entity.transform;
  return {
    min: { x: position.x, y: position.y },
    max: { x: position.x + size.width, y: position.y + size.height },
  };
}

export function pointInEntity(point: Point2D, entity: CanvasEntity): boolean {
  const { position, size, rotation } = entity.transform;
  const cx = position.x + size.width / 2;
  const cy = position.y + size.height / 2;

  // Rotate point into entity's local space
  const rad = -(rotation * Math.PI) / 180;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
  const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

  return (
    Math.abs(localX) <= size.width / 2 &&
    Math.abs(localY) <= size.height / 2
  );
}

export function hitTestPoint(scene: SceneGraph, point: Point2D): CanvasEntity | null {
  const candidates = scene.queryPoint(point);
  for (const entity of candidates) {
    if (!entity.visible) continue;
    if (pointInEntity(point, entity)) {
      return entity;
    }
  }
  return null;
}

export function hitTestRegion(scene: SceneGraph, region: BoundingBox2D): CanvasEntity[] {
  const candidates = scene.queryRegion(region);
  return candidates.filter((entity) => {
    if (!entity.visible) return false;
    const bounds = entityBounds(entity);
    return (
      bounds.max.x > region.min.x &&
      bounds.min.x < region.max.x &&
      bounds.max.y > region.min.y &&
      bounds.min.y < region.max.y
    );
  });
}
