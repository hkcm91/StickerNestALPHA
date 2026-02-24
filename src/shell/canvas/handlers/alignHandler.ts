/**
 * Alignment bus event handler — listens for alignment/distribution events
 * and applies position updates to selected entities via the bus.
 *
 * @module shell/canvas/handlers
 * @layer L6
 */

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import type { SceneGraph } from '../../../canvas/core';
import { bus } from '../../../kernel/bus';
import type { AlignableEntity, AlignmentResult } from '../utils/align';
import {
  alignLeft,
  alignRight,
  alignTop,
  alignBottom,
  alignCenterH,
  alignCenterV,
  distributeH,
  distributeV,
} from '../utils/align';

// ---------------------------------------------------------------------------
// Bus event types for alignment
// ---------------------------------------------------------------------------

export const AlignEvents = {
  ALIGN_LEFT: 'canvas.align.left',
  ALIGN_RIGHT: 'canvas.align.right',
  ALIGN_TOP: 'canvas.align.top',
  ALIGN_BOTTOM: 'canvas.align.bottom',
  ALIGN_CENTER_H: 'canvas.align.centerH',
  ALIGN_CENTER_V: 'canvas.align.centerV',
  DISTRIBUTE_H: 'canvas.distribute.horizontal',
  DISTRIBUTE_V: 'canvas.distribute.vertical',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert canvas entities to the minimal shape needed by alignment functions. */
function toAlignable(entities: CanvasEntity[]): AlignableEntity[] {
  return entities.map((e) => ({
    id: e.id,
    position: e.transform.position,
    size: e.transform.size,
  }));
}

/** Apply alignment results by emitting ENTITY_UPDATED for each changed entity. */
function applyResults(
  results: AlignmentResult[],
  sceneGraph: SceneGraph,
): void {
  for (const result of results) {
    const entity = sceneGraph.getEntity(result.id);
    if (!entity) continue;

    // Only emit update if position actually changed
    if (
      entity.transform.position.x === result.position.x &&
      entity.transform.position.y === result.position.y
    ) {
      continue;
    }

    // Full transform spread to avoid shallow merge issues
    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: result.id,
      transform: {
        ...entity.transform,
        position: result.position,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Handler setup
// ---------------------------------------------------------------------------

type AlignFn = (entities: AlignableEntity[]) => AlignmentResult[];

interface AlignPayload {
  entityIds: string[];
}

/**
 * Initialize alignment bus event subscriptions.
 *
 * @param getSceneGraph - Getter for the current scene graph reference
 * @returns Teardown function to unsubscribe all listeners
 */
export function initAlignHandler(
  getSceneGraph: () => SceneGraph | null,
): () => void {
  const eventMap: Array<[string, AlignFn]> = [
    [AlignEvents.ALIGN_LEFT, alignLeft],
    [AlignEvents.ALIGN_RIGHT, alignRight],
    [AlignEvents.ALIGN_TOP, alignTop],
    [AlignEvents.ALIGN_BOTTOM, alignBottom],
    [AlignEvents.ALIGN_CENTER_H, alignCenterH],
    [AlignEvents.ALIGN_CENTER_V, alignCenterV],
    [AlignEvents.DISTRIBUTE_H, distributeH],
    [AlignEvents.DISTRIBUTE_V, distributeV],
  ];

  const unsubscribers = eventMap.map(([eventType, fn]) =>
    bus.subscribe(eventType, (event: { payload: AlignPayload }) => {
      const sceneGraph = getSceneGraph();
      if (!sceneGraph) return;

      const entities: CanvasEntity[] = [];
      for (const id of event.payload.entityIds) {
        const entity = sceneGraph.getEntity(id);
        if (entity) entities.push(entity);
      }

      const results = fn(toAlignable(entities));
      applyResults(results, sceneGraph);
    }),
  );

  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}
