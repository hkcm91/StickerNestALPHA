import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createDirtyTracker } from './dirty-tracker';
import { createRenderLoop } from './render-loop';

describe('RenderLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let rafId = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafId++;
      setTimeout(() => cb(performance.now()), 16);
      return rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      // no-op in tests
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts and stops', () => {
    const tracker = createDirtyTracker();
    const loop = createRenderLoop(tracker);
    expect(loop.isRunning).toBe(false);
    loop.start();
    expect(loop.isRunning).toBe(true);
    loop.stop();
    expect(loop.isRunning).toBe(false);
  });

  it('calls frame callbacks when dirty', () => {
    const tracker = createDirtyTracker();
    const loop = createRenderLoop(tracker);
    const callback = vi.fn();
    loop.onFrame(callback);
    loop.start();

    tracker.markDirty({ min: { x: 0, y: 0 }, max: { x: 100, y: 100 } });
    vi.advanceTimersByTime(16);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([{ min: { x: 0, y: 0 }, max: { x: 100, y: 100 } }]);
  });

  it('does not call frame callbacks when clean', () => {
    const tracker = createDirtyTracker();
    const loop = createRenderLoop(tracker);
    const callback = vi.fn();
    loop.onFrame(callback);
    loop.start();

    vi.advanceTimersByTime(16);
    expect(callback).not.toHaveBeenCalled();
  });

  it('clears dirty state after frame', () => {
    const tracker = createDirtyTracker();
    const loop = createRenderLoop(tracker);
    loop.onFrame(() => {});
    loop.start();

    tracker.markDirty({ min: { x: 0, y: 0 }, max: { x: 100, y: 100 } });
    vi.advanceTimersByTime(16);

    expect(tracker.isDirty).toBe(false);
  });

  it('unsubscribes frame callback', () => {
    const tracker = createDirtyTracker();
    const loop = createRenderLoop(tracker);
    const callback = vi.fn();
    const unsub = loop.onFrame(callback);
    unsub();
    loop.start();

    tracker.markDirty({ min: { x: 0, y: 0 }, max: { x: 100, y: 100 } });
    vi.advanceTimersByTime(16);

    expect(callback).not.toHaveBeenCalled();
  });

  it('requestFrame forces dirty', () => {
    const tracker = createDirtyTracker();
    const loop = createRenderLoop(tracker);
    expect(tracker.isDirty).toBe(false);
    loop.requestFrame();
    expect(tracker.isDirty).toBe(true);
  });
});
