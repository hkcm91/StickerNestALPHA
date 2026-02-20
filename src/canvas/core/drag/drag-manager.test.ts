import { describe, it, expect } from 'vitest';

import { createDragManager, DRAG_THRESHOLD } from './drag-manager';

describe('DragManager', () => {
  it('starts with idle state', () => {
    const dm = createDragManager(() => 'edit');
    const state = dm.getState();
    expect(state.isDragging).toBe(false);
    expect(state.entityId).toBeNull();
  });

  it('tracks pointer down', () => {
    const dm = createDragManager(() => 'edit');
    dm.onPointerDown('e1', { x: 100, y: 100 });
    const state = dm.getState();
    expect(state.entityId).toBe('e1');
    expect(state.startPosition).toEqual({ x: 100, y: 100 });
    expect(state.isDragging).toBe(false);
  });

  it('does not start dragging below threshold', () => {
    const dm = createDragManager(() => 'edit');
    dm.onPointerDown('e1', { x: 100, y: 100 });
    dm.onPointerMove({ x: 101, y: 101 });
    expect(dm.getState().isDragging).toBe(false);
  });

  it('starts dragging at threshold distance', () => {
    const dm = createDragManager(() => 'edit');
    dm.onPointerDown('e1', { x: 100, y: 100 });
    dm.onPointerMove({ x: 100 + DRAG_THRESHOLD, y: 100 });
    expect(dm.getState().isDragging).toBe(true);
  });

  it('tracks delta during drag', () => {
    const dm = createDragManager(() => 'edit');
    dm.onPointerDown('e1', { x: 100, y: 100 });
    dm.onPointerMove({ x: 120, y: 130 });
    const state = dm.getState();
    expect(state.delta).toEqual({ x: 20, y: 30 });
  });

  it('returns final state on pointer up', () => {
    const dm = createDragManager(() => 'edit');
    dm.onPointerDown('e1', { x: 100, y: 100 });
    dm.onPointerMove({ x: 120, y: 130 });
    const finalState = dm.onPointerUp({ x: 125, y: 135 });
    expect(finalState.entityId).toBe('e1');
    expect(finalState.delta).toEqual({ x: 25, y: 35 });
  });

  it('resets after pointer up', () => {
    const dm = createDragManager(() => 'edit');
    dm.onPointerDown('e1', { x: 100, y: 100 });
    dm.onPointerUp({ x: 100, y: 100 });
    const state = dm.getState();
    expect(state.isDragging).toBe(false);
    expect(state.entityId).toBeNull();
  });

  it('cancel resets state', () => {
    const dm = createDragManager(() => 'edit');
    dm.onPointerDown('e1', { x: 100, y: 100 });
    dm.onPointerMove({ x: 120, y: 130 });
    dm.cancel();
    const state = dm.getState();
    expect(state.isDragging).toBe(false);
    expect(state.entityId).toBeNull();
  });

  it('no-op in preview mode: onPointerDown ignored', () => {
    const dm = createDragManager(() => 'preview');
    dm.onPointerDown('e1', { x: 100, y: 100 });
    const state = dm.getState();
    expect(state.entityId).toBeNull();
  });

  it('no-op in preview mode: onPointerMove ignored', () => {
    const mode = { current: 'edit' as 'edit' | 'preview' };
    const dm = createDragManager(() => mode.current);
    dm.onPointerDown('e1', { x: 100, y: 100 });
    mode.current = 'preview';
    dm.onPointerMove({ x: 120, y: 130 });
    expect(dm.getState().isDragging).toBe(false);
    expect(dm.getState().delta).toEqual({ x: 0, y: 0 });
  });
});
