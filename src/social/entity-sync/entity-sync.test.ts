import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SocialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useCanvasStore } from '../../kernel/stores/canvas/canvas.store';
import type { CanvasChannel } from '../channel';

import { createEntitySync } from './entity-sync';
import type { EntityTransform } from './entity-sync';

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
  bus.unsubscribeAll();
  useCanvasStore.getState().reset();
  // Default: user has editor role
  useCanvasStore.setState({ userRole: 'editor' });
});

describe('EntitySyncManager', () => {
  it('broadcasts entity position optimistically during drag', () => {
    const mock = createMockChannel();
    const sync = createEntitySync(mock);

    const transform: EntityTransform = {
      entityId: 'e-1',
      position: { x: 100, y: 200 },
      userId: 'user-a',
      timestamp: Date.now(),
    };

    sync.broadcastTransform(transform);

    expect(mock._broadcastCalls).toHaveLength(1);
    const sent = mock._broadcastCalls[0].payload as EntityTransform & { isFinal: boolean };
    expect(sent.isFinal).toBe(false);
    expect(sent.position).toEqual({ x: 100, y: 200 });
  });

  it('performs LWW reconciliation on drop', () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.ENTITY_TRANSFORMED, (event) => {
      events.push(event.payload);
    });

    const mock = createMockChannel();
    const sync = createEntitySync(mock);

    const transform: EntityTransform = {
      entityId: 'e-1',
      position: { x: 300, y: 400 },
      userId: 'user-a',
      timestamp: Date.now(),
    };

    sync.reconcileOnDrop(transform);

    expect(mock._broadcastCalls).toHaveLength(1);
    const sent = mock._broadcastCalls[0].payload as EntityTransform & { isFinal: boolean };
    expect(sent.isFinal).toBe(true);

    // Should also emit locally
    expect(events).toHaveLength(1);
    const payload = events[0] as EntityTransform;
    expect(payload.position).toEqual({ x: 300, y: 400 });
  });

  it('emits social.entity.transformed bus event after reconciliation', () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.ENTITY_TRANSFORMED, (event) => {
      events.push(event.payload);
    });

    const mock = createMockChannel();
    createEntitySync(mock);

    // Simulate a final remote transform
    mock._simulateBroadcast('entity-transform', {
      entityId: 'e-1',
      position: { x: 50, y: 60 },
      userId: 'user-b',
      timestamp: Date.now(),
      isFinal: true,
    });

    expect(events).toHaveLength(1);
    const payload = events[0] as EntityTransform;
    expect(payload.entityId).toBe('e-1');
    expect(payload.position).toEqual({ x: 50, y: 60 });
  });

  it('includes position, rotation, scale in transform data', () => {
    const mock = createMockChannel();
    const sync = createEntitySync(mock);

    sync.broadcastTransform({
      entityId: 'e-1',
      position: { x: 10, y: 20 },
      rotation: 45,
      scale: 1.5,
      userId: 'user-a',
      timestamp: Date.now(),
    });

    const sent = mock._broadcastCalls[0].payload as EntityTransform;
    expect(sent.rotation).toBe(45);
    expect(sent.scale).toBe(1.5);
  });

  it('uses timestamp for LWW comparison — later timestamp wins', () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.ENTITY_TRANSFORMED, (event) => {
      events.push(event.payload);
    });

    const mock = createMockChannel();
    const sync = createEntitySync(mock);
    const baseTime = Date.now();

    // Local drop at time T
    sync.reconcileOnDrop({
      entityId: 'e-1',
      position: { x: 100, y: 100 },
      userId: 'user-a',
      timestamp: baseTime,
    });

    events.length = 0; // Clear local event

    // Remote drop at time T+1 (wins LWW)
    mock._simulateBroadcast('entity-transform', {
      entityId: 'e-1',
      position: { x: 200, y: 200 },
      userId: 'user-b',
      timestamp: baseTime + 1,
      isFinal: true,
    });

    expect(events).toHaveLength(1);
    const payload = events[0] as EntityTransform;
    expect(payload.position).toEqual({ x: 200, y: 200 });
  });

  it('handles rapid successive transforms without dropping', () => {
    const mock = createMockChannel();
    const sync = createEntitySync(mock);

    for (let i = 0; i < 10; i++) {
      sync.broadcastTransform({
        entityId: 'e-1',
        position: { x: i * 10, y: i * 10 },
        userId: 'user-a',
        timestamp: Date.now() + i,
      });
    }

    expect(mock._broadcastCalls).toHaveLength(10);
  });

  it('emits ENTITY_TRANSFORMED for optimistic remote drag (isFinal: false)', () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.ENTITY_TRANSFORMED, (event) => {
      events.push(event.payload);
    });

    const mock = createMockChannel();
    createEntitySync(mock);

    // Simulate a remote optimistic drag update (not final)
    mock._simulateBroadcast('entity-transform', {
      entityId: 'e-1',
      position: { x: 75, y: 85 },
      rotation: 10,
      scale: 2.0,
      userId: 'user-b',
      timestamp: Date.now(),
      isFinal: false,
    });

    expect(events).toHaveLength(1);
    const payload = events[0] as EntityTransform;
    expect(payload.entityId).toBe('e-1');
    expect(payload.position).toEqual({ x: 75, y: 85 });
    expect(payload.rotation).toBe(10);
    expect(payload.scale).toBe(2.0);
    expect(payload.userId).toBe('user-b');
  });

  it('destroy() cleans up all subscriptions', () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.ENTITY_TRANSFORMED, (event) => {
      events.push(event.payload);
    });

    const mock = createMockChannel();
    const sync = createEntitySync(mock);

    sync.destroy();

    // After destroy, incoming broadcasts should be ignored
    mock._simulateBroadcast('entity-transform', {
      entityId: 'e-1',
      position: { x: 50, y: 60 },
      userId: 'user-b',
      timestamp: Date.now(),
      isFinal: true,
    });

    expect(events).toHaveLength(0);
  });

  it('rejects broadcast when user has viewer role (permission denied)', () => {
    useCanvasStore.setState({ userRole: 'viewer' });

    const rejections: unknown[] = [];
    bus.subscribe(SocialEvents.CONFLICT_REJECTED, (event) => {
      rejections.push(event.payload);
    });

    const mock = createMockChannel();
    const sync = createEntitySync(mock);

    sync.broadcastTransform({
      entityId: 'e-1',
      position: { x: 100, y: 200 },
      userId: 'user-a',
      timestamp: Date.now(),
    });

    // No broadcast should have been sent
    expect(mock._broadcastCalls).toHaveLength(0);

    // Conflict rejected event should have been emitted
    expect(rejections).toHaveLength(1);
    const payload = rejections[0] as Record<string, unknown>;
    expect(payload.reason).toBe('permission');
  });

  it('rejects reconcileOnDrop when user has commenter role', () => {
    useCanvasStore.setState({ userRole: 'commenter' });

    const rejections: unknown[] = [];
    bus.subscribe(SocialEvents.CONFLICT_REJECTED, (event) => {
      rejections.push(event.payload);
    });

    const mock = createMockChannel();
    const sync = createEntitySync(mock);

    sync.reconcileOnDrop({
      entityId: 'e-1',
      position: { x: 100, y: 200 },
      userId: 'user-a',
      timestamp: Date.now(),
    });

    expect(mock._broadcastCalls).toHaveLength(0);
    expect(rejections).toHaveLength(1);
  });
});

describe('Gate Test 2: Simultaneous entity move convergence', () => {
  it('two sessions move the same entity concurrently — both converge via LWW', () => {
    const baseTime = Date.now();

    const channelA = createMockChannel();
    const channelB = createMockChannel();

    const syncA = createEntitySync(channelA);
    const syncB = createEntitySync(channelB);

    const transformedEvents: unknown[] = [];
    bus.subscribe(SocialEvents.ENTITY_TRANSFORMED, (event) => {
      transformedEvents.push(event.payload);
    });

    // Session A drops entity at (100, 100) with timestamp T
    syncA.reconcileOnDrop({
      entityId: 'e-1',
      position: { x: 100, y: 100 },
      userId: 'user-a',
      timestamp: baseTime,
    });

    // Session B drops entity at (200, 200) with timestamp T+1
    syncB.reconcileOnDrop({
      entityId: 'e-1',
      position: { x: 200, y: 200 },
      userId: 'user-b',
      timestamp: baseTime + 1,
    });

    // Cross-deliver: A receives B's broadcast, B receives A's broadcast
    const aBroadcast = channelA._broadcastCalls.find(
      c => (c.payload as Record<string, unknown>).isFinal,
    );
    const bBroadcast = channelB._broadcastCalls.find(
      c => (c.payload as Record<string, unknown>).isFinal,
    );

    channelA._simulateBroadcast('entity-transform', bBroadcast!.payload);
    channelB._simulateBroadcast('entity-transform', aBroadcast!.payload);

    // Both should converge: B's transform wins (later timestamp)
    // The last two events are the cross-delivered resolutions
    const lastEvents = transformedEvents.slice(-2);
    for (const event of lastEvents) {
      const payload = event as EntityTransform;
      expect(payload.position).toEqual({ x: 200, y: 200 });
      expect(payload.userId).toBe('user-b');
    }
  });
});
