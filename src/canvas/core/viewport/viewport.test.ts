import { describe, it, expect } from 'vitest';

import {
  createViewport,
  canvasToScreen,
  screenToCanvas,
  panBy,
  zoomTo,
  getVisibleBounds,
} from './viewport';

describe('Viewport', () => {
  it('creates viewport with default state', () => {
    const vp = createViewport(1920, 1080);
    expect(vp.offset).toEqual({ x: 0, y: 0 });
    expect(vp.zoom).toBe(1);
    expect(vp.viewportWidth).toBe(1920);
    expect(vp.viewportHeight).toBe(1080);
  });

  it('coordinate round-trip: screenToCanvas(canvasToScreen(p, vp), vp) === p', () => {
    const vp = createViewport(1920, 1080);
    const p = { x: 150, y: 300 };
    const screen = canvasToScreen(p, vp);
    const back = screenToCanvas(screen, vp);
    expect(back.x).toBeCloseTo(p.x, 10);
    expect(back.y).toBeCloseTo(p.y, 10);
  });

  it('coordinate round-trip with non-default offset and zoom', () => {
    let vp = createViewport(1920, 1080);
    vp = { ...vp, offset: { x: 100, y: -50 }, zoom: 2 };
    const p = { x: 42, y: 99 };
    const screen = canvasToScreen(p, vp);
    const back = screenToCanvas(screen, vp);
    expect(back.x).toBeCloseTo(p.x, 10);
    expect(back.y).toBeCloseTo(p.y, 10);
  });

  it('panBy adjusts offset', () => {
    const vp = createViewport(1920, 1080);
    const panned = panBy(vp, { x: 50, y: -30 });
    expect(panned.offset).toEqual({ x: 50, y: -30 });
    expect(panned.zoom).toBe(1);
  });

  it('zoomTo clamps to min/max', () => {
    const vp = createViewport(1920, 1080);
    const zoomed = zoomTo(vp, 50, { x: 960, y: 540 });
    expect(zoomed.zoom).toBe(vp.maxZoom);

    const zoomedMin = zoomTo(vp, 0.001, { x: 960, y: 540 });
    expect(zoomedMin.zoom).toBe(vp.minZoom);
  });

  it('zoomTo keeps anchor point in same canvas position', () => {
    const vp = createViewport(1920, 1080);
    const anchor = { x: 500, y: 400 };
    const canvasBefore = screenToCanvas(anchor, vp);
    const zoomed = zoomTo(vp, 2, anchor);
    const canvasAfter = screenToCanvas(anchor, zoomed);
    expect(canvasAfter.x).toBeCloseTo(canvasBefore.x, 5);
    expect(canvasAfter.y).toBeCloseTo(canvasBefore.y, 5);
  });

  it('getVisibleBounds returns correct canvas-space bounds', () => {
    const vp = createViewport(1920, 1080);
    const bounds = getVisibleBounds(vp);
    expect(bounds.min).toEqual({ x: 0, y: 0 });
    expect(bounds.max).toEqual({ x: 1920, y: 1080 });
  });

  it('getVisibleBounds scales with zoom', () => {
    let vp = createViewport(1920, 1080);
    vp = { ...vp, zoom: 2 };
    const bounds = getVisibleBounds(vp);
    expect(bounds.max.x).toBeCloseTo(960, 5);
    expect(bounds.max.y).toBeCloseTo(540, 5);
  });
});
