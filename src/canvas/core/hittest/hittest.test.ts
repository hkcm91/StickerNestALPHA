import { describe, it, expect } from 'vitest';

import type { CanvasEntity } from '@sn/types';

import { createSceneGraph } from '../scene';

import { entityBounds, pointInEntity, hitTestPoint, hitTestRegion } from './hittest';

function makeEntity(id: string, x: number, y: number, w: number, h: number, zIndex: number, rotation = 0): CanvasEntity {
  return {
    id,
    type: 'shape',
    canvasId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    transform: {
      position: { x, y },
      size: { width: w, height: h },
      rotation,
      scale: 1,
    },
    zIndex,
    visible: true,
    locked: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    shapeType: 'rectangle',
    fill: null,
    stroke: '#000000',
    strokeWidth: 1,
    cornerRadius: 0,
  } as CanvasEntity;
}

describe('HitTest', () => {
  it('entityBounds computes correct bounding box', () => {
    const e = makeEntity('e1', 10, 20, 100, 50, 0);
    const bounds = entityBounds(e);
    expect(bounds.min).toEqual({ x: 10, y: 20 });
    expect(bounds.max).toEqual({ x: 110, y: 70 });
  });

  it('pointInEntity returns true for point inside non-rotated entity', () => {
    const e = makeEntity('e1', 0, 0, 100, 100, 0);
    expect(pointInEntity({ x: 50, y: 50 }, e)).toBe(true);
    expect(pointInEntity({ x: 0, y: 0 }, e)).toBe(true);
    expect(pointInEntity({ x: 100, y: 100 }, e)).toBe(true);
  });

  it('pointInEntity returns false for point outside entity', () => {
    const e = makeEntity('e1', 0, 0, 100, 100, 0);
    expect(pointInEntity({ x: -1, y: 50 }, e)).toBe(false);
    expect(pointInEntity({ x: 50, y: 101 }, e)).toBe(false);
  });

  it('pointInEntity handles rotation', () => {
    // 100x100 entity at (0,0) rotated 45 degrees
    const e = makeEntity('e1', 0, 0, 100, 100, 0, 45);
    // Center should always be inside
    expect(pointInEntity({ x: 50, y: 50 }, e)).toBe(true);
  });

  it('hitTestPoint returns topmost (highest z-order) entity', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('bottom', 0, 0, 200, 200, 1));
    scene.addEntity(makeEntity('top', 0, 0, 200, 200, 10));
    const result = hitTestPoint(scene, { x: 100, y: 100 });
    expect(result).not.toBeNull();
    expect(result!.id).toBe('top');
  });

  it('hitTestPoint skips invisible entities', () => {
    const scene = createSceneGraph();
    const invisible = { ...makeEntity('inv', 0, 0, 200, 200, 10), visible: false } as CanvasEntity;
    scene.addEntity(invisible);
    scene.addEntity(makeEntity('vis', 0, 0, 200, 200, 1));
    const result = hitTestPoint(scene, { x: 100, y: 100 });
    expect(result!.id).toBe('vis');
  });

  it('hitTestPoint returns null for empty area', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 0));
    const result = hitTestPoint(scene, { x: 500, y: 500 });
    expect(result).toBeNull();
  });

  it('hitTestRegion returns all visible entities in region', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 10, 10, 50, 50, 0));
    scene.addEntity(makeEntity('e2', 30, 30, 50, 50, 1));
    scene.addEntity(makeEntity('e3', 500, 500, 50, 50, 2));
    const results = hitTestRegion(scene, { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } });
    const ids = results.map((e) => e.id);
    expect(ids).toContain('e1');
    expect(ids).toContain('e2');
    expect(ids).not.toContain('e3');
  });

  it('hitTestRegion skips invisible entities', () => {
    const scene = createSceneGraph();
    const invisible = { ...makeEntity('inv', 10, 10, 50, 50, 0), visible: false } as CanvasEntity;
    scene.addEntity(invisible);
    scene.addEntity(makeEntity('vis', 30, 30, 50, 50, 1));
    const results = hitTestRegion(scene, { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('vis');
  });
});
