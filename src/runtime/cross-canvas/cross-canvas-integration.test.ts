/**
 * Cross-Canvas Full-Stack Integration Tests
 *
 * Tests the complete message flow: SDK → bridge validation → WidgetFrame → router → back.
 * Uses real validators and real router with mocked Supabase.
 *
 * @module runtime/cross-canvas
 * @layer L3
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

type BroadcastHandler = (event: { payload: unknown }) => void;

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  _broadcastHandlers: BroadcastHandler[];
  _simulateBroadcast: (payload: unknown) => void;
}

// Maps channel name → array of all MockChannel instances for that name
const channelsByName = new Map<string, MockChannel[]>();

function createMockChannel(name: string): MockChannel {
  const broadcastHandlers: BroadcastHandler[] = [];
  const channel: MockChannel = {
    on: vi.fn().mockImplementation((_type: string, _opts: unknown, handler: BroadcastHandler) => {
      broadcastHandlers.push(handler);
      return channel;
    }),
    subscribe: vi.fn().mockImplementation((cb?: (status: string) => void) => {
      if (cb) cb('SUBSCRIBED');
      return channel;
    }),
    send: vi.fn().mockImplementation(({ payload }: { type: string; event: string; payload: unknown }) => {
      // Simulate broadcast to ALL channel instances with the same name (like Supabase Realtime)
      const peers = channelsByName.get(name) || [];
      for (const peer of peers) {
        peer._simulateBroadcast(payload);
      }
    }),
    _broadcastHandlers: broadcastHandlers,
    _simulateBroadcast(payload: unknown) {
      for (const handler of broadcastHandlers) {
        handler({ payload });
      }
    },
  };
  return channel;
}

vi.mock('../../kernel/supabase/client', () => ({
  supabase: {
    channel: vi.fn((name: string) => {
      const ch = createMockChannel(name);
      if (!channelsByName.has(name)) channelsByName.set(name, []);
      channelsByName.get(name)!.push(ch);
      return ch;
    }),
    removeChannel: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Real imports (not mocked)
// ---------------------------------------------------------------------------

import { validateWidgetMessage, validateHostMessage } from '../bridge/message-validator';

import { createCrossCanvasRouter } from './cross-canvas-router';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Cross-Canvas Full-Stack Integration', () => {
  beforeEach(() => {
    channelsByName.clear();
    vi.clearAllMocks();
  });

  it('I1: Widget A emits → bridge validates → router broadcasts → Widget B receives', () => {
    const routerA = createCrossCanvasRouter();
    const routerB = createCrossCanvasRouter();
    const receivedByA: unknown[] = [];
    const receivedByB: unknown[] = [];

    // Both subscribe (as they would in real use)
    routerA.subscribe('chat', (p) => receivedByA.push(p));
    routerB.subscribe('chat', (p) => receivedByB.push(p));

    // Simulate Widget A sending via bridge: validate the message first
    const rawMsg = { type: 'CROSS_CANVAS_EMIT', channel: 'chat', payload: { text: 'hello' } };
    const validated = validateWidgetMessage(rawMsg);
    expect(validated).not.toBeNull();
    expect(validated!.type).toBe('CROSS_CANVAS_EMIT');

    // Router A emits (this is what WidgetFrame does after validation)
    routerA.emit('chat', (validated as any).payload);

    // Widget B should have received the message via broadcast
    expect(receivedByB).toHaveLength(1);
    expect(receivedByB[0]).toEqual({ text: 'hello' });

    routerA.destroy();
    routerB.destroy();
  });

  it('I2: Subscribe + receive via validated CROSS_CANVAS_EVENT host message', () => {
    const router = createCrossCanvasRouter();
    const received: unknown[] = [];

    router.subscribe('updates', (payload) => received.push(payload));

    // Simulate broadcast arriving
    const channel = channelsByName.get('crosscanvas:updates')![0];
    channel._simulateBroadcast({ version: 2 });

    // Validate the host message that would be sent to widget
    const hostMsg = validateHostMessage({
      type: 'CROSS_CANVAS_EVENT',
      channel: 'updates',
      payload: received[0],
    });
    expect(hostMsg).not.toBeNull();
    expect(hostMsg!.type).toBe('CROSS_CANVAS_EVENT');

    router.destroy();
  });

  it('I3: Channel isolation — messages on chat do not reach alerts', () => {
    const routerA = createCrossCanvasRouter();
    const routerB = createCrossCanvasRouter();
    const chatReceived: unknown[] = [];
    const alertsReceived: unknown[] = [];

    routerA.subscribe('chat', (p) => chatReceived.push(p));
    routerB.subscribe('alerts', (p) => alertsReceived.push(p));

    // Emit on chat — broadcasts to all 'crosscanvas:chat' peers
    routerA.emit('chat', { msg: 'hi' });

    // Chat handlers on routerA receive their own broadcast
    expect(chatReceived).toHaveLength(1);
    // Alerts on routerB should NOT receive (different channel name)
    expect(alertsReceived).toHaveLength(0);

    routerA.destroy();
    routerB.destroy();
  });

  it('I4: Unsubscribe stops delivery', () => {
    const router = createCrossCanvasRouter();
    const received: unknown[] = [];

    router.subscribe('events', (p) => received.push(p));
    const channel = channelsByName.get('crosscanvas:events')![0];

    // First broadcast works
    channel._simulateBroadcast({ n: 1 });
    expect(received).toHaveLength(1);

    // Unsubscribe
    router.unsubscribe('events');

    // Second broadcast should not reach handler
    channel._simulateBroadcast({ n: 2 });
    expect(received).toHaveLength(1); // Still 1

    router.destroy();
  });

  it('I5: Invalid message rejected at bridge validation layer', () => {
    // Missing channel field
    const badEmit = validateWidgetMessage({ type: 'CROSS_CANVAS_EMIT', payload: { data: 1 } });
    expect(badEmit).toBeNull();

    // Missing channel field on subscribe
    const badSub = validateWidgetMessage({ type: 'CROSS_CANVAS_SUBSCRIBE' });
    expect(badSub).toBeNull();

    // Missing channel on host event
    const badHost = validateHostMessage({ type: 'CROSS_CANVAS_EVENT', payload: {} });
    expect(badHost).toBeNull();

    // Valid messages pass
    const goodEmit = validateWidgetMessage({ type: 'CROSS_CANVAS_EMIT', channel: 'ch', payload: {} });
    expect(goodEmit).not.toBeNull();

    const goodSub = validateWidgetMessage({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'ch' });
    expect(goodSub).not.toBeNull();
  });

  it('I6: Multiple subscribers on same channel all receive', () => {
    const routerA = createCrossCanvasRouter();
    const routerB = createCrossCanvasRouter();
    const routerC = createCrossCanvasRouter();
    const receivedA: unknown[] = [];
    const receivedB: unknown[] = [];
    const receivedC: unknown[] = [];

    routerA.subscribe('broadcast', (p) => receivedA.push(p));
    routerB.subscribe('broadcast', (p) => receivedB.push(p));
    routerC.subscribe('broadcast', (p) => receivedC.push(p));

    // Router A emits — broadcasts to all peers on 'crosscanvas:broadcast'
    routerA.emit('broadcast', { msg: 'hello all' });

    // All three should receive (broadcast goes to all channel instances)
    expect(receivedA).toHaveLength(1);
    expect(receivedB).toHaveLength(1);
    expect(receivedC).toHaveLength(1);
    expect(receivedA[0]).toEqual({ msg: 'hello all' });
    expect(receivedB[0]).toEqual({ msg: 'hello all' });

    routerA.destroy();
    routerB.destroy();
    routerC.destroy();
  });

  it('I7: Cleanup on destroy — no more callbacks fire', () => {
    const router = createCrossCanvasRouter();
    const received: unknown[] = [];

    router.subscribe('cleanup', (p) => received.push(p));
    const channels = channelsByName.get('crosscanvas:cleanup')!;
    const channel = channels[0];

    // Verify working
    channel._simulateBroadcast({ n: 1 });
    expect(received).toHaveLength(1);

    // Destroy
    router.destroy();

    // No more callbacks (subscription entry deleted from router's internal map)
    channel._simulateBroadcast({ n: 2 });
    expect(received).toHaveLength(1);
  });

  it('I8: Channel name validation rejects at router level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const router = createCrossCanvasRouter();

    // These should all be rejected
    router.subscribe('bad/channel', vi.fn());
    router.emit('bad:channel', {});
    router.subscribe('', vi.fn());

    expect(spy).toHaveBeenCalledTimes(3);
    spy.mockRestore();
    router.destroy();
  });

  it('I9: SDK unsubscribe message validates correctly', () => {
    const msg = validateWidgetMessage({
      type: 'CROSS_CANVAS_UNSUBSCRIBE',
      channel: 'room-1',
    });
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe('CROSS_CANVAS_UNSUBSCRIBE');
    expect((msg as any).channel).toBe('room-1');
  });
});
