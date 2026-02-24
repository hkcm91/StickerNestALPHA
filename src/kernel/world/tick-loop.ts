/**
 * Tick Loop — Game-Mode Frame Loop
 *
 * @module kernel/world/tick-loop
 *
 * @remarks
 * Provides a fixed-timestep game loop using requestAnimationFrame.
 * Only used for game-mode worlds that need physics/animation systems.
 * Dashboard-mode worlds remain event-driven with no tick overhead.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Context passed to systems each tick
 */
export interface TickContext {
  /** Time since last tick in seconds */
  deltaTime: number;
  /** Total elapsed time since loop started in seconds */
  elapsedTime: number;
  /** Current tick number (frame count) */
  tickNumber: number;
  /** Target tick rate in Hz */
  tickRate: number;
  /** Fixed timestep for physics calculations (1/tickRate) */
  fixedDeltaTime: number;
}

/**
 * A system that processes entities each tick
 */
export interface TickSystem {
  /** Unique system name */
  readonly name: string;
  /** Priority for ordering (higher = runs first) */
  readonly priority: number;
  /** Called each tick with timing context */
  tick(ctx: TickContext): void;
  /** Optional: Called when system is registered */
  onRegister?(): void;
  /** Optional: Called when system is unregistered */
  onUnregister?(): void;
}

/**
 * Tick loop state
 */
export type TickLoopState = 'stopped' | 'running' | 'paused';

/**
 * Tick loop options
 */
export interface TickLoopOptions {
  /** Target tick rate in Hz (default: 60) */
  tickRate?: number;
  /** Maximum delta time to prevent spiral of death (default: 0.1s) */
  maxDeltaTime?: number;
  /** Whether to use fixed timestep accumulator (default: true) */
  useFixedTimestep?: boolean;
}

/**
 * Tick loop interface
 */
export interface ITickLoop {
  /** Current loop state */
  readonly state: TickLoopState;
  /** Target tick rate */
  readonly tickRate: number;
  /** Current tick number */
  readonly tickNumber: number;
  /** Total elapsed time in seconds */
  readonly elapsedTime: number;
  /** Number of registered systems */
  readonly systemCount: number;

  /** Start the tick loop */
  start(): void;
  /** Stop the tick loop (resets state) */
  stop(): void;
  /** Pause the tick loop (preserves state) */
  pause(): void;
  /** Resume from paused state */
  resume(): void;

  /** Register a system to run each tick */
  registerSystem(system: TickSystem): void;
  /** Unregister a system by name */
  unregisterSystem(name: string): void;
  /** Get a registered system by name */
  getSystem<T extends TickSystem>(name: string): T | undefined;
  /** Check if a system is registered */
  hasSystem(name: string): boolean;

  /** Subscribe to tick events (for debugging/monitoring) */
  onTick(handler: (ctx: TickContext) => void): () => void;
  /** Subscribe to state changes */
  onStateChange(handler: (state: TickLoopState) => void): () => void;

  /** Dispose the tick loop and clean up */
  dispose(): void;
}

// =============================================================================
// Implementation
// =============================================================================

const DEFAULT_TICK_RATE = 60;
const DEFAULT_MAX_DELTA_TIME = 0.1; // 100ms max to prevent spiral of death

/**
 * Creates a tick loop for game-mode worlds
 */
export function createTickLoop(options?: TickLoopOptions): ITickLoop {
  const tickRate = options?.tickRate ?? DEFAULT_TICK_RATE;
  const maxDeltaTime = options?.maxDeltaTime ?? DEFAULT_MAX_DELTA_TIME;
  const useFixedTimestep = options?.useFixedTimestep ?? true;
  const fixedDeltaTime = 1 / tickRate;

  // State
  let state: TickLoopState = 'stopped';
  let tickNumber = 0;
  let elapsedTime = 0;
  let lastTimestamp = 0;
  let accumulator = 0;
  let rafId: number | null = null;

  // Systems sorted by priority (higher first)
  const systems = new Map<string, TickSystem>();
  let sortedSystems: TickSystem[] = [];

  // Event handlers
  const tickHandlers = new Set<(ctx: TickContext) => void>();
  const stateHandlers = new Set<(state: TickLoopState) => void>();

  // Helper to re-sort systems by priority
  function sortSystems(): void {
    sortedSystems = Array.from(systems.values()).sort(
      (a, b) => b.priority - a.priority
    );
  }

  // Helper to notify state change
  function notifyStateChange(newState: TickLoopState): void {
    state = newState;
    for (const handler of stateHandlers) {
      try {
        handler(newState);
      } catch (err) {
        console.error('[TickLoop] State handler error:', err);
      }
    }
  }

  // The main tick function
  function tick(timestamp: number): void {
    if (state !== 'running') return;

    // Calculate delta time in seconds
    const rawDeltaTime = lastTimestamp > 0 ? (timestamp - lastTimestamp) / 1000 : fixedDeltaTime;
    const deltaTime = Math.min(rawDeltaTime, maxDeltaTime);
    lastTimestamp = timestamp;

    if (useFixedTimestep) {
      // Fixed timestep with accumulator
      accumulator += deltaTime;

      while (accumulator >= fixedDeltaTime) {
        tickNumber++;
        elapsedTime += fixedDeltaTime;

        const ctx: TickContext = {
          deltaTime: fixedDeltaTime,
          elapsedTime,
          tickNumber,
          tickRate,
          fixedDeltaTime,
        };

        // Run all systems
        for (const system of sortedSystems) {
          try {
            system.tick(ctx);
          } catch (err) {
            console.error(`[TickLoop] System "${system.name}" error:`, err);
          }
        }

        // Notify tick handlers
        for (const handler of tickHandlers) {
          try {
            handler(ctx);
          } catch (err) {
            console.error('[TickLoop] Tick handler error:', err);
          }
        }

        accumulator -= fixedDeltaTime;
      }
    } else {
      // Variable timestep
      tickNumber++;
      elapsedTime += deltaTime;

      const ctx: TickContext = {
        deltaTime,
        elapsedTime,
        tickNumber,
        tickRate,
        fixedDeltaTime,
      };

      // Run all systems
      for (const system of sortedSystems) {
        try {
          system.tick(ctx);
        } catch (err) {
          console.error(`[TickLoop] System "${system.name}" error:`, err);
        }
      }

      // Notify tick handlers
      for (const handler of tickHandlers) {
        try {
          handler(ctx);
        } catch (err) {
          console.error('[TickLoop] Tick handler error:', err);
        }
      }
    }

    // Schedule next frame
    rafId = requestAnimationFrame(tick);
  }

  // ---------------------------------------------------------------------------
  // Tick Loop Object
  // ---------------------------------------------------------------------------

  const loop: ITickLoop = {
    get state() {
      return state;
    },
    get tickRate() {
      return tickRate;
    },
    get tickNumber() {
      return tickNumber;
    },
    get elapsedTime() {
      return elapsedTime;
    },
    get systemCount() {
      return systems.size;
    },

    start() {
      if (state === 'running') return;

      // Reset state on fresh start
      if (state === 'stopped') {
        tickNumber = 0;
        elapsedTime = 0;
        accumulator = 0;
      }

      lastTimestamp = 0;
      notifyStateChange('running');
      rafId = requestAnimationFrame(tick);
    },

    stop() {
      if (state === 'stopped') return;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      tickNumber = 0;
      elapsedTime = 0;
      accumulator = 0;
      lastTimestamp = 0;
      notifyStateChange('stopped');
    },

    pause() {
      if (state !== 'running') return;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      notifyStateChange('paused');
    },

    resume() {
      if (state !== 'paused') return;

      lastTimestamp = 0; // Will use fixedDeltaTime for first frame
      notifyStateChange('running');
      rafId = requestAnimationFrame(tick);
    },

    registerSystem(system: TickSystem) {
      if (systems.has(system.name)) {
        console.warn(`[TickLoop] System "${system.name}" already registered`);
        return;
      }

      systems.set(system.name, system);
      sortSystems();

      if (system.onRegister) {
        try {
          system.onRegister();
        } catch (err) {
          console.error(`[TickLoop] System "${system.name}" onRegister error:`, err);
        }
      }
    },

    unregisterSystem(name: string) {
      const system = systems.get(name);
      if (!system) return;

      if (system.onUnregister) {
        try {
          system.onUnregister();
        } catch (err) {
          console.error(`[TickLoop] System "${system.name}" onUnregister error:`, err);
        }
      }

      systems.delete(name);
      sortSystems();
    },

    getSystem<T extends TickSystem>(name: string): T | undefined {
      return systems.get(name) as T | undefined;
    },

    hasSystem(name: string): boolean {
      return systems.has(name);
    },

    onTick(handler: (ctx: TickContext) => void): () => void {
      tickHandlers.add(handler);
      return () => {
        tickHandlers.delete(handler);
      };
    },

    onStateChange(handler: (state: TickLoopState) => void): () => void {
      stateHandlers.add(handler);
      return () => {
        stateHandlers.delete(handler);
      };
    },

    dispose() {
      // Stop the loop
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // Unregister all systems
      for (const system of systems.values()) {
        if (system.onUnregister) {
          try {
            system.onUnregister();
          } catch (err) {
            console.error(`[TickLoop] System "${system.name}" onUnregister error:`, err);
          }
        }
      }
      systems.clear();
      sortedSystems = [];

      // Notify state change before clearing handlers
      notifyStateChange('stopped');

      // Clear handlers
      tickHandlers.clear();
      stateHandlers.clear();
    },
  };

  return loop;
}
