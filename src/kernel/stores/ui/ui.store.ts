/**
 * UI Store — manages UI-level flags and modes
 * @module kernel/stores/ui
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent, CanvasPlatform, SpatialMode, ViewportConfig } from '@sn/types';
import { CanvasEvents, CanvasDocumentEvents, ShellEvents, InteractionModeEvents, FocusEvents } from '@sn/types';

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

/** Focus mode state — ephemeral, never persisted */
export interface FocusModeState {
  /** Whether focus mode is active */
  active: boolean;
  /** Ordered entity IDs for carousel navigation */
  focusedEntityIds: string[];
  /** Index of the currently displayed entity in the carousel */
  activeIndex: number;
}

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
  spatialMode: SpatialMode;
  canvasPlatform: CanvasPlatform;
  artboardPreviewMode: boolean;
  /** Fullscreen preview — hides all chrome and shows canvas in preview mode */
  fullscreenPreview: boolean;
  /** Platform-specific viewport configurations (size) */
  platformConfigs: Record<CanvasPlatform, Partial<ViewportConfig>>;
  /** Focus mode — centers and expands selected widgets with blur backdrop. Ephemeral. */
  focusMode: FocusModeState | null;
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
  setSpatialMode: (mode: SpatialMode) => void;
  setCanvasPlatform: (platform: CanvasPlatform) => void;
  setPlatformConfig: (platform: CanvasPlatform, config: Partial<ViewportConfig>) => void;
  setArtboardPreviewMode: (preview: boolean) => void;
  setFullscreenPreview: (fullscreen: boolean) => void;
  /** Enter focus mode with the given entity IDs (carousel order) */
  enterFocusMode: (entityIds: string[]) => void;
  /** Exit focus mode */
  exitFocusMode: () => void;
  /** Navigate the focus carousel (wraps around) */
  focusNavigate: (direction: 'next' | 'prev') => void;
  reset: () => void;
}

export type UIStore = UIState & UIActions;

const initialState: UIState = {
  canvasInteractionMode: 'edit',
  chromeMode: 'editor',
  activeTool: 'select',
  pendingToolData: null,
  sidebarLeftOpen: false,
  sidebarRightOpen: false,
  panels: {},
  theme: 'light',
  isGlobalLoading: false,
  toasts: [],
  spatialMode: '2d',
  canvasPlatform: 'web',
  artboardPreviewMode: false,
  fullscreenPreview: false,
  focusMode: null,
  platformConfigs: {
    web: { width: 1440, height: 900, sizeMode: 'bounded' },
    mobile: { width: 375, height: 812, sizeMode: 'bounded' },
    desktop: { width: 1920, height: 1080, sizeMode: 'bounded' },
  },
};

export const useUIStore = create<UIStore>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...initialState,

      setCanvasInteractionMode: (canvasInteractionMode) =>
        set({ canvasInteractionMode }),

      setChromeMode: (chromeMode) => set({ chromeMode }),

      setActiveTool: (activeTool) =>
        set({ activeTool: activeTool === 'move' ? 'select' : activeTool }),

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

            setSpatialMode: (spatialMode) => set({ spatialMode }),
            setCanvasPlatform: (canvasPlatform) => {
              set({ canvasPlatform });
              bus.emit(CanvasDocumentEvents.PLATFORM_CHANGED, { platform: canvasPlatform });
            },
            setPlatformConfig: (platform, config) =>
              set((state) => ({
                platformConfigs: {
                  ...state.platformConfigs,
                  [platform]: { ...state.platformConfigs[platform], ...config },
                },
              })),
            setArtboardPreviewMode: (artboardPreviewMode) => set({ artboardPreviewMode }),
            setFullscreenPreview: (fullscreenPreview) => set({ fullscreenPreview }),

      enterFocusMode: (entityIds) => {
        if (entityIds.length === 0) return;
        const focusMode: FocusModeState = {
          active: true,
          focusedEntityIds: entityIds,
          activeIndex: 0,
        };
        set({ focusMode });
        bus.emit(FocusEvents.ENTERED, { entityIds, activeIndex: 0 });
      },

      exitFocusMode: () => {
        set({ focusMode: null });
        bus.emit(FocusEvents.EXITED, {});
      },

      focusNavigate: (direction) => {
        set((state) => {
          const fm = state.focusMode;
          if (!fm || fm.focusedEntityIds.length <= 1) return state;
          const len = fm.focusedEntityIds.length;
          const nextIndex = direction === 'next'
            ? (fm.activeIndex + 1) % len
            : (fm.activeIndex - 1 + len) % len;
          bus.emit(FocusEvents.NAVIGATED, { activeIndex: nextIndex, direction });
          return {
            focusMode: { ...fm, activeIndex: nextIndex },
          };
        });
      },

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
      useUIStore.getState().setActiveTool(tool === 'move' ? 'select' : tool);
      useUIStore.getState().setPendingToolData(Object.keys(rest).length > 0 ? rest : null);
    }
  });
}
