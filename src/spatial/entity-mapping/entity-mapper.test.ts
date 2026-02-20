import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { SpatialEvents } from '@sn/types';
import type { SpatialContext } from '@sn/types';

import { bus } from '../../kernel/bus';
import { createSpatialScene } from '../scene';

import { createEntityMapper } from './entity-mapper';

const testSpatialContext: SpatialContext = {
  position: { x: 1, y: 2, z: 3 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  normal: { x: 0, y: 1, z: 0 },
};

describe('EntityMapper', () => {
  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => bus.unsubscribeAll());

  it('placeIn3D adds entity and emits ENTITY_PLACED', () => {
    const scene = createSpatialScene();
    const mapper = createEntityMapper(scene);
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.ENTITY_PLACED, handler);

    mapper.placeIn3D('e1', testSpatialContext);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.entityId).toBe('e1');
    expect(handler.mock.calls[0][0].spatial).toEqual(testSpatialContext);
    expect(scene.getEntityMesh('e1')).toBeDefined();

    scene.dispose();
  });

  it('removeFrom3D removes entity', () => {
    const scene = createSpatialScene();
    const mapper = createEntityMapper(scene);
    mapper.placeIn3D('e1', testSpatialContext);
    mapper.removeFrom3D('e1');
    expect(scene.getEntityMesh('e1')).toBeUndefined();
    expect(mapper.getPlacedEntities()).not.toContain('e1');

    scene.dispose();
  });

  it('getPlacedEntities returns correct list', () => {
    const scene = createSpatialScene();
    const mapper = createEntityMapper(scene);
    mapper.placeIn3D('e1', testSpatialContext);
    mapper.placeIn3D('e2', testSpatialContext);
    const placed = mapper.getPlacedEntities();
    expect(placed).toContain('e1');
    expect(placed).toContain('e2');
    expect(placed).toHaveLength(2);

    scene.dispose();
  });
});
