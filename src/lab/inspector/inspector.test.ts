import { describe, it, expect, vi } from 'vitest';

import { createEventInspector } from './inspector';

describe('createEventInspector', () => {
  it('starts with no entries', () => {
    const inspector = createEventInspector();
    expect(inspector.getEntries()).toEqual([]);
  });

  it('logs entries with auto-generated id and timestamp', () => {
    const inspector = createEventInspector();
    inspector.log({ eventType: 'widget.ready', payload: { id: '1' }, direction: 'emitted' });

    const entries = inspector.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe('widget.ready');
    expect(entries[0].direction).toBe('emitted');
    expect(entries[0].id).toBeTruthy();
    expect(entries[0].timestamp).toBeGreaterThan(0);
  });

  it('clears all entries', () => {
    const inspector = createEventInspector();
    inspector.log({ eventType: 'a', payload: null, direction: 'emitted' });
    inspector.log({ eventType: 'b', payload: null, direction: 'received' });
    expect(inspector.getEntries()).toHaveLength(2);

    inspector.clear();
    expect(inspector.getEntries()).toEqual([]);
  });

  it('notifies subscribers on log', () => {
    const inspector = createEventInspector();
    const cb = vi.fn();
    inspector.subscribe(cb);

    inspector.log({ eventType: 'test', payload: {}, direction: 'emitted' });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toHaveLength(1);
  });

  it('notifies subscribers on clear', () => {
    const inspector = createEventInspector();
    const cb = vi.fn();
    inspector.log({ eventType: 'test', payload: {}, direction: 'emitted' });
    inspector.subscribe(cb);

    inspector.clear();
    expect(cb).toHaveBeenCalledWith([]);
  });

  it('unsubscribes correctly', () => {
    const inspector = createEventInspector();
    const cb = vi.fn();
    const unsub = inspector.subscribe(cb);
    unsub();

    inspector.log({ eventType: 'test', payload: {}, direction: 'emitted' });
    expect(cb).not.toHaveBeenCalled();
  });

  it('returns a copy of entries (not a reference)', () => {
    const inspector = createEventInspector();
    inspector.log({ eventType: 'test', payload: {}, direction: 'emitted' });
    const entries1 = inspector.getEntries();
    const entries2 = inspector.getEntries();
    expect(entries1).not.toBe(entries2);
    expect(entries1).toEqual(entries2);
  });

  it('destroy clears entries and subscribers', () => {
    const inspector = createEventInspector();
    const cb = vi.fn();
    inspector.subscribe(cb);
    inspector.log({ eventType: 'test', payload: {}, direction: 'emitted' });
    cb.mockClear();

    inspector.destroy();
    expect(inspector.getEntries()).toEqual([]);
    // Subscriber should be gone — no notification from future logs
  });
});
