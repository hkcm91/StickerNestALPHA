/**
 * World Instance Factory
 *
 * @module kernel/world/world-instance
 *
 * @remarks
 * A World is an isolated instance of a canvas/room with its own:
 * - Canvas state (metadata, sharing settings)
 * - Widget instances (scoped to this world)
 * - History stack (undo/redo)
 * - Presence map (who's here)
 * - Scoped event bus (events routed only to this world)
 *
 * This enables multi-canvas scenarios where each room operates
 * independently without state leakage.
 */

import { createStore } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type {
  WorldMode,
  WorldStatus,
  WorldOptions,
  WorldSnapshot,
  PresenceSnapshot,
  WidgetInstanceSnapshot,
  HistorySnapshot,
  BusEvent,
  SpatialContext,
} from '@sn/types';
import { WorldEvents, WorldOptionsSchema } from '@sn/types';

import { createRingBuffer, type RingBuffer } from '../bus/ring-buffer';
import type { BusHandler, SubscribeOptions, Unsubscribe, IEventBus } from '../bus/types';

import { createTickLoop, type ITickLoop, type TickSystem } from './tick-loop';

// =============================================================================
// World-Scoped Event Bus
// =============================================================================

interface HandlerEntry {
  handler: BusHandler;
  priority: number;
  once: boolean;
}

/**
 * Creates an isolated event bus for a world instance
 */
function createWorldEventBus(historySize: number): IEventBus {
  const handlers = new Map<string, Set<HandlerEntry>>();
  const wildcardHandlers = new Map<string, Set<HandlerEntry>>();
  const allHandlers = new Set<HandlerEntry>();
  const history = createRingBuffer<BusEvent>(historySize);

  function dispatch(handlerSet: Set<HandlerEntry>, event: BusEvent): void {
    const sorted =
      handlerSet.size > 1
        ? [...handlerSet].sort((a, b) => b.priority - a.priority)
        : handlerSet;

    const toRemove: HandlerEntry[] = [];

    for (const entry of sorted) {
      try {
        entry.handler(event);
      } catch (err) {
        console.error(`[WorldEventBus] Handler error for "${event.type}":`, err);
      }
      if (entry.once) {
        toRemove.push(entry);
      }
    }

    for (const entry of toRemove) {
      handlerSet.delete(entry);
    }
  }

  const bus: IEventBus = {
    get subscriptionCount(): number {
      let count = allHandlers.size;
      for (const set of handlers.values()) {
        count += set.size;
      }
      for (const set of wildcardHandlers.values()) {
        count += set.size;
      }
      return count;
    },

    emit<T>(type: string, payload: T, spatial?: SpatialContext): void {
      const event: BusEvent = {
        type,
        payload,
        spatial,
        timestamp: Date.now(),
      };
      history.push(event);

      const exact = handlers.get(type);
      if (exact) {
        dispatch(exact, event);
      }

      for (const [prefix, subs] of wildcardHandlers) {
        if (type.startsWith(prefix)) {
          dispatch(subs, event);
        }
      }

      if (allHandlers.size > 0) {
        dispatch(allHandlers, event);
      }
    },

    subscribe<T = unknown>(
      type: string,
      handler: BusHandler<T>,
      options?: SubscribeOptions,
    ): Unsubscribe {
      const entry: HandlerEntry = {
        handler: handler as BusHandler,
        priority: options?.priority ?? 0,
        once: options?.once ?? false,
      };

      if (type.endsWith('.*')) {
        const prefix = type.slice(0, -1);
        let set = wildcardHandlers.get(prefix);
        if (!set) {
          set = new Set();
          wildcardHandlers.set(prefix, set);
        }
        set.add(entry);
        return () => {
          set!.delete(entry);
          if (set!.size === 0) {
            wildcardHandlers.delete(prefix);
          }
        };
      }

      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(entry);
      return () => {
        set!.delete(entry);
        if (set!.size === 0) {
          handlers.delete(type);
        }
      };
    },

    subscribeAll(handler: BusHandler, options?: SubscribeOptions): Unsubscribe {
      const entry: HandlerEntry = {
        handler,
        priority: options?.priority ?? 0,
        once: options?.once ?? false,
      };
      allHandlers.add(entry);
      return () => {
        allHandlers.delete(entry);
      };
    },

    unsubscribeAll(): void {
      handlers.clear();
      wildcardHandlers.clear();
      allHandlers.clear();
    },

    getHistory(count?: number): ReadonlyArray<BusEvent> {
      if (count === undefined) {
        return history.getAll();
      }
      return history.getLast(count);
    },

    getHistoryByType(type: string, count?: number): ReadonlyArray<BusEvent> {
      const all = history.getAll().filter((e) => e.type === type);
      if (count === undefined) {
        return all;
      }
      return all.slice(-count);
    },

    bench(iterations: number = 10000) {
      const latencies: number[] = [];
      let handlerCalledAt = 0;

      const unsub = bus.subscribe('__bench__', () => {
        handlerCalledAt = performance.now();
      });

      for (let i = 0; i < iterations; i++) {
        const emitAt = performance.now();
        bus.emit('__bench__', { i });
        latencies.push((handlerCalledAt - emitAt) * 1000);
      }

      unsub();

      latencies.sort((a, b) => a - b);
      const sum = latencies.reduce((acc, v) => acc + v, 0);
      const avgLatencyUs = sum / latencies.length;
      const medianLatencyUs = latencies[Math.floor(latencies.length / 2)];
      const p99LatencyUs = latencies[Math.floor(latencies.length * 0.99)];
      const totalTimeMs = sum / 1000;
      const eventsPerSecond =
        totalTimeMs > 0 ? Math.round((iterations / totalTimeMs) * 1000) : Infinity;

      return {
        avgLatencyUs,
        medianLatencyUs,
        p99LatencyUs,
        eventsPerSecond,
        sampleSize: iterations,
      };
    },
  };

  return bus;
}

// =============================================================================
// World-Scoped Stores
// =============================================================================

interface WorldCanvasState {
  canvasId: string;
  name: string;
  slug: string | null;
  ownerId: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  settings: Record<string, unknown>;
}

interface WorldWidgetInstance {
  instanceId: string;
  widgetId: string;
  state: Record<string, unknown>;
  config: Record<string, unknown>;
}

interface WorldPresenceEntry {
  userId: string;
  displayName: string;
  color: string;
  cursorPosition?: { x: number; y: number };
  joinedAt: string;
}

interface WorldHistoryEntry {
  event: BusEvent;
  inverse: BusEvent;
}

// =============================================================================
// World Instance Interface
// =============================================================================

export interface WorldInstance {
  /** Unique world instance ID */
  readonly id: string;

  /** The canvas ID this world represents */
  readonly canvasId: string;

  /** World operating mode */
  readonly mode: WorldMode;

  /** World lifecycle status */
  readonly status: WorldStatus;

  /** Creation timestamp */
  readonly createdAt: Date;

  /** Isolated event bus for this world */
  readonly bus: IEventBus;

  /**
   * Tick loop for game-mode worlds (undefined for dashboard mode)
   * @remarks Only available when mode === 'game'
   */
  readonly tickLoop: ITickLoop | undefined;

  // ---------------------------------------------------------------------------
  // Lifecycle Methods
  // ---------------------------------------------------------------------------

  /** Start the world (transitions from 'ready' to 'running') */
  start(): void;

  /** Suspend the world (e.g., tab switch, background) */
  suspend(): void;

  /** Resume from suspension */
  resume(): void;

  /** Destroy the world and clean up resources */
  destroy(): void;

  // ---------------------------------------------------------------------------
  // Canvas State
  // ---------------------------------------------------------------------------

  /** Get canvas metadata */
  getCanvasState(): WorldCanvasState | null;

  /** Set canvas metadata */
  setCanvasState(state: WorldCanvasState): void;

  // ---------------------------------------------------------------------------
  // Widget Instances
  // ---------------------------------------------------------------------------

  /** Get all widget instances in this world */
  getWidgetInstances(): Map<string, WorldWidgetInstance>;

  /** Add a widget instance */
  addWidgetInstance(instance: WorldWidgetInstance): void;

  /** Remove a widget instance */
  removeWidgetInstance(instanceId: string): void;

  /** Update a widget instance's state */
  updateWidgetState(instanceId: string, state: Record<string, unknown>): void;

  /** Update a widget instance's config */
  updateWidgetConfig(instanceId: string, config: Record<string, unknown>): void;

  // ---------------------------------------------------------------------------
  // Presence
  // ---------------------------------------------------------------------------

  /** Get all presence entries */
  getPresence(): Map<string, WorldPresenceEntry>;

  /** Join presence */
  joinPresence(entry: WorldPresenceEntry): void;

  /** Leave presence */
  leavePresence(userId: string): void;

  /** Update cursor position */
  updateCursor(userId: string, position: { x: number; y: number }): void;

  // ---------------------------------------------------------------------------
  // History (Undo/Redo)
  // ---------------------------------------------------------------------------

  /** Whether undo is available */
  canUndo(): boolean;

  /** Whether redo is available */
  canRedo(): boolean;

  /** Perform undo */
  undo(): void;

  /** Perform redo */
  redo(): void;

  /** Push an undoable action onto the history stack */
  pushHistory(event: BusEvent, inverse: BusEvent): void;

  /** Clear history */
  clearHistory(): void;

  // ---------------------------------------------------------------------------
  // Snapshots (for serialization/debugging)
  // ---------------------------------------------------------------------------

  /** Get a snapshot of the world state */
  getSnapshot(): WorldSnapshot;
}

// =============================================================================
// World Instance Implementation
// =============================================================================

interface InternalWorldState {
  status: WorldStatus;
  canvas: WorldCanvasState | null;
  widgetInstances: Map<string, WorldWidgetInstance>;
  presence: Map<string, WorldPresenceEntry>;
  undoStack: WorldHistoryEntry[];
  redoStack: WorldHistoryEntry[];
}

/**
 * Creates an isolated world instance for a canvas
 */
export function createWorldInstance(
  canvasId: string,
  options?: Partial<WorldOptions>,
): WorldInstance {
  // Parse and apply defaults
  const parsedOptions = WorldOptionsSchema.parse(options ?? {});
  const { mode, tickRate, maxHistorySize, enablePresence, preloadWidgets } = parsedOptions;

  // Generate unique world ID
  const id = crypto.randomUUID();
  const createdAt = new Date();

  // Create isolated event bus
  const bus = createWorldEventBus(maxHistorySize);

  // Create tick loop for game-mode worlds only
  const tickLoop = mode === 'game' ? createTickLoop({ tickRate }) : undefined;

  // Create internal state store (not exposed to global)
  const stateStore = createStore<InternalWorldState>()(
    subscribeWithSelector(() => ({
      status: 'initializing' as WorldStatus,
      canvas: null,
      widgetInstances: new Map(),
      presence: new Map(),
      undoStack: [],
      redoStack: [],
    })),
  );

  // Helper to get current state
  const getState = () => stateStore.getState();
  const setState = stateStore.setState;

  // Track cleanup functions
  const cleanupFns: Unsubscribe[] = [];

  // ---------------------------------------------------------------------------
  // World Instance Object
  // ---------------------------------------------------------------------------

  const world: WorldInstance = {
    id,
    canvasId,
    mode,
    createdAt,
    bus,
    tickLoop,

    get status(): WorldStatus {
      return getState().status;
    },

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    start() {
      const current = getState().status;
      if (current !== 'ready') {
        console.warn(`[World:${id}] Cannot start from status "${current}"`);
        return;
      }
      setState({ status: 'running' });

      // Start tick loop for game-mode worlds
      if (tickLoop) {
        tickLoop.start();
      }

      bus.emit(WorldEvents.FOCUSED, { worldId: id, canvasId });
    },

    suspend() {
      const current = getState().status;
      if (current !== 'running') {
        return;
      }

      // Pause tick loop
      if (tickLoop) {
        tickLoop.pause();
      }

      setState({ status: 'suspended' });
      bus.emit(WorldEvents.SUSPENDED, { worldId: id, canvasId });
    },

    resume() {
      const current = getState().status;
      if (current !== 'suspended') {
        return;
      }
      setState({ status: 'running' });

      // Resume tick loop
      if (tickLoop) {
        tickLoop.resume();
      }

      bus.emit(WorldEvents.RESUMED, { worldId: id, canvasId });
    },

    destroy() {
      const current = getState().status;
      if (current === 'destroyed' || current === 'destroying') {
        return;
      }

      setState({ status: 'destroying' });
      bus.emit(WorldEvents.DESTROYING, { worldId: id, canvasId });

      // Dispose tick loop
      if (tickLoop) {
        tickLoop.dispose();
      }

      // Run all cleanup functions
      for (const cleanup of cleanupFns) {
        try {
          cleanup();
        } catch (err) {
          console.error(`[World:${id}] Cleanup error:`, err);
        }
      }
      cleanupFns.length = 0;

      // Clear state
      setState({
        status: 'destroyed',
        canvas: null,
        widgetInstances: new Map(),
        presence: new Map(),
        undoStack: [],
        redoStack: [],
      });

      // Emit DESTROYED before clearing subscriptions so managers can react
      bus.emit(WorldEvents.DESTROYED, { worldId: id, canvasId });

      // Clear all subscriptions last
      bus.unsubscribeAll();
    },

    // -------------------------------------------------------------------------
    // Canvas State
    // -------------------------------------------------------------------------

    getCanvasState() {
      return getState().canvas;
    },

    setCanvasState(canvas) {
      setState({ canvas });
    },

    // -------------------------------------------------------------------------
    // Widget Instances
    // -------------------------------------------------------------------------

    getWidgetInstances() {
      return new Map(getState().widgetInstances);
    },

    addWidgetInstance(instance) {
      const current = getState().widgetInstances;
      const updated = new Map(current);
      updated.set(instance.instanceId, instance);
      setState({ widgetInstances: updated });
    },

    removeWidgetInstance(instanceId) {
      const current = getState().widgetInstances;
      if (!current.has(instanceId)) return;
      const updated = new Map(current);
      updated.delete(instanceId);
      setState({ widgetInstances: updated });
    },

    updateWidgetState(instanceId, state) {
      const current = getState().widgetInstances;
      const instance = current.get(instanceId);
      if (!instance) return;
      const updated = new Map(current);
      updated.set(instanceId, { ...instance, state });
      setState({ widgetInstances: updated });
    },

    updateWidgetConfig(instanceId, config) {
      const current = getState().widgetInstances;
      const instance = current.get(instanceId);
      if (!instance) return;
      const updated = new Map(current);
      updated.set(instanceId, { ...instance, config });
      setState({ widgetInstances: updated });
    },

    // -------------------------------------------------------------------------
    // Presence
    // -------------------------------------------------------------------------

    getPresence() {
      return new Map(getState().presence);
    },

    joinPresence(entry) {
      if (!enablePresence) return;
      const current = getState().presence;
      const updated = new Map(current);
      updated.set(entry.userId, entry);
      setState({ presence: updated });
    },

    leavePresence(userId) {
      if (!enablePresence) return;
      const current = getState().presence;
      if (!current.has(userId)) return;
      const updated = new Map(current);
      updated.delete(userId);
      setState({ presence: updated });
    },

    updateCursor(userId, position) {
      if (!enablePresence) return;
      const current = getState().presence;
      const entry = current.get(userId);
      if (!entry) return;
      const updated = new Map(current);
      updated.set(userId, { ...entry, cursorPosition: position });
      setState({ presence: updated });
    },

    // -------------------------------------------------------------------------
    // History (Undo/Redo)
    // -------------------------------------------------------------------------

    canUndo() {
      return getState().undoStack.length > 0;
    },

    canRedo() {
      return getState().redoStack.length > 0;
    },

    undo() {
      const { undoStack, redoStack } = getState();
      if (undoStack.length === 0) return;

      const entry = undoStack[undoStack.length - 1];
      const newUndo = undoStack.slice(0, -1);
      const newRedo = [...redoStack, entry];

      // Apply the inverse event
      bus.emit(entry.inverse.type, entry.inverse.payload, entry.inverse.spatial);

      // Enforce max size on redo
      while (newRedo.length > maxHistorySize) {
        newRedo.shift();
      }

      setState({ undoStack: newUndo, redoStack: newRedo });
    },

    redo() {
      const { undoStack, redoStack } = getState();
      if (redoStack.length === 0) return;

      const entry = redoStack[redoStack.length - 1];
      const newRedo = redoStack.slice(0, -1);
      const newUndo = [...undoStack, entry];

      // Apply the original event
      bus.emit(entry.event.type, entry.event.payload, entry.event.spatial);

      // Enforce max size on undo
      while (newUndo.length > maxHistorySize) {
        newUndo.shift();
      }

      setState({ undoStack: newUndo, redoStack: newRedo });
    },

    pushHistory(event, inverse) {
      const { undoStack } = getState();
      const newEntry: WorldHistoryEntry = { event, inverse };
      const newUndo = [...undoStack, newEntry];

      // Enforce max size
      while (newUndo.length > maxHistorySize) {
        newUndo.shift();
      }

      // Clear redo on new action (standard undo/redo behavior)
      setState({ undoStack: newUndo, redoStack: [] });
    },

    clearHistory() {
      setState({ undoStack: [], redoStack: [] });
    },

    // -------------------------------------------------------------------------
    // Snapshots
    // -------------------------------------------------------------------------

    getSnapshot(): WorldSnapshot {
      const state = getState();

      const presence: PresenceSnapshot[] = Array.from(state.presence.values()).map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        color: p.color,
        cursorPosition: p.cursorPosition,
        joinedAt: p.joinedAt,
      }));

      const widgetInstances: WidgetInstanceSnapshot[] = Array.from(
        state.widgetInstances.values(),
      ).map((w) => ({
        instanceId: w.instanceId,
        widgetId: w.widgetId,
        state: w.state,
        config: w.config,
      }));

      const history: HistorySnapshot = {
        undoCount: state.undoStack.length,
        redoCount: state.redoStack.length,
        canUndo: state.undoStack.length > 0,
        canRedo: state.redoStack.length > 0,
      };

      return {
        id,
        canvasId,
        status: state.status,
        mode,
        createdAt: createdAt.toISOString(),
        presence,
        widgetInstances,
        history,
      };
    },
  };

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  // Emit creation event
  bus.emit(WorldEvents.CREATED, { worldId: id, canvasId, mode });

  // Transition to ready
  setState({ status: 'ready' });
  bus.emit(WorldEvents.READY, { worldId: id, canvasId });

  return world;
}
