import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

import { createPropertiesController } from './properties-panel';

function makeEntity(id: string, x: number, y: number, w: number, h: number): CanvasEntity {
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
    zIndex: 0,
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

describe('PropertiesController', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
    useUIStore.getState().reset();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('returns mixed for empty selection', () => {
    const ctrl = createPropertiesController();
    const props = ctrl.getProperties([]);
    expect(props.position).toBe('mixed');
    expect(props.size).toBe('mixed');
  });

  it('returns values for single selection', () => {
    const ctrl = createPropertiesController();
    const entity = makeEntity('e1', 10, 20, 100, 50);
    const props = ctrl.getProperties([entity]);
    expect(props.position).toEqual({ x: 10, y: 20 });
    expect(props.size).toEqual({ width: 100, height: 50 });
    expect(props.rotation).toBe(0);
  });

  it('returns mixed for multi-select with different sizes', () => {
    const ctrl = createPropertiesController();
    const e1 = makeEntity('e1', 10, 20, 100, 50);
    const e2 = makeEntity('e2', 30, 40, 200, 80);
    const props = ctrl.getProperties([e1, e2]);
    expect(props.size).toBe('mixed');
    expect(props.position).toBe('mixed');
  });

  it('returns value when multi-select has same values', () => {
    const ctrl = createPropertiesController();
    const e1 = makeEntity('e1', 10, 20, 100, 50);
    const e2 = makeEntity('e2', 10, 20, 100, 50);
    const props = ctrl.getProperties([e1, e2]);
    expect(props.size).toEqual({ width: 100, height: 50 });
    expect(props.rotation).toBe(0);
  });

  it('updateProperty emits ENTITY_UPDATED for each entity', () => {
    const ctrl = createPropertiesController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_UPDATED, handler);
    ctrl.updateProperty(['e1', 'e2'], 'visible', false);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('updateConfig emits ENTITY_CONFIG_UPDATED', () => {
    const ctrl = createPropertiesController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_CONFIG_UPDATED, handler);
    ctrl.updateConfig('e1', 'color', '#ff0000');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ id: 'e1', key: 'color', value: '#ff0000' });
  });

  it('isActiveInMode returns false in preview mode', () => {
    const ctrl = createPropertiesController();
    expect(ctrl.isActiveInMode()).toBe(true);
    useUIStore.getState().setCanvasInteractionMode('preview');
    expect(ctrl.isActiveInMode()).toBe(false);
  });
});
