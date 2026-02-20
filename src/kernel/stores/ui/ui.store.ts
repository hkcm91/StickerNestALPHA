/**
 * UI Store — manages UI-level flags and modes
 * @module kernel/stores/ui
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent } from '@sn/types';
import { CanvasEvents, ShellEvents } from '@sn/types';

import { bus } from '../../bus';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export interface UIState {
  /** Canvas interaction mode — NEVER persisted, always derived from role + URL context on load */
  canvasInteractionMode: 'edit' | 'preview';
  activeTool: string;
  sidebarLeftOpen: boolean;
  sidebarRightOpen: boolean;
  panels: Record<string, boolean>;
  theme: 'light' | 'dark' | 'high-contrast';
  isGlobalLoading: boolean;
  toasts: Toast[];
}

export interface UIActions {
  setCanvasInteractionMode: (mode: 'edit' | 'preview') => void;
  setActiveTool: (tool: string) => void;
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
  activeTool: 'select',
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

      setActiveTool: (activeTool) => set({ activeTool }),

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
}
