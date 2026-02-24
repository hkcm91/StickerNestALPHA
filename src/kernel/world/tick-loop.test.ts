/**
 * Tick Loop Tests
 *
 * @module kernel/world/tick-loop.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createTickLoop, type TickSystem, type TickContext } from './tick-loop';

// Mock requestAnimationFrame and cancelAnimationFrame
let rafCallbacks: Map<number, (timestamp: number) => void>;
let nextRafId: number;
let mockTime: number;

beforeEach(() => {
  rafCallbacks = new Map();
  nextRafId = 1;
  mockTime = 0;

  vi.stubGlobal('requestAnimationFrame', (callback: (timestamp: number) => void) => {
    const id = nextRafId++;
    rafCallbacks.set(id, callback);
    return id;
  });

  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks.delete(id);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Helper to advance time and trigger one round of RAF callbacks
function advanceTime(ms: number): void {
  mockTime += ms;
  const callbacks = Array.from(rafCallbacks.entries());
  rafCallbacks.clear();
  for (const [, callback] of callbacks) {
    callback(mockTime);
  }
}

// Helper to create a simple test system
function createTestSystem(name: string, priority: number): TickSystem & { ticks: TickContext[] } {
  const ticks: TickContext[] = [];
  return {
    name,
    priority,
    ticks,
    tick(ctx: TickContext) {
      ticks.push({ ...ctx });
    },
  };
}

describe('createTickLoop', () => {
  describe('initial state', () => {
    it('starts in stopped state', () => {
      const loop = createTickLoop();
      expect(loop.state).toBe('stopped');
    });

    it('has default tick rate of 60', () => {
      const loop = createTickLoop();
      expect(loop.tickRate).toBe(60);
    });

    it('accepts custom tick rate', () => {
      const loop = createTickLoop({ tickRate: 30 });
      expect(loop.tickRate).toBe(30);
    });

    it('starts with zero tick number', () => {
      const loop = createTickLoop();
      expect(loop.tickNumber).toBe(0);
    });

    it('starts with zero elapsed time', () => {
      const loop = createTickLoop();
      expect(loop.elapsedTime).toBe(0);
    });

    it('starts with zero system count', () => {
      const loop = createTickLoop();
      expect(loop.systemCount).toBe(0);
    });
  });

  describe('start/stop lifecycle', () => {
    it('transitions to running state on start', () => {
      const loop = createTickLoop();
      loop.start();
      expect(loop.state).toBe('running');
    });

    it('transitions to stopped state on stop', () => {
      const loop = createTickLoop();
      loop.start();
      loop.stop();
      expect(loop.state).toBe('stopped');
    });

    it('resets tick number on stop', () => {
      const loop = createTickLoop();
      loop.start();
      advanceTime(100);
      loop.stop();
      expect(loop.tickNumber).toBe(0);
    });

    it('resets elapsed time on stop', () => {
      const loop = createTickLoop();
      loop.start();
      advanceTime(100);
      loop.stop();
      expect(loop.elapsedTime).toBe(0);
    });

    it('ignores start when already running', () => {
      const stateChanges: string[] = [];
      const loop = createTickLoop();
      loop.onStateChange((state) => stateChanges.push(state));
      loop.start();
      loop.start();
      expect(stateChanges).toEqual(['running']);
    });

    it('ignores stop when already stopped', () => {
      const stateChanges: string[] = [];
      const loop = createTickLoop();
      loop.onStateChange((state) => stateChanges.push(state));
      loop.stop();
      expect(stateChanges).toEqual([]);
    });
  });

  describe('pause/resume lifecycle', () => {
    it('transitions to paused state on pause', () => {
      const loop = createTickLoop();
      loop.start();
      loop.pause();
      expect(loop.state).toBe('paused');
    });

    it('preserves tick number on pause', () => {
      const loop = createTickLoop();
      loop.start();
      advanceTime(100);
      const tickNumber = loop.tickNumber;
      loop.pause();
      expect(loop.tickNumber).toBe(tickNumber);
    });

    it('preserves elapsed time on pause', () => {
      const loop = createTickLoop();
      loop.start();
      advanceTime(100);
      const elapsed = loop.elapsedTime;
      loop.pause();
      expect(loop.elapsedTime).toBe(elapsed);
    });

    it('transitions to running state on resume', () => {
      const loop = createTickLoop();
      loop.start();
      loop.pause();
      loop.resume();
      expect(loop.state).toBe('running');
    });

    it('ignores pause when not running', () => {
      const stateChanges: string[] = [];
      const loop = createTickLoop();
      loop.onStateChange((state) => stateChanges.push(state));
      loop.pause();
      expect(stateChanges).toEqual([]);
    });

    it('ignores resume when not paused', () => {
      const stateChanges: string[] = [];
      const loop = createTickLoop();
      loop.start();
      loop.onStateChange((state) => stateChanges.push(state));
      loop.resume();
      expect(stateChanges).toEqual([]);
    });
  });

  describe('system registration', () => {
    it('registers a system', () => {
      const loop = createTickLoop();
      const system = createTestSystem('test', 0);
      loop.registerSystem(system);
      expect(loop.systemCount).toBe(1);
      expect(loop.hasSystem('test')).toBe(true);
    });

    it('retrieves a system by name', () => {
      const loop = createTickLoop();
      const system = createTestSystem('test', 0);
      loop.registerSystem(system);
      expect(loop.getSystem('test')).toBe(system);
    });

    it('returns undefined for unknown system', () => {
      const loop = createTickLoop();
      expect(loop.getSystem('unknown')).toBeUndefined();
    });

    it('unregisters a system', () => {
      const loop = createTickLoop();
      const system = createTestSystem('test', 0);
      loop.registerSystem(system);
      loop.unregisterSystem('test');
      expect(loop.systemCount).toBe(0);
      expect(loop.hasSystem('test')).toBe(false);
    });

    it('calls onRegister when system is registered', () => {
      const loop = createTickLoop();
      const onRegister = vi.fn();
      const system: TickSystem = {
        name: 'test',
        priority: 0,
        tick: vi.fn(),
        onRegister,
      };
      loop.registerSystem(system);
      expect(onRegister).toHaveBeenCalledOnce();
    });

    it('calls onUnregister when system is unregistered', () => {
      const loop = createTickLoop();
      const onUnregister = vi.fn();
      const system: TickSystem = {
        name: 'test',
        priority: 0,
        tick: vi.fn(),
        onUnregister,
      };
      loop.registerSystem(system);
      loop.unregisterSystem('test');
      expect(onUnregister).toHaveBeenCalledOnce();
    });

    it('warns when registering duplicate system name', () => {
      const loop = createTickLoop();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const system1 = createTestSystem('test', 0);
      const system2 = createTestSystem('test', 1);
      loop.registerSystem(system1);
      loop.registerSystem(system2);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('already registered'));
      expect(loop.systemCount).toBe(1);
      warnSpy.mockRestore();
    });
  });

  describe('tick execution', () => {
    it('calls system tick with context', () => {
      const loop = createTickLoop({ tickRate: 60 });
      const system = createTestSystem('test', 0);
      loop.registerSystem(system);
      loop.start();
      advanceTime(16.67); // ~1 frame at 60fps
      expect(system.ticks.length).toBeGreaterThan(0);
      const ctx = system.ticks[0];
      expect(ctx.tickRate).toBe(60);
      expect(ctx.fixedDeltaTime).toBeCloseTo(1 / 60, 5);
    });

    it('executes systems in priority order (higher first)', () => {
      const loop = createTickLoop();
      const executionOrder: string[] = [];

      const lowPriority: TickSystem = {
        name: 'low',
        priority: 10,
        tick: () => executionOrder.push('low'),
      };
      const highPriority: TickSystem = {
        name: 'high',
        priority: 100,
        tick: () => executionOrder.push('high'),
      };
      const medPriority: TickSystem = {
        name: 'med',
        priority: 50,
        tick: () => executionOrder.push('med'),
      };

      // Register in non-priority order
      loop.registerSystem(lowPriority);
      loop.registerSystem(highPriority);
      loop.registerSystem(medPriority);

      loop.start();
      advanceTime(16.67);

      expect(executionOrder).toEqual(['high', 'med', 'low']);
    });

    it('increments tick number on each tick', () => {
      const loop = createTickLoop({ tickRate: 60 });
      const system = createTestSystem('test', 0);
      loop.registerSystem(system);
      loop.start();

      // Each advanceTime triggers one RAF frame which triggers one tick
      advanceTime(16.67); // First tick
      advanceTime(16.67); // Second tick
      advanceTime(16.67); // Third tick

      const tickNumbers = system.ticks.map((t) => t.tickNumber);
      expect(tickNumbers[0]).toBe(1);
      expect(tickNumbers[1]).toBe(2);
      expect(tickNumbers[2]).toBe(3);
    });

    it('accumulates elapsed time', () => {
      const loop = createTickLoop({ tickRate: 60 });
      const system = createTestSystem('test', 0);
      loop.registerSystem(system);
      loop.start();

      advanceTime(50);

      const lastTick = system.ticks[system.ticks.length - 1];
      expect(lastTick.elapsedTime).toBeGreaterThan(0);
    });

    it('does not tick when paused', () => {
      const loop = createTickLoop();
      const system = createTestSystem('test', 0);
      loop.registerSystem(system);
      loop.start();
      advanceTime(16.67);
      const tickCount = system.ticks.length;

      loop.pause();
      advanceTime(100);

      expect(system.ticks.length).toBe(tickCount);
    });

    it('continues ticking after resume', () => {
      const loop = createTickLoop();
      const system = createTestSystem('test', 0);
      loop.registerSystem(system);
      loop.start();
      advanceTime(16.67);
      const tickCount = system.ticks.length;

      loop.pause();
      loop.resume();
      advanceTime(16.67);

      expect(system.ticks.length).toBeGreaterThan(tickCount);
    });

    it('handles system errors gracefully', () => {
      const loop = createTickLoop();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const badSystem: TickSystem = {
        name: 'bad',
        priority: 100,
        tick: () => {
          throw new Error('System error');
        },
      };
      const goodSystem = createTestSystem('good', 0);

      loop.registerSystem(badSystem);
      loop.registerSystem(goodSystem);
      loop.start();
      advanceTime(16.67);

      // Good system should still tick despite bad system error
      expect(goodSystem.ticks.length).toBeGreaterThan(0);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('fixed timestep', () => {
    it('uses fixed delta time in fixed timestep mode', () => {
      const loop = createTickLoop({ tickRate: 60, useFixedTimestep: true });
      const system = createTestSystem('test', 0);
      loop.registerSystem(system);
      loop.start();
      advanceTime(100);

      // All ticks should have the same fixed delta time
      for (const tick of system.ticks) {
        expect(tick.deltaTime).toBeCloseTo(1 / 60, 5);
      }
    });

    it('clamps delta time to maxDeltaTime', () => {
      const loop = createTickLoop({ maxDeltaTime: 0.05, useFixedTimestep: false });
      const system = createTestSystem('test', 0);
      loop.registerSystem(system);
      loop.start();

      // First frame uses fixedDeltaTime
      advanceTime(16.67);
      // Second frame with large jump should be clamped
      advanceTime(500); // 500ms jump

      const lastTick = system.ticks[system.ticks.length - 1];
      expect(lastTick.deltaTime).toBeLessThanOrEqual(0.05);
    });
  });

  describe('event handlers', () => {
    it('notifies tick handlers on each tick', () => {
      const loop = createTickLoop();
      const tickHandler = vi.fn();
      loop.onTick(tickHandler);
      loop.start();
      advanceTime(50);

      expect(tickHandler).toHaveBeenCalled();
      const ctx = tickHandler.mock.calls[0][0];
      expect(ctx).toHaveProperty('deltaTime');
      expect(ctx).toHaveProperty('tickNumber');
    });

    it('allows unsubscribing from tick events', () => {
      const loop = createTickLoop();
      const tickHandler = vi.fn();
      const unsubscribe = loop.onTick(tickHandler);
      loop.start();
      advanceTime(16.67);
      const callCount = tickHandler.mock.calls.length;

      unsubscribe();
      advanceTime(50);

      expect(tickHandler.mock.calls.length).toBe(callCount);
    });

    it('notifies state change handlers', () => {
      const loop = createTickLoop();
      const stateHandler = vi.fn();
      loop.onStateChange(stateHandler);

      loop.start();
      expect(stateHandler).toHaveBeenCalledWith('running');

      loop.pause();
      expect(stateHandler).toHaveBeenCalledWith('paused');

      loop.resume();
      expect(stateHandler).toHaveBeenLastCalledWith('running');

      loop.stop();
      expect(stateHandler).toHaveBeenLastCalledWith('stopped');
    });

    it('allows unsubscribing from state change events', () => {
      const loop = createTickLoop();
      const stateHandler = vi.fn();
      const unsubscribe = loop.onStateChange(stateHandler);

      loop.start();
      unsubscribe();
      loop.stop();

      expect(stateHandler).toHaveBeenCalledTimes(1);
      expect(stateHandler).toHaveBeenCalledWith('running');
    });
  });

  describe('dispose', () => {
    it('stops the loop', () => {
      const loop = createTickLoop();
      loop.start();
      loop.dispose();
      expect(loop.state).toBe('stopped');
    });

    it('unregisters all systems', () => {
      const loop = createTickLoop();
      loop.registerSystem(createTestSystem('a', 0));
      loop.registerSystem(createTestSystem('b', 0));
      loop.dispose();
      expect(loop.systemCount).toBe(0);
    });

    it('calls onUnregister for all systems', () => {
      const loop = createTickLoop();
      const onUnregister1 = vi.fn();
      const onUnregister2 = vi.fn();

      loop.registerSystem({
        name: 'a',
        priority: 0,
        tick: vi.fn(),
        onUnregister: onUnregister1,
      });
      loop.registerSystem({
        name: 'b',
        priority: 0,
        tick: vi.fn(),
        onUnregister: onUnregister2,
      });

      loop.dispose();

      expect(onUnregister1).toHaveBeenCalledOnce();
      expect(onUnregister2).toHaveBeenCalledOnce();
    });

    it('clears all event handlers', () => {
      const loop = createTickLoop();
      const tickHandler = vi.fn();
      const stateHandler = vi.fn();

      loop.onTick(tickHandler);
      loop.onStateChange(stateHandler);
      loop.start();

      const callCountBeforeDispose = stateHandler.mock.calls.length;
      loop.dispose();

      // Dispose should notify state change to 'stopped'
      expect(stateHandler).toHaveBeenLastCalledWith('stopped');
      // But handlers are cleared after dispose notifies them
      expect(stateHandler.mock.calls.length).toBe(callCountBeforeDispose + 1);
    });
  });
});
