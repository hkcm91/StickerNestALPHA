import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { CanvasEntity, PropertyLayer } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

import { createPropertyLayersController } from './property-layers-panel';

const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function makeLayer(id: string, order: number, properties: Record<string, unknown>, enabled = true): PropertyLayer {
  return {
    id,
    widgetInstanceId: UUID,
    widgetId: 'test-widget',
    label: `Layer ${id}`,
    enabled,
    order,
    properties,
    createdAt: '2024-01-01T00:00:00Z',
  };
}

function makeEntity(layers?: PropertyLayer[]): CanvasEntity {
  return {
    id: UUID,
    type: 'shape',
    canvasId: UUID,
    transform: {
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 0,
    visible: true,
    locked: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: UUID,
    shapeType: 'rectangle',
    fill: null,
    stroke: '#000000',
    strokeWidth: 1,
    cornerRadius: 0,
    ...(layers ? { propertyLayers: layers } : {}),
  } as CanvasEntity;
}

describe('PropertyLayersController', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
    useUIStore.getState().reset();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('returns empty array for entity with no layers', () => {
    const ctrl = createPropertyLayersController();
    expect(ctrl.getLayers(makeEntity())).toEqual([]);
  });

  it('returns empty array for entity with empty layers', () => {
    const ctrl = createPropertyLayersController();
    expect(ctrl.getLayers(makeEntity([]))).toEqual([]);
  });

  it('returns layers sorted by order ascending', () => {
    const ctrl = createPropertyLayersController();
    const entity = makeEntity([
      makeLayer('l2', 2, { stroke: '#ff0000' }),
      makeLayer('l1', 0, { opacity: 0.5 }),
      makeLayer('l3', 1, { fill: '#00ff00' }),
    ]);
    const layers = ctrl.getLayers(entity);
    expect(layers[0].id).toBe('l1');
    expect(layers[1].id).toBe('l3');
    expect(layers[2].id).toBe('l2');
  });

  it('includes propertyKeys from layer properties', () => {
    const ctrl = createPropertyLayersController();
    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5, stroke: '#ff0000', borderRadius: 8 }),
    ]);
    const layers = ctrl.getLayers(entity);
    expect(layers[0].propertyKeys).toEqual(['opacity', 'stroke', 'borderRadius']);
  });

  it('emits PROPERTY_LAYER_TOGGLED on toggleLayer', () => {
    const ctrl = createPropertyLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_TOGGLED, handler);

    ctrl.toggleLayer('entity-1', 'layer-1', false);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].payload).toEqual({
      entityId: 'entity-1',
      layerId: 'layer-1',
      enabled: false,
    });
  });

  it('emits PROPERTY_LAYER_REMOVED on removeLayer', () => {
    const ctrl = createPropertyLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_REMOVED, handler);

    ctrl.removeLayer('entity-1', 'layer-1');

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].payload).toEqual({
      entityId: 'entity-1',
      layerId: 'layer-1',
    });
  });

  it('emits PROPERTY_LAYER_REORDERED on reorderLayers', () => {
    const ctrl = createPropertyLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_REORDERED, handler);

    ctrl.reorderLayers('entity-1', ['l3', 'l1', 'l2']);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].payload).toEqual({
      entityId: 'entity-1',
      layerIds: ['l3', 'l1', 'l2'],
    });
  });

  it('emits PROPERTY_LAYER_ALTER on alterLayer', () => {
    const ctrl = createPropertyLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_ALTER, handler);

    ctrl.alterLayer('entity-1', 'layer-1');

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].payload).toEqual({
      entityId: 'entity-1',
      layerId: 'layer-1',
    });
  });

  it('is active only in edit mode', () => {
    const ctrl = createPropertyLayersController();
    useUIStore.setState({ canvasInteractionMode: 'edit' });
    expect(ctrl.isActiveInMode()).toBe(true);

    useUIStore.setState({ canvasInteractionMode: 'preview' });
    expect(ctrl.isActiveInMode()).toBe(false);
  });
});
