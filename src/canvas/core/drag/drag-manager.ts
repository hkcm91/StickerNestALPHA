/**
 * Drag Manager — pointer capture, threshold, and delta tracking
 *
 * @module canvas/core/drag
 * @layer L4A-1
 */

import type { Point2D } from '@sn/types';

export const DRAG_THRESHOLD = 4;

export interface DragState {
  isDragging: boolean;
  entityId: string | null;
  startPosition: Point2D | null;
  currentPosition: Point2D | null;
  delta: Point2D | null;
}

export interface DragManager {
  onPointerDown(entityId: string, position: Point2D): void;
  onPointerMove(position: Point2D): void;
  onPointerUp(position: Point2D): DragState;
  cancel(): void;
  getState(): Readonly<DragState>;
}

export function createDragManager(
  getMode: () => 'edit' | 'preview',
): DragManager {
  let state: DragState = {
    isDragging: false,
    entityId: null,
    startPosition: null,
    currentPosition: null,
    delta: null,
  };
  let pointerDown = false;

  function reset(): void {
    state = {
      isDragging: false,
      entityId: null,
      startPosition: null,
      currentPosition: null,
      delta: null,
    };
    pointerDown = false;
  }

  return {
    onPointerDown(entityId: string, position: Point2D) {
      if (getMode() === 'preview') return;
      pointerDown = true;
      state = {
        isDragging: false,
        entityId,
        startPosition: position,
        currentPosition: position,
        delta: { x: 0, y: 0 },
      };
    },

    onPointerMove(position: Point2D) {
      if (!pointerDown || !state.startPosition) return;
      if (getMode() === 'preview') return;

      const dx = position.x - state.startPosition.x;
      const dy = position.y - state.startPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      state = {
        ...state,
        currentPosition: position,
        delta: { x: dx, y: dy },
        isDragging: state.isDragging || distance >= DRAG_THRESHOLD,
      };
    },

    onPointerUp(position: Point2D): DragState {
      if (!pointerDown) return { ...state };
      const finalState = {
        ...state,
        currentPosition: position,
        delta: state.startPosition
          ? { x: position.x - state.startPosition.x, y: position.y - state.startPosition.y }
          : null,
      };
      reset();
      return finalState;
    },

    cancel() {
      reset();
    },

    getState() {
      return { ...state };
    },
  };
}
