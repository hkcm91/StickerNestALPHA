/**
 * Canvas Event Stream Adapter — Tests
 * @module kernel/ai
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { bus } from '../bus';

import { createEventStream } from './event-stream';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createEventStream', () => {
  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => bus.unsubscribeAll());

  it('captures events matching patterns', () => {
    const stream = createEventStream({ patterns: ['canvas.*'] });

    bus.emit('canvas.entity.created', { id: 'e1', type: 'text', name: 'Title' });
    bus.emit('widget.mounted', { instanceId: 'w1' }); // should NOT be captured
    bus.emit('canvas.entity.moved', { entityId: 'e1', position: { x: 10, y: 20 } });

    const buffer = stream.getBuffer();
    expect(buffer).toHaveLength(2);
    expect(buffer[0].type).toBe('canvas.entity.created');
    expect(buffer[1].type).toBe('canvas.entity.moved');

    stream.destroy();
  });

  it('summarizes entity created events', () => {
    const stream = createEventStream({ patterns: ['canvas.*'] });

    bus.emit('canvas.entity.created', { id: 'e1', type: 'text', name: 'My Title' });

    const buffer = stream.getBuffer();
    expect(buffer[0].summary).toContain('Created text');
    expect(buffer[0].summary).toContain('My Title');

    stream.destroy();
  });

  it('summarizes entity moved events', () => {
    const stream = createEventStream({ patterns: ['canvas.*'] });

    bus.emit('canvas.entity.moved', { entityId: 'abcd1234-5678', position: { x: 100, y: 200 } });

    const buffer = stream.getBuffer();
    expect(buffer[0].summary).toContain('Moved');
    expect(buffer[0].summary).toContain('100');
    expect(buffer[0].summary).toContain('200');

    stream.destroy();
  });

  it('respects maxBuffer limit', () => {
    const stream = createEventStream({ patterns: ['canvas.*'], maxBuffer: 3 });

    bus.emit('canvas.entity.created', { id: 'e1' });
    bus.emit('canvas.entity.created', { id: 'e2' });
    bus.emit('canvas.entity.created', { id: 'e3' });
    bus.emit('canvas.entity.created', { id: 'e4' });

    const buffer = stream.getBuffer();
    expect(buffer).toHaveLength(3);
    // Oldest event dropped
    expect(buffer[0].entityId).toBe('e2');

    stream.destroy();
  });

  it('calls onEvent callback for each event', () => {
    const onEvent = vi.fn();
    const stream = createEventStream({ patterns: ['canvas.*'], onEvent });

    bus.emit('canvas.entity.selected', { entityId: 'e1' });

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent.mock.calls[0][0].type).toBe('canvas.entity.selected');

    stream.destroy();
  });

  it('produces compact text summary', () => {
    const stream = createEventStream({ patterns: ['canvas.*'] });

    bus.emit('canvas.entity.created', { id: 'e1', type: 'sticker', name: 'Cat' });
    bus.emit('canvas.selection.cleared', {});
    bus.emit('canvas.mode.changed', { mode: 'preview' });

    const summary = stream.summarize();
    expect(summary).toContain('Created sticker');
    expect(summary).toContain('Selection cleared');
    expect(summary).toContain('Mode changed to preview');

    stream.destroy();
  });

  it('limits summarize output to maxEntries', () => {
    const stream = createEventStream({ patterns: ['canvas.*'] });

    for (let i = 0; i < 10; i++) {
      bus.emit('canvas.entity.created', { id: `e${i}` });
    }

    const summary = stream.summarize(3);
    const lines = summary.split('\n');
    expect(lines).toHaveLength(3);

    stream.destroy();
  });

  it('returns placeholder when no events', () => {
    const stream = createEventStream({ patterns: ['canvas.*'] });

    const summary = stream.summarize();
    expect(summary).toBe('No recent canvas events.');

    stream.destroy();
  });

  it('clears the buffer', () => {
    const stream = createEventStream({ patterns: ['canvas.*'] });

    bus.emit('canvas.entity.created', { id: 'e1' });
    expect(stream.getBuffer()).toHaveLength(1);

    stream.clear();
    expect(stream.getBuffer()).toHaveLength(0);

    stream.destroy();
  });

  it('stops listening after destroy', () => {
    const stream = createEventStream({ patterns: ['canvas.*'] });

    stream.destroy();

    bus.emit('canvas.entity.created', { id: 'e1' });
    expect(stream.getBuffer()).toHaveLength(0);
  });

  it('supports multiple patterns', () => {
    const stream = createEventStream({ patterns: ['canvas.*', 'widget.*'] });

    bus.emit('canvas.entity.created', { id: 'e1' });
    bus.emit('widget.mounted', { instanceId: 'w1' });
    bus.emit('social.cursor.moved', {}); // should NOT be captured

    expect(stream.getBuffer()).toHaveLength(2);

    stream.destroy();
  });
});
