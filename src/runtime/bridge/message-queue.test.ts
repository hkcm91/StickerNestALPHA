/**
 * MessageQueue Tests
 *
 * @module runtime/bridge
 * @layer L3
 */

import { describe, it, expect } from 'vitest';

import { createMessageQueue, MAX_QUEUE_SIZE } from './message-queue';
import type { HostMessage } from './message-types';

describe('createMessageQueue', () => {
  it('starts with size 0', () => {
    const q = createMessageQueue();
    expect(q.size()).toBe(0);
  });

  it('enqueues messages and reports correct size', () => {
    const q = createMessageQueue();
    q.enqueue({ type: 'DESTROY' });
    q.enqueue({ type: 'DESTROY' });
    expect(q.size()).toBe(2);
  });

  it('flush returns messages in FIFO order and empties the queue', () => {
    const q = createMessageQueue();
    const msgs: HostMessage[] = [
      { type: 'EVENT', event: { type: 'a', payload: 1 } },
      { type: 'EVENT', event: { type: 'b', payload: 2 } },
      { type: 'EVENT', event: { type: 'c', payload: 3 } },
    ];
    for (const m of msgs) q.enqueue(m);

    const flushed = q.flush();
    expect(flushed).toEqual(msgs);
    expect(q.size()).toBe(0);
  });

  it('drops the oldest message when exceeding MAX_QUEUE_SIZE', () => {
    const q = createMessageQueue();

    for (let i = 0; i < MAX_QUEUE_SIZE + 5; i++) {
      q.enqueue({ type: 'EVENT', event: { type: `e.${i}`, payload: i } });
    }

    expect(q.size()).toBe(MAX_QUEUE_SIZE);

    const flushed = q.flush();
    // The first 5 messages (indices 0-4) should have been dropped
    const first = flushed[0] as { type: 'EVENT'; event: { payload: number } };
    expect(first.event.payload).toBe(5);
    const last = flushed[MAX_QUEUE_SIZE - 1] as { type: 'EVENT'; event: { payload: number } };
    expect(last.event.payload).toBe(MAX_QUEUE_SIZE + 4);
  });

  it('clear empties the queue', () => {
    const q = createMessageQueue();
    q.enqueue({ type: 'DESTROY' });
    q.enqueue({ type: 'DESTROY' });
    q.clear();
    expect(q.size()).toBe(0);
    expect(q.flush()).toEqual([]);
  });

  it('flush returns a copy — mutating the result does not affect the queue', () => {
    const q = createMessageQueue();
    q.enqueue({ type: 'DESTROY' });

    const flushed = q.flush();
    flushed.push({ type: 'DESTROY' });

    // Queue should still be empty after the flush
    expect(q.size()).toBe(0);
  });

  it('can enqueue after flush', () => {
    const q = createMessageQueue();
    q.enqueue({ type: 'DESTROY' });
    q.flush();
    q.enqueue({ type: 'EVENT', event: { type: 'x', payload: null } });
    expect(q.size()).toBe(1);
    const result = q.flush();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('EVENT');
  });

  it('MAX_QUEUE_SIZE is 1000', () => {
    expect(MAX_QUEUE_SIZE).toBe(1000);
  });
});
