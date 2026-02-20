import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

import { createLayersController } from './layers-panel';

function makeEntity(id: string, zIndex: number, name?: string): CanvasEntity {
  return {
    id,
    type: 'shape',
    canvasId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    transform: {
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      rotation: 0,
      scale: 1,
    },
    zIndex,
    visible: true,
    locked: false,
    name,
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

describe('LayersController', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
    useUIStore.getState().reset();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('returns layers sorted by z-order descending (front first)', () => {
    const ctrl = createLayersController();
    const entities = [makeEntity('e1', 1), makeEntity('e2', 3), makeEntity('e3', 2)];
    const layers = ctrl.getLayers(entities);
    expect(layers[0].id).toBe('e2');
    expect(layers[1].id).toBe('e3');
    expect(layers[2].id).toBe('e1');
  });

  it('uses entity name or generates fallback', () => {
    const ctrl = createLayersController();
    const named = makeEntity('e1', 0, 'My Shape');
    const unnamed = makeEntity('a0eebc99-1234-5678-abcd-000000000001', 0);
    const layers = ctrl.getLayers([named, unnamed]);
    expect(layers.find((l) => l.id === 'e1')!.name).toBe('My Shape');
    expect(layers.find((l) => l.id === 'a0eebc99-1234-5678-abcd-000000000001')!.name).toContain('shape-');
  });

  it('selectEntity emits ENTITY_SELECTED', () => {
    const ctrl = createLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_SELECTED, handler);
    ctrl.selectEntity('e1');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ id: 'e1' });
  });

  it('reorder emits ENTITY_UPDATED with new zIndex', () => {
    const ctrl = createLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_UPDATED, handler);
    ctrl.reorder('e1', 5);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ id: 'e1', updates: { zIndex: 5 } });
  });

  it('toggleVisibility emits ENTITY_UPDATED', () => {
    const ctrl = createLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_UPDATED, handler);
    ctrl.toggleVisibility('e1', true);
    expect(handler.mock.calls[0][0].payload).toEqual({ id: 'e1', updates: { visible: false } });
  });

  it('rename emits ENTITY_UPDATED', () => {
    const ctrl = createLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_UPDATED, handler);
    ctrl.rename('e1', 'New Name');
    expect(handler.mock.calls[0][0].payload).toEqual({ id: 'e1', updates: { name: 'New Name' } });
  });

  it('isActiveInMode returns false in preview mode', () => {
    const ctrl = createLayersController();
    expect(ctrl.isActiveInMode()).toBe(true);
    useUIStore.getState().setCanvasInteractionMode('preview');
    expect(ctrl.isActiveInMode()).toBe(false);
  });
});
