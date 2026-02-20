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

  // Subscribe to entity CRUD bus events
  unsubscribers.push(
    bus.subscribe<CanvasEntity>(CanvasEvents.ENTITY_CREATED, (event: BusEvent<CanvasEntity>) => {
      sceneGraph.addEntity(event.payload);
      const bounds = entityBounds(event.payload);
      dirtyTracker.markDirty(bounds);
    }),
  );

  unsubscribers.push(
    bus.subscribe<{ id: string; updates: Partial<CanvasEntity> }>(
      CanvasEvents.ENTITY_UPDATED,
      (event: BusEvent<{ id: string; updates: Partial<CanvasEntity> }>) => {
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
      },
    ),
  );

  unsubscribers.push(
    bus.subscribe<{ id: string }>(CanvasEvents.ENTITY_DELETED, (event: BusEvent<{ id: string }>) => {
      const existing = sceneGraph.getEntity(event.payload.id);
      if (existing) {
        const bounds = entityBounds(existing);
        dirtyTracker.markDirty(bounds);
      }
      sceneGraph.removeEntity(event.payload.id);
    }),
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
