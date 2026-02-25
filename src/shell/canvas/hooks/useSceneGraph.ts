/**
 * React hook subscribing to scene graph changes via bus events.
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

import { useEffect, useReducer, useRef } from 'react';

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { SceneGraph } from '../../../canvas/core';

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

    unsubs.push(bus.subscribe(CanvasEvents.ENTITY_CREATED, () => forceUpdate()));
    unsubs.push(bus.subscribe(CanvasEvents.ENTITY_UPDATED, () => forceUpdate()));
    unsubs.push(bus.subscribe(CanvasEvents.ENTITY_DELETED, () => forceUpdate()));

    return () => {
      for (const u of unsubs) u();
    };
  }, []);

  if (!sceneGraph) return [] as CanvasEntity[];
  return sceneGraph.getEntitiesByZOrder();
}
