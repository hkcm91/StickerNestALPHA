import { describe, it, expect } from 'vitest';

import { createSpatialScene } from './spatial-scene';

describe('SpatialScene', () => {
  it('creates scene and camera', () => {
    const scene = createSpatialScene();
    expect(scene.getScene()).toBeDefined();
    expect(scene.getCamera()).toBeDefined();
  });

  it('renderer is null initially (created lazily)', () => {
    const scene = createSpatialScene();
    expect(scene.getRenderer()).toBeNull();
  });

  it('adds and retrieves entity', () => {
    const scene = createSpatialScene();
    scene.addEntity('e1', { x: 1, y: 2, z: 3 });
    expect(scene.getEntityMesh('e1')).toBeDefined();
    expect(scene.getEntityMesh('e1')!.position.x).toBe(1);
    expect(scene.getAllEntityIds()).toContain('e1');
  });

  it('removes entity', () => {
    const scene = createSpatialScene();
    scene.addEntity('e1', { x: 0, y: 0, z: 0 });
    scene.removeEntity('e1');
    expect(scene.getEntityMesh('e1')).toBeUndefined();
    expect(scene.getAllEntityIds()).not.toContain('e1');
  });

  it('updates entity position', () => {
    const scene = createSpatialScene();
    scene.addEntity('e1', { x: 0, y: 0, z: 0 });
    scene.updateEntityPosition('e1', { x: 5, y: 10, z: 15 });
    const mesh = scene.getEntityMesh('e1')!;
    expect(mesh.position.x).toBe(5);
    expect(mesh.position.y).toBe(10);
    expect(mesh.position.z).toBe(15);
  });

  it('dispose cleans up', () => {
    const scene = createSpatialScene();
    scene.addEntity('e1', { x: 0, y: 0, z: 0 });
    scene.addEntity('e2', { x: 1, y: 1, z: 1 });
    scene.dispose();
    expect(scene.getAllEntityIds()).toHaveLength(0);
  });
});
