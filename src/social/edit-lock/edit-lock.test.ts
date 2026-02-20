import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { CanvasChannel } from '../channel';

import { createEditLockManager, EDIT_LOCK_TIMEOUT_MS } from './edit-lock';

function createMockChannel(): CanvasChannel & {
  _simulateBroadcast: (event: string, payload: unknown) => void;
  _broadcastCalls: Array<{ event: string; payload: unknown }>;
} {
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
    isConnected: () => true,
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
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('EditLockManager', () => {
  it('acquires lock on entity optimistically', () => {
    const mock = createMockChannel();
    const manager = createEditLockManager(mock);

    manager.acquireLock('entity-1', 'user-a');

    const lock = manager.getLock('entity-1');
    expect(lock).not.toBeNull();
    expect(lock!.entityId).toBe('entity-1');
    expect(lock!.lockedBy).toBe('user-a');
    expect(typeof lock!.lockedAt).toBe('number');
  });

  it('broadcasts lock acquisition to channel', () => {
    const mock = createMockChannel();
    const manager = createEditLockManager(mock);

    manager.acquireLock('entity-1', 'user-a');

    expect(mock._broadcastCalls).toHaveLength(1);
    expect(mock._broadcastCalls[0].event).toBe('edit-lock');
    const payload = mock._broadcastCalls[0].payload as { action: string; lock: { entityId: string } };
    expect(payload.action).toBe('acquire');
    expect(payload.lock.entityId).toBe('entity-1');
  });

  it('lock expires after 30 seconds of inactivity', () => {
    const mock = createMockChannel();
    const manager = createEditLockManager(mock);

    manager.acquireLock('entity-1', 'user-a');
    expect(manager.getLock('entity-1')).not.toBeNull();

    // Advance past the lock timeout + one check interval
    vi.advanceTimersByTime(EDIT_LOCK_TIMEOUT_MS + 1_000);

    expect(manager.getLock('entity-1')).toBeNull();
  });

  it('lock is released on explicit releaseLock call', () => {
    const mock = createMockChannel();
    const manager = createEditLockManager(mock);

    manager.acquireLock('entity-1', 'user-a');
    expect(manager.getLock('entity-1')).not.toBeNull();

    manager.releaseLock('entity-1');
    expect(manager.getLock('entity-1')).toBeNull();
  });

  it('releaseLock broadcasts release action to channel', () => {
    const mock = createMockChannel();
    const manager = createEditLockManager(mock);

    manager.acquireLock('entity-1', 'user-a');
    manager.releaseLock('entity-1');

    expect(mock._broadcastCalls).toHaveLength(2);
    const releasePayload = mock._broadcastCalls[1].payload as { action: string };
    expect(releasePayload.action).toBe('release');
  });

  it('remote lock broadcast appears in local lock map', () => {
    const mock = createMockChannel();
    const manager = createEditLockManager(mock);

    // Simulate a remote user acquiring a lock
    mock._simulateBroadcast('edit-lock', {
      action: 'acquire',
      lock: { entityId: 'entity-1', lockedBy: 'user-b', lockedAt: Date.now() },
    });

    const lock = manager.getLock('entity-1');
    expect(lock).not.toBeNull();
    expect(lock!.lockedBy).toBe('user-b');
  });

  it('remote lock release removes from local map', () => {
    const mock = createMockChannel();
    const manager = createEditLockManager(mock);

    // Simulate remote acquire then release
    mock._simulateBroadcast('edit-lock', {
      action: 'acquire',
      lock: { entityId: 'entity-1', lockedBy: 'user-b', lockedAt: Date.now() },
    });
    expect(manager.getLock('entity-1')).not.toBeNull();

    mock._simulateBroadcast('edit-lock', {
      action: 'release',
      lock: { entityId: 'entity-1', lockedBy: 'user-b', lockedAt: Date.now() },
    });
    expect(manager.getLock('entity-1')).toBeNull();
  });

  it('does NOT hard-block writes — lock is advisory only', () => {
    const mock = createMockChannel();
    const manager = createEditLockManager(mock);

    // User B has a lock
    mock._simulateBroadcast('edit-lock', {
      action: 'acquire',
      lock: { entityId: 'entity-1', lockedBy: 'user-b', lockedAt: Date.now() },
    });

    // User A can still acquire the same lock (advisory, not enforced)
    manager.acquireLock('entity-1', 'user-a');
    const lock = manager.getLock('entity-1');
    expect(lock!.lockedBy).toBe('user-a');
  });

  it('getLock returns null for unlocked entity', () => {
    const mock = createMockChannel();
    const manager = createEditLockManager(mock);

    expect(manager.getLock('nonexistent')).toBeNull();
  });

  it('getAllLocks returns all active locks', () => {
    const mock = createMockChannel();
    const manager = createEditLockManager(mock);

    manager.acquireLock('entity-1', 'user-a');
    manager.acquireLock('entity-2', 'user-b');

    const allLocks = manager.getAllLocks();
    expect(allLocks).toHaveLength(2);

    const ids = allLocks.map(l => l.entityId).sort();
    expect(ids).toEqual(['entity-1', 'entity-2']);
  });

  it('destroy cleans up timers and locks', () => {
    const mock = createMockChannel();
    const manager = createEditLockManager(mock);

    manager.acquireLock('entity-1', 'user-a');
    expect(manager.getAllLocks()).toHaveLength(1);

    manager.destroy();

    expect(manager.getAllLocks()).toHaveLength(0);

    // After destroy, acquireLock should be a no-op
    manager.acquireLock('entity-2', 'user-b');
    expect(manager.getAllLocks()).toHaveLength(0);
  });

  it('releaseLock is a no-op for unlocked entity', () => {
    const mock = createMockChannel();
    const manager = createEditLockManager(mock);

    // Should not throw or broadcast
    manager.releaseLock('nonexistent');
    expect(mock._broadcastCalls).toHaveLength(0);
  });
});
