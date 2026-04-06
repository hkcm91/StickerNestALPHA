/**
 * Canvas Core — initialization and teardown
 *
 * @module canvas/core
 * @layer L4A-1
 */

import type { CanvasEntity, BusEvent, PropertyLayer } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { registerEntityProvider, unregisterEntityProvider } from '../../kernel/ai/entity-provider';
import { bus } from '../../kernel/bus';
import { useHistoryStore } from '../../kernel/stores/history';

import { entityBounds } from './hittest';
import type { DirtyTracker , RenderLoop } from './renderer';
import { createDirtyTracker, createRenderLoop } from './renderer';
import type { SceneGraph } from './scene';
import { createSceneGraph } from './scene';

export interface CanvasCoreContext {
  sceneGraph: SceneGraph;
  dirtyTracker: DirtyTracker;
  renderLoop: RenderLoop;
}

let context: CanvasCoreContext | null = null;
const unsubscribers: (() => void)[] = [];

export function initCanvasCore(): CanvasCoreContext {
  if (context) return context;

  const sceneGraph = createSceneGraph();
  const dirtyTracker = createDirtyTracker();
  const renderLoop = createRenderLoop(dirtyTracker);

  context = { sceneGraph, dirtyTracker, renderLoop };

  // Register entity provider so L0/L3 modules can access entities
  registerEntityProvider(() => sceneGraph.getEntitiesByZOrder());

  // Handler for entity creation events
  const handleEntityCreated = (event: BusEvent<CanvasEntity>) => {
    const now = new Date().toISOString();
    const entity = { ...event.payload } as Record<string, unknown>;

    // Fill in required base fields if missing
    if (!entity.id) entity.id = crypto.randomUUID();
    if (!entity.canvasId) entity.canvasId = 'default';
    if (!entity.createdAt) entity.createdAt = now;
    if (!entity.updatedAt) entity.updatedAt = now;
    if (!entity.createdBy) entity.createdBy = 'local';
    if (entity.flipH === undefined) entity.flipH = false;
    if (entity.flipV === undefined) entity.flipV = false;
    if (entity.opacity === undefined) entity.opacity = 1;
    if (entity.borderRadius === undefined) entity.borderRadius = 0;
    if (entity.canvasVisibility === undefined) entity.canvasVisibility = 'both';
    if (entity.syncTransform2d3d === undefined) entity.syncTransform2d3d = true;
    if (entity.visible === undefined) entity.visible = true;
    if (entity.zIndex === undefined) entity.zIndex = sceneGraph.entityCount;

    // Widget entities need a widgetInstanceId for serialization
    if (entity.type === 'widget' && !entity.widgetInstanceId) {
      entity.widgetInstanceId = crypto.randomUUID();
    }

    sceneGraph.addEntity(entity as CanvasEntity);
    const bounds = entityBounds(entity as CanvasEntity);
    dirtyTracker.markDirty(bounds);
  };

  // Handler for entity update events
  const handleEntityUpdated = (event: BusEvent<{ id: string; updates: Partial<CanvasEntity> }>) => {
    const existing = sceneGraph.getEntity(event.payload.id);
    if (existing) {
      const oldBounds = entityBounds(existing);
      dirtyTracker.markDirty(oldBounds);

      // Capture previous values for undo/redo
      const prev: Record<string, unknown> = {};
      for (const key of Object.keys(event.payload.updates)) {
        prev[key] = (existing as Record<string, unknown>)[key];
      }
      useHistoryStore.getState().pushEntry({
        event: { type: event.type, payload: event.payload },
        inverseEvent: {
          type: CanvasEvents.ENTITY_UPDATED,
          payload: { id: event.payload.id, updates: prev },
        },
        timestamp: Date.now(),
      });
    }
    sceneGraph.updateEntity(event.payload.id, event.payload.updates);
    const updated = sceneGraph.getEntity(event.payload.id);
    if (updated) {
      const newBounds = entityBounds(updated);
      dirtyTracker.markDirty(newBounds);
    }
  };

  // Handler for entity move events
  const handleEntityMoved = (event: BusEvent<{ entityId: string; position: { x: number; y: number } }>) => {
    const existing = sceneGraph.getEntity(event.payload.entityId);
    if (!existing) return;
    const oldBounds = entityBounds(existing);
    dirtyTracker.markDirty(oldBounds);
    sceneGraph.updateEntity(event.payload.entityId, {
      transform: { ...existing.transform, position: event.payload.position },
    } as Partial<CanvasEntity>);
    const updated = sceneGraph.getEntity(event.payload.entityId);
    if (updated) {
      dirtyTracker.markDirty(entityBounds(updated));
    }
  };

  // Handler for entity resize events
  const handleEntityResized = (event: BusEvent<{ id: string; position: { x: number; y: number }; size: { width: number; height: number } }>) => {
    const existing = sceneGraph.getEntity(event.payload.id);
    if (!existing) return;
    const oldBounds = entityBounds(existing);
    dirtyTracker.markDirty(oldBounds);
    sceneGraph.updateEntity(event.payload.id, {
      transform: {
        ...existing.transform,
        position: event.payload.position,
        size: event.payload.size,
      },
    } as Partial<CanvasEntity>);
    const updated = sceneGraph.getEntity(event.payload.id);
    if (updated) {
      dirtyTracker.markDirty(entityBounds(updated));
    }
  };

  // Handler for entity deletion events
  const handleEntityDeleted = (event: BusEvent<{ id: string }>) => {
    const existing = sceneGraph.getEntity(event.payload.id);
    if (existing) {
      const bounds = entityBounds(existing);
      dirtyTracker.markDirty(bounds);
    }
    sceneGraph.removeEntity(event.payload.id);
  };

  // Subscribe to direct entity CRUD bus events
  unsubscribers.push(
    bus.subscribe<CanvasEntity>(CanvasEvents.ENTITY_CREATED, handleEntityCreated),
  );

  unsubscribers.push(
    bus.subscribe<{ id: string; updates: Partial<CanvasEntity> }>(
      CanvasEvents.ENTITY_UPDATED,
      handleEntityUpdated,
    ),
  );

  unsubscribers.push(
    bus.subscribe<{ id: string }>(CanvasEvents.ENTITY_DELETED, handleEntityDeleted),
  );

  unsubscribers.push(
    bus.subscribe<{ entityId: string; position: { x: number; y: number } }>(
      CanvasEvents.ENTITY_MOVED,
      handleEntityMoved,
    ),
  );

  unsubscribers.push(
    bus.subscribe<{ id: string; position: { x: number; y: number }; size: { width: number; height: number } }>(
      CanvasEvents.ENTITY_RESIZED,
      handleEntityResized,
    ),
  );

  // ── Property Layer Handlers ──────────────────────────────────────────────

  const handlePropertyLayerAdded = (event: BusEvent<{ entityId: string; layer: PropertyLayer }>) => {
    const { entityId, layer } = event.payload;
    const existing = sceneGraph.getEntity(entityId);
    if (!existing) return;
    const existingLayers: PropertyLayer[] = existing.propertyLayers ?? [];
    const layers = [...existingLayers];
    // Normalize order to be the next index
    layer.order = layers.length;
    layers.push(layer);
    sceneGraph.updateEntity(entityId, { propertyLayers: layers } as Partial<CanvasEntity>);
    dirtyTracker.markDirty(entityBounds(existing));
  };

  const handlePropertyLayerUpdated = (event: BusEvent<{ entityId: string; layerId: string; widgetInstanceId?: string; updates: Partial<PropertyLayer> }>) => {
    const { entityId, layerId, updates } = event.payload;
    const existing = sceneGraph.getEntity(entityId);
    if (!existing) return;
    const existingLayers: PropertyLayer[] = existing.propertyLayers ?? [];
    // Capture previous state for undo/redo
    const previousLayer = existingLayers.find((l: PropertyLayer) => l.id === layerId);
    const layers = existingLayers.map((l: PropertyLayer) =>
      l.id === layerId ? { ...l, ...updates, id: l.id } : l,
    );
    sceneGraph.updateEntity(entityId, { propertyLayers: layers } as Partial<CanvasEntity>);
    dirtyTracker.markDirty(entityBounds(existing));
    // Augment payload with previous state for history store
    if (previousLayer) {
      (event.payload as Record<string, unknown>).previousProperties = previousLayer.properties;
    }
  };

  const handlePropertyLayerRemoved = (event: BusEvent<{ entityId: string; layerId: string }>) => {
    const { entityId, layerId } = event.payload;
    const existing = sceneGraph.getEntity(entityId);
    if (!existing) return;
    const existingLayers: PropertyLayer[] = existing.propertyLayers ?? [];
    // Capture the removed layer for undo/redo before filtering
    const removedLayer = existingLayers.find((l: PropertyLayer) => l.id === layerId);
    const layers = existingLayers
      .filter((l: PropertyLayer) => l.id !== layerId)
      .map((l: PropertyLayer, i: number) => ({ ...l, order: i }));
    sceneGraph.updateEntity(entityId, { propertyLayers: layers } as Partial<CanvasEntity>);
    dirtyTracker.markDirty(entityBounds(existing));
    // Augment payload with removed layer snapshot for history store
    if (removedLayer) {
      (event.payload as Record<string, unknown>).removedLayer = removedLayer;
    }
  };

  const handlePropertyLayerReordered = (event: BusEvent<{ entityId: string; layerIds: string[] }>) => {
    const { entityId, layerIds } = event.payload;
    const existing = sceneGraph.getEntity(entityId);
    if (!existing) return;
    const existingLayers: PropertyLayer[] = existing.propertyLayers ?? [];
    // Capture previous order for undo/redo
    const previousLayerIds = [...existingLayers].sort((a, b) => a.order - b.order).map((l) => l.id);
    const layerMap = new Map(existingLayers.map((l: PropertyLayer) => [l.id, l]));
    const reordered = layerIds
      .map((id, i) => {
        const layer = layerMap.get(id);
        return layer ? { ...layer, order: i } : null;
      })
      .filter((l): l is PropertyLayer => l !== null);
    sceneGraph.updateEntity(entityId, { propertyLayers: reordered } as Partial<CanvasEntity>);
    dirtyTracker.markDirty(entityBounds(existing));
    // Augment payload with previous order for history store
    (event.payload as Record<string, unknown>).previousLayerIds = previousLayerIds;
  };

  const handlePropertyLayerToggled = (event: BusEvent<{ entityId: string; layerId: string; enabled: boolean }>) => {
    const { entityId, layerId, enabled } = event.payload;
    const existing = sceneGraph.getEntity(entityId);
    if (!existing) return;
    const existingLayers: PropertyLayer[] = existing.propertyLayers ?? [];
    const layers = existingLayers.map((l: PropertyLayer) =>
      l.id === layerId ? { ...l, enabled } : l,
    );
    sceneGraph.updateEntity(entityId, { propertyLayers: layers } as Partial<CanvasEntity>);
    dirtyTracker.markDirty(entityBounds(existing));
  };

  const handlePropertyLayerBatchUpdated = (event: BusEvent<{ entityId: string; layers: PropertyLayer[]; previousLayers?: PropertyLayer[] }>) => {
    const { entityId, layers: newLayers } = event.payload;
    const existing = sceneGraph.getEntity(entityId);
    if (!existing) return;
    // Capture previous state for undo/redo
    const previousLayers = existing.propertyLayers ?? [];
    // Normalize order indices
    const normalized = newLayers.map((l, i) => ({ ...l, order: i }));
    sceneGraph.updateEntity(entityId, { propertyLayers: normalized } as Partial<CanvasEntity>);
    dirtyTracker.markDirty(entityBounds(existing));
    // Augment payload with previous layers for history store
    (event.payload as Record<string, unknown>).previousLayers = previousLayers;
  };

  // Subscribe to property layer events
  unsubscribers.push(
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_ADDED, handlePropertyLayerAdded),
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_UPDATED, handlePropertyLayerUpdated),
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_REMOVED, handlePropertyLayerRemoved),
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_REORDERED, handlePropertyLayerReordered),
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_TOGGLED, handlePropertyLayerToggled),
    bus.subscribe(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, handlePropertyLayerBatchUpdated),
  );

  // Subscribe to widget-namespaced events (emitted by sandboxed widgets via bridge)
  // When a sandboxed widget calls StickerNest.emit('canvas.entity.created', payload),
  // the WidgetFrame namespaces it as 'widget.canvas.entity.created' via toBusEventType.
  unsubscribers.push(
    bus.subscribe<CanvasEntity>(
      `widget.${CanvasEvents.ENTITY_CREATED}`,
      handleEntityCreated,
    ),
  );

  unsubscribers.push(
    bus.subscribe<{ id: string; updates: Partial<CanvasEntity> }>(
      `widget.${CanvasEvents.ENTITY_UPDATED}`,
      handleEntityUpdated,
    ),
  );

  unsubscribers.push(
    bus.subscribe<{ id: string }>(
      `widget.${CanvasEvents.ENTITY_DELETED}`,
      handleEntityDeleted,
    ),
  );

  unsubscribers.push(
    bus.subscribe<{ entityId: string; position: { x: number; y: number } }>(
      `widget.${CanvasEvents.ENTITY_MOVED}`,
      handleEntityMoved,
    ),
  );

  return context;
}

export function teardownCanvasCore(): void {
  if (!context) return;
  unregisterEntityProvider();
  context.renderLoop.stop();
  for (const unsub of unsubscribers) {
    unsub();
  }
  unsubscribers.length = 0;
  context = null;
}

export function isCanvasCoreInitialized(): boolean {
  return context !== null;
}

export function getCanvasCoreContext(): CanvasCoreContext | null {
  return context;
}
