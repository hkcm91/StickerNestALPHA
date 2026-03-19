import { describe, it, expect, beforeEach } from 'vitest';

import { createViewport } from '../viewport/viewport';
import type { ViewportState } from '../viewport/viewport';

import { createEdgePanController, computeEdgePan } from './edge-pan';

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
  function step() {
    if (callbacks.length === 0) return;
    const entry = callbacks.shift()!;
    entry.cb(0);
  }
  return { raf, cancelRaf, step, get pending() { return callbacks.length; } };
}

describe('computeEdgePan', () => {
  const W = 1920;
  const H = 1080;
  const ZONE = 40;
  const MAX = 8;

  it('returns zero when cursor is in center', () => {
    const pan = computeEdgePan({ x: W / 2, y: H / 2 }, W, H, ZONE, MAX);
    expect(pan.x).toBe(0);
    expect(pan.y).toBe(0);
  });

  it('pans right (positive dx) when cursor is at left edge', () => {
    const pan = computeEdgePan({ x: 0, y: H / 2 }, W, H, ZONE, MAX);
    expect(pan.x).toBeCloseTo(MAX, 5);
    expect(pan.y).toBe(0);
  });

  it('pans left (negative dx) when cursor is at right edge', () => {
    const pan = computeEdgePan({ x: W, y: H / 2 }, W, H, ZONE, MAX);
    expect(pan.x).toBeCloseTo(-MAX, 5);
    expect(pan.y).toBe(0);
  });

  it('pans down (positive dy) when cursor is at top edge', () => {
    const pan = computeEdgePan({ x: W / 2, y: 0 }, W, H, ZONE, MAX);
    expect(pan.x).toBe(0);
    expect(pan.y).toBeCloseTo(MAX, 5);
  });

  it('pans up (negative dy) when cursor is at bottom edge', () => {
    const pan = computeEdgePan({ x: W / 2, y: H }, W, H, ZONE, MAX);
    expect(pan.x).toBe(0);
    expect(pan.y).toBeCloseTo(-MAX, 5);
  });

  it('ramps linearly — half zone = half speed', () => {
    const pan = computeEdgePan({ x: ZONE / 2, y: H / 2 }, W, H, ZONE, MAX);
    expect(pan.x).toBeCloseTo(MAX / 2, 5);
  });

  it('returns zero when cursor is just outside edge zone', () => {
    const pan = computeEdgePan({ x: ZONE + 1, y: ZONE + 1 }, W, H, ZONE, MAX);
    expect(pan.x).toBe(0);
    expect(pan.y).toBe(0);
  });

  it('handles corner — both x and y pan', () => {
    const pan = computeEdgePan({ x: 0, y: 0 }, W, H, ZONE, MAX);
    expect(pan.x).toBeCloseTo(MAX, 5);
    expect(pan.y).toBeCloseTo(MAX, 5);
  });
});

describe('EdgePanController', () => {
  let vp: ViewportState;
  let fakeRaf: ReturnType<typeof createFakeRaf>;

  beforeEach(() => {
    vp = createViewport(1920, 1080);
    fakeRaf = createFakeRaf();
  });

  it('is not active by default', () => {
    const ctrl = createEdgePanController(
      { getViewport: () => vp, setViewport: (next) => { vp = next; } },
      undefined,
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );
    expect(ctrl.isActive()).toBe(false);
  });

  it('activates and pans when cursor is at edge', () => {
    const ctrl = createEdgePanController(
      { getViewport: () => vp, setViewport: (next) => { vp = next; } },
      { edgeZone: 40, maxSpeed: 8 },
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );

    // Cursor at left edge
    ctrl.activate(() => ({ x: 0, y: 540 }));
    expect(ctrl.isActive()).toBe(true);

    // Run a few frames
    fakeRaf.step();
    fakeRaf.step();

    // Viewport should have panned (offset.x increased)
    expect(vp.offset.x).toBeGreaterThan(0);
  });

  it('does not pan when cursor is in center', () => {
    const ctrl = createEdgePanController(
      { getViewport: () => vp, setViewport: (next) => { vp = next; } },
      { edgeZone: 40, maxSpeed: 8 },
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );

    ctrl.activate(() => ({ x: 960, y: 540 }));
    fakeRaf.step();
    fakeRaf.step();

    expect(vp.offset.x).toBe(0);
    expect(vp.offset.y).toBe(0);
  });

  it('stops panning on deactivate', () => {
    const ctrl = createEdgePanController(
      { getViewport: () => vp, setViewport: (next) => { vp = next; } },
      { edgeZone: 40, maxSpeed: 8 },
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );

    ctrl.activate(() => ({ x: 0, y: 540 }));
    fakeRaf.step();
    ctrl.deactivate();
    expect(ctrl.isActive()).toBe(false);

    const offsetBefore = vp.offset.x;
    fakeRaf.step(); // Should do nothing
    expect(vp.offset.x).toBe(offsetBefore);
  });
});
