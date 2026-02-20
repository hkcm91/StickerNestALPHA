import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SocialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useSocialStore, setupSocialBusSubscriptions } from '../../kernel/stores/social/social.store';
import type { CanvasChannel } from '../channel';

import { createCursorBroadcaster, CURSOR_THROTTLE_MS } from './cursor';
import type { CursorData } from './cursor';

/**
 * Creates a mock CanvasChannel with broadcast interception.
 */
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
  bus.unsubscribeAll();
  useSocialStore.getState().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CursorBroadcaster', () => {
  it('broadcasts cursor position to other users via channel', () => {
    const mock = createMockChannel();
    const broadcaster = createCursorBroadcaster(mock, 'user-a', '#FF0000');

    broadcaster.broadcastPosition({ x: 100, y: 200 });

    expect(mock._broadcastCalls).toHaveLength(1);
    expect(mock._broadcastCalls[0].event).toBe('cursor');
    const payload = mock._broadcastCalls[0].payload as CursorData;
    expect(payload.userId).toBe('user-a');
    expect(payload.position).toEqual({ x: 100, y: 200 });
    expect(payload.color).toBe('#FF0000');
  });

  it('throttles outbound broadcasts to 30fps (33ms window)', () => {
    const mock = createMockChannel();
    const broadcaster = createCursorBroadcaster(mock, 'user-a', '#FF0000');

    // First call goes through immediately
    broadcaster.broadcastPosition({ x: 10, y: 20 });
    expect(mock._broadcastCalls).toHaveLength(1);

    // Second call within throttle window is queued
    broadcaster.broadcastPosition({ x: 30, y: 40 });
    expect(mock._broadcastCalls).toHaveLength(1);

    // After throttle window, pending position is sent
    vi.advanceTimersByTime(CURSOR_THROTTLE_MS);
    expect(mock._broadcastCalls).toHaveLength(2);
    const lastPayload = mock._broadcastCalls[1].payload as CursorData;
    expect(lastPayload.position).toEqual({ x: 30, y: 40 });
  });

  it('does not send on every call if within throttle window', () => {
    const mock = createMockChannel();
    const broadcaster = createCursorBroadcaster(mock, 'user-a', '#FF0000');

    broadcaster.broadcastPosition({ x: 1, y: 1 });
    broadcaster.broadcastPosition({ x: 2, y: 2 });
    broadcaster.broadcastPosition({ x: 3, y: 3 });
    broadcaster.broadcastPosition({ x: 4, y: 4 });

    // Only the first should have gone through immediately
    expect(mock._broadcastCalls).toHaveLength(1);

    // After throttle, only the last queued position is sent
    vi.advanceTimersByTime(CURSOR_THROTTLE_MS);
    expect(mock._broadcastCalls).toHaveLength(2);
    const lastPayload = mock._broadcastCalls[1].payload as CursorData;
    expect(lastPayload.position).toEqual({ x: 4, y: 4 });
  });

  it('incoming cursor positions emit social.cursor.moved bus event', () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.CURSOR_MOVED, (event) => {
      events.push(event.payload);
    });

    const mock = createMockChannel();
    createCursorBroadcaster(mock, 'user-a', '#FF0000');

    // Simulate incoming cursor from another user
    mock._simulateBroadcast('cursor', {
      userId: 'user-b',
      position: { x: 50, y: 60 },
      color: '#00FF00',
    } satisfies CursorData);

    expect(events).toHaveLength(1);
    const payload = events[0] as CursorData;
    expect(payload.userId).toBe('user-b');
    expect(payload.position).toEqual({ x: 50, y: 60 });
  });

  it('cursor data includes userId, position (canvas-space), and color', () => {
    const mock = createMockChannel();
    const broadcaster = createCursorBroadcaster(mock, 'user-a', '#ABCDEF');

    broadcaster.broadcastPosition({ x: 999, y: 888 });

    const payload = mock._broadcastCalls[0].payload as CursorData;
    expect(payload.userId).toBe('user-a');
    expect(payload.position).toEqual({ x: 999, y: 888 });
    expect(payload.color).toBe('#ABCDEF');
  });

  it('filters out own userId from incoming broadcasts', () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.CURSOR_MOVED, (event) => {
      events.push(event.payload);
    });

    const mock = createMockChannel();
    createCursorBroadcaster(mock, 'user-a', '#FF0000');

    // Simulate incoming cursor from self — should be filtered
    mock._simulateBroadcast('cursor', {
      userId: 'user-a',
      position: { x: 50, y: 60 },
      color: '#FF0000',
    } satisfies CursorData);

    expect(events).toHaveLength(0);
  });

  it('stop() ceases all broadcasting and cleans up', () => {
    const mock = createMockChannel();
    const broadcaster = createCursorBroadcaster(mock, 'user-a', '#FF0000');

    broadcaster.broadcastPosition({ x: 10, y: 20 });
    expect(mock._broadcastCalls).toHaveLength(1);

    broadcaster.stop();

    // Further broadcasts should be suppressed
    broadcaster.broadcastPosition({ x: 30, y: 40 });
    expect(mock._broadcastCalls).toHaveLength(1);

    // And pending timer should not fire
    vi.advanceTimersByTime(CURSOR_THROTTLE_MS * 10);
    expect(mock._broadcastCalls).toHaveLength(1);
  });

  it('stop() clears a pending throttle timer so queued position is never sent', () => {
    const mock = createMockChannel();
    const broadcaster = createCursorBroadcaster(mock, 'user-a', '#FF0000');

    // First call goes through immediately
    broadcaster.broadcastPosition({ x: 10, y: 20 });
    expect(mock._broadcastCalls).toHaveLength(1);

    // Second call within throttle window queues a timer
    broadcaster.broadcastPosition({ x: 50, y: 60 });
    expect(mock._broadcastCalls).toHaveLength(1);

    // Stop while the throttle timer is pending
    broadcaster.stop();

    // Advance past the throttle window — queued position should NOT be sent
    vi.advanceTimersByTime(CURSOR_THROTTLE_MS * 2);
    expect(mock._broadcastCalls).toHaveLength(1);
  });

  it('incoming broadcasts are ignored after stop()', () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.CURSOR_MOVED, (event) => {
      events.push(event.payload);
    });

    const mock = createMockChannel();
    const broadcaster = createCursorBroadcaster(mock, 'user-a', '#FF0000');

    broadcaster.stop();

    // Simulate incoming cursor after stop — should be silently ignored
    mock._simulateBroadcast('cursor', {
      userId: 'user-b',
      position: { x: 50, y: 60 },
      color: '#00FF00',
    } satisfies CursorData);

    expect(events).toHaveLength(0);
  });

  it('cursors visible for ALL user types including Guests', () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.CURSOR_MOVED, (event) => {
      events.push(event.payload);
    });

    const mock = createMockChannel();
    createCursorBroadcaster(mock, 'user-a', '#FF0000');

    // Simulate cursor from a Guest user
    mock._simulateBroadcast('cursor', {
      userId: 'guest-1',
      position: { x: 10, y: 20 },
      color: '#4ECDC4',
    } satisfies CursorData);

    expect(events).toHaveLength(1);
    const payload = events[0] as CursorData;
    expect(payload.userId).toBe('guest-1');
  });
});

describe('Gate Test 1: Two-session cursor visibility', () => {
  it('both sessions see each other\'s cursor in socialStore', () => {
    setupSocialBusSubscriptions();

    // Setup presence for both users
    bus.emit(SocialEvents.PRESENCE_JOINED, {
      userId: 'user-a',
      displayName: 'Alice',
      color: '#FF0000',
      cursorPosition: null,
      joinedAt: new Date().toISOString(),
    });
    bus.emit(SocialEvents.PRESENCE_JOINED, {
      userId: 'user-b',
      displayName: 'Bob',
      color: '#00FF00',
      cursorPosition: null,
      joinedAt: new Date().toISOString(),
    });

    const channelA = createMockChannel();
    const channelB = createMockChannel();

    const broadcasterA = createCursorBroadcaster(channelA, 'user-a', '#FF0000');
    createCursorBroadcaster(channelB, 'user-b', '#00FF00');

    // Session A broadcasts cursor
    broadcasterA.broadcastPosition({ x: 100, y: 200 });

    // Simulate the broadcast arriving at Session B's channel
    const sentByA = channelA._broadcastCalls[0];
    channelB._simulateBroadcast('cursor', sentByA.payload);

    // Session B should see A's cursor in socialStore
    const presenceMap = useSocialStore.getState().presenceMap;
    expect(presenceMap['user-a'].cursorPosition).toEqual({ x: 100, y: 200 });
  });
});
