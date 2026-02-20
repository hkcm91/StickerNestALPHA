import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SocialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import type { CanvasChannel } from '../channel';

import { createYjsSync } from './yjs-sync';

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
});

describe('YjsSyncManager', () => {
  it('creates one Y.Doc per DataSource instance', () => {
    const mock = createMockChannel();
    const yjs = createYjsSync(mock);

    const doc1 = yjs.getDoc('ds-1');
    const doc2 = yjs.getDoc('ds-2');
    const doc1Again = yjs.getDoc('ds-1');

    expect(doc1).not.toBe(doc2);
    expect(doc1).toBe(doc1Again); // Same instance returned
  });

  it('startSync begins broadcasting local updates', () => {
    const mock = createMockChannel();
    const yjs = createYjsSync(mock);

    yjs.startSync('ds-1');
    const doc = yjs.getDoc('ds-1');

    // Make a local edit
    const text = doc.getText('content');
    text.insert(0, 'Hello');

    // Should have broadcast the update
    expect(mock._broadcastCalls).toHaveLength(1);
    expect(mock._broadcastCalls[0].event).toBe('yjs-update');
    const payload = mock._broadcastCalls[0].payload as { dataSourceId: string; update: string };
    expect(payload.dataSourceId).toBe('ds-1');
    expect(typeof payload.update).toBe('string'); // base64
  });

  it('syncs Yjs updates via channel as base64 encoded binary', () => {
    const mock = createMockChannel();
    const yjs = createYjsSync(mock);

    yjs.startSync('ds-1');
    const doc = yjs.getDoc('ds-1');

    doc.getText('content').insert(0, 'Test');

    const payload = mock._broadcastCalls[0].payload as { update: string };
    // Verify it's a valid base64 string
    expect(() => atob(payload.update)).not.toThrow();
  });

  it('applies remote updates to local doc', () => {
    const channelA = createMockChannel();
    const channelB = createMockChannel();

    const yjsA = createYjsSync(channelA);
    const yjsB = createYjsSync(channelB);

    yjsA.startSync('ds-1');
    yjsB.startSync('ds-1');

    // Session A types "Hello"
    const docA = yjsA.getDoc('ds-1');
    docA.getText('content').insert(0, 'Hello');

    // Simulate update arriving at B
    const updateFromA = channelA._broadcastCalls[0];
    channelB._simulateBroadcast('yjs-update', updateFromA.payload);

    // B's doc should have the text
    const docB = yjsB.getDoc('ds-1');
    expect(docB.getText('content').toString()).toBe('Hello');
  });

  it('stopSync ceases broadcasting for a specific doc', () => {
    const mock = createMockChannel();
    const yjs = createYjsSync(mock);

    yjs.startSync('ds-1');
    const doc = yjs.getDoc('ds-1');

    doc.getText('content').insert(0, 'A');
    expect(mock._broadcastCalls).toHaveLength(1);

    yjs.stopSync('ds-1');

    doc.getText('content').insert(1, 'B');
    // No new broadcast after stopSync
    expect(mock._broadcastCalls).toHaveLength(1);
  });

  it('destroy cleans up all Y.Docs and subscriptions', () => {
    const mock = createMockChannel();
    const yjs = createYjsSync(mock);

    yjs.startSync('ds-1');
    yjs.startSync('ds-2');

    const doc1 = yjs.getDoc('ds-1');
    const doc2 = yjs.getDoc('ds-2');

    yjs.destroy();

    // After destroy, local edits should not broadcast
    doc1.getText('content').insert(0, 'X');
    doc2.getText('content').insert(0, 'Y');
    expect(mock._broadcastCalls).toHaveLength(0);
  });

  it('emits social.datasource.updated bus event on remote change', () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.DATASOURCE_UPDATED, (event) => {
      events.push(event.payload);
    });

    const channelA = createMockChannel();
    const channelB = createMockChannel();

    const yjsA = createYjsSync(channelA);
    const yjsB = createYjsSync(channelB);

    yjsA.startSync('ds-1');
    yjsB.startSync('ds-1');

    // Session A makes a change
    yjsA.getDoc('ds-1').getText('content').insert(0, 'Hi');

    // Deliver to B
    channelB._simulateBroadcast('yjs-update', channelA._broadcastCalls[0].payload);

    expect(events).toHaveLength(1);
    const payload = events[0] as Record<string, unknown>;
    expect(payload.dataSourceId).toBe('ds-1');
    expect(payload.type).toBe('doc');
    expect(payload.source).toBe('remote');
  });

  it('ignores yjs-update for unknown DataSource (no doc created)', () => {
    const events: unknown[] = [];
    bus.subscribe(SocialEvents.DATASOURCE_UPDATED, (event) => {
      events.push(event.payload);
    });

    const mock = createMockChannel();
    const yjs = createYjsSync(mock);

    // Start sync only for ds-1 — ds-unknown has no doc
    yjs.startSync('ds-1');

    // Get a real base64 update by making a local edit
    yjs.getDoc('ds-1').getText('content').insert(0, 'Hi');
    const realPayload = mock._broadcastCalls[0].payload as { update: string };

    // Simulate a yjs-update arriving for a DataSource that has no doc
    mock._simulateBroadcast('yjs-update', {
      dataSourceId: 'ds-unknown',
      update: realPayload.update,
    });

    // Only ds-1 should have a DATASOURCE_UPDATED event, not ds-unknown
    const unknownEvents = (events as Array<Record<string, unknown>>).filter(
      e => e.dataSourceId === 'ds-unknown',
    );
    expect(unknownEvents).toHaveLength(0);
  });

  it('does not double-subscribe on repeated startSync calls', () => {
    const mock = createMockChannel();
    const yjs = createYjsSync(mock);

    yjs.startSync('ds-1');
    yjs.startSync('ds-1'); // Should be a no-op

    const doc = yjs.getDoc('ds-1');
    doc.getText('content').insert(0, 'X');

    // Should only have one broadcast, not two
    expect(mock._broadcastCalls).toHaveLength(1);
  });

  it('does not broadcast remote updates back to the channel', () => {
    const channelA = createMockChannel();
    const channelB = createMockChannel();

    const yjsA = createYjsSync(channelA);
    const yjsB = createYjsSync(channelB);

    yjsA.startSync('ds-1');
    yjsB.startSync('ds-1');

    // Session A types
    yjsA.getDoc('ds-1').getText('content').insert(0, 'Hi');

    // Deliver to B
    const beforeB = channelB._broadcastCalls.length;
    channelB._simulateBroadcast('yjs-update', channelA._broadcastCalls[0].payload);

    // B should NOT have re-broadcast (origin is 'remote')
    expect(channelB._broadcastCalls.length).toBe(beforeB);
  });
});

describe('Gate Test 3: Doc co-edit via Yjs — no keystrokes lost', () => {
  it('two sessions type concurrently and both converge', () => {
    const channelA = createMockChannel();
    const channelB = createMockChannel();

    const yjsA = createYjsSync(channelA);
    const yjsB = createYjsSync(channelB);

    yjsA.startSync('ds-1');
    yjsB.startSync('ds-1');

    const docA = yjsA.getDoc('ds-1');
    const docB = yjsB.getDoc('ds-1');

    // Session A types "Hello"
    docA.getText('content').insert(0, 'Hello');

    // Deliver A's update to B
    const updateFromA = channelA._broadcastCalls.find(c => c.event === 'yjs-update');
    expect(updateFromA).toBeDefined();
    channelB._simulateBroadcast('yjs-update', updateFromA!.payload);

    // Session B types " World" at the end
    docB.getText('content').insert(docB.getText('content').length, ' World');

    // Deliver B's update to A
    const updatesFromB = channelB._broadcastCalls.filter(c => c.event === 'yjs-update');
    const latestFromB = updatesFromB[updatesFromB.length - 1];
    expect(latestFromB).toBeDefined();
    channelA._simulateBroadcast('yjs-update', latestFromB.payload);

    // Both docs should converge to "Hello World"
    expect(docA.getText('content').toString()).toBe('Hello World');
    expect(docB.getText('content').toString()).toBe('Hello World');
  });
});
