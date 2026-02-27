/**
 * Tests for usePointerDrag hook
 *
 * @module shell/dev/hooks
 * @layer L6
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { usePointerDrag } from './use-pointer-drag';

function makePointerEvent(overrides: Partial<React.PointerEvent> = {}): React.PointerEvent {
  return {
    clientX: 0,
    clientY: 0,
    pointerId: 1,
    button: 0,
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
    currentTarget: {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    },
    ...overrides,
  } as unknown as React.PointerEvent;
}

describe('usePointerDrag', () => {
  it('calls onTap when pointer down/up without exceeding threshold', () => {
    const onTap = vi.fn();
    const { result } = renderHook(() => usePointerDrag({ onTap }));

    act(() => {
      result.current.onPointerDown(
        makePointerEvent({ clientX: 100, clientY: 100 }),
        'entity-1',
      );
    });

    act(() => {
      result.current.onPointerUp(
        makePointerEvent({ clientX: 101, clientY: 101, pointerId: 1 }),
      );
    });

    expect(onTap).toHaveBeenCalledWith('entity-1', { x: 101, y: 101 });
  });

  it('calls onDragStart and onDragMove after exceeding threshold', () => {
    const onDragStart = vi.fn();
    const onDragMove = vi.fn();
    const { result } = renderHook(() =>
      usePointerDrag({ onDragStart, onDragMove }),
    );

    act(() => {
      result.current.onPointerDown(
        makePointerEvent({ clientX: 100, clientY: 100 }),
        'entity-2',
      );
    });

    // Move within threshold — no drag yet
    act(() => {
      result.current.onPointerMove(
        makePointerEvent({ clientX: 102, clientY: 102, pointerId: 1 }),
      );
    });
    expect(onDragStart).not.toHaveBeenCalled();

    // Move beyond threshold (>4px)
    act(() => {
      result.current.onPointerMove(
        makePointerEvent({ clientX: 106, clientY: 106, pointerId: 1 }),
      );
    });
    expect(onDragStart).toHaveBeenCalledWith('entity-2', { x: 100, y: 100 });
    expect(onDragMove).toHaveBeenCalled();
  });

  it('calls onDragEnd on pointer up after dragging', () => {
    const onDragEnd = vi.fn();
    const onTap = vi.fn();
    const { result } = renderHook(() =>
      usePointerDrag({ onDragEnd, onTap }),
    );

    act(() => {
      result.current.onPointerDown(
        makePointerEvent({ clientX: 100, clientY: 100 }),
        'entity-3',
      );
    });

    // Exceed threshold
    act(() => {
      result.current.onPointerMove(
        makePointerEvent({ clientX: 120, clientY: 120, pointerId: 1 }),
      );
    });

    act(() => {
      result.current.onPointerUp(
        makePointerEvent({ clientX: 120, clientY: 120, pointerId: 1 }),
      );
    });

    expect(onDragEnd).toHaveBeenCalledWith('entity-3', { x: 120, y: 120 });
    expect(onTap).not.toHaveBeenCalled();
  });

  it('does nothing when enabled=false', () => {
    const onTap = vi.fn();
    const { result } = renderHook(() =>
      usePointerDrag({ onTap, enabled: false }),
    );

    act(() => {
      result.current.onPointerDown(
        makePointerEvent({ clientX: 100, clientY: 100 }),
        'entity-4',
      );
    });

    act(() => {
      result.current.onPointerUp(
        makePointerEvent({ clientX: 100, clientY: 100, pointerId: 1 }),
      );
    });

    // onPointerDown was a no-op, so onPointerUp won't fire onTap (phase is idle)
    expect(onTap).not.toHaveBeenCalled();
  });

  it('ignores non-primary button', () => {
    const onTap = vi.fn();
    const { result } = renderHook(() => usePointerDrag({ onTap }));

    act(() => {
      result.current.onPointerDown(
        makePointerEvent({ clientX: 100, clientY: 100, button: 2 }),
        'entity-5',
      );
    });

    act(() => {
      result.current.onPointerUp(
        makePointerEvent({ clientX: 100, clientY: 100, pointerId: 1 }),
      );
    });

    expect(onTap).not.toHaveBeenCalled();
  });

  it('provides delta values in onDragMove', () => {
    const onDragMove = vi.fn();
    const { result } = renderHook(() => usePointerDrag({ onDragMove }));

    act(() => {
      result.current.onPointerDown(
        makePointerEvent({ clientX: 100, clientY: 100 }),
        'entity-6',
      );
    });

    // Exceed threshold
    act(() => {
      result.current.onPointerMove(
        makePointerEvent({ clientX: 110, clientY: 115, pointerId: 1 }),
      );
    });

    // Check delta is relative to last position
    act(() => {
      result.current.onPointerMove(
        makePointerEvent({ clientX: 115, clientY: 120, pointerId: 1 }),
      );
    });

    // Second move: delta from (110,115) to (115,120) = (5, 5)
    expect(onDragMove).toHaveBeenLastCalledWith(
      'entity-6',
      { dx: 5, dy: 5 },
      { x: 115, y: 120 },
    );
  });

  it('ignores pointer events from different pointer IDs', () => {
    const onDragMove = vi.fn();
    const { result } = renderHook(() => usePointerDrag({ onDragMove }));

    act(() => {
      result.current.onPointerDown(
        makePointerEvent({ clientX: 100, clientY: 100, pointerId: 1 }),
        'entity-7',
      );
    });

    // Different pointer ID — should be ignored
    act(() => {
      result.current.onPointerMove(
        makePointerEvent({ clientX: 200, clientY: 200, pointerId: 2 }),
      );
    });

    expect(onDragMove).not.toHaveBeenCalled();
  });

  it('calls setPointerCapture on pointer down', () => {
    const setCapture = vi.fn();
    const { result } = renderHook(() => usePointerDrag({}));

    act(() => {
      result.current.onPointerDown(
        makePointerEvent({
          clientX: 100,
          clientY: 100,
          pointerId: 5,
          currentTarget: { setPointerCapture: setCapture, releasePointerCapture: vi.fn() } as unknown as EventTarget & Element,
        }),
        'entity-8',
      );
    });

    expect(setCapture).toHaveBeenCalledWith(5);
  });
});
