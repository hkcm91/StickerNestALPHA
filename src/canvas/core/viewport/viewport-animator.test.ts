import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createViewport } from './viewport';
import type { ViewportState } from './viewport';
import {
  ViewportAnimator,
  easeOutCubic,
  easeInOutCubic,
  linear,
} from './viewport-animator';

// ---------------------------------------------------------------------------
// Helpers — fake RAF that advances time manually
// ---------------------------------------------------------------------------

function createFakeRaf() {
  const callbacks: Array<{ id: number; cb: FrameRequestCallback }> = [];
  let nextId = 1;

  const raf: typeof requestAnimationFrame = (cb) => {
    const id = nextId++;
    callbacks.push({ id, cb });
    return id;
  };

  const cancelRaf: typeof cancelAnimationFrame = (id) => {
    const idx = callbacks.findIndex((c) => c.id === id);
    if (idx !== -1) callbacks.splice(idx, 1);
  };

  /** Advance to `timestamp`ms, executing all queued callbacks */
  function flush(timestamp: number) {
    // Process all pending callbacks (may enqueue new ones)
    while (callbacks.length > 0) {
      const batch = callbacks.splice(0, callbacks.length);
      for (const entry of batch) {
        entry.cb(timestamp);
      }
    }
  }

  /** Step one frame at `timestamp`ms, executing only the first pending callback */
  function step(timestamp: number) {
    if (callbacks.length === 0) return;
    const entry = callbacks.shift()!;
    entry.cb(timestamp);
  }

  return { raf, cancelRaf, flush, step, callbacks };
}

describe('ViewportAnimator', () => {
  let vp: ViewportState;
  let updates: ViewportState[];
  let onUpdate: (state: ViewportState) => void;

  beforeEach(() => {
    vi.restoreAllMocks();
    vp = createViewport(1920, 1080);
    updates = [];
    onUpdate = (state) => {
      vp = state;
      updates.push({ ...state });
    };
  });

  // -----------------------------------------------------------------------
  // Basic animation
  // -----------------------------------------------------------------------

  it('animates offset from current to target', () => {
    const { raf, cancelRaf, step } = createFakeRaf();
    const animator = new ViewportAnimator(() => vp, onUpdate, raf, cancelRaf);

    animator.animateTo(
      { offset: { x: 100, y: 200 } },
      { duration: 100, easing: linear },
    );

    // First frame at t=0 (progress=0)
    step(0);
    expect(updates[0].offset.x).toBeCloseTo(0, 5);
    expect(updates[0].offset.y).toBeCloseTo(0, 5);

    // Midpoint at t=50 (progress=0.5)
    step(50);
    expect(updates[1].offset.x).toBeCloseTo(50, 5);
    expect(updates[1].offset.y).toBeCloseTo(100, 5);

    // Final at t=100 (progress=1)
    step(100);
    expect(updates[2].offset.x).toBeCloseTo(100, 5);
    expect(updates[2].offset.y).toBeCloseTo(200, 5);

    expect(animator.isAnimating()).toBe(false);
  });

  it('animates zoom from current to target', () => {
    const { raf, cancelRaf, step } = createFakeRaf();
    const animator = new ViewportAnimator(() => vp, onUpdate, raf, cancelRaf);

    animator.animateTo(
      { zoom: 3 },
      { duration: 100, easing: linear },
    );

    step(0);   // t=0  → zoom=1
    step(50);  // t=50 → zoom=2
    step(100); // t=100 → zoom=3

    expect(updates[0].zoom).toBeCloseTo(1, 5);
    expect(updates[1].zoom).toBeCloseTo(2, 5);
    expect(updates[2].zoom).toBeCloseTo(3, 5);
  });

  it('animates both offset and zoom simultaneously', () => {
    const { raf, cancelRaf, step } = createFakeRaf();
    const animator = new ViewportAnimator(() => vp, onUpdate, raf, cancelRaf);

    animator.animateTo(
      { offset: { x: 200, y: 0 }, zoom: 2 },
      { duration: 100, easing: linear },
    );

    step(0);
    step(100);

    expect(updates[updates.length - 1].offset.x).toBeCloseTo(200, 5);
    expect(updates[updates.length - 1].zoom).toBeCloseTo(2, 5);
  });

  // -----------------------------------------------------------------------
  // Duration = 0 (instant)
  // -----------------------------------------------------------------------

  it('applies target immediately when duration is 0', () => {
    const { raf, cancelRaf } = createFakeRaf();
    const animator = new ViewportAnimator(() => vp, onUpdate, raf, cancelRaf);

    animator.animateTo(
      { offset: { x: 50, y: 50 }, zoom: 2 },
      { duration: 0 },
    );

    expect(updates).toHaveLength(1);
    expect(updates[0].offset.x).toBeCloseTo(50, 5);
    expect(updates[0].zoom).toBeCloseTo(2, 5);
    expect(animator.isAnimating()).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Cancel
  // -----------------------------------------------------------------------

  it('cancel() stops animation and resolves the promise', async () => {
    const { raf, cancelRaf, step } = createFakeRaf();
    const animator = new ViewportAnimator(() => vp, onUpdate, raf, cancelRaf);

    const promise = animator.animateTo(
      { offset: { x: 100, y: 0 } },
      { duration: 200, easing: linear },
    );

    step(0);  // first frame
    animator.cancel();

    // Promise should resolve (not hang)
    await promise;

    expect(animator.isAnimating()).toBe(false);
    // Offset should NOT have reached the target
    expect(vp.offset.x).toBeCloseTo(0, 5);
  });

  it('starting a new animation cancels the previous one', () => {
    const { raf, cancelRaf, step } = createFakeRaf();
    const animator = new ViewportAnimator(() => vp, onUpdate, raf, cancelRaf);

    animator.animateTo(
      { offset: { x: 100, y: 0 } },
      { duration: 200, easing: linear },
    );

    step(0);

    // Start a new animation before the first finishes
    animator.animateTo(
      { offset: { x: -50, y: 0 } },
      { duration: 100, easing: linear },
    );

    step(0);
    step(100);

    // Should have ended at the SECOND animation's target
    expect(vp.offset.x).toBeCloseTo(-50, 5);
  });

  // -----------------------------------------------------------------------
  // isAnimating
  // -----------------------------------------------------------------------

  it('isAnimating() returns true during animation', () => {
    const { raf, cancelRaf, step } = createFakeRaf();
    const animator = new ViewportAnimator(() => vp, onUpdate, raf, cancelRaf);

    expect(animator.isAnimating()).toBe(false);

    animator.animateTo(
      { offset: { x: 100, y: 0 } },
      { duration: 100, easing: linear },
    );

    expect(animator.isAnimating()).toBe(true);

    step(0);
    expect(animator.isAnimating()).toBe(true);

    step(100);
    expect(animator.isAnimating()).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Easing functions
  // -----------------------------------------------------------------------

  it('easeOutCubic: starts fast, ends slow', () => {
    expect(easeOutCubic(0)).toBeCloseTo(0, 10);
    expect(easeOutCubic(1)).toBeCloseTo(1, 10);
    // At t=0.5, easeOutCubic should be > 0.5 (front-loaded)
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it('easeInOutCubic: symmetric S-curve', () => {
    expect(easeInOutCubic(0)).toBeCloseTo(0, 10);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
    expect(easeInOutCubic(1)).toBeCloseTo(1, 10);
  });

  it('linear: constant rate', () => {
    expect(linear(0)).toBe(0);
    expect(linear(0.5)).toBe(0.5);
    expect(linear(1)).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Zoom clamping
  // -----------------------------------------------------------------------

  it('clamps zoom to min/max during animation', () => {
    const { raf, cancelRaf, step } = createFakeRaf();
    const animator = new ViewportAnimator(() => vp, onUpdate, raf, cancelRaf);

    animator.animateTo(
      { zoom: 50 }, // exceeds maxZoom of 10
      { duration: 100, easing: linear },
    );

    step(0);
    step(100);

    expect(updates[updates.length - 1].zoom).toBe(vp.maxZoom);
  });

  // -----------------------------------------------------------------------
  // Bus event emission
  // -----------------------------------------------------------------------

  it('emits canvas.viewport.changed bus event on each frame', async () => {
    const { bus } = await import('../../../kernel/bus');
    const handler = vi.fn();
    const unsub = bus.subscribe('canvas.viewport.changed', handler);

    const { raf, cancelRaf, step } = createFakeRaf();
    const animator = new ViewportAnimator(() => vp, onUpdate, raf, cancelRaf);

    animator.animateTo(
      { offset: { x: 10, y: 0 } },
      { duration: 50, easing: linear },
    );

    step(0);
    step(50);

    expect(handler).toHaveBeenCalledTimes(2);
    const lastPayload = handler.mock.calls[1][0].payload;
    expect(lastPayload.offset.x).toBeCloseTo(10, 5);

    unsub();
  });

  // -----------------------------------------------------------------------
  // Default options
  // -----------------------------------------------------------------------

  it('uses easeOutCubic and 250ms by default', () => {
    const { raf, cancelRaf, step } = createFakeRaf();
    const animator = new ViewportAnimator(() => vp, onUpdate, raf, cancelRaf);

    animator.animateTo({ offset: { x: 100, y: 0 } });

    // First frame
    step(0);
    // At t=125 (half of 250ms), easeOutCubic(0.5) ≈ 0.875
    step(125);
    expect(updates[1].offset.x).toBeCloseTo(100 * easeOutCubic(0.5), 1);

    // Complete
    step(250);
    expect(updates[2].offset.x).toBeCloseTo(100, 5);
  });
});
