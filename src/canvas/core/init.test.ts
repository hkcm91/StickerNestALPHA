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

  // Widget-namespaced event tests (sandboxed widgets emit via toBusEventType)
  describe('widget-namespaced entity events', () => {
    it('adds entity on widget.canvas.entity.created bus event', () => {
      const ctx = initCanvasCore();
      const entity = makeEntity('w1', 50, 50, 200, 200, 5);
      bus.emit(`widget.${CanvasEvents.ENTITY_CREATED}`, entity);
      expect(ctx.sceneGraph.getEntity('w1')).toBeDefined();
      expect(ctx.sceneGraph.entityCount).toBe(1);
    });

    it('updates entity on widget.canvas.entity.updated bus event', () => {
      const ctx = initCanvasCore();
      const entity = makeEntity('w1', 50, 50, 200, 200, 5);
      bus.emit(CanvasEvents.ENTITY_CREATED, entity);
      bus.emit(`widget.${CanvasEvents.ENTITY_UPDATED}`, { id: 'w1', updates: { locked: true } });
      expect(ctx.sceneGraph.getEntity('w1')!.locked).toBe(true);
    });

    it('removes entity on widget.canvas.entity.deleted bus event', () => {
      const ctx = initCanvasCore();
      const entity = makeEntity('w1', 50, 50, 200, 200, 5);
      bus.emit(CanvasEvents.ENTITY_CREATED, entity);
      bus.emit(`widget.${CanvasEvents.ENTITY_DELETED}`, { id: 'w1' });
      expect(ctx.sceneGraph.getEntity('w1')).toBeUndefined();
      expect(ctx.sceneGraph.entityCount).toBe(0);
    });

    it('fills default fields for widget-created entities missing base fields', () => {
      const ctx = initCanvasCore();
      // Emit a minimal sticker entity without optional base fields
      bus.emit(`widget.${CanvasEvents.ENTITY_CREATED}`, {
        type: 'sticker',
        transform: { position: { x: 100, y: 100 }, size: { width: 64, height: 64 }, rotation: 0, scale: 1 },
        zIndex: 0,
        visible: true,
        locked: false,
        assetUrl: 'https://example.com/image.png',
        mediaType: 'image',
      });
      expect(ctx.sceneGraph.entityCount).toBe(1);
      const entities = ctx.sceneGraph.getAllEntities();
      const created = entities[0];
      expect(created.id).toBeDefined();
      expect(created.canvasId).toBe('default');
      expect(created.createdAt).toBeDefined();
      expect(created.opacity).toBe(1);
    });

    it('assigns widgetInstanceId for widget-type entities created via widget events', () => {
      const ctx = initCanvasCore();
      bus.emit(`widget.${CanvasEvents.ENTITY_CREATED}`, {
        type: 'widget',
        transform: { position: { x: 0, y: 0 }, size: { width: 300, height: 200 }, rotation: 0, scale: 1 },
        zIndex: 1,
        visible: true,
        locked: false,
        widgetId: 'test-widget',
        scalingMode: 'responsive',
      });
      const entities = ctx.sceneGraph.getAllEntities();
      expect((entities[0] as Record<string, unknown>).widgetInstanceId).toBeDefined();
    });
  });
});
