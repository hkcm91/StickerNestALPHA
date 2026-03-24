/**
 * Widget Hooks — Tests
 *
 * @module runtime/hooks
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { bus } from '../kernel/bus';
import { useWidgetStore } from '../kernel/stores/widget/widget.store';

// We test the underlying bus integration directly, not the React hooks
// (which require React rendering). This validates the bus wiring.

describe('Widget Hook Bus Integration', () => {
  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => bus.unsubscribeAll());

  describe('emit pattern (useEmit)', () => {
    it('emits events to the bus', () => {
      const handler = vi.fn();
      bus.subscribe('widget.test.event', handler);

      bus.emit('widget.test.event', { value: 42 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].payload.value).toBe(42);
    });

    it('supports wildcard subscriptions', () => {
      const handler = vi.fn();
      bus.subscribe('widget.*', handler);

      bus.emit('widget.foo', { a: 1 });
      bus.emit('widget.bar', { b: 2 });
      bus.emit('canvas.entity.created', { c: 3 }); // should not match

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('subscribe pattern (useSubscribe)', () => {
    it('subscribes to specific event types', () => {
      const handler = vi.fn();
      const unsub = bus.subscribe('canvas.entity.selected', (event: any) => {
        handler(event.payload);
      });

      bus.emit('canvas.entity.selected', { entityId: 'abc' });

      expect(handler).toHaveBeenCalledWith({ entityId: 'abc' });
      unsub();
    });

    it('unsubscribes correctly', () => {
      const handler = vi.fn();
      const unsub = bus.subscribe('test.event', handler);

      unsub();
      bus.emit('test.event', {});

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('widget state pattern (useWidgetState)', () => {
    it('reads and writes widget instance state', () => {
      const instanceId = 'test-instance-hooks';
      const store = useWidgetStore.getState();

      // Add instance first (updateInstanceState no-ops for unknown instances)
      store.addInstance({
        instanceId,
        widgetId: 'sn.test',
        state: {},
        config: {},
      });

      // Update state
      store.updateInstanceState(instanceId, { count: 5, label: 'test' });

      const updated = useWidgetStore.getState().instances[instanceId]?.state;
      expect(updated).toEqual({ count: 5, label: 'test' });
    });
  });
});
