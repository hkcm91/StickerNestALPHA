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

import { createCrossCanvasRouter } from './cross-canvas-router';
import type { CrossCanvasRouter } from './cross-canvas-router';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CrossCanvasRouter', () => {
  let router: CrossCanvasRouter;

  beforeEach(() => {
    mockChannels.clear();
    vi.clearAllMocks();

    // Set up mock implementations
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
    const handler = vi.fn();
    router.subscribe('notifications', handler);

    expect(mockChannels.has('crosscanvas:notifications')).toBe(true);
  });

  it('subscribe() registers the callback and invokes it on broadcast', () => {
    const handler = vi.fn();
    router.subscribe('notifications', handler);

    const channel = mockChannels.get('crosscanvas:notifications')!;
    channel._simulateBroadcast({ text: 'hello' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ text: 'hello' });
  });

  it('subscribe() supports multiple callbacks on the same channel', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    router.subscribe('notifications', handler1);
    router.subscribe('notifications', handler2);

    const channel = mockChannels.get('crosscanvas:notifications')!;
    channel._simulateBroadcast({ text: 'multi' });

    expect(handler1).toHaveBeenCalledWith({ text: 'multi' });
    expect(handler2).toHaveBeenCalledWith({ text: 'multi' });
  });

  it('subscribe() only creates one Realtime channel per logical channel', () => {
    router.subscribe('notifications', vi.fn());
    router.subscribe('notifications', vi.fn());

    // supabase.channel should have been called only once for 'crosscanvas:notifications'
    const channelCalls = mockChannelFn.mock.calls.filter(
      (call: unknown[]) => call[0] === 'crosscanvas:notifications',
    );
    expect(channelCalls).toHaveLength(1);
  });

  it('emit() sends via existing subscribed channel', () => {
    router.subscribe('notifications', vi.fn());

    const channel = mockChannels.get('crosscanvas:notifications')!;
    router.emit('notifications', { text: 'broadcast' });

    expect(channel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'message',
      payload: { text: 'broadcast' },
    });
  });

  it('emit() creates ephemeral channel when no subscription exists', () => {
    router.emit('ephemeral', { text: 'fire-and-forget' });

    const channel = mockChannels.get('crosscanvas:ephemeral')!;
    expect(channel).toBeDefined();
    expect(channel.subscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe() removes the channel and cleans up', () => {
    const handler = vi.fn();
    router.subscribe('notifications', handler);

    const channel = mockChannels.get('crosscanvas:notifications')!;

    router.unsubscribe('notifications');

    expect(mockRemoveChannelFn).toHaveBeenCalledWith(channel);
  });

  it('unsubscribe() is a no-op for non-existent channels', () => {
    // Should not throw
    expect(() => router.unsubscribe('nonexistent')).not.toThrow();
  });

  it('destroy() removes all channels', () => {
    router.subscribe('channel-a', vi.fn());
    router.subscribe('channel-b', vi.fn());

    router.destroy();

    // removeChannel should have been called for both
    expect(mockRemoveChannelFn).toHaveBeenCalledTimes(2);
  });

  it('handler errors do not crash the router', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badHandler = vi.fn(() => {
      throw new Error('handler crash');
    });
    const goodHandler = vi.fn();

    router.subscribe('notifications', badHandler);
    router.subscribe('notifications', goodHandler);

    const channel = mockChannels.get('crosscanvas:notifications')!;
    channel._simulateBroadcast({ text: 'test' });

    // Bad handler threw, but good handler still ran
    expect(badHandler).toHaveBeenCalledTimes(1);
    expect(goodHandler).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('callbacks do not fire after unsubscribe', () => {
    const handler = vi.fn();
    router.subscribe('notifications', handler);

    // Capture channel reference before unsubscribe removes it from map
    const channel = mockChannels.get('crosscanvas:notifications')!;

    router.unsubscribe('notifications');

    // Simulate a broadcast on the (now removed) channel — handler should not fire
    // because the subscription entry no longer exists in the router
    channel._simulateBroadcast({ text: 'late' });

    expect(handler).not.toHaveBeenCalled();
  });
});
