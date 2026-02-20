import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SocialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useSocialStore, setupSocialBusSubscriptions } from '../../kernel/stores/social/social.store';
import type { CanvasChannel } from '../channel';

import { createOfflineManager, OFFLINE_GRACE_PERIOD_MS } from './offline';
import type { QueuedEdit } from './offline';

function createMockChannel(initiallyConnected = true): CanvasChannel & {
  _simulateBroadcast: (event: string, payload: unknown) => void;
  _broadcastCalls: Array<{ event: string; payload: unknown }>;
  _setConnected: (value: boolean) => void;
} {
  let connected = initiallyConnected;
  const handlers = new Map<string, Array<(payload: unknown) => void>>();
  const broadcastCalls: Array<{ event: string; payload: unknown }> = [];

  const mockChannel = {
    on: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn(),
    track: vi.fn(),
    untrack: vi.fn(),
    presenceState: vi.fn(() => ({})),
  };

  return {
    canvasId: 'test-canvas',
    channel: mockChannel as unknown as CanvasChannel['channel'],
    async join() {},
    async leave() {},
    isConnected: () => connected,
    broadcast(event: string, payload: unknown) {
      broadcastCalls.push({ event, payload });
    },
    onBroadcast(event: string, callback: (payload: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(callback);
    },
    _simulateBroadcast(event: string, payload: unknown) {
      const cbs = handlers.get(event) ?? [];
      for (const cb of cbs) cb(payload);
    },
    _broadcastCalls: broadcastCalls,
    _setConnected(value: boolean) {
      connected = value;
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  bus.unsubscribeAll();
  useSocialStore.getState().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OfflineManager', () => {
  it('connected channel reports not offline', () => {
    const mock = createMockChannel(true);
    const manager = createOfflineManager(mock);

    expect(manager.isOffline()).toBe(false);
    manager.destroy();
  });

  it('does not show offline for interruptions under 5 seconds', () => {
    const mock = createMockChannel(true);
    const manager = createOfflineManager(mock);

    // Disconnect
    mock._setConnected(false);
    // Trigger poll to detect disconnect
    vi.advanceTimersByTime(1_000);

    // Wait less than grace period
    vi.advanceTimersByTime(3_000);

    expect(manager.isOffline()).toBe(false);
    manager.destroy();
  });

  it('goes offline after grace period expires while disconnected', () => {
    const mock = createMockChannel(true);
    const manager = createOfflineManager(mock);

    // Disconnect
    mock._setConnected(false);
    // Trigger poll to detect disconnect
    vi.advanceTimersByTime(1_000);

    // Wait past grace period
    vi.advanceTimersByTime(OFFLINE_GRACE_PERIOD_MS + 1_000);

    expect(manager.isOffline()).toBe(true);
    manager.destroy();
  });

  it('hides remote cursors when going offline', () => {
    setupSocialBusSubscriptions();

    // Add a presence user to the store
    bus.emit(SocialEvents.PRESENCE_JOINED, {
      userId: 'user-b',
      displayName: 'Bob',
      color: '#00FF00',
      cursorPosition: { x: 100, y: 200 },
      joinedAt: new Date().toISOString(),
    });

    const mock = createMockChannel(true);
    const manager = createOfflineManager(mock);

    // Disconnect
    mock._setConnected(false);
    vi.advanceTimersByTime(1_000); // poll detects disconnect
    vi.advanceTimersByTime(OFFLINE_GRACE_PERIOD_MS); // grace period expires

    // Bob's cursor should now be null
    const presenceMap = useSocialStore.getState().presenceMap;
    expect(presenceMap['user-b'].cursorPosition).toBeNull();

    manager.destroy();
  });

  it('reconnect clears offline status', () => {
    const mock = createMockChannel(true);
    const manager = createOfflineManager(mock);

    // Go offline
    mock._setConnected(false);
    vi.advanceTimersByTime(1_000);
    vi.advanceTimersByTime(OFFLINE_GRACE_PERIOD_MS);
    expect(manager.isOffline()).toBe(true);

    // Reconnect
    mock._setConnected(true);
    vi.advanceTimersByTime(1_000); // poll detects reconnect

    expect(manager.isOffline()).toBe(false);
    manager.destroy();
  });

  it('reconnect within grace period does not trigger offline', () => {
    const mock = createMockChannel(true);
    const manager = createOfflineManager(mock);

    // Disconnect
    mock._setConnected(false);
    vi.advanceTimersByTime(1_000); // poll detects disconnect

    // Reconnect before grace period expires
    vi.advanceTimersByTime(2_000);
    mock._setConnected(true);
    vi.advanceTimersByTime(1_000); // poll detects reconnect

    // Wait past what would have been the grace period
    vi.advanceTimersByTime(OFFLINE_GRACE_PERIOD_MS);

    expect(manager.isOffline()).toBe(false);
    manager.destroy();
  });

  it('queues edits while offline', () => {
    const mock = createMockChannel(true);
    const manager = createOfflineManager(mock);

    const edit: QueuedEdit = {
      type: 'entity-transform',
      payload: { entityId: 'e1', position: { x: 10, y: 20 } },
      timestamp: Date.now(),
    };

    manager.queueEdit(edit);

    const queued = manager.getQueuedEdits();
    expect(queued).toHaveLength(1);
    expect(queued[0].type).toBe('entity-transform');
    manager.destroy();
  });

  it('replays queued edits on reconnect', () => {
    const mock = createMockChannel(true);
    const manager = createOfflineManager(mock);

    // Go offline
    mock._setConnected(false);
    vi.advanceTimersByTime(1_000);
    vi.advanceTimersByTime(OFFLINE_GRACE_PERIOD_MS);
    expect(manager.isOffline()).toBe(true);

    // Queue some edits
    manager.queueEdit({
      type: 'entity-transform',
      payload: { entityId: 'e1' },
      timestamp: Date.now(),
    });
    manager.queueEdit({
      type: 'datasource-update',
      payload: { dsId: 'ds-1' },
      timestamp: Date.now(),
    });

    // Reconnect
    mock._setConnected(true);
    vi.advanceTimersByTime(1_000);

    // Queued edits should have been replayed via broadcast
    expect(mock._broadcastCalls).toHaveLength(2);
    expect(mock._broadcastCalls[0].event).toBe('entity-transform');
    expect(mock._broadcastCalls[1].event).toBe('datasource-update');

    // Queue should be empty
    expect(manager.getQueuedEdits()).toHaveLength(0);
    manager.destroy();
  });

  it('destroy cleans up timers and queue', () => {
    const mock = createMockChannel(true);
    const manager = createOfflineManager(mock);

    manager.queueEdit({
      type: 'entity-transform',
      payload: {},
      timestamp: Date.now(),
    });

    manager.destroy();

    expect(manager.getQueuedEdits()).toHaveLength(0);
  });
});
