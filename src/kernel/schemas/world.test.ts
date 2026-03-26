import { describe, it, expect } from 'vitest';

import {
  WorldModeSchema,
  WorldStatusSchema,
  WorldOptionsSchema,
  PresenceSnapshotSchema,
  WidgetInstanceSnapshotSchema,
  HistorySnapshotSchema,
  WorldSnapshotSchema,
  WorldEvents,
} from './world';

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

describe('WorldModeSchema', () => {
  it('accepts dashboard and game', () => {
    expect(WorldModeSchema.parse('dashboard')).toBe('dashboard');
    expect(WorldModeSchema.parse('game')).toBe('game');
  });

  it('rejects invalid mode', () => {
    expect(() => WorldModeSchema.parse('sandbox')).toThrow();
  });
});

describe('WorldStatusSchema', () => {
  it('accepts all valid statuses', () => {
    const statuses = ['initializing', 'ready', 'running', 'suspended', 'destroying', 'destroyed'];
    for (const s of statuses) {
      expect(WorldStatusSchema.parse(s)).toBe(s);
    }
  });

  it('rejects invalid status', () => {
    expect(() => WorldStatusSchema.parse('paused')).toThrow();
  });
});

describe('WorldOptionsSchema', () => {
  it('applies all defaults', () => {
    const result = WorldOptionsSchema.parse({});
    expect(result.mode).toBe('dashboard');
    expect(result.tickRate).toBe(60);
    expect(result.maxHistorySize).toBe(100);
    expect(result.enablePresence).toBe(true);
    expect(result.preloadWidgets).toBe(true);
  });

  it('overrides defaults', () => {
    const result = WorldOptionsSchema.parse({
      mode: 'game',
      tickRate: 30,
      maxHistorySize: 500,
      enablePresence: false,
      preloadWidgets: false,
    });
    expect(result.mode).toBe('game');
    expect(result.tickRate).toBe(30);
    expect(result.enablePresence).toBe(false);
  });

  it('rejects tickRate below 1', () => {
    expect(() => WorldOptionsSchema.parse({ tickRate: 0 })).toThrow();
  });

  it('rejects tickRate above 144', () => {
    expect(() => WorldOptionsSchema.parse({ tickRate: 200 })).toThrow();
  });

  it('rejects maxHistorySize below 10', () => {
    expect(() => WorldOptionsSchema.parse({ maxHistorySize: 5 })).toThrow();
  });

  it('rejects maxHistorySize above 10000', () => {
    expect(() => WorldOptionsSchema.parse({ maxHistorySize: 20000 })).toThrow();
  });
});

describe('PresenceSnapshotSchema', () => {
  it('parses valid presence with cursor', () => {
    const result = PresenceSnapshotSchema.parse({
      userId: uuid(),
      displayName: 'Alice',
      color: '#ff0000',
      cursorPosition: { x: 100, y: 200 },
      joinedAt: now(),
    });
    expect(result.cursorPosition).toEqual({ x: 100, y: 200 });
  });

  it('parses presence without cursor', () => {
    const result = PresenceSnapshotSchema.parse({
      userId: uuid(),
      displayName: 'Bob',
      color: 'blue',
      joinedAt: now(),
    });
    expect(result.cursorPosition).toBeUndefined();
  });

  it('rejects missing displayName', () => {
    expect(() =>
      PresenceSnapshotSchema.parse({
        userId: uuid(),
        color: 'red',
        joinedAt: now(),
      }),
    ).toThrow();
  });
});

describe('WidgetInstanceSnapshotSchema', () => {
  it('parses valid snapshot', () => {
    const result = WidgetInstanceSnapshotSchema.parse({
      instanceId: uuid(),
      widgetId: 'my-widget',
      state: { count: 42 },
      config: { theme: 'dark' },
    });
    expect(result.state).toEqual({ count: 42 });
  });

  it('rejects missing widgetId', () => {
    expect(() =>
      WidgetInstanceSnapshotSchema.parse({
        instanceId: uuid(),
        state: {},
        config: {},
      }),
    ).toThrow();
  });
});

describe('HistorySnapshotSchema', () => {
  it('parses valid history snapshot', () => {
    const result = HistorySnapshotSchema.parse({
      undoCount: 5,
      redoCount: 2,
      canUndo: true,
      canRedo: true,
    });
    expect(result.undoCount).toBe(5);
  });

  it('rejects negative counts', () => {
    expect(() =>
      HistorySnapshotSchema.parse({
        undoCount: -1,
        redoCount: 0,
        canUndo: false,
        canRedo: false,
      }),
    ).toThrow();
  });
});

describe('WorldSnapshotSchema', () => {
  it('parses full world snapshot', () => {
    const result = WorldSnapshotSchema.parse({
      id: uuid(),
      canvasId: uuid(),
      status: 'ready',
      mode: 'dashboard',
      createdAt: now(),
      presence: [],
      widgetInstances: [],
      history: { undoCount: 0, redoCount: 0, canUndo: false, canRedo: false },
    });
    expect(result.status).toBe('ready');
    expect(result.presence).toEqual([]);
  });

  it('rejects invalid status in snapshot', () => {
    expect(() =>
      WorldSnapshotSchema.parse({
        id: uuid(),
        canvasId: uuid(),
        status: 'unknown',
        mode: 'dashboard',
        createdAt: now(),
        presence: [],
        widgetInstances: [],
        history: { undoCount: 0, redoCount: 0, canUndo: false, canRedo: false },
      }),
    ).toThrow();
  });
});

describe('WorldEvents', () => {
  it('has all expected event constants', () => {
    expect(WorldEvents.CREATED).toBe('world.created');
    expect(WorldEvents.READY).toBe('world.ready');
    expect(WorldEvents.FOCUSED).toBe('world.focused');
    expect(WorldEvents.BLURRED).toBe('world.blurred');
    expect(WorldEvents.SUSPENDED).toBe('world.suspended');
    expect(WorldEvents.RESUMED).toBe('world.resumed');
    expect(WorldEvents.DESTROYING).toBe('world.destroying');
    expect(WorldEvents.DESTROYED).toBe('world.destroyed');
    expect(WorldEvents.ERROR).toBe('world.error');
  });
});
