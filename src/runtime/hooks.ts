/**
 * Widget Hooks
 *
 * Direct React hooks for trusted inline widgets.
 * These bypass the bridge and talk directly to the kernel bus and stores.
 *
 * @module runtime/hooks
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import { useCallback, useEffect, useState } from 'react';

import { bus } from '../kernel/bus';
import { useWidgetStore } from '../kernel/stores/widget/widget.store';

/**
 * Hook to emit events to the kernel bus.
 *
 * @returns An emit function
 */
export function useEmit() {
  return useCallback((type: string, payload: unknown) => {
    bus.emit(type, payload);
  }, []);
}

/**
 * Hook to subscribe to events from the kernel bus.
 *
 * @param type - The event type to subscribe to
 * @param handler - The event handler function
 */
export function useSubscribe(type: string, handler: (payload: unknown) => void) {
  useEffect(() => {
    // bus.subscribe delivers the full BusEvent: { type, payload, timestamp, ... }
    const unsubscribe = bus.subscribe(type, (event: any) => {
      handler(event.payload);
    });
    return unsubscribe;
  }, [type, handler]);
}

/**
 * Hook to manage widget instance state.
 *
 * @param instanceId - The widget instance ID
 * @returns [state, setState] pair
 */
export function useWidgetState<T = any>(instanceId: string): [Record<string, T>, (key: string, value: T) => void] {
  const store = useWidgetStore();
  const instance = store.instances[instanceId];
  const state = (instance?.state || {}) as Record<string, T>;

  const setState = useCallback((key: string, value: T) => {
    const currentState = useWidgetStore.getState().instances[instanceId]?.state || {};
    useWidgetStore.getState().updateInstanceState(instanceId, {
      ...currentState,
      [key]: value,
    });
  }, [instanceId]);

  return [state, setState];
}
