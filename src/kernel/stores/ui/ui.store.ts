/**
 * UI Store — manages UI-level flags and modes
 * @module kernel/stores/ui
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent } from '@sn/types';
import { CanvasEvents, ShellEvents, InteractionModeEvents } from '@sn/types';

import { bus } from '../../bus';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

/**
 * Chrome mode controls UI chrome visibility
 * - 'editor': Full editing UI with toolbars, panels, sidebars
 * - 'clean': Minimal UI for viewing/playing (public slugs, embeds)
 */
export type ChromeMode = 'editor' | 'clean';

export interface UIState {
  /** Canvas interaction mode — NEVER persisted, always derived from role + URL context on load */
  canvasInteractionMode: 'edit' | 'preview';
  /**
   * Chrome mode controls UI chrome visibility.
   * Independent of canvasInteractionMode — you can have editor chrome with preview interaction.
   */
  chromeMode: ChromeMode;
  activeTool: string;
  /** Metadata from the last TOOL_CHANGED event (e.g., widgetId, assetId) */
  pendingToolData: Record<string, unknown> | null;
  sidebarLeftOpen: boolean;
  sidebarRightOpen: boolean;
  panels: Record<string, boolean>;
  theme: 'light' | 'dark' | 'high-contrast';
  isGlobalLoading: boolean;
  toasts: Toast[];
}

export interface UIActions {
  setCanvasInteractionMode: (mode: 'edit' | 'preview') => void;
  setChromeMode: (mode: ChromeMode) => void;
  setActiveTool: (tool: string) => void;
  setPendingToolData: (data: Record<string, unknown> | null) => void;
  toggleSidebarLeft: () => void;
  toggleSidebarRight: () => void;
  setPanelOpen: (panelId: string, open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'high-contrast') => void;
  setGlobalLoading: (loading: boolean) => void;
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
  reset: () => void;
}

export type UIStore = UIState & UIActions;

const initialState: UIState = {
  canvasInteractionMode: 'edit',
  chromeMode: 'editor',
  activeTool: 'select',
  pendingToolData: null,
  sidebarLeftOpen: true,
  sidebarRightOpen: true,
  panels: {},
  theme: 'light',
  isGlobalLoading: false,
  toasts: [],
};

export const useUIStore = create<UIStore>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...initialState,

      setCanvasInteractionMode: (canvasInteractionMode) =>
        set({ canvasInteractionMode }),

      setChromeMode: (chromeMode) => set({ chromeMode }),

      setActiveTool: (activeTool) => set({ activeTool }),

      setPendingToolData: (pendingToolData) => set({ pendingToolData }),

      toggleSidebarLeft: () =>
        set((state) => ({ sidebarLeftOpen: !state.sidebarLeftOpen })),

      toggleSidebarRight: () =>
        set((state) => ({ sidebarRightOpen: !state.sidebarRightOpen })),

      setPanelOpen: (panelId, open) =>
        set((state) => ({
          panels: { ...state.panels, [panelId]: open },
        })),

      setTheme: (theme) => set({ theme }),

      setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),

      addToast: (toast) =>
        set((state) => ({
          toasts: [...state.toasts, toast],
        })),

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      reset: () => set(initialState),
    })),
    { name: 'uiStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

/** Subscribe to UI-related bus events for cross-store coordination */
export function setupUIBusSubscriptions(): void {
  // Canvas mode changed — update interaction mode
  bus.subscribe(CanvasEvents.MODE_CHANGED, (event: BusEvent) => {
    const payload = event.payload as { mode: 'edit' | 'preview' } | null;
    if (payload && (payload.mode === 'edit' || payload.mode === 'preview')) {
      useUIStore.getState().setCanvasInteractionMode(payload.mode);
    }
  });

  // Shell theme changed — update theme
  bus.subscribe(ShellEvents.THEME_CHANGED, (event: BusEvent) => {
    const payload = event.payload as { theme: 'light' | 'dark' | 'high-contrast' } | null;
    if (
      payload &&
      (payload.theme === 'light' ||
        payload.theme === 'dark' ||
        payload.theme === 'high-contrast')
    ) {
      useUIStore.getState().setTheme(payload.theme);
    }
  });

  // Chrome mode changed — update chrome visibility
  bus.subscribe(InteractionModeEvents.CHROME_MODE_CHANGED, (event: BusEvent) => {
    const payload = event.payload as { mode: ChromeMode } | null;
    if (payload && (payload.mode === 'editor' || payload.mode === 'clean')) {
      useUIStore.getState().setChromeMode(payload.mode);
    }
  });

  // Tool changed — update active tool + pending tool data (from AssetPanel, etc.)
  bus.subscribe(CanvasEvents.TOOL_CHANGED, (event: BusEvent) => {
    const payload = event.payload as { tool: string; [key: string]: unknown } | null;
    if (payload && typeof payload.tool === 'string') {
      const { tool, ...rest } = payload;
      useUIStore.getState().setActiveTool(tool);
      useUIStore.getState().setPendingToolData(Object.keys(rest).length > 0 ? rest : null);
    }
  });
}
