/**
 * useCanvasInput — unit tests
 *
 * Tests that the hook wires event listeners onto the container element
 * and cleans them up on unmount.
 *
 * @module shell/canvas/hooks
 * @layer L6
 * @vitest-environment happy-dom
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the canvas core input modules
vi.mock('../../../canvas/core', () => ({
  createPointerAdapter: vi.fn(() => ({
    detach: vi.fn(),
  })),
  createGestureInterpreter: vi.fn(() => ({
    onGesture: vi.fn(() => vi.fn()),
    handlePointerDown: vi.fn(),
    handlePointerMove: vi.fn(),
    handlePointerUp: vi.fn(),
    reset: vi.fn(),
  })),
  createDefaultModifiers: vi.fn(() => ({
    shift: false,
    ctrl: false,
    alt: false,
    meta: false,
  })),
}));

import { useCanvasInput } from './useCanvasInput';
import type { ViewportStore } from './useViewport';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockViewportStore(): ViewportStore {
  return {
    getState: vi.fn().mockReturnValue({ zoom: 1, offset: { x: 0, y: 0 }, viewportWidth: 1280, viewportHeight: 800 }),
    subscribe: vi.fn(() => vi.fn()),
    pan: vi.fn(),
    zoom: vi.fn(),
    resize: vi.fn(),
    reset: vi.fn(),
    set: vi.fn(),
    fitToCanvas: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCanvasInput', () => {
  let container: HTMLDivElement;
  let viewportStore: ViewportStore;

  beforeEach(() => {
    container = document.createElement('div');
    viewportStore = createMockViewportStore();
  });

  it('attaches event listeners on mount', () => {
    const addSpy = vi.spyOn(container, 'addEventListener');
    const ref = { current: container };
    renderHook(() => useCanvasInput(ref, viewportStore));

    const eventTypes = addSpy.mock.calls.map((c) => c[0]);
    expect(eventTypes).toContain('wheel');
    expect(eventTypes).toContain('pointerdown');
    expect(eventTypes).toContain('pointermove');
    expect(eventTypes).toContain('pointerup');
    expect(eventTypes).toContain('touchstart');
  });

  it('removes event listeners on unmount', () => {
    const removeSpy = vi.spyOn(container, 'removeEventListener');
    const ref = { current: container };
    const { unmount } = renderHook(() => useCanvasInput(ref, viewportStore));

    unmount();

    const eventTypes = removeSpy.mock.calls.map((c) => c[0]);
    expect(eventTypes).toContain('wheel');
    expect(eventTypes).toContain('pointerdown');
    expect(eventTypes).toContain('touchstart');
  });

  it('does not crash when containerRef is null', () => {
    const ref = { current: null };
    expect(() => {
      renderHook(() => useCanvasInput(ref, viewportStore));
    }).not.toThrow();
  });
});
