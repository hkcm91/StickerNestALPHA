import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

import { initCanvasCore, teardownCanvasCore, isCanvasCoreInitialized } from './init';

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

describe('Canvas Core Init', () => {
  beforeEach(() => {
    teardownCanvasCore();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    teardownCanvasCore();
    bus.unsubscribeAll();
  });

  it('initializes and reports initialized', () => {
    expect(isCanvasCoreInitialized()).toBe(false);
    initCanvasCore();
    expect(isCanvasCoreInitialized()).toBe(true);
  });

  it('returns the same context on double init', () => {
    const ctx1 = initCanvasCore();
    const ctx2 = initCanvasCore();
    expect(ctx1).toBe(ctx2);
  });

  it('teardown resets state', () => {
    initCanvasCore();
    teardownCanvasCore();
    expect(isCanvasCoreInitialized()).toBe(false);
  });

  it('adds entity to scene graph on ENTITY_CREATED bus event', () => {
    const ctx = initCanvasCore();
    const entity = makeEntity('e1', 10, 10, 100, 100, 0);
    bus.emit(CanvasEvents.ENTITY_CREATED, entity);
    expect(ctx.sceneGraph.getEntity('e1')).toBeDefined();
    expect(ctx.sceneGraph.entityCount).toBe(1);
  });

  it('updates entity in scene graph on ENTITY_UPDATED bus event', () => {
    const ctx = initCanvasCore();
    const entity = makeEntity('e1', 10, 10, 100, 100, 0);
    bus.emit(CanvasEvents.ENTITY_CREATED, entity);
    bus.emit(CanvasEvents.ENTITY_UPDATED, { id: 'e1', updates: { visible: false } });
    expect(ctx.sceneGraph.getEntity('e1')!.visible).toBe(false);
  });

  it('removes entity from scene graph on ENTITY_DELETED bus event', () => {
    const ctx = initCanvasCore();
    const entity = makeEntity('e1', 10, 10, 100, 100, 0);
    bus.emit(CanvasEvents.ENTITY_CREATED, entity);
    bus.emit(CanvasEvents.ENTITY_DELETED, { id: 'e1' });
    expect(ctx.sceneGraph.getEntity('e1')).toBeUndefined();
    expect(ctx.sceneGraph.entityCount).toBe(0);
  });

  it('marks dirty regions on entity operations', () => {
    const ctx = initCanvasCore();
    const entity = makeEntity('e1', 10, 10, 100, 100, 0);
    bus.emit(CanvasEvents.ENTITY_CREATED, entity);
    expect(ctx.dirtyTracker.isDirty).toBe(true);
    const regions = ctx.dirtyTracker.getDirtyRegions();
    expect(regions.length).toBeGreaterThan(0);
  });
});
