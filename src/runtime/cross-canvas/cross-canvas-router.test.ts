/**
 * Tests for Cross-Canvas Event Router
 *
 * @module runtime/cross-canvas
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

type BroadcastHandler = (event: { payload: unknown }) => void;

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  _broadcastHandlers: BroadcastHandler[];
  _simulateBroadcast: (envelope: unknown) => void;
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
        cb('SUBSCRIBED');
      }
      return channel;
    }),
    send: vi.fn(),
    _broadcastHandlers: broadcastHandlers,
    _simulateBroadcast(envelope: unknown) {
      for (const handler of broadcastHandlers) {
        handler({ payload: envelope });
      }
    },
    get _subscribeCallback() {
      return subscribeCallback;
    },
  };

  return channel;
}

const mockChannels = new Map<string, MockChannel>();

const { mockChannelFn, mockRemoveChannelFn } = vi.hoisted(() => {
  return {
    mockChannelFn: vi.fn(),
    mockRemoveChannelFn: vi.fn(),
  };
});

vi.mock('../../kernel/supabase/client', () => ({
  supabase: {
    channel: mockChannelFn,
    removeChannel: mockRemoveChannelFn,
  },
}));

vi.mock('../../kernel/stores/auth/auth.store', () => ({
  useAuthStore: Object.assign(vi.fn(), {
    getState: vi.fn(() => ({ user: null })),
  }),
}));

import { createCrossCanvasRouter } from './cross-canvas-router';
import type { CrossCanvasRouter, CrossCanvasEnvelope } from './cross-canvas-router';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a valid envelope for simulating remote delivery */
function makeEnvelope(payload: unknown, id?: string): CrossCanvasEnvelope {
  return {
    id: id ?? crypto.randomUUID(),
    sender: { widgetId: 'test-widget', instanceId: 'test-instance' },
    payload,
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CrossCanvasRouter', () => {
  let router: CrossCanvasRouter;

  beforeEach(() => {
    mockChannels.clear();
    vi.clearAllMocks();

    mockChannelFn.mockImplementation((name: string) => {
      const ch = createMockChannel();
      mockChannels.set(name, ch);
      return ch;
    });
    mockRemoveChannelFn.mockImplementation(() => {});

    router = createCrossCanvasRouter();
  });

  afterEach(() => {
    router.destroy();
  });

  it('subscribe() creates a Realtime channel with correct naming', () => {
    router.subscribe('notifications', vi.fn());
    expect(mockChannels.has('crosscanvas:notifications')).toBe(true);
  });

  it('subscribe() registers the callback and invokes it on remote broadcast', () => {
    const handler = vi.fn();
    router.subscribe('notifications', handler);

    const channel = mockChannels.get('crosscanvas:notifications')!;
    channel._simulateBroadcast(makeEnvelope({ text: 'hello' }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ text: 'hello' });
  });

  it('subscribe() supports multiple callbacks on the same channel', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    router.subscribe('notifications', handler1);
    router.subscribe('notifications', handler2);

    const channel = mockChannels.get('crosscanvas:notifications')!;
    channel._simulateBroadcast(makeEnvelope({ text: 'multi' }));

    expect(handler1).toHaveBeenCalledWith({ text: 'multi' });
    expect(handler2).toHaveBeenCalledWith({ text: 'multi' });
  });

  it('subscribe() only creates one Realtime channel per logical channel', () => {
    router.subscribe('notifications', vi.fn());
    router.subscribe('notifications', vi.fn());

    const channelCalls = mockChannelFn.mock.calls.filter(
      (call: unknown[]) => call[0] === 'crosscanvas:notifications',
    );
    expect(channelCalls).toHaveLength(1);
  });

  it('emit() sends envelope via Supabase when connected', () => {
    router.subscribe('notifications', vi.fn());

    const channel = mockChannels.get('crosscanvas:notifications')!;
    router.emit('notifications', { text: 'broadcast' }, { widgetId: 'w1', instanceId: 'i1' });

    expect(channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'message',
        payload: expect.objectContaining({
          id: expect.any(String),
          sender: { widgetId: 'w1', instanceId: 'i1' },
          payload: { text: 'broadcast' },
          timestamp: expect.any(Number),
        }),
      }),
    );
  });

  it('emit() delivers locally with raw payload (no envelope)', () => {
    const handler = vi.fn();
    router.subscribe('notifications', handler);

    router.emit('notifications', { text: 'local' });

    expect(handler).toHaveBeenCalledWith({ text: 'local' });
  });

  it('emit() without prior subscription creates transport on demand', () => {
    router.emit('ephemeral', { text: 'fire-and-forget' });
    // Transport is created on demand so remote delivery works
    expect(mockChannels.get('crosscanvas:ephemeral')).toBeDefined();
  });

  it('unsubscribe() removes the channel and cleans up', () => {
    router.subscribe('notifications', vi.fn());
    const channel = mockChannels.get('crosscanvas:notifications')!;

    router.unsubscribe('notifications');

    expect(mockRemoveChannelFn).toHaveBeenCalledWith(channel);
  });

  it('unsubscribe() is a no-op for non-existent channels', () => {
    expect(() => router.unsubscribe('nonexistent')).not.toThrow();
  });

  it('handler errors do not crash the router', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badHandler = vi.fn(() => { throw new Error('boom'); });
    const goodHandler = vi.fn();

    router.subscribe('ch', badHandler);
    router.subscribe('ch', goodHandler);

    const channel = mockChannels.get('crosscanvas:ch')!;
    channel._simulateBroadcast(makeEnvelope({ n: 1 }));

    expect(goodHandler).toHaveBeenCalledWith({ n: 1 });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('destroy() cleans up all channels', () => {
    router.subscribe('a', vi.fn());
    router.subscribe('b', vi.fn());

    router.destroy();

    expect(mockRemoveChannelFn).toHaveBeenCalledTimes(2);
  });

  // --- Per-callback subscriptions ---

  describe('per-callback unsubscribe', () => {
    it('subscribe() returns a function', () => {
      const unsub = router.subscribe('ch', vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('calling returned function removes only that callback', () => {
      const handlerA = vi.fn();
      const handlerB = vi.fn();

      const unsubA = router.subscribe('ch', handlerA);
      router.subscribe('ch', handlerB);

      // Both receive
      const channel = mockChannels.get('crosscanvas:ch')!;
      channel._simulateBroadcast(makeEnvelope({ n: 1 }));
      expect(handlerA).toHaveBeenCalledTimes(1);
      expect(handlerB).toHaveBeenCalledTimes(1);

      // Unsub A only
      unsubA();

      channel._simulateBroadcast(makeEnvelope({ n: 2 }));
      expect(handlerA).toHaveBeenCalledTimes(1); // still 1
      expect(handlerB).toHaveBeenCalledTimes(2); // now 2
    });

    it('transport is torn down only when last callback is removed', () => {
      const unsubA = router.subscribe('ch', vi.fn());
      const unsubB = router.subscribe('ch', vi.fn());

      unsubA();
      // Transport still alive — B is still subscribed
      expect(mockRemoveChannelFn).not.toHaveBeenCalled();

      unsubB();
      // Now last callback removed — transport torn down
      expect(mockRemoveChannelFn).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe() still tears down the entire channel', () => {
      router.subscribe('ch', vi.fn());
      router.subscribe('ch', vi.fn());

      router.unsubscribe('ch');
      expect(mockRemoveChannelFn).toHaveBeenCalledTimes(1);
    });
  });

  // --- Envelope & Dedup ---

  describe('message envelope and dedup', () => {
    it('emit() wraps payload in CrossCanvasEnvelope with sender identity', () => {
      router.subscribe('ch', vi.fn());
      const channel = mockChannels.get('crosscanvas:ch')!;

      router.emit('ch', { data: 1 }, { widgetId: 'sender-w', instanceId: 'sender-i' });

      const sentPayload = channel.send.mock.calls[0][0].payload as CrossCanvasEnvelope;
      expect(sentPayload.id).toBeDefined();
      expect(sentPayload.sender).toEqual({ widgetId: 'sender-w', instanceId: 'sender-i' });
      expect(sentPayload.payload).toEqual({ data: 1 });
      expect(sentPayload.timestamp).toBeGreaterThan(0);
    });

    it('dedup: same message ID received twice delivers only once', () => {
      const handler = vi.fn();
      router.subscribe('ch', handler);
      const channel = mockChannels.get('crosscanvas:ch')!;

      const envelope = makeEnvelope({ x: 1 }, 'dedup-test-id');

      // Simulate receiving the same envelope twice (e.g., BroadcastChannel + Supabase)
      channel._simulateBroadcast(envelope);
      channel._simulateBroadcast(envelope);

      // Should only deliver once
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('dedup: own emitted message ID is tracked (no self-echo)', () => {
      const handler = vi.fn();
      router.subscribe('ch', handler);
      const channel = mockChannels.get('crosscanvas:ch')!;

      router.emit('ch', { data: 1 });

      // Extract the message ID from the sent envelope
      const sentEnvelope = channel.send.mock.calls[0][0].payload as CrossCanvasEnvelope;

      // Simulate the same message coming back via remote
      channel._simulateBroadcast(sentEnvelope);

      // Local delivery: 1 call. Remote echo: 0 (deduped). Total: 1.
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // --- Channel scoping ---

  describe('user-scoped channels', () => {
    it('channels are prefixed with userId when provided', () => {
      const scopedRouter = createCrossCanvasRouter('user-123');
      scopedRouter.subscribe('chat', vi.fn());

      expect(mockChannels.has('crosscanvas:user-123:chat')).toBe(true);
      scopedRouter.destroy();
    });

    it('channels have no prefix when userId is not provided', () => {
      router.subscribe('chat', vi.fn());
      expect(mockChannels.has('crosscanvas:chat')).toBe(true);
    });

    it('two routers with different userIds are isolated', () => {
      const routerA = createCrossCanvasRouter('alice');
      const routerB = createCrossCanvasRouter('bob');

      const handlerA = vi.fn();
      const handlerB = vi.fn();

      routerA.subscribe('chat', handlerA);
      routerB.subscribe('chat', handlerB);

      // Emit on alice's router — should not reach bob (different scoped channels)
      routerA.emit('chat', { msg: 'hi' });

      expect(handlerA).toHaveBeenCalledWith({ msg: 'hi' }); // local delivery
      expect(handlerB).not.toHaveBeenCalled(); // different channel

      routerA.destroy();
      routerB.destroy();
    });
  });

  // --- Channel name validation ---

  describe('channel name validation', () => {
    it('rejects invalid channel names on subscribe', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      router.subscribe('', vi.fn());
      router.subscribe('has spaces', vi.fn());
      router.subscribe('has:colons', vi.fn());

      expect(spy).toHaveBeenCalledTimes(3);
      spy.mockRestore();
    });

    it('accepts valid channel names', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      router.subscribe('my-channel.v2_test', vi.fn());

      expect(mockChannelFn).toHaveBeenCalledWith('crosscanvas:my-channel.v2_test', expect.objectContaining({ config: expect.any(Object) }));
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('accepts channel name at exactly 128 chars', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const maxName = 'a'.repeat(128);
      router.subscribe(maxName, vi.fn());

      expect(mockChannelFn).toHaveBeenCalledWith(`crosscanvas:${maxName}`, expect.objectContaining({ config: expect.any(Object) }));
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // --- Offline queuing ---

  describe('offline queuing', () => {
    it('queues messages when channel is not connected', () => {
      // Override subscribe to NOT auto-fire SUBSCRIBED
      mockChannelFn.mockImplementation((name: string) => {
        const broadcastHandlers: BroadcastHandler[] = [];
        const ch: MockChannel = {
          on: vi.fn().mockImplementation((_t: string, _o: unknown, h: BroadcastHandler) => {
            broadcastHandlers.push(h);
            return ch;
          }),
          subscribe: vi.fn().mockImplementation((cb?: (status: string) => void) => {
            // Don't auto-connect
            if (cb) cb('CHANNEL_ERROR');
            return ch;
          }),
          send: vi.fn(),
          _broadcastHandlers: broadcastHandlers,
          _simulateBroadcast(envelope: unknown) {
            for (const handler of broadcastHandlers) handler({ payload: envelope });
          },
          get _subscribeCallback() { return null; },
        };
        mockChannels.set(name, ch);
        return ch;
      });

      const offlineRouter = createCrossCanvasRouter();
      offlineRouter.subscribe('ch', vi.fn());
      offlineRouter.emit('ch', { queued: true });

      expect(offlineRouter.getQueueLength()).toBe(1);
      offlineRouter.destroy();
    });

    it('flushes queue when channel becomes connected', () => {
      let connectCb: ((status: string) => void) | null = null;
      mockChannelFn.mockImplementation((name: string) => {
        const broadcastHandlers: BroadcastHandler[] = [];
        const ch: MockChannel = {
          on: vi.fn().mockImplementation((_t: string, _o: unknown, h: BroadcastHandler) => {
            broadcastHandlers.push(h);
            return ch;
          }),
          subscribe: vi.fn().mockImplementation((cb?: (status: string) => void) => {
            if (cb) connectCb = cb;
            return ch;
          }),
          send: vi.fn(),
          _broadcastHandlers: broadcastHandlers,
          _simulateBroadcast(envelope: unknown) {
            for (const handler of broadcastHandlers) handler({ payload: envelope });
          },
          get _subscribeCallback() { return connectCb; },
        };
        mockChannels.set(name, ch);
        return ch;
      });

      const queueRouter = createCrossCanvasRouter();
      queueRouter.subscribe('ch', vi.fn());
      queueRouter.emit('ch', { queued: true });

      const channel = mockChannels.get('crosscanvas:ch')!;
      expect(channel.send).not.toHaveBeenCalled();

      // Now connect — use non-null assertion; closure assignment is invisible to TS control flow
      connectCb!('SUBSCRIBED');
      expect(channel.send).toHaveBeenCalledTimes(1);

      queueRouter.destroy();
    });
  });
});
