/**
 * Centralized selection state hook using useSyncExternalStore.
 *
 * Provides reactive selection state that can be shared across
 * CanvasWorkspace, panels, and tool layers without prop drilling.
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

import { useSyncExternalStore } from 'react';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

type Subscriber = () => void;

/**
 * External store for selection state.
 * Singleton — shared across all consumers.
 */
function createSelectionStore() {
  let selected = new Set<string>();
  const listeners = new Set<Subscriber>();

  function notify() {
    for (const fn of listeners) fn();
  }

  const store = {
    getState: () => selected,

    subscribe: (fn: Subscriber) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** Replace the full selection set. */
    select(ids: Set<string>) {
      selected = ids;
      notify();
    },

    /** Toggle a single ID in/out of the selection. */
    toggle(id: string) {
      const next = new Set(selected);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      selected = next;
      notify();
    },

    /** Clear the selection. */
    clear() {
      if (selected.size === 0) return;
      selected = new Set();
      notify();
    },

    /** Get selected IDs (non-reactive for imperative use). */
    getSelected: () => selected,
  };

  // Sync with bus events from tool layer
  bus.subscribe(CanvasEvents.ENTITY_SELECTED, (event: { payload?: { id?: string } }) => {
    if (event.payload?.id) {
      store.select(new Set([event.payload.id]));
    }
  });

  return store;
}

export type SelectionStore = ReturnType<typeof createSelectionStore>;

// Singleton instance
let selectionStoreInstance: SelectionStore | null = null;

function getSelectionStore(): SelectionStore {
  if (!selectionStoreInstance) {
    selectionStoreInstance = createSelectionStore();
  }
  return selectionStoreInstance;
}

/**
 * Hook providing reactive selection state and imperative controls.
 */
export function useSelection() {
  const store = getSelectionStore();
  const selectedIds = useSyncExternalStore(store.subscribe, store.getState);

  return {
    selectedIds,
    store,
    select: store.select,
    toggle: store.toggle,
    clear: store.clear,
  };
}

/**
 * Get the selection store imperatively (for use outside React components).
 */
export { getSelectionStore };
