import { describe, it, expect } from 'vitest';

import type { CanvasEntity } from '@sn/types';

import { createSceneGraph } from './scene-graph';

function makeEntity(id: string, x: number, y: number, w: number, h: number, zIndex: number): CanvasEntity {
  return {
    id,
    type: 'shape',
    canvasId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    transform: {
      position: { x, y },
      size: { width: w, height: h },
      rotation: 0,
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

describe('SceneGraph', () => {
  it('adds and retrieves entities', () => {
    const scene = createSceneGraph();
    const e = makeEntity('e1', 0, 0, 100, 100, 0);
    scene.addEntity(e);
    expect(scene.entityCount).toBe(1);
    expect(scene.getEntity('e1')).toEqual(e);
  });

  it('removes entities', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 0));
    scene.removeEntity('e1');
    expect(scene.entityCount).toBe(0);
    expect(scene.getEntity('e1')).toBeUndefined();
  });

  it('updates entities', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 0));
    scene.updateEntity('e1', { visible: false } as Partial<CanvasEntity>);
    expect(scene.getEntity('e1')!.visible).toBe(false);
  });

  it('returns entities sorted by z-order', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 3));
    scene.addEntity(makeEntity('e2', 0, 0, 100, 100, 1));
    scene.addEntity(makeEntity('e3', 0, 0, 100, 100, 2));
    const ordered = scene.getEntitiesByZOrder();
    expect(ordered.map((e) => e.id)).toEqual(['e2', 'e3', 'e1']);
  });

  it('bringToFront moves entity to highest z-order', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 1));
    scene.addEntity(makeEntity('e2', 0, 0, 100, 100, 2));
    scene.addEntity(makeEntity('e3', 0, 0, 100, 100, 3));
    scene.bringToFront('e1');
    const ordered = scene.getEntitiesByZOrder();
    expect(ordered[ordered.length - 1].id).toBe('e1');
  });

  it('sendToBack moves entity to lowest z-order', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 1));
    scene.addEntity(makeEntity('e2', 0, 0, 100, 100, 2));
    scene.addEntity(makeEntity('e3', 0, 0, 100, 100, 3));
    scene.sendToBack('e3');
    const ordered = scene.getEntitiesByZOrder();
    expect(ordered[0].id).toBe('e3');
  });

  it('bringForward swaps with entity above', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 1));
    scene.addEntity(makeEntity('e2', 0, 0, 100, 100, 2));
    scene.bringForward('e1');
    const ordered = scene.getEntitiesByZOrder();
    expect(ordered[ordered.length - 1].id).toBe('e1');
  });

  it('sendBackward swaps with entity below', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 1));
    scene.addEntity(makeEntity('e2', 0, 0, 100, 100, 2));
    scene.sendBackward('e2');
    const ordered = scene.getEntitiesByZOrder();
    expect(ordered[0].id).toBe('e2');
  });

  it('queryPoint returns entities at point, sorted by z-order descending', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 200, 200, 1));
    scene.addEntity(makeEntity('e2', 50, 50, 200, 200, 5));
    const results = scene.queryPoint({ x: 100, y: 100 });
    expect(results.length).toBe(2);
    expect(results[0].id).toBe('e2');
  });

  it('queryRegion returns entities in region', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 0));
    scene.addEntity(makeEntity('e2', 500, 500, 100, 100, 0));
    const results = scene.queryRegion({
      min: { x: 0, y: 0 },
      max: { x: 150, y: 150 },
    });
    expect(results.some((e) => e.id === 'e1')).toBe(true);
  });
});
