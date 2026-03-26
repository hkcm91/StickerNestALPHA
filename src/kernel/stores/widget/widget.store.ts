/**
 * Widget Store — manages widget registry and widget instances
 * @module kernel/stores/widget
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent, WidgetManifest } from '@sn/types';
import { WidgetEvents } from '@sn/types';

import { bus } from '../../bus';

/** A widget registered in the local widget store (installed or built-in) */
export interface WidgetRegistryEntry {
  /** Unique widget identifier from the marketplace or built-in set */
  widgetId: string;
  /** Widget manifest declaring events, permissions, and config schema */
  manifest: WidgetManifest;
  /** Single-file HTML source loaded via WidgetFrame srcdoc */
  htmlContent: string;
  /** True for platform-provided widgets (Sticky Note, Clock, etc.) */
  isBuiltIn: boolean;
  /** ISO timestamp when the widget was installed */
  installedAt: string;
}

/** A specific placement of a widget on a canvas */
export interface WidgetInstance {
  /** Unique instance ID (one widget can have many instances across canvases) */
  instanceId: string;
  /** References the WidgetRegistryEntry this instance was created from */
  widgetId: string;
  /** Canvas this instance belongs to */
  canvasId: string;
  /** Persisted instance state (max 1MB) managed via SDK setState/getState */
  state: Record<string, unknown>;
  /** User-configured values from the Properties panel */
  config: Record<string, unknown>;
}

export interface WidgetState {
  registry: Record<string, WidgetRegistryEntry>;
  instances: Record<string, WidgetInstance>;
  isLoading: boolean;
  error: string | null;
}

/** Actions for managing widget registry and instances */
export interface WidgetActions {
  /** Adds a widget to the local registry (install or built-in registration) */
  registerWidget: (entry: WidgetRegistryEntry) => void;
  /** Removes a widget from the registry (uninstall) */
  unregisterWidget: (widgetId: string) => void;
  /** Creates a new widget instance on a canvas */
  addInstance: (instance: WidgetInstance) => void;
  /** Removes a widget instance (widget unmounted or deleted) */
  removeInstance: (instanceId: string) => void;
  /** Replaces the persisted state for a widget instance */
  updateInstanceState: (instanceId: string, state: Record<string, unknown>) => void;
  /** Updates user-configured values for a widget instance */
  updateInstanceConfig: (instanceId: string, config: Record<string, unknown>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  /** Resets to initial state — clears registry and all instances */
  reset: () => void;
}

export type WidgetStore = WidgetState & WidgetActions;

const initialState: WidgetState = {
  registry: {},
  instances: {},
  isLoading: false,
  error: null,
};

export const useWidgetStore = create<WidgetStore>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...initialState,

      registerWidget: (entry) =>
        set((state) => ({
          registry: { ...state.registry, [entry.widgetId]: entry },
        })),

      unregisterWidget: (widgetId) =>
        set((state) => {
          const { [widgetId]: _removed, ...rest } = state.registry;
          return { registry: rest };
        }),

      addInstance: (instance) =>
        set((state) => ({
          instances: { ...state.instances, [instance.instanceId]: instance },
        })),

      removeInstance: (instanceId) =>
        set((state) => {
          const { [instanceId]: _removed, ...rest } = state.instances;
          return { instances: rest };
        }),

      updateInstanceState: (instanceId, newState) =>
        set((state) => {
          const instance = state.instances[instanceId];
          if (!instance) return state;
          return {
            instances: {
              ...state.instances,
              [instanceId]: { ...instance, state: newState },
            },
          };
        }),

      updateInstanceConfig: (instanceId, config) =>
        set((state) => {
          const instance = state.instances[instanceId];
          if (!instance) return state;
          return {
            instances: {
              ...state.instances,
              [instanceId]: { ...instance, config },
            },
          };
        }),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      reset: () => set(initialState),
    })),
    { name: 'widgetStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

/** Subscribe to widget-related bus events for cross-store coordination */
export function setupWidgetBusSubscriptions(): void {
  // Widget mounted — could add instance
  bus.subscribe(WidgetEvents.MOUNTED, (event: BusEvent) => {
    const payload = event.payload as WidgetInstance | null;
    if (payload && payload.instanceId && payload.widgetId && payload.canvasId) {
      useWidgetStore.getState().addInstance({
        instanceId: payload.instanceId,
        widgetId: payload.widgetId,
        canvasId: payload.canvasId,
        state: payload.state ?? {},
        config: payload.config ?? {},
      });
    }
  });

  // Widget unmounted — could remove instance
  bus.subscribe(WidgetEvents.UNMOUNTED, (event: BusEvent) => {
    const payload = event.payload as { instanceId: string } | null;
    if (payload && payload.instanceId) {
      useWidgetStore.getState().removeInstance(payload.instanceId);
    }
  });
}
