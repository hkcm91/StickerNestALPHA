/**
 * Snap utilities — grid snapping and alignment guides
 *
 * @module canvas/tools/move
 * @layer L4A-2
 */

import type { Point2D, BoundingBox2D } from '@sn/types';

export function snapToGrid(position: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

export interface AlignmentGuide {
  axis: 'x' | 'y';
  position: number;
}

export function findAlignmentGuides(
  entityBounds: BoundingBox2D,
  allBounds: BoundingBox2D[],
  threshold: number = 5,
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];
  const entityCenterX = (entityBounds.min.x + entityBounds.max.x) / 2;
  const entityCenterY = (entityBounds.min.y + entityBounds.max.y) / 2;

  for (const other of allBounds) {
    const otherCenterX = (other.min.x + other.max.x) / 2;
    const otherCenterY = (other.min.y + other.max.y) / 2;

    // Left edge alignment
    if (Math.abs(entityBounds.min.x - other.min.x) < threshold) {
      guides.push({ axis: 'x', position: other.min.x });
    }
    // Right edge alignment
    if (Math.abs(entityBounds.max.x - other.max.x) < threshold) {
      guides.push({ axis: 'x', position: other.max.x });
    }
    // Center X alignment
    if (Math.abs(entityCenterX - otherCenterX) < threshold) {
      guides.push({ axis: 'x', position: otherCenterX });
    }
    // Top edge alignment
    if (Math.abs(entityBounds.min.y - other.min.y) < threshold) {
      guides.push({ axis: 'y', position: other.min.y });
    }
    // Bottom edge alignment
    if (Math.abs(entityBounds.max.y - other.max.y) < threshold) {
      guides.push({ axis: 'y', position: other.max.y });
    }
    // Center Y alignment
    if (Math.abs(entityCenterY - otherCenterY) < threshold) {
      guides.push({ axis: 'y', position: otherCenterY });
    }
  }

  return guides;
}
