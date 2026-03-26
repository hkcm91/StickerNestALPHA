/**
 * Docker Store — manages shell-level dockable container panels
 * @module kernel/stores/docker
 *
 * @remarks
 * Dockers are user-level UI preferences that persist across sessions and canvases.
 * They host widget instances in a tabbed, movable/resizable panel system.
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type {
  Docker,
  DockerDockMode,
  DockerTab,
  DockerWidgetSlot,
  Point2D,
  Size2D,
  CreateDockerInput,
  UpdateDockerInput,
} from '@sn/types';
import { DockerEvents } from '@sn/types';

import { bus } from '../../bus';

// =============================================================================
// State & Actions Interface
// =============================================================================

export interface DockerState {
  /** All docker containers, keyed by docker ID */
  dockers: Record<string, Docker>;
  /** Z-order for floating dockers (last = front) */
  activeDockerOrder: string[];
  /** Loading state for backend operations */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Actions for managing docker containers. Emits DockerEvents bus events on mutations.
 * Dockers persist across sessions — they are user-level UI preferences, not canvas entities.
 */
export interface DockerActions {
  // ── Docker CRUD ──
  /** Creates a new docker container. Returns the generated docker ID. Emits CREATED. */
  addDocker: (input: CreateDockerInput) => string;
  /** Removes a docker and all its tabs/widgets. Emits DELETED. */
  removeDocker: (id: string) => void;
  /** Updates docker properties (name, position, size, etc.). Emits UPDATED. */
  updateDocker: (id: string, updates: UpdateDockerInput) => void;

  // ── Docking ──
  /** Sets dock mode: 'floating', 'docked-left', or 'docked-right'. Emits DOCK_MODE_CHANGED. */
  setDockMode: (id: string, mode: DockerDockMode) => void;
  /** Sets the floating position (only applies when dockMode is 'floating') */
  setPosition: (id: string, position: Point2D) => void;
  /** Sets the docker panel size */
  setSize: (id: string, size: Size2D) => void;

  // ── Visibility ──
  /** Toggles docker visibility (shown/hidden). Emits VISIBILITY_CHANGED. */
  toggleVisible: (id: string) => void;
  /** Sets docker visibility explicitly. Emits VISIBILITY_CHANGED. */
  setVisible: (id: string, visible: boolean) => void;
  /** Toggles whether the docker is pinned (stays visible across canvas navigation) */
  togglePinned: (id: string) => void;

  // ── Tabs ──
  /** Adds a tab to a docker. Returns the generated tab ID. Emits TAB_ADDED. */
  addTab: (dockerId: string, tab?: Partial<Omit<DockerTab, 'id'>>) => string;
  /** Removes a tab by index. Emits TAB_REMOVED. */
  removeTab: (dockerId: string, tabIndex: number) => void;
  /** Sets the active (focused) tab. Emits TAB_ACTIVATED. */
  setActiveTab: (dockerId: string, tabIndex: number) => void;
  /** Renames a tab at the given index */
  renameTab: (dockerId: string, tabIndex: number, name: string) => void;
  /** Reorders tabs by providing the desired tab ID order */
  reorderTabs: (dockerId: string, tabIds: string[]) => void;

  // ── Widgets in tabs ──
  /** Adds a widget instance to a tab. Emits WIDGET_ADDED. */
  addWidgetToTab: (dockerId: string, tabIndex: number, widgetInstanceId: string, height?: number) => void;
  /** Removes a widget instance from a tab. Emits WIDGET_REMOVED. */
  removeWidgetFromTab: (dockerId: string, tabIndex: number, widgetInstanceId: string) => void;
  /** Resizes a widget within a tab (undefined = auto height). Emits WIDGET_RESIZED. */
  resizeWidgetInTab: (dockerId: string, tabIndex: number, widgetInstanceId: string, height: number | undefined) => void;
  /** Reorders widgets within a tab by providing the desired instance ID order */
  reorderWidgetsInTab: (dockerId: string, tabIndex: number, widgetInstanceIds: string[]) => void;

  // ── Z-order ──
  /** Brings a floating docker to the front of the z-order stack */
  bringToFront: (id: string) => void;

  // ── Persistence ──
  /** Loads docker configuration from backend. Emits CONFIG_LOADED. */
  loadFromConfig: (dockers: Docker[]) => void;
  /** Returns all dockers as an array for backend persistence */
  getConfig: () => Docker[];

  // ── Utility ──
  /** Sets the loading state for backend operations */
  setLoading: (loading: boolean) => void;
  /** Sets or clears the error message */
  setError: (error: string | null) => void;
  /** Resets all docker state to initial values */
  reset: () => void;
}

export type DockerStore = DockerState & DockerActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: DockerState = {
  dockers: {},
  activeDockerOrder: [],
  isLoading: false,
  error: null,
};

// =============================================================================
// Helper Functions
// =============================================================================

function generateUUID(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function createDefaultTab(): DockerTab {
  return {
    id: generateUUID(),
    name: 'Tab 1',
    widgets: [],
  };
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useDockerStore = create<DockerStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // =========================================================================
      // Docker CRUD
      // =========================================================================

      addDocker: (input) => {
        const id = generateUUID();
        const timestamp = now();

        // Normalize input tabs to ensure required fields are present
        const normalizedTabs: DockerTab[] = input.tabs
          ? input.tabs.map((tab) => ({
              id: tab.id,
              name: tab.name ?? 'Tab',
              widgets: tab.widgets ?? [],
            }))
          : [createDefaultTab()];

        const docker: Docker = {
          id,
          name: input.name ?? 'Docker',
          dockMode: input.dockMode ?? 'floating',
          position: input.position,
          size: input.size,
          visible: input.visible ?? false,
          pinned: input.pinned ?? false,
          tabs: normalizedTabs,
          activeTabIndex: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        set((state) => ({
          dockers: { ...state.dockers, [id]: docker },
          activeDockerOrder: [...state.activeDockerOrder, id],
        }));

        bus.emit(DockerEvents.CREATED, { docker });
        return id;
      },

      removeDocker: (id) => {
        const docker = get().dockers[id];
        if (!docker) return;

        set((state) => {
          const { [id]: _removed, ...rest } = state.dockers;
          return {
            dockers: rest,
            activeDockerOrder: state.activeDockerOrder.filter((dId) => dId !== id),
          };
        });

        bus.emit(DockerEvents.DELETED, { dockerId: id });
      },

      updateDocker: (id, updates) => {
        set((state) => {
          const docker = state.dockers[id];
          if (!docker) return state;

          const updated: Docker = {
            ...docker,
            ...updates,
            updatedAt: now(),
          };

          return {
            dockers: { ...state.dockers, [id]: updated },
          };
        });

        bus.emit(DockerEvents.UPDATED, { dockerId: id, updates });
      },

      // =========================================================================
      // Docking
      // =========================================================================

      setDockMode: (id, mode) => {
        set((state) => {
          const docker = state.dockers[id];
          if (!docker) return state;

          return {
            dockers: {
              ...state.dockers,
              [id]: { ...docker, dockMode: mode, updatedAt: now() },
            },
          };
        });

        bus.emit(DockerEvents.DOCK_MODE_CHANGED, { dockerId: id, mode });
      },

      setPosition: (id, position) => {
        set((state) => {
          const docker = state.dockers[id];
          if (!docker) return state;

          return {
            dockers: {
              ...state.dockers,
              [id]: { ...docker, position, updatedAt: now() },
            },
          };
        });
      },

      setSize: (id, size) => {
        set((state) => {
          const docker = state.dockers[id];
          if (!docker) return state;

          return {
            dockers: {
              ...state.dockers,
              [id]: { ...docker, size, updatedAt: now() },
            },
          };
        });
      },

      // =========================================================================
      // Visibility
      // =========================================================================

      toggleVisible: (id) => {
        const docker = get().dockers[id];
        if (!docker) return;

        const visible = !docker.visible;
        set((state) => ({
          dockers: {
            ...state.dockers,
            [id]: { ...docker, visible, updatedAt: now() },
          },
        }));

        bus.emit(DockerEvents.VISIBILITY_CHANGED, { dockerId: id, visible });
      },

      setVisible: (id, visible) => {
        set((state) => {
          const docker = state.dockers[id];
          if (!docker) return state;

          return {
            dockers: {
              ...state.dockers,
              [id]: { ...docker, visible, updatedAt: now() },
            },
          };
        });

        bus.emit(DockerEvents.VISIBILITY_CHANGED, { dockerId: id, visible });
      },

      togglePinned: (id) => {
        set((state) => {
          const docker = state.dockers[id];
          if (!docker) return state;

          return {
            dockers: {
              ...state.dockers,
              [id]: { ...docker, pinned: !docker.pinned, updatedAt: now() },
            },
          };
        });
      },

      // =========================================================================
      // Tabs
      // =========================================================================

      addTab: (dockerId, tabInput) => {
        const tabId = generateUUID();
        const tab: DockerTab = {
          id: tabId,
          name: tabInput?.name ?? `Tab ${(get().dockers[dockerId]?.tabs.length ?? 0) + 1}`,
          widgets: tabInput?.widgets ?? [],
        };

        set((state) => {
          const docker = state.dockers[dockerId];
          if (!docker) return state;

          return {
            dockers: {
              ...state.dockers,
              [dockerId]: {
                ...docker,
                tabs: [...docker.tabs, tab],
                updatedAt: now(),
              },
            },
          };
        });

        bus.emit(DockerEvents.TAB_ADDED, { dockerId, tab });
        return tabId;
      },

      removeTab: (dockerId, tabIndex) => {
        set((state) => {
          const docker = state.dockers[dockerId];
          if (!docker || docker.tabs.length <= 1) return state; // Must have at least one tab

          const newTabs = docker.tabs.filter((_, i) => i !== tabIndex);
          const newActiveIndex = Math.min(docker.activeTabIndex, newTabs.length - 1);

          return {
            dockers: {
              ...state.dockers,
              [dockerId]: {
                ...docker,
                tabs: newTabs,
                activeTabIndex: newActiveIndex,
                updatedAt: now(),
              },
            },
          };
        });

        bus.emit(DockerEvents.TAB_REMOVED, { dockerId, tabIndex });
      },

      setActiveTab: (dockerId, tabIndex) => {
        set((state) => {
          const docker = state.dockers[dockerId];
          if (!docker || tabIndex < 0 || tabIndex >= docker.tabs.length) return state;

          return {
            dockers: {
              ...state.dockers,
              [dockerId]: {
                ...docker,
                activeTabIndex: tabIndex,
                updatedAt: now(),
              },
            },
          };
        });

        bus.emit(DockerEvents.TAB_ACTIVATED, { dockerId, tabIndex });
      },

      renameTab: (dockerId, tabIndex, name) => {
        set((state) => {
          const docker = state.dockers[dockerId];
          if (!docker || tabIndex < 0 || tabIndex >= docker.tabs.length) return state;

          const newTabs = [...docker.tabs];
          newTabs[tabIndex] = { ...newTabs[tabIndex], name };

          return {
            dockers: {
              ...state.dockers,
              [dockerId]: {
                ...docker,
                tabs: newTabs,
                updatedAt: now(),
              },
            },
          };
        });
      },

      reorderTabs: (dockerId, tabIds) => {
        set((state) => {
          const docker = state.dockers[dockerId];
          if (!docker) return state;

          const tabMap = new Map(docker.tabs.map((t) => [t.id, t]));
          const newTabs = tabIds
            .map((id) => tabMap.get(id))
            .filter((t): t is DockerTab => t !== undefined);

          if (newTabs.length !== docker.tabs.length) return state;

          return {
            dockers: {
              ...state.dockers,
              [dockerId]: {
                ...docker,
                tabs: newTabs,
                updatedAt: now(),
              },
            },
          };
        });
      },

      // =========================================================================
      // Widgets in Tabs
      // =========================================================================

      addWidgetToTab: (dockerId, tabIndex, widgetInstanceId, height) => {
        const slot: DockerWidgetSlot = {
          widgetInstanceId,
          height,
        };

        set((state) => {
          const docker = state.dockers[dockerId];
          if (!docker || tabIndex < 0 || tabIndex >= docker.tabs.length) return state;

          const newTabs = [...docker.tabs];
          newTabs[tabIndex] = {
            ...newTabs[tabIndex],
            widgets: [...newTabs[tabIndex].widgets, slot],
          };

          return {
            dockers: {
              ...state.dockers,
              [dockerId]: {
                ...docker,
                tabs: newTabs,
                updatedAt: now(),
              },
            },
          };
        });

        bus.emit(DockerEvents.WIDGET_ADDED, { dockerId, tabIndex, widgetInstanceId });
      },

      removeWidgetFromTab: (dockerId, tabIndex, widgetInstanceId) => {
        set((state) => {
          const docker = state.dockers[dockerId];
          if (!docker || tabIndex < 0 || tabIndex >= docker.tabs.length) return state;

          const newTabs = [...docker.tabs];
          newTabs[tabIndex] = {
            ...newTabs[tabIndex],
            widgets: newTabs[tabIndex].widgets.filter(
              (w) => w.widgetInstanceId !== widgetInstanceId
            ),
          };

          return {
            dockers: {
              ...state.dockers,
              [dockerId]: {
                ...docker,
                tabs: newTabs,
                updatedAt: now(),
              },
            },
          };
        });

        bus.emit(DockerEvents.WIDGET_REMOVED, { dockerId, tabIndex, widgetInstanceId });
      },

      resizeWidgetInTab: (dockerId, tabIndex, widgetInstanceId, height) => {
        set((state) => {
          const docker = state.dockers[dockerId];
          if (!docker || tabIndex < 0 || tabIndex >= docker.tabs.length) return state;

          const newTabs = [...docker.tabs];
          newTabs[tabIndex] = {
            ...newTabs[tabIndex],
            widgets: newTabs[tabIndex].widgets.map((w) =>
              w.widgetInstanceId === widgetInstanceId ? { ...w, height } : w
            ),
          };

          return {
            dockers: {
              ...state.dockers,
              [dockerId]: {
                ...docker,
                tabs: newTabs,
                updatedAt: now(),
              },
            },
          };
        });

        bus.emit(DockerEvents.WIDGET_RESIZED, { dockerId, tabIndex, widgetInstanceId, height });
      },

      reorderWidgetsInTab: (dockerId, tabIndex, widgetInstanceIds) => {
        set((state) => {
          const docker = state.dockers[dockerId];
          if (!docker || tabIndex < 0 || tabIndex >= docker.tabs.length) return state;

          const tab = docker.tabs[tabIndex];
          const widgetMap = new Map(tab.widgets.map((w) => [w.widgetInstanceId, w]));
          const newWidgets = widgetInstanceIds
            .map((id) => widgetMap.get(id))
            .filter((w): w is DockerWidgetSlot => w !== undefined);

          if (newWidgets.length !== tab.widgets.length) return state;

          const newTabs = [...docker.tabs];
          newTabs[tabIndex] = { ...tab, widgets: newWidgets };

          return {
            dockers: {
              ...state.dockers,
              [dockerId]: {
                ...docker,
                tabs: newTabs,
                updatedAt: now(),
              },
            },
          };
        });
      },

      // =========================================================================
      // Z-order
      // =========================================================================

      bringToFront: (id) => {
        set((state) => {
          if (!state.dockers[id]) return state;

          const filtered = state.activeDockerOrder.filter((dId) => dId !== id);
          return {
            activeDockerOrder: [...filtered, id],
          };
        });
      },

      // =========================================================================
      // Persistence
      // =========================================================================

      loadFromConfig: (dockers) => {
        const dockerMap: Record<string, Docker> = {};
        const order: string[] = [];

        for (const docker of dockers) {
          dockerMap[docker.id] = docker;
          order.push(docker.id);
        }

        set({
          dockers: dockerMap,
          activeDockerOrder: order,
          isLoading: false,
          error: null,
        });

        bus.emit(DockerEvents.CONFIG_LOADED, { count: dockers.length });
      },

      getConfig: () => {
        const state = get();
        return state.activeDockerOrder.map((id) => state.dockers[id]).filter(Boolean);
      },

      // =========================================================================
      // Utility
      // =========================================================================

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    })),
    { name: 'dockerStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// =============================================================================
// Selectors
// =============================================================================

/** Select all visible dockers in z-order */
export const selectVisibleDockers = (state: DockerStore): Docker[] =>
  state.activeDockerOrder
    .map((id) => state.dockers[id])
    .filter((d) => d && d.visible);

/** Select dockers docked to the left */
export const selectLeftDockedDockers = (state: DockerStore): Docker[] =>
  Object.values(state.dockers).filter((d) => d.dockMode === 'docked-left' && d.visible);

/** Select dockers docked to the right */
export const selectRightDockedDockers = (state: DockerStore): Docker[] =>
  Object.values(state.dockers).filter((d) => d.dockMode === 'docked-right' && d.visible);

/** Select floating dockers in z-order */
export const selectFloatingDockers = (state: DockerStore): Docker[] =>
  state.activeDockerOrder
    .map((id) => state.dockers[id])
    .filter((d) => d && d.dockMode === 'floating' && d.visible);

// =============================================================================
// Bus Subscriptions
// =============================================================================

/** Subscribe to docker-related bus events for cross-store coordination */
export function setupDockerBusSubscriptions(): void {
  // Currently no external events trigger docker state changes
  // This is here for future extensibility (e.g., widget deletion could remove from dockers)
}
