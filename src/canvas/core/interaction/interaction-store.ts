/**
 * Canvas Interaction Store
 *
 * Manages canvas interaction mode independently from UI chrome mode.
 * This allows the same canvas to be used in different contexts
 * (Canvas Page, Widget Lab, Public Slug) with appropriate interaction behavior.
 *
 * @module canvas/core/interaction
 * @layer L4A-1
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent } from '@sn/types';
import { InteractionModeEvents, createBusEvent } from '@sn/types';

import { bus } from '../../../kernel/bus';

/**
 * Interaction mode determines how the canvas responds to user input
 * - 'edit': Full entity manipulation, tools active, editing enabled
 * - 'play': Widgets fully interactive, layout locked, view-only for entities
 */
export type InteractionMode = 'edit' | 'play';

export interface InteractionState {
  /** Current interaction mode */
  mode: InteractionMode;
  /**
   * Whether tools are enabled in current mode.
   * In 'edit' mode, tools are always enabled.
   * In 'play' mode, tools are disabled (entities locked).
   */
  toolsEnabled: boolean;
  /**
   * Whether widget interaction is enabled.
   * In both modes, widgets can receive interaction by default.
   */
  widgetsInteractive: boolean;
}

export interface InteractionActions {
  /** Set the interaction mode */
  setMode: (mode: InteractionMode) => void;
  /** Toggle between edit and play modes */
  toggleMode: () => void;
  /** Reset to default state */
  reset: () => void;
}

export type InteractionStore = InteractionState & InteractionActions;

/**
 * Compute derived state from mode
 */
function computeDerivedState(mode: InteractionMode): Pick<InteractionState, 'toolsEnabled' | 'widgetsInteractive'> {
  return {
    toolsEnabled: mode === 'edit',
    widgetsInteractive: true, // Widgets are always interactive
  };
}

const initialState: InteractionState = {
  mode: 'edit',
  ...computeDerivedState('edit'),
};

/**
 * Canvas interaction store
 *
 * @remarks
 * This store is separate from the kernel uiStore to maintain layer boundaries.
 * It coordinates with uiStore via bus events, not direct imports.
 */
export const useInteractionStore = create<InteractionStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      setMode: (mode) => {
        const current = get().mode;
        if (current === mode) return;

        set({
          mode,
          ...computeDerivedState(mode),
        });

        // Emit bus event for cross-layer coordination
        bus.emit(
          createBusEvent(InteractionModeEvents.MODE_CHANGED, { mode })
        );
      },

      toggleMode: () => {
        const current = get().mode;
        const newMode: InteractionMode = current === 'edit' ? 'play' : 'edit';
        get().setMode(newMode);
      },

      reset: () => set(initialState),
    })),
    { name: 'interactionStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

/**
 * Check if the current mode allows entity manipulation
 */
export function canManipulateEntities(): boolean {
  return useInteractionStore.getState().mode === 'edit';
}

/**
 * Check if the current mode allows tool usage
 */
export function areToolsEnabled(): boolean {
  return useInteractionStore.getState().toolsEnabled;
}

/**
 * Check if widgets can receive interaction
 */
export function areWidgetsInteractive(): boolean {
  return useInteractionStore.getState().widgetsInteractive;
}

/**
 * Subscribe to external mode change events (from kernel uiStore)
 * This allows the kernel to request mode changes that this store will honor.
 */
export function setupInteractionBusSubscriptions(): void {
  // Listen for mode changes requested via the bus
  bus.subscribe(InteractionModeEvents.MODE_CHANGED, (event: BusEvent) => {
    const payload = event.payload as { mode: InteractionMode } | null;
    if (payload && (payload.mode === 'edit' || payload.mode === 'play')) {
      // Only update if it differs (avoid infinite loops)
      const current = useInteractionStore.getState().mode;
      if (current !== payload.mode) {
        useInteractionStore.setState({
          mode: payload.mode,
          ...computeDerivedState(payload.mode),
        });
      }
    }
  });
}
