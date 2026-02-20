/**
 * Event Bus — Test Suite
 * @module kernel/bus/bus
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { bus } from './bus';
import type { IEventBus } from './types';

// Cast to access internals for cleanup
const testBus = bus as IEventBus;

describe('EventBus', () => {
  beforeEach(() => {
    testBus.unsubscribeAll();
  });

  describe('emit and subscribe', () => {
    it('should deliver event to matching subscriber', () => {
      const handler = vi.fn();
      testBus.subscribe('test.event', handler);
      testBus.emit('test.event', { value: 42 });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test.event',
          payload: { value: 42 },
        }),
      );
    });

    it('should not deliver event to non-matching subscriber', () => {
      const handler = vi.fn();
      testBus.subscribe('type.a', handler);
      testBus.emit('type.b', { value: 1 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should deliver to multiple handlers on the same type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      testBus.subscribe('multi', handler1);
      testBus.subscribe('multi', handler2);
      testBus.emit('multi', 'data');

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('should include spatial context when provided', () => {
      const handler = vi.fn();
      const spatial = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        normal: { x: 0, y: 1, z: 0 },
      };
      testBus.subscribe('spatial.event', handler);
      testBus.emit('spatial.event', { foo: 'bar' }, spatial);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ spatial }),
      );
    });

    it('should have undefined spatial when not provided', () => {
      const handler = vi.fn();
      testBus.subscribe('no.spatial', handler);
      testBus.emit('no.spatial', {});

      expect(handler.mock.calls[0][0].spatial).toBeUndefined();
    });
  });

  describe('unsubscribe', () => {
    it('should stop delivering events after unsubscribe', () => {
      const handler = vi.fn();
      const unsub = testBus.subscribe('unsub.test', handler);
      testBus.emit('unsub.test', 1);
      expect(handler).toHaveBeenCalledOnce();

      unsub();
      testBus.emit('unsub.test', 2);
      expect(handler).toHaveBeenCalledOnce(); // still 1
    });

    it('should track subscription count correctly', () => {
      const unsub1 = testBus.subscribe('a', vi.fn());
      const unsub2 = testBus.subscribe('b', vi.fn());
      expect(testBus.subscriptionCount).toBe(2);

      unsub1();
      expect(testBus.subscriptionCount).toBe(1);

      unsub2();
      expect(testBus.subscriptionCount).toBe(0);
    });
  });

  describe('wildcard subscriptions', () => {
    it('should match events with wildcard prefix', () => {
      const handler = vi.fn();
      testBus.subscribe('social.*', handler);
      testBus.emit('social.cursor.moved', { x: 10, y: 20 });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'social.cursor.moved' }),
      );
    });

    it('should not match events outside the wildcard prefix', () => {
      const handler = vi.fn();
      testBus.subscribe('social.*', handler);
      testBus.emit('canvas.entity.moved', {});

      expect(handler).not.toHaveBeenCalled();
    });

    it('should match multiple event types under the same prefix', () => {
      const handler = vi.fn();
      testBus.subscribe('kernel.*', handler);
      testBus.emit('kernel.auth.stateChanged', {});
      testBus.emit('kernel.datasource.created', {});

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe wildcard handlers', () => {
      const handler = vi.fn();
      const unsub = testBus.subscribe('social.*', handler);
      unsub();
      testBus.emit('social.cursor.moved', {});

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('subscribeAll', () => {
    it('should receive events of all types', () => {
      const handler = vi.fn();
      testBus.subscribeAll(handler);
      testBus.emit('type.a', 1);
      testBus.emit('type.b', 2);
      testBus.emit('type.c', 3);

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should unsubscribe from all events', () => {
      const handler = vi.fn();
      const unsub = testBus.subscribeAll(handler);
      unsub();
      testBus.emit('any.event', {});

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once option', () => {
    it('should only fire handler once with once: true', () => {
      const handler = vi.fn();
      testBus.subscribe('once.test', handler, { once: true });
      testBus.emit('once.test', 1);
      testBus.emit('once.test', 2);

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('priority', () => {
    it('should call higher priority handlers first', () => {
      const order: number[] = [];
      testBus.subscribe('prio', () => order.push(1), { priority: 1 });
      testBus.subscribe('prio', () => order.push(10), { priority: 10 });
      testBus.subscribe('prio', () => order.push(5), { priority: 5 });

      testBus.emit('prio', {});

      expect(order).toEqual([10, 5, 1]);
    });
  });

  describe('error isolation', () => {
    it('should not crash the bus when a handler throws', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const goodHandler = vi.fn();

      testBus.subscribe('err.test', () => {
        throw new Error('Handler exploded');
      });
      testBus.subscribe('err.test', goodHandler);

      testBus.emit('err.test', {});

      expect(goodHandler).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalledOnce();
      errorSpy.mockRestore();
    });
  });

  describe('unsubscribeAll', () => {
    it('should remove all subscriptions', () => {
      testBus.subscribe('a', vi.fn());
      testBus.subscribe('b.*', vi.fn());
      testBus.subscribeAll(vi.fn());

      testBus.unsubscribeAll();
      expect(testBus.subscriptionCount).toBe(0);
    });
  });

  describe('history', () => {
    it('should record emitted events', () => {
      testBus.emit('hist.1', 'a');
      testBus.emit('hist.2', 'b');
      testBus.emit('hist.3', 'c');

      const history = testBus.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);

      const types = history.map((e) => e.type);
      expect(types).toContain('hist.1');
      expect(types).toContain('hist.2');
      expect(types).toContain('hist.3');
    });

    it('should return last N events with getHistory(count)', () => {
      // Emit some events
      for (let i = 0; i < 5; i++) {
        testBus.emit(`count.${i}`, i);
      }

      const last2 = testBus.getHistory(2);
      expect(last2).toHaveLength(2);
      expect(last2[0].type).toBe('count.3');
      expect(last2[1].type).toBe('count.4');
    });

    it('should filter history by type', () => {
      testBus.emit('filter.a', 1);
      testBus.emit('filter.b', 2);
      testBus.emit('filter.a', 3);

      const filtered = testBus.getHistoryByType('filter.a');
      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => e.type === 'filter.a')).toBe(true);
    });

    it('should limit filtered history with count', () => {
      testBus.emit('limit.a', 1);
      testBus.emit('limit.a', 2);
      testBus.emit('limit.a', 3);

      const last1 = testBus.getHistoryByType('limit.a', 1);
      expect(last1).toHaveLength(1);
      expect(last1[0].payload).toBe(3);
    });
  });

  describe('bench() — L0 gate test: throughput benchmark', () => {
    it('should complete benchmark and return statistics', () => {
      const result = testBus.bench(1000);

      expect(result.sampleSize).toBe(1000);
      expect(result.avgLatencyUs).toBeTypeOf('number');
      expect(result.medianLatencyUs).toBeTypeOf('number');
      expect(result.p99LatencyUs).toBeTypeOf('number');
      expect(result.eventsPerSecond).toBeTypeOf('number');
    });

    it('should achieve emit-to-handler latency < 1ms (1000us)', () => {
      const result = testBus.bench(10000);

      // Hard performance contract from L0 rules
      expect(result.avgLatencyUs).toBeLessThan(1000);
    });

    it('should not leave bench events in history', () => {
      testBus.bench(100);
      const afterHistory = testBus.getHistory();

      const benchEvents = afterHistory.filter((e) => e.type === '__bench__');
      expect(benchEvents).toHaveLength(0);
    });
  });
});
