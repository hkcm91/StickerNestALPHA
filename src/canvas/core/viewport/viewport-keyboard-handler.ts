/**
 * Viewport Keyboard Handler
 *
 * Subscribes to navigation bus events (emitted by the shortcut registry)
 * and drives the viewport animator / panBy accordingly.
 *
 * @module canvas/core/viewport
 * @layer L4A-1
 */

import type { BusEvent } from '@sn/types';

import { bus } from '../../../kernel/bus';

import type { ViewportState } from './viewport';
import { panBy, zoomTo } from './viewport';
import type { ViewportAnimator } from './viewport-animator';
import { computeZoomToFit } from './viewport-navigation';

// ---------------------------------------------------------------------------
// Bus event types this handler listens for
// ---------------------------------------------------------------------------

export const NAV_EVENTS = {
  PAN_STEP: 'canvas.viewport.panStep',
  ZOOM_IN: 'canvas.viewport.zoomIn',
  ZOOM_OUT: 'canvas.viewport.zoomOut',
  RESET_ZOOM: 'canvas.viewport.resetZoom',
  ZOOM_TO_FIT: 'canvas.viewport.zoomToFit',
  RESET: 'canvas.viewport.reset',
  DOUBLETAP_ZOOM: 'canvas.viewport.doubleTapZoom',
} as const;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export interface ViewportKeyboardHandler {
  /** Start listening for navigation bus events */
  attach(): void;
  /** Stop listening */
  detach(): void;
}

export interface ViewportKeyboardHandlerDeps {
  getViewport: () => ViewportState;
  setViewport: (vp: ViewportState) => void;
  animator: ViewportAnimator;
  /** Returns bounding boxes for zoom-to-fit. If omitted, zoom-to-fit resets to origin. */
  getEntityBounds?: () => Array<{ min: { x: number; y: number }; max: { x: number; y: number } }>;
}

export function createViewportKeyboardHandler(
  deps: ViewportKeyboardHandlerDeps,
): ViewportKeyboardHandler {
  const unsubs: Array<() => void> = [];
  const { getViewport, setViewport, animator } = deps;

  function handlePanStep(event: BusEvent) {
    const { dx, dy } = event.payload as { dx: number; dy: number };
    const next = panBy(getViewport(), { x: dx, y: dy });
    setViewport(next);
    bus.emit('canvas.viewport.changed', { offset: next.offset, zoom: next.zoom });
  }

  function handleZoomIn() {
    const vp = getViewport();
    const anchor = { x: vp.viewportWidth / 2, y: vp.viewportHeight / 2 };
    const target = zoomTo(vp, vp.zoom * 1.25, anchor);
    animator.animateTo(
      { offset: target.offset, zoom: target.zoom },
      { duration: 150 },
    );
  }

  function handleZoomOut() {
    const vp = getViewport();
    const anchor = { x: vp.viewportWidth / 2, y: vp.viewportHeight / 2 };
    const target = zoomTo(vp, vp.zoom / 1.25, anchor);
    animator.animateTo(
      { offset: target.offset, zoom: target.zoom },
      { duration: 150 },
    );
  }

  function handleResetZoom() {
    const vp = getViewport();
    const anchor = { x: vp.viewportWidth / 2, y: vp.viewportHeight / 2 };
    const target = zoomTo(vp, 1, anchor);
    animator.animateTo(
      { offset: target.offset, zoom: target.zoom },
      { duration: 250 },
    );
  }

  function handleZoomToFit() {
    const vp = getViewport();
    if (deps.getEntityBounds) {
      const bounds = deps.getEntityBounds();
      const target = computeZoomToFit(bounds, vp.viewportWidth, vp.viewportHeight, 48);
      animator.animateTo(
        { offset: target.offset, zoom: target.zoom },
        { duration: 250 },
      );
    } else {
      // Fallback: reset to origin at zoom 1
      animator.animateTo({ offset: { x: 0, y: 0 }, zoom: 1 }, { duration: 250 });
    }
  }

  function handleReset() {
    animator.animateTo({ offset: { x: 0, y: 0 }, zoom: 1 }, { duration: 250 });
  }

  function handleDoubleTapZoom(event: BusEvent) {
    const { position } = event.payload as { position: { x: number; y: number } };
    const vp = getViewport();

    // If already zoomed in past 4x, zoom out to 1x. Otherwise zoom in 2x.
    const targetZoom = vp.zoom > 4 ? 1 : vp.zoom * 2;
    const target = zoomTo(vp, targetZoom, position);
    animator.animateTo(
      { offset: target.offset, zoom: target.zoom },
      { duration: 250 },
    );
  }

  return {
    attach() {
      unsubs.push(bus.subscribe(NAV_EVENTS.PAN_STEP, handlePanStep));
      unsubs.push(bus.subscribe(NAV_EVENTS.ZOOM_IN, handleZoomIn));
      unsubs.push(bus.subscribe(NAV_EVENTS.ZOOM_OUT, handleZoomOut));
      unsubs.push(bus.subscribe(NAV_EVENTS.RESET_ZOOM, handleResetZoom));
      unsubs.push(bus.subscribe(NAV_EVENTS.ZOOM_TO_FIT, handleZoomToFit));
      unsubs.push(bus.subscribe(NAV_EVENTS.RESET, handleReset));
      unsubs.push(bus.subscribe(NAV_EVENTS.DOUBLETAP_ZOOM, handleDoubleTapZoom));
    },

    detach() {
      for (const unsub of unsubs) unsub();
      unsubs.length = 0;
    },
  };
}
