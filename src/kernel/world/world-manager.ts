/**
 * World Manager — Multi-World Coordinator
 *
 * @module kernel/world/world-manager
 *
 * @remarks
 * Manages multiple world instances, handling:
 * - World creation and destruction
 * - Active world tracking
 * - Focus switching between worlds
 * - Global event forwarding (optional)
 * - World lookup by ID or canvasId
 */

import type { WorldOptions, WorldStatus } from '@sn/types';
import { WorldEvents } from '@sn/types';

import { bus } from '../bus';
import type { Unsubscribe } from '../bus/types';

import { createWorldInstance, type WorldInstance } from './world-instance';

// =============================================================================
// World Manager Interface
// =============================================================================

export interface WorldManager {
  /** Get the currently active (focused) world */
  readonly activeWorld: WorldInstance | null;

  /** Get count of all managed worlds */
  readonly worldCount: number;

  /**
   * Create a new world instance for a canvas
   * @param canvasId The canvas ID this world represents
   * @param options World configuration options
   * @returns The created world instance
   */
  createWorld(canvasId: string, options?: Partial<WorldOptions>): WorldInstance;

  /**
   * Get a world by its instance ID
   */
  getWorld(worldId: string): WorldInstance | undefined;

  /**
   * Get a world by canvas ID
   * @remarks Returns the first world found for this canvas
   */
  getWorldByCanvasId(canvasId: string): WorldInstance | undefined;

  /**
   * Get all worlds for a canvas ID
   * @remarks Supports multiple worlds per canvas (e.g., different views)
   */
  getWorldsForCanvas(canvasId: string): WorldInstance[];

  /**
   * Get all managed worlds
   */
  getAllWorlds(): WorldInstance[];

  /**
   * Set a world as the active (focused) world
   * @param worldId The world instance ID to focus
   * @returns true if focus was changed, false if world not found
   */
  focusWorld(worldId: string): boolean;

  /**
   * Destroy a world instance
   * @param worldId The world instance ID to destroy
   * @returns true if world was destroyed, false if not found
   */
  destroyWorld(worldId: string): boolean;

  /**
   * Destroy all worlds for a canvas
   * @returns Number of worlds destroyed
   */
  destroyWorldsForCanvas(canvasId: string): number;

  /**
   * Destroy all managed worlds
   */
  destroyAllWorlds(): void;

  /**
   * Subscribe to world manager events
   * @param event The event type to subscribe to
   * @param handler The handler function
   * @returns Unsubscribe function
   */
  on<T = unknown>(event: WorldManagerEvent, handler: (payload: T) => void): Unsubscribe;

  /**
   * Dispose the world manager and all its resources
   */
  dispose(): void;
}

// =============================================================================
// World Manager Events
// =============================================================================

export type WorldManagerEvent =
  | 'world:created'
  | 'world:destroyed'
  | 'world:focused'
  | 'world:blurred';

interface WorldManagerEventPayload {
  'world:created': { world: WorldInstance };
  'world:destroyed': { worldId: string; canvasId: string };
  'world:focused': { world: WorldInstance; previous: WorldInstance | null };
  'world:blurred': { world: WorldInstance };
}

// =============================================================================
// World Manager Implementation
// =============================================================================

interface InternalManagerState {
  worlds: Map<string, WorldInstance>;
  canvasIndex: Map<string, Set<string>>; // canvasId -> Set<worldId>
  activeWorldId: string | null;
  handlers: Map<WorldManagerEvent, Set<(payload: unknown) => void>>;
}

/**
 * Creates a world manager for coordinating multiple world instances
 */
export function createWorldManager(): WorldManager {
  const state: InternalManagerState = {
    worlds: new Map(),
    canvasIndex: new Map(),
    activeWorldId: null,
    handlers: new Map(),
  };

  // Global bus subscriptions for cleanup
  const globalCleanup: Unsubscribe[] = [];

  // Helper to emit manager events
  function emitEvent<E extends WorldManagerEvent>(
    event: E,
    payload: WorldManagerEventPayload[E],
  ): void {
    const handlers = state.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[WorldManager] Handler error for "${event}":`, err);
        }
      }
    }

    // Also emit to global bus with manager namespace
    bus.emit(`world.manager.${event.replace(':', '.')}`, payload);
  }

  // Helper to index world by canvas
  function indexWorld(world: WorldInstance): void {
    let worldIds = state.canvasIndex.get(world.canvasId);
    if (!worldIds) {
      worldIds = new Set();
      state.canvasIndex.set(world.canvasId, worldIds);
    }
    worldIds.add(world.id);
  }

  // Helper to unindex world
  function unindexWorld(worldId: string, canvasId: string): void {
    const worldIds = state.canvasIndex.get(canvasId);
    if (worldIds) {
      worldIds.delete(worldId);
      if (worldIds.size === 0) {
        state.canvasIndex.delete(canvasId);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // World Manager Object
  // ---------------------------------------------------------------------------

  const manager: WorldManager = {
    get activeWorld(): WorldInstance | null {
      if (!state.activeWorldId) return null;
      return state.worlds.get(state.activeWorldId) ?? null;
    },

    get worldCount(): number {
      return state.worlds.size;
    },

    createWorld(canvasId: string, options?: Partial<WorldOptions>): WorldInstance {
      const world = createWorldInstance(canvasId, options);

      // Store in manager
      state.worlds.set(world.id, world);
      indexWorld(world);

      // Subscribe to world lifecycle events for cleanup
      const worldCleanup = world.bus.subscribe(WorldEvents.DESTROYED, () => {
        // Auto-remove from manager when world is destroyed externally
        if (state.worlds.has(world.id)) {
          state.worlds.delete(world.id);
          unindexWorld(world.id, world.canvasId);

          // Clear active if this was the active world
          if (state.activeWorldId === world.id) {
            state.activeWorldId = null;
          }
        }
      });

      // Track cleanup for dispose
      globalCleanup.push(worldCleanup);

      // Emit creation event
      emitEvent('world:created', { world });

      return world;
    },

    getWorld(worldId: string): WorldInstance | undefined {
      return state.worlds.get(worldId);
    },

    getWorldByCanvasId(canvasId: string): WorldInstance | undefined {
      const worldIds = state.canvasIndex.get(canvasId);
      if (!worldIds || worldIds.size === 0) return undefined;
      // Return the first one (usually there's only one)
      const firstId = worldIds.values().next().value;
      return firstId ? state.worlds.get(firstId) : undefined;
    },

    getWorldsForCanvas(canvasId: string): WorldInstance[] {
      const worldIds = state.canvasIndex.get(canvasId);
      if (!worldIds) return [];
      return Array.from(worldIds)
        .map((id) => state.worlds.get(id))
        .filter((w): w is WorldInstance => w !== undefined);
    },

    getAllWorlds(): WorldInstance[] {
      return Array.from(state.worlds.values());
    },

    focusWorld(worldId: string): boolean {
      const world = state.worlds.get(worldId);
      if (!world) return false;

      const previous = manager.activeWorld;

      // Blur previous world
      if (previous && previous.id !== worldId) {
        previous.suspend();
        emitEvent('world:blurred', { world: previous });
      }

      // Focus new world
      state.activeWorldId = worldId;
      if (world.status === 'ready' || world.status === 'suspended') {
        if (world.status === 'suspended') {
          world.resume();
        } else {
          world.start();
        }
      }

      emitEvent('world:focused', { world, previous });

      return true;
    },

    destroyWorld(worldId: string): boolean {
      const world = state.worlds.get(worldId);
      if (!world) return false;

      const canvasId = world.canvasId;

      // Remove from manager first
      state.worlds.delete(worldId);
      unindexWorld(worldId, canvasId);

      // Clear active if this was the active world
      if (state.activeWorldId === worldId) {
        state.activeWorldId = null;
      }

      // Destroy the world
      world.destroy();

      // Emit destroyed event
      emitEvent('world:destroyed', { worldId, canvasId });

      return true;
    },

    destroyWorldsForCanvas(canvasId: string): number {
      const worldIds = state.canvasIndex.get(canvasId);
      if (!worldIds) return 0;

      const ids = Array.from(worldIds);
      let count = 0;

      for (const worldId of ids) {
        if (manager.destroyWorld(worldId)) {
          count++;
        }
      }

      return count;
    },

    destroyAllWorlds(): void {
      const worldIds = Array.from(state.worlds.keys());
      for (const worldId of worldIds) {
        manager.destroyWorld(worldId);
      }
    },

    on<T = unknown>(event: WorldManagerEvent, handler: (payload: T) => void): Unsubscribe {
      let handlers = state.handlers.get(event);
      if (!handlers) {
        handlers = new Set();
        state.handlers.set(event, handlers);
      }
      const h = handler as (payload: unknown) => void;
      handlers.add(h);
      return () => {
        handlers!.delete(h);
        if (handlers!.size === 0) {
          state.handlers.delete(event);
        }
      };
    },

    dispose(): void {
      // Destroy all worlds
      manager.destroyAllWorlds();

      // Run global cleanup
      for (const cleanup of globalCleanup) {
        try {
          cleanup();
        } catch (err) {
          console.error('[WorldManager] Cleanup error:', err);
        }
      }
      globalCleanup.length = 0;

      // Clear all handlers
      state.handlers.clear();
    },
  };

  return manager;
}
