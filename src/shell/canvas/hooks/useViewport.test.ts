/**
 * useViewport — unit tests
 *
 * @module shell/canvas/hooks
 * @layer L6
 * @vitest-environment happy-dom
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useViewport } from './useViewport';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useViewport', () => {
  it('initialises viewport with provided width and height', () => {
    const { result } = renderHook(() => useViewport(1920, 1080));
    const vp = result.current.viewport;
    expect(vp.viewportWidth).toBe(1920);
    expect(vp.viewportHeight).toBe(1080);
    expect(vp.zoom).toBe(1);
  });

  it('defaults to 1280x800 when no args given', () => {
    const { result } = renderHook(() => useViewport());
    expect(result.current.viewport.viewportWidth).toBe(1280);
    expect(result.current.viewport.viewportHeight).toBe(800);
  });

  it('pan updates the viewport offset', () => {
    const { result } = renderHook(() => useViewport(1000, 1000));
    const initialOffset = { ...result.current.viewport.offset };

    act(() => {
      result.current.pan({ x: 50, y: 30 });
    });

    expect(result.current.viewport.offset.x).toBe(initialOffset.x + 50);
    expect(result.current.viewport.offset.y).toBe(initialOffset.y + 30);
  });

  it('zoom updates the viewport zoom level', () => {
    const { result } = renderHook(() => useViewport(1000, 1000));

    act(() => {
      result.current.zoom(2, { x: 500, y: 500 });
    });

    expect(result.current.viewport.zoom).toBe(2);
  });

  it('resize updates viewport dimensions', () => {
    const { result } = renderHook(() => useViewport(1000, 1000));

    act(() => {
      result.current.resize(1920, 1080);
    });

    expect(result.current.viewport.viewportWidth).toBe(1920);
    expect(result.current.viewport.viewportHeight).toBe(1080);
  });

  it('reset restores default viewport state', () => {
    const { result } = renderHook(() => useViewport(1000, 1000));

    act(() => {
      result.current.pan({ x: 100, y: 100 });
      result.current.zoom(3, { x: 0, y: 0 });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.viewport.zoom).toBe(1);
  });

  it('toScreen and toCanvas are inverse operations', () => {
    const { result } = renderHook(() => useViewport(1000, 1000));

    act(() => {
      result.current.zoom(1.5, { x: 0, y: 0 });
      result.current.pan({ x: 100, y: 50 });
    });

    const original = { x: 200, y: 300 };
    const screen = result.current.toScreen(original);
    const backToCanvas = result.current.toCanvas(screen);

    expect(backToCanvas.x).toBeCloseTo(original.x, 5);
    expect(backToCanvas.y).toBeCloseTo(original.y, 5);
  });

  it('store is stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useViewport(800, 600));
    const storeA = result.current.store;
    rerender();
    const storeB = result.current.store;
    expect(storeA).toBe(storeB);
  });
});
