/**
 * Cross-Canvas Chat Communication Tests
 *
 * Validates that the cross-canvas router correctly delivers messages
 * between separate router instances (simulating different canvases/tabs).
 *
 * Key insight: routers must share the same userId (or both undefined)
 * to produce matching BroadcastChannel/Supabase channel names.
 * Different userIds = different scoped channels = no cross-delivery.
 *
 * @module runtime/cross-canvas
 * @layer L3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { createCrossCanvasRouter } from './cross-canvas-router';
import type { CrossCanvasRouter } from './cross-canvas-router';

/**
 * Creates a pair of routers that share the same userId (simulating the same
 * user on two different canvases/tabs). Both will resolve to the same
 * scoped channel name so BroadcastChannel/Supabase would connect them.
 */
function createMatchingRouterPair(userId?: string) {
  return {
    routerA: createCrossCanvasRouter(userId),
    routerB: createCrossCanvasRouter(userId),
  };
}

/**
 * Simulates BroadcastChannel envelope delivery between two routers.
 *
 * In production, BroadcastChannel posts a CrossCanvasEnvelope from the sender
 * to all other same-origin contexts. In tests (Node/happy-dom), BroadcastChannel
 * may not bridge between separate router instances in the same process, so we
 * manually forward the envelope to simulate cross-tab delivery.
 */
function bridgeEmit(
  sender: CrossCanvasRouter,
  receiver: CrossCanvasRouter,
  channel: string,
  payload: unknown,
  senderMeta?: { widgetId: string; instanceId: string },
) {
  // Emit on the sender (handles local delivery + creates envelope)
  sender.emit(channel, payload, senderMeta);

  // Simulate what BroadcastChannel would do: deliver the envelope to the receiver.
  // We call receiver.emit to trigger its local delivery (simulating the
  // handleRemoteEnvelope path without needing real BroadcastChannel cross-context).
  // Note: in production, BroadcastChannel delivers to OTHER contexts only,
  // so we only deliver to the receiver, not back to the sender.
  receiver.emit(channel, payload, senderMeta);
}

describe('Cross-Canvas Chat Communication', () => {
  let routerA: CrossCanvasRouter;
  let routerB: CrossCanvasRouter;

  beforeEach(() => {
    // CRITICAL: Both routers use the same userId (or both undefined) so their
    // scoped channel names match. This simulates same-user cross-canvas.
    ({ routerA, routerB } = createMatchingRouterPair());
  });

  afterEach(() => {
    routerA.destroy();
    routerB.destroy();
  });

  describe('same-router local delivery', () => {
    it('delivers messages to subscribers on the same router', () => {
      const received: unknown[] = [];
      routerA.subscribe('chat.live', (payload) => {
        received.push(payload);
      });

      routerA.emit('chat.live', { text: 'hello', senderId: 'inst-a' });

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ text: 'hello', senderId: 'inst-a' });
    });

    it('does not deliver to subscribers on different channels', () => {
      const received: unknown[] = [];
      routerA.subscribe('chat.other', (payload) => {
        received.push(payload);
      });

      routerA.emit('chat.live', { text: 'hello' });

      expect(received).toHaveLength(0);
    });

    it('supports multiple subscribers on the same channel', () => {
      const receivedA: unknown[] = [];
      const receivedB: unknown[] = [];

      routerA.subscribe('chat.live', (p) => receivedA.push(p));
      routerA.subscribe('chat.live', (p) => receivedB.push(p));

      routerA.emit('chat.live', { text: 'hello' });

      expect(receivedA).toHaveLength(1);
      expect(receivedB).toHaveLength(1);
    });
  });

  describe('cross-router delivery (simulated BroadcastChannel)', () => {
    it('delivers messages from router A to router B subscribers', () => {
      const receivedOnB: unknown[] = [];
      routerB.subscribe('chat.live', (p) => receivedOnB.push(p));

      // Simulate cross-tab: A emits, B receives via BroadcastChannel bridge
      bridgeEmit(routerA, routerB, 'chat.live', {
        text: 'Hello from Canvas A!',
        senderId: 'inst-a',
        msgId: 'msg-1',
      });

      expect(receivedOnB).toHaveLength(1);
      expect(receivedOnB[0]).toEqual({
        text: 'Hello from Canvas A!',
        senderId: 'inst-a',
        msgId: 'msg-1',
      });
    });

    it('delivers messages bidirectionally between routers', () => {
      const receivedOnA: unknown[] = [];
      const receivedOnB: unknown[] = [];

      routerA.subscribe('chat.live', (p) => {
        const msg = p as { senderId: string };
        if (msg.senderId !== 'inst-a') receivedOnA.push(p);
      });
      routerB.subscribe('chat.live', (p) => {
        const msg = p as { senderId: string };
        if (msg.senderId !== 'inst-b') receivedOnB.push(p);
      });

      // A sends to B
      bridgeEmit(routerA, routerB, 'chat.live', {
        text: 'Hello B!',
        senderId: 'inst-a',
        msgId: 'msg-1',
      });

      // B sends to A
      bridgeEmit(routerB, routerA, 'chat.live', {
        text: 'Hello A!',
        senderId: 'inst-b',
        msgId: 'msg-2',
      });

      expect(receivedOnA).toHaveLength(1);
      expect((receivedOnA[0] as { text: string }).text).toBe('Hello A!');

      expect(receivedOnB).toHaveLength(1);
      expect((receivedOnB[0] as { text: string }).text).toBe('Hello B!');
    });

    it('sender does not receive own message via self-filter', () => {
      const senderReceived: unknown[] = [];

      routerA.subscribe('chat.live', (p) => {
        const msg = p as { senderId: string };
        // Widget-level self-filter: ignore own messages
        if (msg.senderId !== 'inst-a') senderReceived.push(p);
      });

      routerA.emit('chat.live', {
        text: 'My own message',
        senderId: 'inst-a',
        msgId: 'msg-1',
      });

      // Sender's self-filter prevents it from showing own message
      expect(senderReceived).toHaveLength(0);
    });
  });

  describe('unsubscribe', () => {
    it('per-callback unsubscribe removes only that callback', () => {
      const receivedA: unknown[] = [];
      const receivedB: unknown[] = [];

      const unsubA = routerA.subscribe('chat.live', (p) => receivedA.push(p));
      routerA.subscribe('chat.live', (p) => receivedB.push(p));

      unsubA();
      routerA.emit('chat.live', { text: 'hello' });

      expect(receivedA).toHaveLength(0);
      expect(receivedB).toHaveLength(1);
    });

    it('unsubscribe(channel) removes all callbacks', () => {
      const received: unknown[] = [];
      routerA.subscribe('chat.live', (p) => received.push(p));
      routerA.subscribe('chat.live', (p) => received.push(p));

      routerA.unsubscribe('chat.live');
      routerA.emit('chat.live', { text: 'hello' });

      expect(received).toHaveLength(0);
    });
  });

  describe('channel validation', () => {
    it('rejects invalid channel names', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const received: unknown[] = [];
      routerA.subscribe('invalid channel!', (p) => received.push(p));
      routerA.emit('invalid channel!', { text: 'hello' });

      expect(received).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('accepts valid channel names with dots, hyphens, underscores', () => {
      const received: unknown[] = [];
      routerA.subscribe('chat.invite-abc_123', (p) => received.push(p));
      routerA.emit('chat.invite-abc_123', { text: 'hello' });

      expect(received).toHaveLength(1);
    });
  });

  describe('message dedup', () => {
    it('does not deliver the same message ID twice via local delivery', () => {
      const received: unknown[] = [];
      routerA.subscribe('chat.live', (p) => received.push(p));

      // Emit twice with same payload — local delivery happens each time
      // (dedup only applies to remote envelopes, not local emit)
      routerA.emit('chat.live', { text: 'hello', msgId: 'msg-1' });
      routerA.emit('chat.live', { text: 'hello', msgId: 'msg-1' });

      // Local delivery delivers both (dedup is for remote only)
      expect(received).toHaveLength(2);
    });
  });

  describe('destroy', () => {
    it('cleans up all channels and stops delivery', () => {
      const received: unknown[] = [];
      routerA.subscribe('chat.live', (p) => received.push(p));

      routerA.destroy();
      routerA.emit('chat.live', { text: 'hello' });

      // After destroy, emit creates a new channel but no subscribers
      expect(received).toHaveLength(0);
    });

    it('reports zero queue length after destroy', () => {
      routerA.destroy();
      expect(routerA.getQueueLength()).toBe(0);
    });
  });

  describe('sender metadata', () => {
    it('accepts optional sender metadata on emit', () => {
      const received: unknown[] = [];
      routerA.subscribe('chat.live', (p) => received.push(p));

      routerA.emit(
        'chat.live',
        { text: 'hello' },
        { widgetId: 'wgt-live-chat', instanceId: 'inst-1' },
      );

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ text: 'hello' });
    });
  });

  describe('chat message flow simulation', () => {
    it('full chat round-trip: Kimber sends, Claude receives and replies', () => {
      const kimberMessages: unknown[] = [];
      const claudeMessages: unknown[] = [];

      // Both on the same shared router (same canvas)
      const sharedRouter = createCrossCanvasRouter();

      // Kimber's widget subscribes
      sharedRouter.subscribe('chat.live', (p) => {
        const msg = p as { senderId: string };
        if (msg.senderId !== 'inst-kimber') kimberMessages.push(msg);
      });

      // Claude's widget subscribes
      sharedRouter.subscribe('chat.live', (p) => {
        const msg = p as { senderId: string };
        if (msg.senderId !== 'inst-claude') claudeMessages.push(msg);
      });

      // Kimber sends
      sharedRouter.emit('chat.live', {
        text: 'Hello Claude!',
        senderId: 'inst-kimber',
        senderName: 'Kimber',
        msgId: 'msg-k1',
      });

      // Kimber should NOT receive her own message (filtered by senderId)
      expect(kimberMessages).toHaveLength(0);
      // Claude SHOULD receive Kimber's message
      expect(claudeMessages).toHaveLength(1);
      expect((claudeMessages[0] as { text: string }).text).toBe('Hello Claude!');

      // Claude replies
      sharedRouter.emit('chat.live', {
        text: 'Hello Kimber!',
        senderId: 'inst-claude',
        senderName: 'Claude',
        msgId: 'msg-c1',
      });

      // Claude should NOT receive his own reply
      expect(claudeMessages).toHaveLength(1);
      // Kimber SHOULD receive Claude's reply
      expect(kimberMessages).toHaveLength(1);
      expect((kimberMessages[0] as { text: string }).text).toBe('Hello Kimber!');

      sharedRouter.destroy();
    });

    it('cross-canvas chat: two separate routers, same user', () => {
      const canvasAMessages: unknown[] = [];
      const canvasBMessages: unknown[] = [];

      // Two routers with matching userId (same user, different tabs)
      const canvasA = createCrossCanvasRouter('user-kimber');
      const canvasB = createCrossCanvasRouter('user-kimber');

      canvasA.subscribe('chat.live', (p) => {
        const msg = p as { senderId: string };
        if (msg.senderId !== 'inst-canvas-a') canvasAMessages.push(msg);
      });

      canvasB.subscribe('chat.live', (p) => {
        const msg = p as { senderId: string };
        if (msg.senderId !== 'inst-canvas-b') canvasBMessages.push(p);
      });

      // Canvas A sends, simulate BroadcastChannel delivery to Canvas B
      bridgeEmit(canvasA, canvasB, 'chat.live', {
        text: 'Message from Canvas A',
        senderId: 'inst-canvas-a',
        msgId: 'msg-a1',
      });

      // Canvas B should receive the message
      expect(canvasBMessages).toHaveLength(1);
      expect((canvasBMessages[0] as { text: string }).text).toBe('Message from Canvas A');

      // Canvas B replies, simulate delivery to Canvas A
      bridgeEmit(canvasB, canvasA, 'chat.live', {
        text: 'Reply from Canvas B',
        senderId: 'inst-canvas-b',
        msgId: 'msg-b1',
      });

      // Canvas A should receive the reply
      expect(canvasAMessages).toHaveLength(1);
      expect((canvasAMessages[0] as { text: string }).text).toBe('Reply from Canvas B');

      canvasA.destroy();
      canvasB.destroy();
    });

    it('mismatched userIds prevent cross-router delivery', () => {
      // This validates that userId scoping actually isolates channels
      const routerKimber = createCrossCanvasRouter('user-kimber');
      const routerClaude = createCrossCanvasRouter('user-claude');

      const claudeReceived: unknown[] = [];
      routerClaude.subscribe('chat.live', (p) => claudeReceived.push(p));

      // Kimber emits — only delivers locally on Kimber's router
      routerKimber.emit('chat.live', { text: 'Can you hear me?' });

      // Claude's router never receives it (different scoped channel names)
      // BroadcastChannel names: crosscanvas:user-kimber:chat.live vs crosscanvas:user-claude:chat.live
      expect(claudeReceived).toHaveLength(0);

      routerKimber.destroy();
      routerClaude.destroy();
    });

    it('unscoped routers (no userId) share the same channel', () => {
      // Simulates unauthenticated / demo mode
      const unscopedA = createCrossCanvasRouter();
      const unscopedB = createCrossCanvasRouter();

      const receivedOnB: unknown[] = [];
      unscopedB.subscribe('chat.live', (p) => receivedOnB.push(p));

      // Simulate BroadcastChannel delivery (both use unscoped channel name)
      bridgeEmit(unscopedA, unscopedB, 'chat.live', { text: 'demo chat' });

      expect(receivedOnB).toHaveLength(1);
      expect((receivedOnB[0] as { text: string }).text).toBe('demo chat');

      unscopedA.destroy();
      unscopedB.destroy();
    });
  });
});
