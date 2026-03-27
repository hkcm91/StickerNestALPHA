/**
 * UI Store — manages UI-level flags and modes
 * @module kernel/stores/ui
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent, CanvasPlatform, SpatialMode, ThemeName, ViewportConfig } from '@sn/types';
import { CanvasEvents, CanvasDocumentEvents, ShellEvents, InteractionModeEvents, FocusEvents } from '@sn/types';

import { bus } from '../../bus';

/** Toast notification shown in the canvas UI */
export interface Toast {
  /** Unique toast identifier for removal */
  id: string;
  /** Human-readable message displayed to the user */
  message: string;
  /** Visual severity — determines icon and color */
  type: 'info' | 'success' | 'warning' | 'error';
  /** Auto-dismiss duration in ms. Omit for persistent toasts requiring manual dismissal. */
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
  /** Currently active canvas tool (e.g., 'select', 'pen', 'text', 'rect') */
  activeTool: string;
  /** Metadata from the last TOOL_CHANGED event (e.g., widgetId, assetId for placement tools) */
  pendingToolData: Record<string, unknown> | null;
  /** Whether the left sidebar panel is open */
  sidebarLeftOpen: boolean;
  /** Whether the right sidebar panel is open */
  sidebarRightOpen: boolean;
  /** Panel visibility map — keys are panel IDs, values are open/closed */
  panels: Record<string, boolean>;
  /** Active color theme for the application shell */
  theme: ThemeName;
  /** Whether a global loading overlay is active */
  isGlobalLoading: boolean;
  /** Queue of active toast notifications */
  toasts: Toast[];
  /** Current spatial rendering mode: 2d canvas, 3d browser, or VR */
  spatialMode: SpatialMode;
  /** Target platform for viewport sizing (web, mobile, desktop) */
  canvasPlatform: CanvasPlatform;
  /** Whether artboard preview mode is active (renders within artboard bounds) */
  artboardPreviewMode: boolean;
  /** Fullscreen preview — hides all chrome and shows canvas in preview mode */
  fullscreenPreview: boolean;
  /** Platform-specific viewport configurations (size) */
  platformConfigs: Record<CanvasPlatform, Partial<ViewportConfig>>;
  /** Focus mode — centers and expands selected widgets with blur backdrop. Ephemeral. */
  focusMode: FocusModeState | null;
}

/** Actions for mutating UI state. All cross-store coordination goes through the event bus. */
export interface UIActions {
  /** Sets canvas interaction mode. Never persisted — always derived from role + URL context. */
  setCanvasInteractionMode: (mode: 'edit' | 'preview') => void;
  /** Sets chrome visibility mode (editor: full UI, clean: minimal/embed) */
  setChromeMode: (mode: ChromeMode) => void;
  /** Sets the active canvas tool. Normalizes 'move' to 'select'. */
  setActiveTool: (tool: string) => void;
  /** Sets metadata from the last TOOL_CHANGED event (e.g., widgetId for widget tool) */
  setPendingToolData: (data: Record<string, unknown> | null) => void;
  /** Toggles left sidebar open/closed */
  toggleSidebarLeft: () => void;
  /** Toggles right sidebar open/closed */
  toggleSidebarRight: () => void;
  /** Sets a named panel's open/closed state */
  setPanelOpen: (panelId: string, open: boolean) => void;
  /** Sets the active theme. Emits ShellEvents.THEME_CHANGED for widget iframe forwarding. */
  setTheme: (theme: ThemeName) => void;
  /** Sets the global loading overlay state */
  setGlobalLoading: (loading: boolean) => void;
  /** Adds a toast notification to the queue */
  addToast: (toast: Toast) => void;
  /** Removes a toast by ID */
  removeToast: (id: string) => void;
  /** Switches spatial rendering mode (2d, 3d, or vr) */
  setSpatialMode: (mode: SpatialMode) => void;
  /** Sets the target canvas platform (web, mobile, desktop) and emits PLATFORM_CHANGED */
  setCanvasPlatform: (platform: CanvasPlatform) => void;
  /** Updates viewport config for a specific platform preset */
  setPlatformConfig: (platform: CanvasPlatform, config: Partial<ViewportConfig>) => void;
  /** Toggles artboard preview mode (renders canvas within artboard bounds) */
  setArtboardPreviewMode: (preview: boolean) => void;
  /** Toggles fullscreen preview — hides all chrome and shows canvas in preview mode */
  setFullscreenPreview: (fullscreen: boolean) => void;
  /** Enter focus mode with the given entity IDs (carousel order) */
  enterFocusMode: (entityIds: string[]) => void;
  /** Exit focus mode */
  exitFocusMode: () => void;
  /** Navigate the focus carousel (wraps around) */
  focusNavigate: (direction: 'next' | 'prev') => void;
  /** Resets all UI state to defaults */
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
  theme: 'midnight-aurora',
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
    const payload = event.payload as { theme: ThemeName } | null;
    if (payload && payload.theme) {
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

  // Spatial mode toggle — switch between 2D and 3D
  bus.subscribe(ShellEvents.SPATIAL_TOGGLE_3D, () => {
    const current = useUIStore.getState().spatialMode;
    useUIStore.getState().setSpatialMode(current === '2d' ? '3d' : '2d');
  });

 