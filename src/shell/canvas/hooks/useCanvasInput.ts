/**
 * Hook wiring pointer/touch/gesture input to the canvas viewport.
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

import { useEffect, useRef } from 'react';

import {
  createPointerAdapter,
  createGestureInterpreter,
  createDefaultModifiers,
} from '../../../canvas/core';
import type { PointerAdapter, GestureInterpreter, GestureEvent } from '../../../canvas/core';
import type { ViewportStore } from './useViewport';

const ZOOM_SPEED = 0.001;

/**
 * Wires pointer, wheel, and touch events on a container element
 * to viewport pan/zoom operations.
 */
export function useCanvasInput(
  containerRef: React.RefObject<HTMLDivElement | null>,
  viewportStore: ViewportStore,
) {
  const pointerAdapterRef = useRef<PointerAdapter | null>(null);
  const gestureRef = useRef<GestureInterpreter | null>(null);
  const isPanning = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // --- Pointer adapter for normalized events ---
    const adapter = createPointerAdapter(el);
    pointerAdapterRef.current = adapter;

    // --- Gesture interpreter for touch ---
    const gesture = createGestureInterpreter();
    gestureRef.current = gesture;

    // --- Wire pinch-to-zoom from gesture interpreter ---
    const defaultMods = createDefaultModifiers();

    const unsubGesture = gesture.onGesture((evt: GestureEvent) => {
      if (evt.type === 'gesture.pinch' && evt.state === 'update') {
        const rect = el!.getBoundingClientRect();
        const center = { x: evt.center.x - rect.left, y: evt.center.y - rect.top };
        const vp = viewportStore.getState();
        const newZoom = Math.max(0.1, Math.min(10, vp.zoom * (1 + evt.scaleDelta)));
        viewportStore.zoom(newZoom, center);
      }
    });

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        gesture.handlePointerDown({
          type: 'pointer.down',
          pointerId: t.identifier,
          screenPosition: { x: t.clientX, y: t.clientY },
          button: 'primary',
          source: 'touch',
          timestamp: e.timeStamp,
          modifiers: defaultMods,
          pressure: t.force || 0,
          tiltX: 0,
          tiltY: 0,
          handled: false,
          preventDefault: () => { e.preventDefault(); },
        });
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        gesture.handlePointerMove({
          type: 'pointer.move',
          pointerId: t.identifier,
          screenPosition: { x: t.clientX, y: t.clientY },
          buttons: ['primary'],
          delta: { x: 0, y: 0 },
          source: 'touch',
          timestamp: e.timeStamp,
          modifiers: defaultMods,
          pressure: t.force || 0,
          handled: false,
          preventDefault: () => { e.preventDefault(); },
        });
      }
    }
    function onTouchEnd(e: TouchEvent) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        gesture.handlePointerUp({
          type: 'pointer.up',
          pointerId: t.identifier,
          screenPosition: { x: t.clientX, y: t.clientY },
          button: 'primary',
          source: 'touch',
          timestamp: e.timeStamp,
          modifiers: defaultMods,
          handled: false,
          preventDefault: () => {},
        });
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    // --- Wheel zoom ---
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const vp = viewportStore.getState();
      const delta = -e.deltaY * ZOOM_SPEED;
      viewportStore.zoom(vp.zoom * (1 + delta), anchor);
    }

    // --- Middle-click pan ---
    function onPointerDown(e: PointerEvent) {
      // Middle button (1) or space+left
      if (e.button === 1) {
        e.preventDefault();
        isPanning.current = true;
        lastPointer.current = { x: e.clientX, y: e.clientY };
        el!.setPointerCapture(e.pointerId);
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!isPanning.current || !lastPointer.current) return;
      const vp = viewportStore.getState();
      const dx = (e.clientX - lastPointer.current.x) / vp.zoom;
      const dy = (e.clientY - lastPointer.current.y) / vp.zoom;
      viewportStore.pan({ x: dx, y: dy });
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }

    function onPointerUp(e: PointerEvent) {
      if (e.button === 1) {
        isPanning.current = false;
        lastPointer.current = null;
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      unsubGesture();
      gesture.reset();
      adapter.detach();
    };
  }, [containerRef, viewportStore]);
}
