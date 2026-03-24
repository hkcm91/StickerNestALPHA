/**
 * Canvas Core — initialization and teardown
 *
 * @module canvas/core
 * @layer L4A-1
 */

import type { CanvasEntity, BusEvent } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

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
    }
    sceneGraph.updateEntity(event.payload.id, event.payload.updates);
    const updated = sceneGraph.getEntity(event.payload.id);
    if (updated) {
      const newBounds = entityBounds(updated);
      dirtyTracker.markDirty(newBounds);
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

  return context;
}

export function teardownCanvasCore(): void {
  if (!context) return;
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
