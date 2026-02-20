/**
 * History Store — Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { BusEvent } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../bus';

import {
  useHistoryStore,
  selectCanUndo,
  selectCanRedo,
  setupHistoryBusSubscriptions,
} from './history.store';
import type { HistoryEntry } from './history.store';

function makeEntry(overrides?: Partial<HistoryEntry>): HistoryEntry {
  return {
    event: { type: 'canvas.entity.moved', payload: { entityId: 'e-1', position: { x: 100, y: 100 }, previousPosition: { x: 0, y: 0 } } },
    inverseEvent: { type: 'canvas.entity.moved', payload: { entityId: 'e-1', position: { x: 0, y: 0 }, previousPosition: { x: 100, y: 100 } } },
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('historyStore', () => {
  beforeEach(() => {
    useHistoryStore.getState().reset();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  describe('initial state', () => {
    it('should have empty undoStack', () => {
      expect(useHistoryStore.getState().undoStack).toEqual([]);
    });

    it('should have empty redoStack', () => {
      expect(useHistoryStore.getState().redoStack).toEqual([]);
    });

    it('should have maxSize of 100', () => {
      expect(useHistoryStore.getState().maxSize).toBe(100);
    });
  });

  describe('actions', () => {
    it('pushEntry should add to undoStack', () => {
      const entry = makeEntry();
      useHistoryStore.getState().pushEntry(entry);
      expect(useHistoryStore.getState().undoStack).toHaveLength(1);
      expect(useHistoryStore.getState().undoStack[0]).toEqual(entry);
    });

    it('pushEntry should clear redoStack', () => {
      // Manually set up a redo state
      const entry1 = makeEntry();
      const entry2 = makeEntry();
      useHistoryStore.getState().pushEntry(entry1);
      useHistoryStore.getState().pushEntry(entry2);
      useHistoryStore.getState().undo(); // moves entry2 to redo

      expect(useHistoryStore.getState().redoStack).toHaveLength(1);

      // New push should clear redo
      const entry3 = makeEntry();
      useHistoryStore.getState().pushEntry(entry3);
      expect(useHistoryStore.getState().redoStack).toEqual([]);
    });

    it('pushEntry should enforce maxSize', () => {
      // Set a smaller maxSize for testing
      useHistoryStore.setState({ maxSize: 3 });

      for (let i = 0; i < 5; i++) {
        useHistoryStore.getState().pushEntry(makeEntry({
          event: { type: 'test', payload: { i } },
          timestamp: i,
        }));
      }

      expect(useHistoryStore.getState().undoStack).toHaveLength(3);
      // Should keep the most recent entries (indices 2, 3, 4)
      expect(useHistoryStore.getState().undoStack[0].timestamp).toBe(2);
    });

    it('undo should return null on empty stack', () => {
      const result = useHistoryStore.getState().undo();
      expect(result).toBeNull();
    });

    it('undo should pop from undoStack and push to redoStack', () => {
      const entry = makeEntry();
      useHistoryStore.getState().pushEntry(entry);

      const result = useHistoryStore.getState().undo();

      expect(result).toEqual(entry);
      expect(useHistoryStore.getState().undoStack).toHaveLength(0);
      expect(useHistoryStore.getState().redoStack).toHaveLength(1);
      expect(useHistoryStore.getState().redoStack[0]).toEqual(entry);
    });

    it('undo should emit inverseEvent on the bus', () => {
      const handler = vi.fn();
      bus.subscribe(CanvasEvents.ENTITY_MOVED, handler);

      const entry = makeEntry();
      useHistoryStore.getState().pushEntry(entry);
      useHistoryStore.getState().undo();

      // Handler called: once from pushEntry subscription (if setup) + once from undo emit
      expect(handler).toHaveBeenCalled();
      const lastCall = handler.mock.calls[handler.mock.calls.length - 1][0] as BusEvent;
      expect(lastCall.type).toBe(CanvasEvents.ENTITY_MOVED);
      expect((lastCall.payload as Record<string, unknown>).position).toEqual({ x: 0, y: 0 });
    });

    it('undo should not emit if inverseEvent is null', () => {
      const handler = vi.fn();
      bus.subscribe('canvas.entity.moved', handler);

      const entry = makeEntry({ inverseEvent: null });
      useHistoryStore.getState().pushEntry(entry);

      handler.mockClear();
      useHistoryStore.getState().undo();

      expect(handler).not.toHaveBeenCalled();
    });

    it('redo should return null on empty stack', () => {
      const result = useHistoryStore.getState().redo();
      expect(result).toBeNull();
    });

    it('redo should pop from redoStack and push to undoStack', () => {
      const entry = makeEntry();
      useHistoryStore.getState().pushEntry(entry);
      useHistoryStore.getState().undo();

      const result = useHistoryStore.getState().redo();

      expect(result).toEqual(entry);
      expect(useHistoryStore.getState().redoStack).toHaveLength(0);
      expect(useHistoryStore.getState().undoStack).toHaveLength(1);
    });

    it('redo should emit the original event on the bus', () => {
      const handler = vi.fn();
      bus.subscribe(CanvasEvents.ENTITY_MOVED, handler);

      const entry = makeEntry();
      useHistoryStore.getState().pushEntry(entry);
      useHistoryStore.getState().undo();

      handler.mockClear();
      useHistoryStore.getState().redo();

      expect(handler).toHaveBeenCalled();
      const lastCall = handler.mock.calls[handler.mock.calls.length - 1][0] as BusEvent;
      expect(lastCall.type).toBe(CanvasEvents.ENTITY_MOVED);
      expect((lastCall.payload as Record<string, unknown>).position).toEqual({ x: 100, y: 100 });
    });

    it('clear should empty both stacks', () => {
      useHistoryStore.getState().pushEntry(makeEntry());
      useHistoryStore.getState().pushEntry(makeEntry());
      useHistoryStore.getState().undo();

      useHistoryStore.getState().clear();

      expect(useHistoryStore.getState().undoStack).toEqual([]);
      expect(useHistoryStore.getState().redoStack).toEqual([]);
    });

    it('reset should restore initial state', () => {
      useHistoryStore.getState().pushEntry(makeEntry());
      useHistoryStore.getState().reset();

      const state = useHistoryStore.getState();
      expect(state.undoStack).toEqual([]);
      expect(state.redoStack).toEqual([]);
      expect(state.maxSize).toBe(100);
    });
  });

  describe('selectors', () => {
    it('selectCanUndo returns false on empty stack', () => {
      expect(selectCanUndo(useHistoryStore.getState())).toBe(false);
    });

    it('selectCanUndo returns true with entries', () => {
      useHistoryStore.getState().pushEntry(makeEntry());
      expect(selectCanUndo(useHistoryStore.getState())).toBe(true);
    });

    it('selectCanRedo returns false on empty stack', () => {
      expect(selectCanRedo(useHistoryStore.getState())).toBe(false);
    });

    it('selectCanRedo returns true after undo', () => {
      useHistoryStore.getState().pushEntry(makeEntry());
      useHistoryStore.getState().undo();
      expect(selectCanRedo(useHistoryStore.getState())).toBe(true);
    });
  });

  describe('bus subscriptions', () => {
    it('should auto-push history entry on canvas.entity.moved', () => {
      setupHistoryBusSubscriptions();

      bus.emit(CanvasEvents.ENTITY_MOVED, {
        entityId: 'e-1',
        position: { x: 200, y: 300 },
        previousPosition: { x: 0, y: 0 },
      });

      const stack = useHistoryStore.getState().undoStack;
      expect(stack).toHaveLength(1);
      expect(stack[0].event.type).toBe(CanvasEvents.ENTITY_MOVED);
      expect(stack[0].inverseEvent).not.toBeNull();
      expect((stack[0].inverseEvent!.payload as Record<string, unknown>).position).toEqual({ x: 0, y: 0 });
    });

    it('should auto-push history entry on canvas.entity.created', () => {
      setupHistoryBusSubscriptions();

      bus.emit(CanvasEvents.ENTITY_CREATED, {
        entityId: 'e-2',
      });

      const stack = useHistoryStore.getState().undoStack;
      expect(stack).toHaveLength(1);
      expect(stack[0].event.type).toBe(CanvasEvents.ENTITY_CREATED);
      expect(stack[0].inverseEvent!.type).toBe(CanvasEvents.ENTITY_DELETED);
    });

    it('should auto-push history entry on canvas.entity.deleted', () => {
      setupHistoryBusSubscriptions();

      bus.emit(CanvasEvents.ENTITY_DELETED, {
        entityId: 'e-3',
        entityData: { name: 'Test Entity' },
      });

      const stack = useHistoryStore.getState().undoStack;
      expect(stack).toHaveLength(1);
      expect(stack[0].event.type).toBe(CanvasEvents.ENTITY_DELETED);
      expect(stack[0].inverseEvent!.type).toBe(CanvasEvents.ENTITY_CREATED);
      expect((stack[0].inverseEvent!.payload as Record<string, unknown>).entityData).toEqual({ name: 'Test Entity' });
    });
  });
});
