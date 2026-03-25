import { describe, it, expect, beforeEach } from 'vitest';

import { createViewport } from './viewport';
import type { ViewportState } from './viewport';
import { createMomentumController } from './viewport-momentum';

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
  function step(timestamp: number) {
    if (callbacks.length === 0) return;
    const entry = callbacks.shift()!;
    entry.cb(timestamp);
  }
  function stepN(count: number, startTime: number, frameInterval: number) {
    for (let i = 0; i < count; i++) {
      step(startTime + i * frameInterval);
    }
  }
  return { raf, cancelRaf, step, stepN, get pending() { return callbacks.length; } };
}

describe('MomentumController', () => {
  let vp: ViewportState;
  let fakeRaf: ReturnType<typeof createFakeRaf>;

  beforeEach(() => {
    vp = createViewport(1920, 1080);
    fakeRaf = createFakeRaf();
  });

  it('is not active by default', () => {
    const ctrl = createMomentumController(
      { getViewport: () => vp, setViewport: (next) => { vp = next; } },
      undefined,
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );
    expect(ctrl.isActive()).toBe(false);
  });

  it('starts momentum and pans viewport', () => {
    const ctrl = createMomentumController(
      { getViewport: () => vp, setViewport: (next) => { vp = next; } },
      { friction: 0.9, threshold: 0.5 },
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );

    ctrl.start({ x: 600, y: 0 }); // 600 px/sec rightward
    expect(ctrl.isActive()).toBe(true);

    // Step a few frames at ~60fps (16.67ms apart)
    fakeRaf.step(0);     // first frame (dt defaults to 1/60)
    fakeRaf.step(16.67); // second frame

    // Viewport should have panned to the right
    expect(vp.offset.x).toBeGreaterThan(0);
  });

  it('decays velocity to zero and stops', () => {
    const ctrl = createMomentumController(
      { getViewport: () => vp, setViewport: (next) => { vp = next; } },
      { friction: 0.5, threshold: 1 }, // Aggressive friction for quick convergence
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );

    ctrl.start({ x: 100, y: 0 });

    // Step many frames until it stops
    for (let i = 0; i < 50; i++) {
      fakeRaf.step(i * 16.67);
      if (!ctrl.isActive()) break;
    }

    expect(ctrl.isActive()).toBe(false);
  });

  it('cancel stops momentum immediately', () => {
    const ctrl = createMomentumController(
      { getViewport: () => vp, setViewport: (next) => { vp = next; } },
      { friction: 0.95, threshold: 0.5 },
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );

    ctrl.start({ x: 1000, y: 1000 });
    expect(ctrl.isActive()).toBe(true);

    ctrl.cancel();
    expect(ctrl.isActive()).toBe(false);

    const offsetBefore = { ...vp.offset };

    // No more frames should execute
    fakeRaf.step(100);
    expect(vp.offset.x).toBe(offsetBefore.x);
    expect(vp.offset.y).toBe(offsetBefore.y);
  });

  it('does not start if velocity is below threshold', () => {
    const ctrl = createMomentumController(
      { getViewport: () => vp, setViewport: (next) => { vp = next; } },
      { friction: 0.95, threshold: 10 },
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );

    ctrl.start({ x: 5, y: 5 }); // Below threshold
    expect(ctrl.isActive()).toBe(false);
  });

  it('scales pan by zoom level', () => {
    vp = { ...vp, zoom: 2 };
    const ctrl = createMomentumController(
      { getViewport: () => vp, setViewport: (next) => { vp = next; } },
      { friction: 0.9, threshold: 0.5 },
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );

    ctrl.start({ x: 600, y: 0 });
    fakeRaf.step(0);
    fakeRaf.step(16.67);

    // At zoom=2, the canvas offset should be half what it would be at zoom=1
    const atZoom2 = vp.offset.x;

    // Reset and try at zoom=1
    vp = createViewport(1920, 1080);
    ctrl.cancel();
    const ctrl2 = createMomentumController(
      { getViewport: () => vp, setViewport: (next) => { vp = next; } },
      { friction: 0.9, threshold: 0.5 },
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );
    ctrl2.start({ x: 600, y: 0 });
    fakeRaf.step(0);
    fakeRaf.step(16.67);

    const atZoom1 = vp.offset.x;

    // zoom=2 offset should be roughly half of zoom=1
    expect(atZoom2).toBeCloseTo(atZoom1 / 2, 0);
  });

  it('replacing momentum cancels the previous one', () => {
    const ctrl = createMomentumController(
      { getViewport: () => vp, setViewport: (next) => { vp = next; } },
      { friction: 0.9, threshold: 0.5 },
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );

    ctrl.start({ x: 1000, y: 0 });
    ctrl.start({ x: 0, y: 1000 }); // Replace

    fakeRaf.step(0);
    fakeRaf.step(16.67);

    // Should only move in Y direction (second momentum)
    expect(vp.offset.y).toBeGreaterThan(0);
  });
});
