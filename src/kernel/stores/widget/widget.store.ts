/**
 * Widget Store — manages widget registry and widget instances
 * @module kernel/stores/widget
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent, WidgetManifest } from '@sn/types';
import { WidgetEvents } from '@sn/types';

import { bus } from '../../bus';

export interface WidgetRegistryEntry {
  widgetId: string;
  manifest: WidgetManifest;
  htmlContent: string;
  isBuiltIn: boolean;
  installedAt: string;
}

export interface WidgetInstance {
  instanceId: string;
  widgetId: string;
  canvasId: string;
  state: Record<string, unknown>;
  config: Record<string, unknown>;
}

export interface WidgetState {
  registry: Record<string, WidgetRegistryEntry>;
  instances: Record<string, WidgetInstance>;
  isLoading: boolean;
  error: string | null;
}

export interface WidgetActions {
  registerWidget: (entry: WidgetRegistryEntry) => void;
  unregisterWidget: (widgetId: string) => void;
  addInstance: (instance: WidgetInstance) => void;
  removeInstance: (instanceId: string) => void;
  updateInstanceState: (instanceId: string, state: Record<string, unknown>) => void;
  updateInstanceConfig: (instanceId: string, config: Record<string, unknown>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
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
