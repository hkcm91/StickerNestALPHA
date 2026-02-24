/**
 * Alignment and distribution utilities — pure geometry functions.
 *
 * Each function takes an array of entity descriptors (id + position + size)
 * and returns an array of `{ id, position }` updates. The caller is
 * responsible for emitting bus events to apply the changes.
 *
 * Requires at least 2 entities for alignment, 3 for distribution.
 *
 * @module shell/canvas/utils
 * @layer L6
 */

import type { Point2D, Size2D } from '@sn/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal entity descriptor needed for alignment computations. */
export interface AlignableEntity {
  id: string;
  position: Point2D;
  size: Size2D;
}

/** Result of an alignment operation — new position per entity. */
export interface AlignmentResult {
  id: string;
  position: Point2D;
}

// ---------------------------------------------------------------------------
// Alignment functions
// ---------------------------------------------------------------------------

/**
 * Align all entities' left edges to the leftmost entity's left edge.
 */
export function alignLeft(entities: AlignableEntity[]): AlignmentResult[] {
  if (entities.length < 2) return [];
  const targetX = Math.min(...entities.map((e) => e.position.x));
  return entities.map((e) => ({
    id: e.id,
    position: { x: targetX, y: e.position.y },
  }));
}

/**
 * Align all entities' right edges to the rightmost entity's right edge.
 */
export function alignRight(entities: AlignableEntity[]): AlignmentResult[] {
  if (entities.length < 2) return [];
  const targetRight = Math.max(...entities.map((e) => e.position.x + e.size.width));
  return entities.map((e) => ({
    id: e.id,
    position: { x: targetRight - e.size.width, y: e.position.y },
  }));
}

/**
 * Align all entities' top edges to the topmost entity's top edge.
 */
export function alignTop(entities: AlignableEntity[]): AlignmentResult[] {
  if (entities.length < 2) return [];
  const targetY = Math.min(...entities.map((e) => e.position.y));
  return entities.map((e) => ({
    id: e.id,
    position: { x: e.position.x, y: targetY },
  }));
}

/**
 * Align all entities' bottom edges to the bottommost entity's bottom edge.
 */
export function alignBottom(entities: AlignableEntity[]): AlignmentResult[] {
  if (entities.length < 2) return [];
  const targetBottom = Math.max(...entities.map((e) => e.position.y + e.size.height));
  return entities.map((e) => ({
    id: e.id,
    position: { x: e.position.x, y: targetBottom - e.size.height },
  }));
}

/**
 * Align all entities' horizontal centers to the selection's horizontal center.
 */
export function alignCenterH(entities: AlignableEntity[]): AlignmentResult[] {
  if (entities.length < 2) return [];
  const minX = Math.min(...entities.map((e) => e.position.x));
  const maxX = Math.max(...entities.map((e) => e.position.x + e.size.width));
  const centerX = (minX + maxX) / 2;
  return entities.map((e) => ({
    id: e.id,
    position: { x: centerX - e.size.width / 2, y: e.position.y },
  }));
}

/**
 * Align all entities' vertical centers to the selection's vertical center.
 */
export function alignCenterV(entities: AlignableEntity[]): AlignmentResult[] {
  if (entities.length < 2) return [];
  const minY = Math.min(...entities.map((e) => e.position.y));
  const maxY = Math.max(...entities.map((e) => e.position.y + e.size.height));
  const centerY = (minY + maxY) / 2;
  return entities.map((e) => ({
    id: e.id,
    position: { x: e.position.x, y: centerY - e.size.height / 2 },
  }));
}

// ---------------------------------------------------------------------------
// Distribution functions
// ---------------------------------------------------------------------------

/**
 * Distribute entities with even horizontal spacing.
 *
 * First and last entities (by left edge) stay in place.
 * Interior entities are repositioned with equal gaps between them.
 * Requires at least 3 entities.
 */
export function distributeH(entities: AlignableEntity[]): AlignmentResult[] {
  if (entities.length < 3) return [];

  // Sort by left edge
  const sorted = [...entities].sort((a, b) => a.position.x - b.position.x);

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Total available span from first left edge to last right edge
  const totalSpan = (last.position.x + last.size.width) - first.position.x;

  // Total width consumed by all entities
  const totalWidth = sorted.reduce((sum, e) => sum + e.size.width, 0);

  // Remaining space divided evenly as gaps
  const gapCount = sorted.length - 1;
  const gap = (totalSpan - totalWidth) / gapCount;

  let currentX = first.position.x;
  return sorted.map((e) => {
    const result: AlignmentResult = {
      id: e.id,
      position: { x: currentX, y: e.position.y },
    };
    currentX += e.size.width + gap;
    return result;
  });
}

/**
 * Distribute entities with even vertical spacing.
 *
 * First and last entities (by top edge) stay in place.
 * Interior entities are repositioned with equal gaps between them.
 * Requires at least 3 entities.
 */
export function distributeV(entities: AlignableEntity[]): AlignmentResult[] {
  if (entities.length < 3) return [];

  // Sort by top edge
  const sorted = [...entities].sort((a, b) => a.position.y - b.position.y);

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Total available span from first top edge to last bottom edge
  const totalSpan = (last.position.y + last.size.height) - first.position.y;

  // Total height consumed by all entities
  const totalHeight = sorted.reduce((sum, e) => sum + e.size.height, 0);

  // Remaining space divided evenly as gaps
  const gapCount = sorted.length - 1;
  const gap = (totalSpan - totalHeight) / gapCount;

  let currentY = first.position.y;
  return sorted.map((e) => {
    const result: AlignmentResult = {
      id: e.id,
      position: { x: e.position.x, y: currentY },
    };
    currentY += e.size.height + gap;
    return result;
  });
}
