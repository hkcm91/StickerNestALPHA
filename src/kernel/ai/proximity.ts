/**
 * Proximity / Spatial Awareness API for AI
 *
 * Provides spatial query utilities that let the AI reason about
 * entity relationships on the canvas. Works with compact entity
 * snapshots to stay within token budgets.
 *
 * @module kernel/ai
 */

import type { AIEntitySnapshot, AISpatialRelation } from '@sn/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProximityQuery {
  /** Center point to search from */
  origin: { x: number; y: number };
  /** Maximum distance in canvas-space pixels */
  radius: number;
}

export interface ProximityResult {
  entity: AIEntitySnapshot;
  distance: number;
}

// ---------------------------------------------------------------------------
// Distance & Overlap Utilities
// ---------------------------------------------------------------------------

/** Euclidean distance between two entity centers */
export function entityDistance(a: AIEntitySnapshot, b: AIEntitySnapshot): number {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

/** Distance from a point to an entity center */
export function pointToEntityDistance(
  point: { x: number; y: number },
  entity: AIEntitySnapshot,
): number {
  const cx = entity.x + entity.w / 2;
  const cy = entity.y + entity.h / 2;
  return Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2);
}

/** Check if two entity bounding boxes overlap */
export function entitiesOverlap(a: AIEntitySnapshot, b: AIEntitySnapshot): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

/** Check if entity A fully contains entity B */
export function entityContains(outer: AIEntitySnapshot, inner: AIEntitySnapshot): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.w >= inner.x + inner.w &&
    outer.y + outer.h >= inner.y + inner.h
  );
}

// ---------------------------------------------------------------------------
// Proximity Queries
// ---------------------------------------------------------------------------

/**
 * Find all entities within a given radius of a point.
 * Results are sorted by distance (nearest first).
 */
export function findNearbyEntities(
  entities: AIEntitySnapshot[],
  query: ProximityQuery,
): ProximityResult[] {
  const results: ProximityResult[] = [];

  for (const entity of entities) {
    const dist = pointToEntityDistance(query.origin, entity);
    if (dist <= query.radius) {
      results.push({ entity, distance: dist });
    }
  }

  results.sort((a, b) => a.distance - b.distance);
  return results;
}

/**
 * Find the K nearest entities to a point.
 */
export function findKNearest(
  entities: AIEntitySnapshot[],
  origin: { x: number; y: number },
  k: number,
): ProximityResult[] {
  const distances = entities.map((entity) => ({
    entity,
    distance: pointToEntityDistance(origin, entity),
  }));

  distances.sort((a, b) => a.distance - b.distance);
  return distances.slice(0, k);
}

/**
 * Find entities that overlap with a given entity.
 */
export function findOverlapping(
  entities: AIEntitySnapshot[],
  target: AIEntitySnapshot,
): AIEntitySnapshot[] {
  return entities.filter((e) => e.id !== target.id && entitiesOverlap(target, e));
}

// ---------------------------------------------------------------------------
// Spatial Relation Computation
// ---------------------------------------------------------------------------

/** Adjacency threshold in canvas-space pixels */
const ADJACENT_THRESHOLD = 20;
const NEARBY_THRESHOLD = 200;

/**
 * Compute spatial relations between all entity pairs.
 * Relations: overlaps, contains, adjacent_left/right/top/bottom, nearby.
 */
export function computeSpatialRelations(entities: AIEntitySnapshot[]): AISpatialRelation[] {
  const relations: AISpatialRelation[] = [];

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];

      // Containment
      if (entityContains(a, b)) {
        relations.push({ from: a.id, to: b.id, relation: 'contains' });
        continue;
      }
      if (entityContains(b, a)) {
        relations.push({ from: b.id, to: a.id, relation: 'contains' });
        continue;
      }

      // Overlap
      if (entitiesOverlap(a, b)) {
        relations.push({ from: a.id, to: b.id, relation: 'overlaps' });
        continue;
      }

      // Adjacency (check gaps between edges)
      const dist = entityDistance(a, b);
      const gapRight = b.x - (a.x + a.w);
      const gapLeft = a.x - (b.x + b.w);
      const gapBottom = b.y - (a.y + a.h);
      const gapTop = a.y - (b.y + b.h);

      if (gapRight >= 0 && gapRight <= ADJACENT_THRESHOLD) {
        relations.push({ from: a.id, to: b.id, relation: 'adjacent_right', distance: Math.round(dist) });
        continue;
      }
      if (gapLeft >= 0 && gapLeft <= ADJACENT_THRESHOLD) {
        relations.push({ from: a.id, to: b.id, relation: 'adjacent_left', distance: Math.round(dist) });
        continue;
      }
      if (gapBottom >= 0 && gapBottom <= ADJACENT_THRESHOLD) {
        relations.push({ from: a.id, to: b.id, relation: 'adjacent_below', distance: Math.round(dist) });
        continue;
      }
      if (gapTop >= 0 && gapTop <= ADJACENT_THRESHOLD) {
        relations.push({ from: a.id, to: b.id, relation: 'adjacent_above', distance: Math.round(dist) });
        continue;
      }

      // Nearby
      if (dist <= NEARBY_THRESHOLD) {
        relations.push({ from: a.id, to: b.id, relation: 'nearby', distance: Math.round(dist) });
      }
    }
  }

  return relations;
}
