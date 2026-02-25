/**
 * React hook wrapping canvas viewport state (pan/zoom/transforms).
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

import { useCallback, useRef, useSyncExternalStore } from 'react';

import type { Point2D } from '@sn/types';

import {
  createViewport,
  canvasToScreen,
  screenToCanvas,
  panBy,
  zoomTo,
  getVisibleBounds,
} from '../../../canvas/core';
import type { ViewportState } from '../../../canvas/core';

type Subscriber = () => void;

/**
 * Simple external store for viewport state.
 * Allows React components to subscribe to viewport changes.
 */
function createViewportStore(initialWidth: number, initialHeight: number) {
  let state = createViewport(initialWidth, initialHeight);
  const listeners = new Set<Subscriber>();

  function notify() {
    for (const fn of listeners) fn();
  }

  return {
    getState: () => state,
    subscribe: (fn: Subscriber) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    pan: (delta: Point2D) => {
      state = panBy(state, delta);
      notify();
    },
    zoom: (level: number, anchor: Point2D) => {
      state = zoomTo(state, level, anchor);
      notify();
    },
    resize: (width: number, height: number) => {
      state = { ...state, viewportWidth: width, viewportHeight: height };
      notify();
    },
    reset: () => {
      state = createViewport(state.viewportWidth, state.viewportHeight);
      notify();
    },
    set: (next: ViewportState) => {
      state = next;
      notify();
    },
  };
}

export type ViewportStore = ReturnType<typeof createViewportStore>;

/**
 * Hook providing reactive viewport state and imperative controls.
 */
export function useViewport(width = 1280, height = 800) {
  const storeRef = useRef<ViewportStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createViewportStore(width, height);
  }
  const store = storeRef.current;

  const viewport = useSyncExternalStore(store.subscribe, store.getState);

  const toScreen = useCallback(
    (p: Point2D) => canvasToScreen(p, store.getState()),
    [store],
  );

  const toCanvas = useCallback(
    (p: Point2D) => screenToCanvas(p, store.getState()),
    [store],
  );

  const visibleBounds = useCallback(
    () => getVisibleBounds(store.getState()),
    [store],
  );

  return {
    viewport,
    store,
    pan: store.pan,
    zoom: store.zoom,
    resize: store.resize,
    reset: store.reset,
    toScreen,
    toCanvas,
    visibleBounds,
  };
}
