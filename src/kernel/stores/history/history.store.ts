/**
 * History Store — manages undo/redo stack powered by event bus ring buffer
 * @module kernel/stores/history
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../bus';

/** A single undoable action recorded in the history stack */
export interface HistoryEntry {
  /** The original bus event that was executed */
  event: BusEvent;
  /** The inverse event that reverses this action (null if not undoable) */
  inverseEvent: BusEvent | null;
  /** Unix timestamp (ms) when the action occurred */
  timestamp: number;
}

export interface HistoryState {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  maxSize: number;
}

/** Actions for undo/redo stack management */
export interface HistoryActions {
  /** Pushes an undoable action onto the undo stack (clears redo stack) */
  pushEntry: (entry: HistoryEntry) => void;
  /** Pops the last action, emits its inverse event, and moves it to the redo stack. Returns null if empty. */
  undo: () => HistoryEntry | null;
  /** Pops from the redo stack, re-emits the original event, and moves it back to undo. Returns null if empty. */
  redo: () => HistoryEntry | null;
  /** Clears both undo and redo stacks */
  clear: () => void;
  /** Resets to initial state */
  reset: () => void;
}

export type HistoryStore = HistoryState & HistoryActions;

const initialState: HistoryState = {
  undoStack: [],
  redoStack: [],
  maxSize: 100,
};

export const useHistoryStore = create<HistoryStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      pushEntry: (entry: HistoryEntry) =>
        set((state) => {
          const newUndoStack = [...state.undoStack, entry];
          // Enforce maxSize: trim from the front if exceeding
          if (newUndoStack.length > state.maxSize) {
            newUndoStack.splice(0, newUndoStack.length - state.maxSize);
          }
          return {
            undoStack: newUndoStack,
            redoStack: [], // Clear redo stack on new action
          };
        }),

      undo: () => {
        const state = get();
        if (state.undoStack.length === 0) {
          return null;
        }

        const entry = state.undoStack[state.undoStack.length - 1];
        const newUndoStack = state.undoStack.slice(0, -1);
        const newRedoStack = [...state.redoStack, entry];

        set({ undoStack: newUndoStack, redoStack: newRedoStack });

        // Emit the inverse event on the bus to trigger the undo action
        if (entry.inverseEvent) {
          bus.emit(
            entry.inverseEvent.type,
            entry.inverseEvent.payload,
            entry.inverseEvent.spatial,
          );
        }

        return entry;
      },

      redo: () => {
        const state = get();
        if (state.redoStack.length === 0) {
          return null;
        }

        const entry = state.redoStack[state.redoStack.length - 1];
        const newRedoStack = state.redoStack.slice(0, -1);
        const newUndoStack = [...state.undoStack, entry];

        set({ undoStack: newUndoStack, redoStack: newRedoStack });

        // Emit the original event on the bus to redo the action
        bus.emit(
          entry.event.type,
          entry.event.payload,
          entry.event.spatial,
        );

        return entry;
      },

      clear: () => set({ undoStack: [], redoStack: [] }),
      reset: () => set(initialState),
    })),
    { name: 'historyStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

/** Derived selector: whether undo is available */
export const selectCanUndo = (state: HistoryStore): boolean =>
  state.undoStack.length > 0;

/** Derived selector: whether redo is available */
export const selectCanRedo = (state: HistoryStore): boolean =>
  state.redoStack.length > 0;

/** Subscribe to undoable canvas events and auto-push history entries */
export function setupHistoryBusSubscriptions(): void {
  // Entity moved — includes previousPosition in payload for inverse
  bus.subscribe(CanvasEvents.ENTITY_MOVED, (event: BusEvent) => {
    const payload = event.payload as {
      entityId: string;
      position: { x: number; y: number };
      previousPosition: { x: number; y: number };
    };

    const inverseEvent: BusEvent = {
      type: CanvasEvents.ENTITY_MOVED,
      payload: {
        entityId: payload.entityId,
        position: payload.previousPosition,
        previousPosition: payload.position,
      },
    };

    useHistoryStore.getState().pushEntry({
      event: { type: event.type, payload: event.payload },
      inverseEvent,
      timestamp: Date.now(),
    });
  });

  // Entity created — inverse is delete
  bus.subscribe(CanvasEvents.ENTITY_CREATED, (event: BusEvent) => {
    const payload = event.payload as { entityId: string };

    const inverseEvent: BusEvent = {
      type: CanvasEvents.ENTITY_DELETED,
      payload: { entityId: payload.entityId },
    };

    useHistoryStore.getState().pushEntry({
      event: { type: event.type, payload: event.payload },
      inverseEvent,
      timestamp: Date.now(),
    });
  });

  // Entity deleted — inverse is create (payload should include full entity data)
  bus.subscribe(CanvasEvents.ENTITY_DELETED, (event: BusEvent) => {
    const payload = event.payload as { entityId: string; entityData?: unknown };

    const inverseEvent: BusEvent = {
      type: CanvasEvents.ENTITY_CREATED,
      payload: {
        entityId: payload.entityId,
        entityData: payload.entityData,
      },
    };

    useHistoryStore.getState().pushEntry({
      event: { type: event.type, payload: event.payload },
      inverseEvent,
      timestamp: Date.now(),
    });
  });
}
