/**
 * World Instance Tests
 *
 * @module kernel/world/world-instance.test
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { WorldEvents } from '@sn/types';

import { createWorldInstance } from './world-instance';
import type { WorldInstance } from './world-instance';

// Valid UUIDs for testing
const CANVAS_ID = '11111111-1111-4111-a111-111111111111';
const USER_ID = '22222222-2222-4222-a222-222222222222';
const WIDGET_INSTANCE_ID = '33333333-3333-4333-a333-333333333333';

describe('createWorldInstance', () => {
  let world: WorldInstance;

  beforeEach(() => {
    world = createWorldInstance(CANVAS_ID);
  });

  describe('creation and lifecycle', () => {
    it('should create a world with a unique ID', () => {
      expect(world.id).toBeDefined();
      expect(typeof world.id).toBe('string');
      expect(world.id.length).toBeGreaterThan(0);
    });

    it('should have the correct canvasId', () => {
      expect(world.canvasId).toBe(CANVAS_ID);
    });

    it('should start in "ready" status', () => {
      expect(world.status).toBe('ready');
    });

    it('should default to "dashboard" mode', () => {
      expect(world.mode).toBe('dashboard');
    });

    it('should accept "game" mode option', () => {
      const gameWorld = createWorldInstance(CANVAS_ID, { mode: 'game' });
      expect(gameWorld.mode).toBe('game');
      gameWorld.destroy();
    });

    it('should have an isolated event bus', () => {
      expect(world.bus).toBeDefined();
      expect(world.bus.subscriptionCount).toBeGreaterThanOrEqual(0);
    });

    it('should emit CREATED and READY events on creation', () => {
      const newWorld = createWorldInstance(CANVAS_ID);

      // Check history for creation events
      const history = newWorld.bus.getHistory();
      const types = history.map((e) => e.type);

      expect(types).toContain(WorldEvents.CREATED);
      expect(types).toContain(WorldEvents.READY);

      newWorld.destroy();
    });
  });

  describe('start/suspend/resume lifecycle', () => {
    it('should transition from ready to running on start()', () => {
      expect(world.status).toBe('ready');
      world.start();
      expect(world.status).toBe('running');
    });

    it('should emit FOCUSED event on start()', () => {
      const events: string[] = [];
      world.bus.subscribe(WorldEvents.FOCUSED, () => {
        events.push(WorldEvents.FOCUSED);
      });

      world.start();
      expect(events).toContain(WorldEvents.FOCUSED);
    });

    it('should transition from running to suspended on suspend()', () => {
      world.start();
      expect(world.status).toBe('running');

      world.suspend();
      expect(world.status).toBe('suspended');
    });

    it('should emit SUSPENDED event on suspend()', () => {
      world.start();

      const events: string[] = [];
      world.bus.subscribe(WorldEvents.SUSPENDED, () => {
        events.push(WorldEvents.SUSPENDED);
      });

      world.suspend();
      expect(events).toContain(WorldEvents.SUSPENDED);
    });

    it('should transition from suspended to running on resume()', () => {
      world.start();
      world.suspend();
      expect(world.status).toBe('suspended');

      world.resume();
      expect(world.status).toBe('running');
    });

    it('should emit RESUMED event on resume()', () => {
      world.start();
      world.suspend();

      const events: string[] = [];
      world.bus.subscribe(WorldEvents.RESUMED, () => {
        events.push(WorldEvents.RESUMED);
      });

      world.resume();
      expect(events).toContain(WorldEvents.RESUMED);
    });

    it('should not start from non-ready status', () => {
      world.start(); // Now running
      world.start(); // Should be no-op, still running
      expect(world.status).toBe('running');
    });
  });

  describe('destroy lifecycle', () => {
    it('should transition to destroyed on destroy()', () => {
      world.destroy();
      expect(world.status).toBe('destroyed');
    });

    it('should emit DESTROYING and DESTROYED events', () => {
      // We need to check history since the events are emitted during destroy
      world.destroy();

      const history = world.bus.getHistory();
      const types = history.map((e) => e.type);

      expect(types).toContain(WorldEvents.DESTROYING);
      expect(types).toContain(WorldEvents.DESTROYED);
    });

    it('should clear all subscriptions on destroy', () => {
      // Add a subscription
      world.bus.subscribe('test.event', () => {});
      const countBefore = world.bus.subscriptionCount;
      expect(countBefore).toBeGreaterThan(0);

      world.destroy();

      // After destroy, unsubscribeAll is called
      expect(world.bus.subscriptionCount).toBe(0);
    });

    it('should be idempotent (calling destroy twice is safe)', () => {
      world.destroy();
      expect(() => world.destroy()).not.toThrow();
      expect(world.status).toBe('destroyed');
    });
  });

  describe('canvas state', () => {
    it('should start with null canvas state', () => {
      expect(world.getCanvasState()).toBeNull();
    });

    it('should set and get canvas state', () => {
      const canvasState = {
        canvasId: CANVAS_ID,
        name: 'Test Canvas',
        slug: 'test-canvas',
        ownerId: USER_ID,
        description: 'A test canvas',
        thumbnailUrl: null,
        isPublic: false,
        settings: {},
      };

      world.setCanvasState(canvasState);
      expect(world.getCanvasState()).toEqual(canvasState);
    });
  });

  describe('widget instances', () => {
    it('should start with empty widget instances', () => {
      expect(world.getWidgetInstances().size).toBe(0);
    });

    it('should add widget instances', () => {
      const instance = {
        instanceId: WIDGET_INSTANCE_ID,
        widgetId: 'test-widget',
        state: { count: 0 },
        config: { theme: 'dark' },
      };

      world.addWidgetInstance(instance);

      const instances = world.getWidgetInstances();
      expect(instances.size).toBe(1);
      expect(instances.get(WIDGET_INSTANCE_ID)).toEqual(instance);
    });

    it('should remove widget instances', () => {
      world.addWidgetInstance({
        instanceId: WIDGET_INSTANCE_ID,
        widgetId: 'test-widget',
        state: {},
        config: {},
      });

      world.removeWidgetInstance(WIDGET_INSTANCE_ID);
      expect(world.getWidgetInstances().size).toBe(0);
    });

    it('should update widget state', () => {
      world.addWidgetInstance({
        instanceId: WIDGET_INSTANCE_ID,
        widgetId: 'test-widget',
        state: { count: 0 },
        config: {},
      });

      world.updateWidgetState(WIDGET_INSTANCE_ID, { count: 5 });

      const instance = world.getWidgetInstances().get(WIDGET_INSTANCE_ID);
      expect(instance?.state).toEqual({ count: 5 });
    });

    it('should update widget config', () => {
      world.addWidgetInstance({
        instanceId: WIDGET_INSTANCE_ID,
        widgetId: 'test-widget',
        state: {},
        config: { theme: 'light' },
      });

      world.updateWidgetConfig(WIDGET_INSTANCE_ID, { theme: 'dark' });

      const instance = world.getWidgetInstances().get(WIDGET_INSTANCE_ID);
      expect(instance?.config).toEqual({ theme: 'dark' });
    });
  });

  describe('presence', () => {
    it('should start with empty presence', () => {
      expect(world.getPresence().size).toBe(0);
    });

    it('should add presence entries', () => {
      const entry = {
        userId: USER_ID,
        displayName: 'Test User',
        color: '#ff0000',
        joinedAt: new Date().toISOString(),
      };

      world.joinPresence(entry);

      const presence = world.getPresence();
      expect(presence.size).toBe(1);
      expect(presence.get(USER_ID)).toEqual(entry);
    });

    it('should remove presence entries', () => {
      world.joinPresence({
        userId: USER_ID,
        displayName: 'Test User',
        color: '#ff0000',
        joinedAt: new Date().toISOString(),
      });

      world.leavePresence(USER_ID);
      expect(world.getPresence().size).toBe(0);
    });

    it('should update cursor position', () => {
      world.joinPresence({
        userId: USER_ID,
        displayName: 'Test User',
        color: '#ff0000',
        joinedAt: new Date().toISOString(),
      });

      world.updateCursor(USER_ID, { x: 100, y: 200 });

      const entry = world.getPresence().get(USER_ID);
      expect(entry?.cursorPosition).toEqual({ x: 100, y: 200 });
    });

    it('should not track presence when disabled', () => {
      const noPresenceWorld = createWorldInstance(CANVAS_ID, { enablePresence: false });

      noPresenceWorld.joinPresence({
        userId: USER_ID,
        displayName: 'Test User',
        color: '#ff0000',
        joinedAt: new Date().toISOString(),
      });

      expect(noPresenceWorld.getPresence().size).toBe(0);
      noPresenceWorld.destroy();
    });
  });

  describe('history (undo/redo)', () => {
    it('should start with empty history', () => {
      expect(world.canUndo()).toBe(false);
      expect(world.canRedo()).toBe(false);
    });

    it('should push history entries', () => {
      const event = { type: 'entity.moved', payload: { id: '1', to: { x: 100, y: 100 } }, timestamp: Date.now() };
      const inverse = { type: 'entity.moved', payload: { id: '1', to: { x: 0, y: 0 } }, timestamp: Date.now() };

      world.pushHistory(event, inverse);

      expect(world.canUndo()).toBe(true);
      expect(world.canRedo()).toBe(false);
    });

    it('should undo by emitting inverse event', () => {
      const emitted: unknown[] = [];
      world.bus.subscribe('entity.moved', (e) => {
        emitted.push(e.payload);
      });

      const event = { type: 'entity.moved', payload: { id: '1', to: { x: 100, y: 100 } }, timestamp: Date.now() };
      const inverse = { type: 'entity.moved', payload: { id: '1', to: { x: 0, y: 0 } }, timestamp: Date.now() };

      world.pushHistory(event, inverse);
      world.undo();

      expect(emitted).toContainEqual({ id: '1', to: { x: 0, y: 0 } });
      expect(world.canUndo()).toBe(false);
      expect(world.canRedo()).toBe(true);
    });

    it('should redo by emitting original event', () => {
      const emitted: unknown[] = [];
      world.bus.subscribe('entity.moved', (e) => {
        emitted.push(e.payload);
      });

      const event = { type: 'entity.moved', payload: { id: '1', to: { x: 100, y: 100 } }, timestamp: Date.now() };
      const inverse = { type: 'entity.moved', payload: { id: '1', to: { x: 0, y: 0 } }, timestamp: Date.now() };

      world.pushHistory(event, inverse);
      world.undo();
      world.redo();

      expect(emitted).toContainEqual({ id: '1', to: { x: 100, y: 100 } });
      expect(world.canUndo()).toBe(true);
      expect(world.canRedo()).toBe(false);
    });

    it('should clear redo stack on new action', () => {
      const event1 = { type: 'test', payload: { a: 1 }, timestamp: Date.now() };
      const inverse1 = { type: 'test', payload: { a: 0 }, timestamp: Date.now() };
      const event2 = { type: 'test', payload: { b: 1 }, timestamp: Date.now() };
      const inverse2 = { type: 'test', payload: { b: 0 }, timestamp: Date.now() };

      world.pushHistory(event1, inverse1);
      world.undo();
      expect(world.canRedo()).toBe(true);

      world.pushHistory(event2, inverse2);
      expect(world.canRedo()).toBe(false);
    });

    it('should respect maxHistorySize', () => {
      // min is 10, so use 10
      const smallWorld = createWorldInstance(CANVAS_ID, { maxHistorySize: 10 });

      for (let i = 0; i < 15; i++) {
        smallWorld.pushHistory(
          { type: 'test', payload: { i }, timestamp: Date.now() },
          { type: 'test', payload: { i: -i }, timestamp: Date.now() },
        );
      }

      // Undo 10 times should work (max history)
      for (let i = 0; i < 10; i++) {
        expect(smallWorld.canUndo()).toBe(true);
        smallWorld.undo();
      }

      // 11th undo should not work (only 10 items in history)
      expect(smallWorld.canUndo()).toBe(false);

      smallWorld.destroy();
    });

    it('should clear history', () => {
      world.pushHistory(
        { type: 'test', payload: {}, timestamp: Date.now() },
        { type: 'test', payload: {}, timestamp: Date.now() },
      );
      expect(world.canUndo()).toBe(true);

      world.clearHistory();
      expect(world.canUndo()).toBe(false);
      expect(world.canRedo()).toBe(false);
    });
  });

  describe('snapshots', () => {
    it('should return a valid snapshot', () => {
      world.setCanvasState({
        canvasId: CANVAS_ID,
        name: 'Test',
        slug: null,
        ownerId: USER_ID,
        description: null,
        thumbnailUrl: null,
        isPublic: false,
        settings: {},
      });

      world.addWidgetInstance({
        instanceId: WIDGET_INSTANCE_ID,
        widgetId: 'test',
        state: {},
        config: {},
      });

      world.joinPresence({
        userId: USER_ID,
        displayName: 'User',
        color: '#000',
        joinedAt: new Date().toISOString(),
      });

      const snapshot = world.getSnapshot();

      expect(snapshot.id).toBe(world.id);
      expect(snapshot.canvasId).toBe(CANVAS_ID);
      expect(snapshot.status).toBe('ready');
      expect(snapshot.mode).toBe('dashboard');
      expect(snapshot.createdAt).toBeDefined();
      expect(snapshot.presence).toHaveLength(1);
      expect(snapshot.widgetInstances).toHaveLength(1);
      expect(snapshot.history.undoCount).toBe(0);
      expect(snapshot.history.redoCount).toBe(0);
    });
  });

  describe('event bus isolation', () => {
    it('should not leak events between worlds', () => {
      const world1 = createWorldInstance(CANVAS_ID);
      const world2 = createWorldInstance(CANVAS_ID);

      const world1Events: string[] = [];
      const world2Events: string[] = [];

      world1.bus.subscribe('test.event', () => {
        world1Events.push('world1');
      });

      world2.bus.subscribe('test.event', () => {
        world2Events.push('world2');
      });

      // Emit only on world1's bus
      world1.bus.emit('test.event', { data: 'test' });

      expect(world1Events).toEqual(['world1']);
      expect(world2Events).toEqual([]);

      world1.destroy();
      world2.destroy();
    });
  });
});
