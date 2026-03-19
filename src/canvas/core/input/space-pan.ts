/**
 * Space+Drag Pan — temporary pan mode while Space is held
 *
 * When the user holds Space, the active tool temporarily switches to pan.
 * On Space release, the previous tool is restored. While Space is held,
 * pointer drag events are interpreted as viewport pans.
 *
 * @module canvas/core/input
 * @layer L4A-1
 */

import type { Point2D } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { ViewportState } from '../viewport/viewport';
import { panBy } from '../viewport/viewport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpacePanController {
  /** Start listening for Space key and pointer events */
  attach(): void;
  /** Stop listening */
  detach(): void;
  /** Whether space-pan mode is currently active */
  isActive(): boolean;
}

/** Event listener interface for DOM-like targets */
interface EventTarget {
  addEventListener(type: string, handler: EventListener): void;
  removeEventListener(type: string, handler: EventListener): void;
}

export interface SpacePanDeps {
  /** The DOM element to listen on for pointer events */
  target: HTMLElement | EventTarget;
  /** Returns current viewport */
  getViewport: () => ViewportState;
  /** Apply updated viewport */
  setViewport: (vp: ViewportState) => void;
}

// Tags that indicate the user is typing, not navigating
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditable(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (EDITABLE_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createSpacePanController(deps: SpacePanDeps): SpacePanController {
  let active = false;
  let dragging = false;
  let lastPointer: Point2D | null = null;

  // Bound handlers for cleanup
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  let keyupHandler: ((e: KeyboardEvent) => void) | null = null;
  let pointerdownHandler: ((e: PointerEvent) => void) | null = null;
  let pointermoveHandler: ((e: PointerEvent) => void) | null = null;
  let pointerupHandler: ((e: PointerEvent) => void) | null = null;

  function onKeydown(e: KeyboardEvent) {
    if (e.code !== 'Space' || e.repeat) return;
    if (isEditable(e.target)) return;

    e.preventDefault();
    active = true;

    // Save current tool and notify via bus
    bus.emit('canvas.spacepan.activated', {});
  }

  function onKeyup(e: KeyboardEvent) {
    if (e.code !== 'Space') return;
    if (!active) return;

    active = false;
    dragging = false;
    lastPointer = null;

    bus.emit('canvas.spacepan.deactivated', {});
  }

  function onPointerdown(e: PointerEvent) {
    if (!active) return;

    e.preventDefault();
    dragging = true;
    lastPointer = { x: e.clientX, y: e.clientY };
  }

  function onPointermove(e: PointerEvent) {
    if (!active || !dragging || !lastPointer) return;

    const current = { x: e.clientX, y: e.clientY };
    const vp = deps.getViewport();

    // Delta is in screen pixels; convert to canvas-space offset delta
    const dx = (current.x - lastPointer.x) / vp.zoom;
    const dy = (current.y - lastPointer.y) / vp.zoom;

    const next = panBy(vp, { x: dx, y: dy });
    deps.setViewport(next);
    bus.emit('canvas.viewport.changed', { offset: next.offset, zoom: next.zoom });

    lastPointer = current;
  }

  function onPointerup(_e: PointerEvent) {
    dragging = false;
    lastPointer = null;
  }

  return {
    attach() {
      keydownHandler = onKeydown;
      keyupHandler = onKeyup;
      pointerdownHandler = onPointerdown as EventListener;
      pointermoveHandler = onPointermove as EventListener;
      pointerupHandler = onPointerup as EventListener;

      window.addEventListener('keydown', keydownHandler);
      window.addEventListener('keyup', keyupHandler);
      (deps.target as HTMLElement).addEventListener('pointerdown', pointerdownHandler as EventListener);
      (deps.target as HTMLElement).addEventListener('pointermove', pointermoveHandler as EventListener);
      (deps.target as HTMLElement).addEventListener('pointerup', pointerupHandler as EventListener);
    },

    detach() {
      if (keydownHandler) window.removeEventListener('keydown', keydownHandler);
      if (keyupHandler) window.removeEventListener('keyup', keyupHandler);
      if (pointerdownHandler) (deps.target as HTMLElement).removeEventListener('pointerdown', pointerdownHandler as EventListener);
      if (pointermoveHandler) (deps.target as HTMLElement).removeEventListener('pointermove', pointermoveHandler as EventListener);
      if (pointerupHandler) (deps.target as HTMLElement).removeEventListener('pointerup', pointerupHandler as EventListener);

      keydownHandler = null;
      keyupHandler = null;
      pointerdownHandler = null;
      pointermoveHandler = null;
      pointerupHandler = null;
      active = false;
      dragging = false;
      lastPointer = null;
    },

    isActive() {
      return active;
    },
  };
}
