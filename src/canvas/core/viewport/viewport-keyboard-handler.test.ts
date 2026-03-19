import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { bus } from '../../../kernel/bus';

import { createViewport } from './viewport';
import type { ViewportState } from './viewport';
import { ViewportAnimator } from './viewport-animator';
import { createViewportKeyboardHandler, NAV_EVENTS } from './viewport-keyboard-handler';

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
  /** Execute one pending callback at `timestamp` */
  function step(timestamp: number) {
    if (callbacks.length === 0) return;
    const entry = callbacks.shift()!;
    entry.cb(timestamp);
  }
  /** Run start frame + end frame to complete an animation */
  function complete(duration: number) {
    step(0);
    step(duration);
  }
  return { raf, cancelRaf, step, complete };
}

describe('ViewportKeyboardHandler', () => {
  let vp: ViewportState;
  let animator: ViewportAnimator;
  let fakeRaf: ReturnType<typeof createFakeRaf>;

  beforeEach(() => {
    vp = createViewport(1920, 1080);
    fakeRaf = createFakeRaf();
    animator = new ViewportAnimator(
      () => vp,
      (next) => { vp = next; },
      fakeRaf.raf,
      fakeRaf.cancelRaf,
    );
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('panStep moves viewport instantly', () => {
    const handler = createViewportKeyboardHandler({
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
      animator,
    });
    handler.attach();

    bus.emit(NAV_EVENTS.PAN_STEP, { dx: 50, dy: -30 });
    expect(vp.offset.x).toBe(50);
    expect(vp.offset.y).toBe(-30);

    handler.detach();
  });

  it('zoomIn increases zoom via animator', () => {
    const handler = createViewportKeyboardHandler({
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
      animator,
    });
    handler.attach();

    bus.emit(NAV_EVENTS.ZOOM_IN, {});
    // Animation started — complete it
    fakeRaf.complete(150);

    expect(vp.zoom).toBeCloseTo(1.25, 2);

    handler.detach();
  });

  it('zoomOut decreases zoom via animator', () => {
    const handler = createViewportKeyboardHandler({
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
      animator,
    });
    handler.attach();

    bus.emit(NAV_EVENTS.ZOOM_OUT, {});
    fakeRaf.complete(150);

    expect(vp.zoom).toBeCloseTo(1 / 1.25, 2);

    handler.detach();
  });

  it('resetZoom returns zoom to 1', () => {
    vp = { ...vp, zoom: 3 };
    const handler = createViewportKeyboardHandler({
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
      animator,
    });
    handler.attach();

    bus.emit(NAV_EVENTS.RESET_ZOOM, {});
    fakeRaf.complete(250);

    expect(vp.zoom).toBeCloseTo(1, 2);

    handler.detach();
  });

  it('reset returns viewport to origin at zoom 1', () => {
    vp = { ...vp, offset: { x: 500, y: 300 }, zoom: 2 };
    const handler = createViewportKeyboardHandler({
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
      animator,
    });
    handler.attach();

    bus.emit(NAV_EVENTS.RESET, {});
    fakeRaf.complete(250);

    expect(vp.offset.x).toBeCloseTo(0, 1);
    expect(vp.offset.y).toBeCloseTo(0, 1);
    expect(vp.zoom).toBeCloseTo(1, 2);

    handler.detach();
  });

  it('doubleTapZoom zooms in 2x at position', () => {
    const handler = createViewportKeyboardHandler({
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
      animator,
    });
    handler.attach();

    bus.emit(NAV_EVENTS.DOUBLETAP_ZOOM, { position: { x: 960, y: 540 } });
    fakeRaf.complete(250);

    expect(vp.zoom).toBeCloseTo(2, 2);

    handler.detach();
  });

  it('doubleTapZoom zooms out to 1x when already > 4x', () => {
    vp = { ...vp, zoom: 5 };
    const handler = createViewportKeyboardHandler({
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
      animator,
    });
    handler.attach();

    bus.emit(NAV_EVENTS.DOUBLETAP_ZOOM, { position: { x: 960, y: 540 } });
    fakeRaf.complete(250);

    expect(vp.zoom).toBeCloseTo(1, 2);

    handler.detach();
  });

  it('detach stops handling events', () => {
    const handler = createViewportKeyboardHandler({
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
      animator,
    });
    handler.attach();
    handler.detach();

    bus.emit(NAV_EVENTS.PAN_STEP, { dx: 100, dy: 0 });
    expect(vp.offset.x).toBe(0); // unchanged
  });
});
