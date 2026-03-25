/**
 * Proximity / Spatial Awareness API — Tests
 * @module kernel/ai
 */

import { describe, expect, it } from 'vitest';

import type { AIEntitySnapshot } from '@sn/types';

import {
  entityDistance,
  pointToEntityDistance,
  entitiesOverlap,
  entityContains,
  findNearbyEntities,
  findKNearest,
  findOverlapping,
  computeSpatialRelations,
} from './proximity';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEntity(overrides: Partial<AIEntitySnapshot> & { id: string }): AIEntitySnapshot {
  return { type: 'sticker', x: 0, y: 0, w: 100, h: 100, z: 0, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('entityDistance', () => {
  it('returns 0 for identical positions', () => {
    const a = makeEntity({ id: 'a', x: 0, y: 0, w: 100, h: 100 });
    const b = makeEntity({ id: 'b', x: 0, y: 0, w: 100, h: 100 });
    expect(entityDistance(a, b)).toBe(0);
  });

  it('calculates correct euclidean distance between centers', () => {
    const a = makeEntity({ id: 'a', x: 0, y: 0, w: 100, h: 100 }); // center: (50, 50)
    const b = makeEntity({ id: 'b', x: 200, y: 0, w: 100, h: 100 }); // center: (250, 50)
    expect(entityDistance(a, b)).toBe(200);
  });
});

describe('pointToEntityDistance', () => {
  it('returns 0 when point is at entity center', () => {
    const e = makeEntity({ id: 'e', x: 100, y: 100, w: 50, h: 50 }); // center: (125, 125)
    expect(pointToEntityDistance({ x: 125, y: 125 }, e)).toBe(0);
  });

  it('calculates correct distance from point to center', () => {
    const e = makeEntity({ id: 'e', x: 0, y: 0, w: 100, h: 100 }); // center: (50, 50)
    expect(pointToEntityDistance({ x: 50, y: 150 }, e)).toBe(100);
  });
});

describe('entitiesOverlap', () => {
  it('returns true for overlapping entities', () => {
    const a = makeEntity({ id: 'a', x: 0, y: 0, w: 100, h: 100 });
    const b = makeEntity({ id: 'b', x: 50, y: 50, w: 100, h: 100 });
    expect(entitiesOverlap(a, b)).toBe(true);
  });

  it('returns false for non-overlapping entities', () => {
    const a = makeEntity({ id: 'a', x: 0, y: 0, w: 100, h: 100 });
    const b = makeEntity({ id: 'b', x: 200, y: 200, w: 100, h: 100 });
    expect(entitiesOverlap(a, b)).toBe(false);
  });

  it('returns false for touching edges (non-overlap)', () => {
    const a = makeEntity({ id: 'a', x: 0, y: 0, w: 100, h: 100 });
    const b = makeEntity({ id: 'b', x: 100, y: 0, w: 100, h: 100 });
    expect(entitiesOverlap(a, b)).toBe(false);
  });
});

describe('entityContains', () => {
  it('returns true when outer fully contains inner', () => {
    const outer = makeEntity({ id: 'o', x: 0, y: 0, w: 200, h: 200 });
    const inner = makeEntity({ id: 'i', x: 50, y: 50, w: 50, h: 50 });
    expect(entityContains(outer, inner)).toBe(true);
  });

  it('returns false when inner extends beyond outer', () => {
    const outer = makeEntity({ id: 'o', x: 0, y: 0, w: 100, h: 100 });
    const inner = makeEntity({ id: 'i', x: 50, y: 50, w: 100, h: 100 });
    expect(entityContains(outer, inner)).toBe(false);
  });
});

describe('findNearbyEntities', () => {
  it('returns entities within radius, sorted by distance', () => {
    const entities = [
      makeEntity({ id: 'far', x: 500, y: 0, w: 10, h: 10 }),
      makeEntity({ id: 'near', x: 50, y: 0, w: 10, h: 10 }),
      makeEntity({ id: 'medium', x: 200, y: 0, w: 10, h: 10 }),
    ];

    const results = findNearbyEntities(entities, { origin: { x: 0, y: 5 }, radius: 250 });
    expect(results).toHaveLength(2);
    expect(results[0].entity.id).toBe('near');
    expect(results[1].entity.id).toBe('medium');
  });

  it('returns empty array when no entities in range', () => {
    const entities = [makeEntity({ id: 'a', x: 1000, y: 1000 })];
    const results = findNearbyEntities(entities, { origin: { x: 0, y: 0 }, radius: 100 });
    expect(results).toHaveLength(0);
  });
});

describe('findKNearest', () => {
  it('returns k nearest entities', () => {
    const entities = [
      makeEntity({ id: 'c', x: 300, y: 0 }),
      makeEntity({ id: 'a', x: 0, y: 0 }),
      makeEntity({ id: 'b', x: 100, y: 0 }),
    ];

    const results = findKNearest(entities, { x: 0, y: 50 }, 2);
    expect(results).toHaveLength(2);
    expect(results[0].entity.id).toBe('a');
    expect(results[1].entity.id).toBe('b');
  });
});

describe('findOverlapping', () => {
  it('finds all entities overlapping with target', () => {
    const target = makeEntity({ id: 'target', x: 50, y: 50, w: 100, h: 100 });
    const entities = [
      target,
      makeEntity({ id: 'overlap', x: 100, y: 100, w: 50, h: 50 }),
      makeEntity({ id: 'noOverlap', x: 500, y: 500, w: 50, h: 50 }),
    ];

    const results = findOverlapping(entities, target);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('overlap');
  });
});

describe('computeSpatialRelations', () => {
  it('detects containment', () => {
    const entities = [
      makeEntity({ id: 'outer', x: 0, y: 0, w: 200, h: 200 }),
      makeEntity({ id: 'inner', x: 50, y: 50, w: 50, h: 50 }),
    ];

    const relations = computeSpatialRelations(entities);
    expect(relations).toHaveLength(1);
    expect(relations[0].relation).toBe('contains');
    expect(relations[0].from).toBe('outer');
    expect(relations[0].to).toBe('inner');
  });

  it('detects overlap', () => {
    const entities = [
      makeEntity({ id: 'a', x: 0, y: 0, w: 100, h: 100 }),
      makeEntity({ id: 'b', x: 50, y: 50, w: 100, h: 100 }),
    ];

    const relations = computeSpatialRelations(entities);
    expect(relations[0].relation).toBe('overlaps');
  });

  it('detects adjacency', () => {
    const entities = [
      makeEntity({ id: 'a', x: 0, y: 0, w: 100, h: 100 }),
      makeEntity({ id: 'b', x: 110, y: 0, w: 100, h: 100 }), // 10px gap = adjacent
    ];

    const relations = computeSpatialRelations(entities);
    expect(relations).toHaveLength(1);
    expect(relations[0].relation).toBe('adjacent_right');
  });

  it('detects nearby entities', () => {
    const entities = [
      makeEntity({ id: 'a', x: 0, y: 0, w: 50, h: 50 }),
      makeEntity({ id: 'b', x: 100, y: 0, w: 50, h: 50 }), // 50px gap, within 200px nearby threshold
    ];

    const relations = computeSpatialRelations(entities);
    expect(relations.length).toBeGreaterThan(0);
    // Could be adjacent_right or nearby depending on gap size
  });

  it('returns empty for distant entities', () => {
    const entities = [
      makeEntity({ id: 'a', x: 0, y: 0, w: 50, h: 50 }),
      makeEntity({ id: 'b', x: 1000, y: 1000, w: 50, h: 50 }),
    ];

    const relations = computeSpatialRelations(entities);
    expect(relations).toHaveLength(0);
  });
});
