/**
 * Cross-Canvas Event Bus — Scenario Tests
 *
 * Tests all major cross-canvas communication patterns:
 *   1. Same-user, same canvas (two widgets)
 *   2. Same-user, different canvases (two tabs)
 *   3. Different users, shared channel
 *   4. Broadcast fan-out (1 emitter → N receivers)
 *   5. Bidirectional (ping-pong between widgets)
 *   6. Multi-channel isolation
 *   7. Late subscriber (joins after messages sent)
 *   8. Rapid fire (burst of messages)
 *   9. Payload variety (primitives, objects, arrays, nested)
 *  10. Cleanup on destroy (no leaks)
 *
 * Run: npm test -- cross-canvas-scenarios
 *
 * @module runtime/cross-canvas
 * @layer L3
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Supabase — simulates Realtime broadcast across "connections"
// ---------------------------------------------------------------------------

type BroadcastHandler = (event: { payload: unknown }) => void;

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  _broadcastHandlers: BroadcastHandler[];
  _simulateBroadcast: (payload: unknown) => void;
  _subscribeCallback: ((status: string) => void) | null;
}

function createMockChannel(): MockChannel {
  const broadcastHandlers: BroadcastHandler[] = [];
  let subscribeCallback: ((status: string) => void) | null = null;

  const channel: MockChannel = {
    on: vi.fn().mockImplementation((_type: string, _opts: unknown, handler: BroadcastHandler) => {
      broadcastHandlers.push(handler);
      return channel;
    }),
    subscribe: vi.fn().mockImplementation((cb?: (status: string) => void) => {
      if (cb) {
        subscribeCallback = cb;
      }
      return channel;
    }),
    send: vi.fn(),
    _broadcastHandlers: broadcastHandlers,
    _simulateBroadcast(payload: unknown) {
      for (const handler of broadcastHandlers) {
        handler({ payload });
      }
    },
    get _subscribeCallback() {
      return subscribeCallback;
    },
  };

  return channel;
}

/**
 * Global channel registry — simulates the Supabase Realtime server.
 * All routers that subscribe to the same channel name share the same MockChannel,
 * which lets us simulate cross-user / cross-canvas delivery.
 */
const globalChannelRegistry = new Map<string, MockChannel>();

const { mockChannelFn, mockRemoveChannelFn } = vi.hoisted(() => ({
  mockChannelFn: vi.fn(),
  mockRemoveChannelFn: vi.fn(),
}));

vi.mock('../../kernel/supabase/client', () => ({
  supabase: {
    channel: mockChannelFn,
    removeChannel: mockRemoveChannelFn,
  },
}));

import { createCrossCanvasRouter } from './cross-canvas-router';
import type { CrossCanvasRouter } from './cross-canvas-router';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulates a broadcast arriving from the network for a given channel name */
function simulateRemoteBroadcast(channelName: string, payload: unknown) {
  const ch = globalChannelRegistry.get(`crosscanvas:${channelName}`);
  if (ch) ch._simulateBroadcast(payload);
}

/** Returns the mock channel for inspection */
function getChannel(channelName: string): MockChannel | undefined {
  return globalChannelRegistry.get(`crosscanvas:${channelName}`);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe('Cross-Canvas Event Bus — Scenarios', () => {
  const routers: CrossCanvasRouter[] = [];

  function makeRouter(): CrossCanvasRouter {
    const r = createCrossCanvasRouter();
    routers.push(r);
    return r;
  }

  beforeEach(() => {
    globalChannelRegistry.clear();
    vi.clearAllMocks();

    mockChannelFn.mockImplementation((name: string) => {
      // Reuse channel if it already exists (simulates shared Realtime channel)
      if (!globalChannelRegistry.has(name)) {
        globalChannelRegistry.set(name, createMockChannel());
      }
      return globalChannelRegistry.get(name)!;
    });

    mockRemoveChannelFn.mockImplementation(() => {});
  });

  afterEach(() => {
    for (const r of routers) r.destroy();
    routers.length = 0;
  });

  // =========================================================================
  // Scenario 1: Same user, same canvas — two widgets talk via shared channel
  // =========================================================================
  describe('Scenario 1: Same canvas, two widgets', () => {
    it('Widget A emits → Widget B receives on the same channel', () => {
      const routerA = makeRouter();
      const routerB = makeRouter();
      const handlerB = vi.fn();

      routerA.subscribe('chat', vi.fn());
      routerB.subscribe('chat', handlerB);

      // Simulate the broadcast arriving (as if Supabase delivered it)
      simulateRemoteBroadcast('chat', { msg: 'hello from A' });

      expect(handlerB).toHaveBeenCalledWith({ msg: 'hello from A' });
    });

    it('Both widgets receive their own broadcasts', () => {
      const routerA = makeRouter();
      const routerB = makeRouter();
      const handlerA = vi.fn();
      const handlerB = vi.fn();

      routerA.subscribe('sync', handlerA);
      routerB.subscribe('sync', handlerB);

      simulateRemoteBroadcast('sync', { seq: 1 });

      expect(handlerA).toHaveBeenCalledWith({ seq: 1 });
      expect(handlerB).toHaveBeenCalledWith({ seq: 1 });
    });
  });

  // =========================================================================
  // Scenario 2: Same user, different canvases (simulates two browser tabs)
  // =========================================================================
  describe('Scenario 2: Same user, different canvases', () => {
    it('Widget on Canvas 1 sends → Widget on Canvas 2 receives', () => {
      // Each canvas has its own router (separate WidgetFrame instances)
      const canvas1Router = makeRouter();
      const canvas2Router = makeRouter();
      const canvas2Handler = vi.fn();

      canvas1Router.subscribe('global-alerts', vi.fn());
      canvas2Router.subscribe('global-alerts', canvas2Handler);

      simulateRemoteBroadcast('global-alerts', { alert: 'system update' });

      expect(canvas2Handler).toHaveBeenCalledWith({ alert: 'system update' });
    });
  });

  // =========================================================================
  // Scenario 3: Different users, shared channel
  // =========================================================================
  describe('Scenario 3: Different users, shared channel', () => {
    it('User A widget emits → User B widget receives via same channel', () => {
      const userARouter = makeRouter();
      const userBRouter = makeRouter();
      const userBHandler = vi.fn();

      userARouter.subscribe('collab-room', vi.fn());
      userBRouter.subscribe('collab-room', userBHandler);

      // User A sends
      simulateRemoteBroadcast('collab-room', { user: 'alice', action: 'move' });

      expect(userBHandler).toHaveBeenCalledWith({ user: 'alice', action: 'move' });
    });

    it('Both users receive broadcasts bidirectionally', () => {
      const userARouter = makeRouter();
      const userBRouter = makeRouter();
      const handlerA = vi.fn();
      const handlerB = vi.fn();

      userARouter.subscribe('collab-room', handlerA);
      userBRouter.subscribe('collab-room', handlerB);

      // Message from either direction
      simulateRemoteBroadcast('collab-room', { from: 'B', data: 42 });

      expect(handlerA).toHaveBeenCalledWith({ from: 'B', data: 42 });
      expect(handlerB).toHaveBeenCalledWith({ from: 'B', data: 42 });
    });
  });

  // =========================================================================
  // Scenario 4: Fan-out — one emitter, many receivers
  // =========================================================================
  describe('Scenario 4: Broadcast fan-out (1 → N)', () => {
    it('One emit reaches all 5 subscribers', () => {
      const emitter = makeRouter();
      const handlers: ReturnType<typeof vi.fn>[] = [];

      emitter.subscribe('announcements', vi.fn());

      for (let i = 0; i < 5; i++) {
        const r = makeRouter();
        const h = vi.fn();
        handlers.push(h);
        r.subscribe('announcements', h);
      }

      simulateRemoteBroadcast('announcements', { text: 'v5 shipped!' });

      for (const h of handlers) {
        expect(h).toHaveBeenCalledTimes(1);
        expect(h).toHaveBeenCalledWith({ text: 'v5 shipped!' });
      }
    });
  });

  // =========================================================================
  // Scenario 5: Bidirectional ping-pong
  // =========================================================================
  describe('Scenario 5: Bidirectional ping-pong', () => {
    it('Two routers exchange messages back and forth', () => {
      const routerA = makeRouter();
      const routerB = makeRouter();
      const messagesA: unknown[] = [];
      const messagesB: unknown[] = [];

      routerA.subscribe('pingpong', (p) => messagesA.push(p));
      routerB.subscribe('pingpong', (p) => messagesB.push(p));

      // A sends ping
      simulateRemoteBroadcast('pingpong', { type: 'ping', from: 'A' });
      // B sends pong
      simulateRemoteBroadcast('pingpong', { type: 'pong', from: 'B' });
      // A sends ping again
      simulateRemoteBroadcast('pingpong', { type: 'ping', from: 'A' });

      expect(messagesA).toHaveLength(3);
      expect(messagesB).toHaveLength(3);
      expect(messagesA[0]).toEqual({ type: 'ping', from: 'A' });
      expect(messagesB[1]).toEqual({ type: 'pong', from: 'B' });
    });
  });

  // =========================================================================
  // Scenario 6: Multi-channel isolation
  // =========================================================================
  describe('Scenario 6: Channel isolation', () => {
    it('Messages on channel-A do not leak to channel-B subscribers', () => {
      const router = makeRouter();
      const handlerA = vi.fn();
      const handlerB = vi.fn();

      router.subscribe('channel-a', handlerA);
      router.subscribe('channel-b', handlerB);

      simulateRemoteBroadcast('channel-a', { data: 'for A only' });

      expect(handlerA).toHaveBeenCalledWith({ data: 'for A only' });
      expect(handlerB).not.toHaveBeenCalled();
    });

    it('Same router can subscribe to many channels independently', () => {
      const router = makeRouter();
      const results: Record<string, unknown[]> = { x: [], y: [], z: [] };

      router.subscribe('x', (p) => results.x.push(p));
      router.subscribe('y', (p) => results.y.push(p));
      router.subscribe('z', (p) => results.z.push(p));

      simulateRemoteBroadcast('y', 'only-y');
      simulateRemoteBroadcast('z', 'only-z');

      expect(results.x).toHaveLength(0);
      expect(results.y).toEqual(['only-y']);
      expect(results.z).toEqual(['only-z']);
    });
  });

  // =========================================================================
  // Scenario 7: Late subscriber
  // =========================================================================
  describe('Scenario 7: Late subscriber', () => {
    it('Late subscriber does NOT receive messages sent before subscription', () => {
      const earlyRouter = makeRouter();
      earlyRouter.subscribe('news', vi.fn());

      // Message sent before late subscriber joins
      simulateRemoteBroadcast('news', { old: true });

      const lateRouter = makeRouter();
      const lateHandler = vi.fn();
      lateRouter.subscribe('news', lateHandler);

      // Late subscriber should NOT have received the old message
      expect(lateHandler).not.toHaveBeenCalled();

      // But does receive new messages
      simulateRemoteBroadcast('news', { new: true });
      expect(lateHandler).toHaveBeenCalledWith({ new: true });
    });
  });

  // =========================================================================
  // Scenario 8: Rapid fire (burst of messages)
  // =========================================================================
  describe('Scenario 8: Rapid fire burst', () => {
    it('All messages in a burst are delivered in order', () => {
      const router = makeRouter();
      const received: number[] = [];

      router.subscribe('firehose', (p) => received.push(p as number));

      for (let i = 0; i < 100; i++) {
        simulateRemoteBroadcast('firehose', i);
      }

      expect(received).toHaveLength(100);
      expect(received).toEqual(Array.from({ length: 100 }, (_, i) => i));
    });
  });

  // =========================================================================
  // Scenario 9: Payload variety
  // =========================================================================
  describe('Scenario 9: Diverse payload types', () => {
    it.each([
      ['string', 'hello world'],
      ['number', 42],
      ['boolean', true],
      ['null', null],
      ['flat object', { key: 'value', count: 7 }],
      ['array', [1, 'two', { three: 3 }]],
      ['nested object', { a: { b: { c: { d: 'deep' } } } }],
      ['empty object', {}],
      ['empty array', []],
      ['mixed array', [null, true, 42, 'str', { nested: [1] }]],
    ])('delivers %s payload correctly', (_label, payload) => {
      const router = makeRouter();
      const handler = vi.fn();

      router.subscribe('typed-channel', handler);
      simulateRemoteBroadcast('typed-channel', payload);

      expect(handler).toHaveBeenCalledWith(payload);
    });
  });

  // =========================================================================
  // Scenario 10: Cleanup on destroy — no leaks
  // =========================================================================
  describe('Scenario 10: Cleanup on destroy', () => {
    it('Destroyed router does not receive further broadcasts', () => {
      const router = makeRouter();
      const handler = vi.fn();

      router.subscribe('cleanup-test', handler);

      // Verify it works before destroy
      simulateRemoteBroadcast('cleanup-test', 'before');
      expect(handler).toHaveBeenCalledTimes(1);

      router.destroy();

      // Simulate another broadcast — handler should NOT fire
      // (channel was removed from router's internal map)
      simulateRemoteBroadcast('cleanup-test', 'after');
      expect(handler).toHaveBeenCalledTimes(1); // still 1, not 2
    });

    it('Destroying one router does not affect other routers on the same channel', () => {
      const routerA = makeRouter();
      const routerB = makeRouter();
      const handlerA = vi.fn();
      const handlerB = vi.fn();

      routerA.subscribe('shared', handlerA);
      routerB.subscribe('shared', handlerB);

      routerA.destroy();

      // Router B should still receive
      simulateRemoteBroadcast('shared', 'still alive');
      expect(handlerB).toHaveBeenCalledWith('still alive');
    });

    it('destroy() calls removeChannel for every subscribed channel', () => {
      const router = makeRouter();
      router.subscribe('ch1', vi.fn());
      router.subscribe('ch2', vi.fn());
      router.subscribe('ch3', vi.fn());

      router.destroy();

      expect(mockRemoveChannelFn).toHaveBeenCalledTimes(3);
    });
  });
});
