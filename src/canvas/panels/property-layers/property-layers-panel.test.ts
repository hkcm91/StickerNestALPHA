import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { CanvasEntity, PropertyLayer } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { useWidgetStore } from '../../../kernel/stores/widget/widget.store';

import { createPropertyLayersController } from './property-layers-panel';

const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function makeLayer(
  id: string,
  order: number,
  properties: Record<string, unknown>,
  enabled = true,
  overrides?: Partial<PropertyLayer>,
): PropertyLayer {
  return {
    id,
    widgetInstanceId: UUID,
    widgetId: 'test-widget',
    label: `Layer ${id}`,
    enabled,
    order,
    properties,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
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
    // Set up mock widget store state
    useWidgetStore.setState({
      registry: {
        'test-widget': {
          widgetId: 'test-widget',
          manifest: { name: 'Test Widget' } as never,
          htmlContent: '',
          isBuiltIn: false,
          installedAt: '2024-01-01T00:00:00Z',
        },
        'other-widget': {
          widgetId: 'other-widget',
          manifest: { name: 'Other Widget' } as never,
          htmlContent: '',
          isBuiltIn: false,
          installedAt: '2024-01-01T00:00:00Z',
        },
      },
      instances: {
        [UUID]: {
          instanceId: UUID,
          widgetId: 'test-widget',
          canvasId: UUID,
          state: {},
          config: {},
        } as never,
      },
    });
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  // ── getLayers basics ────────────────────────────────────────────────────

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

  // ── enriched fields ────────────────────────────────────────────────────

  it('resolves widgetName from registry', () => {
    const ctrl = createPropertyLayersController();
    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5 }),
    ]);
    const layers = ctrl.getLayers(entity);
    expect(layers[0].widgetName).toBe('Test Widget');
  });

  it('falls back to widgetId when widget not in registry', () => {
    const ctrl = createPropertyLayersController();
    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5 }, true, { widgetId: 'unknown-widget' }),
    ]);
    const layers = ctrl.getLayers(entity);
    expect(layers[0].widgetName).toBe('unknown-widget');
  });

  it('detects orphaned layers (widget instance missing)', () => {
    const ctrl = createPropertyLayersController();
    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5 }, true, { widgetInstanceId: 'missing-instance-id' }),
    ]);
    const layers = ctrl.getLayers(entity);
    expect(layers[0].isOrphan).toBe(true);
  });

  it('marks non-orphan layers correctly', () => {
    const ctrl = createPropertyLayersController();
    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5 }),
    ]);
    const layers = ctrl.getLayers(entity);
    expect(layers[0].isOrphan).toBe(false);
  });

  it('computes conflictingKeys for overlapping property keys', () => {
    const ctrl = createPropertyLayersController();
    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5, stroke: '#ff0000' }),
      makeLayer('l2', 1, { opacity: 0.7, fill: '#00ff00' }),
    ]);
    const layers = ctrl.getLayers(entity);
    // Both layers set 'opacity' — it should be conflicting for both
    expect(layers[0].conflictingKeys).toEqual(['opacity']);
    expect(layers[1].conflictingKeys).toEqual(['opacity']);
    // 'stroke' and 'fill' are unique to each layer
    expect(layers[0].conflictingKeys).not.toContain('stroke');
    expect(layers[1].conflictingKeys).not.toContain('fill');
  });

  it('does not count disabled layers in conflict detection', () => {
    const ctrl = createPropertyLayersController();
    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5 }),
      makeLayer('l2', 1, { opacity: 0.7 }, false), // disabled
    ]);
    const layers = ctrl.getLayers(entity);
    expect(layers[0].conflictingKeys).toEqual([]);
  });

  it('includes propertyValues', () => {
    const ctrl = createPropertyLayersController();
    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5, stroke: '#ff0000' }),
    ]);
    const layers = ctrl.getLayers(entity);
    expect(layers[0].propertyValues).toEqual({ opacity: 0.5, stroke: '#ff0000' });
  });

  // ── event emissions ────────────────────────────────────────────────────

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

  // ── batch operations ───────────────────────────────────────────────────

  it('disableAllLayers emits BATCH_UPDATED with all layers disabled', () => {
    const ctrl = createPropertyLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, handler);

    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5 }, true),
      makeLayer('l2', 1, { stroke: '#ff0000' }, true),
    ]);
    ctrl.disableAllLayers(UUID, entity);

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0].payload;
    expect(payload.entityId).toBe(UUID);
    expect(payload.layers).toHaveLength(2);
    expect(payload.layers.every((l: PropertyLayer) => l.enabled === false)).toBe(true);
  });

  it('enableAllLayers emits BATCH_UPDATED with all layers enabled', () => {
    const ctrl = createPropertyLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, handler);

    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5 }, false),
      makeLayer('l2', 1, { stroke: '#ff0000' }, false),
    ]);
    ctrl.enableAllLayers(UUID, entity);

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0].payload;
    expect(payload.layers.every((l: PropertyLayer) => l.enabled === true)).toBe(true);
  });

  it('removeLayersByWidget removes only layers from specified widget', () => {
    const ctrl = createPropertyLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, handler);

    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5 }, true, { widgetId: 'test-widget' }),
      makeLayer('l2', 1, { stroke: '#ff0000' }, true, { widgetId: 'other-widget' }),
      makeLayer('l3', 2, { fill: '#00ff00' }, true, { widgetId: 'test-widget' }),
    ]);
    ctrl.removeLayersByWidget(UUID, entity, 'test-widget');

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0].payload;
    expect(payload.layers).toHaveLength(1);
    expect(payload.layers[0].id).toBe('l2');
    expect(payload.layers[0].order).toBe(0); // re-normalized
  });

  it('removeOrphanedLayers removes only layers with missing widget instances', () => {
    const ctrl = createPropertyLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, handler);

    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5 }, true, { widgetInstanceId: UUID }), // exists
      makeLayer('l2', 1, { stroke: '#ff0000' }, true, { widgetInstanceId: 'deleted-instance' }), // orphan
    ]);
    ctrl.removeOrphanedLayers(UUID, entity);

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0].payload;
    expect(payload.layers).toHaveLength(1);
    expect(payload.layers[0].id).toBe('l1');
  });

  it('duplicateLayer clones a layer with new ID and "(copy)" suffix', () => {
    const ctrl = createPropertyLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, handler);

    const entity = makeEntity([
      makeLayer('l1', 0, { opacity: 0.5 }),
      makeLayer('l2', 1, { stroke: '#ff0000' }),
    ]);
    ctrl.duplicateLayer(UUID, entity, 'l1');

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0].payload;
    expect(payload.layers).toHaveLength(3);
    // Original is first
    expect(payload.layers[0].id).toBe('l1');
    // Clone is second with "(copy)" suffix
    expect(payload.layers[1].label).toBe('Layer l1 (copy)');
    expect(payload.layers[1].id).not.toBe('l1'); // new UUID
    expect(payload.layers[1].order).toBe(1);
    // Original l2 shifted to order 2
    expect(payload.layers[2].id).toBe('l2');
    expect(payload.layers[2].order).toBe(2);
  });

  it('duplicateLayer is a no-op for non-existent layerId', () => {
    const ctrl = createPropertyLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, handler);

    const entity = makeEntity([makeLayer('l1', 0, { opacity: 0.5 })]);
    ctrl.duplicateLayer(UUID, entity, 'nonexistent');

    expect(handler).not.toHaveBeenCalled();
  });

  // ── inline editing ─────────────────────────────────────────────────────

  it('updateLayerProperties emits PROPERTY_LAYER_UPDATED with properties update', () => {
    const ctrl = createPropertyLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_UPDATED, handler);

    ctrl.updateLayerProperties('entity-1', 'layer-1', { opacity: 0.8 });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].payload).toEqual({
      entityId: 'entity-1',
      layerId: 'layer-1',
      updates: { properties: { opacity: 0.8 } },
    });
  });

  // ── no-op on empty ─────────────────────────────────────────────────────

  it('batch operations are no-ops on entities without layers', () => {
    const ctrl = createPropertyLayersController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, handler);

    const entity = makeEntity();
    ctrl.disableAllLayers(UUID, entity);
    ctrl.enableAllLayers(UUID, entity);
    ctrl.removeLayersByWidget(UUID, entity, 'test-widget');
    ctrl.removeOrphanedLayers(UUID, entity);
    ctrl.duplicateLayer(UUID, entity, 'l1');

    expect(handler).not.toHaveBeenCalled();
  });
});
