/**
 * React hook subscribing to scene graph changes via bus events.
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

import { useEffect, useReducer, useRef } from 'react';

import type { CanvasEntity } from '@sn/types';
import { CanvasDocumentEvents, CanvasEvents } from '@sn/types';

import type { SceneGraph } from '../../../canvas/core';
import { bus } from '../../../kernel/bus';

/**
 * Hook that subscribes to scene graph mutation events and
 * returns the current entity list sorted by z-order.
 *
 * Forces a re-render whenever the scene graph changes.
 */
export function useSceneGraph(sceneGraph: SceneGraph | null) {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const sgRef = useRef(sceneGraph);
  sgRef.current = sceneGraph;

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(bus.subscribe(CanvasEvents.ENTITY_CREATED, () => {
      console.log('[useSceneGraph] ENTITY_CREATED received, entityCount:', sgRef.current?.entityCount);
      forceUpdate();
    }));
    unsubs.push(bus.subscribe(CanvasEvents.ENTITY_UPDATED, () => forceUpdate()));
    unsubs.push(bus.subscribe(CanvasEvents.ENTITY_DELETED, () => forceUpdate()));
    // Re-render after persistence loads entities (bypasses individual ENTITY_CREATED events)
    unsubs.push(bus.subscribe(CanvasDocumentEvents.LOADED, () => {
      console.log('[useSceneGraph] LOADED received, entityCount:', sgRef.current?.entityCount);
      forceUpdate();
    }));

    return () => {
      for (const u of unsubs) u();
    };
  }, []);

  if (!sceneGraph) return [] as CanvasEntity[];
  return sceneGraph.getEntitiesByZOrder();
}
