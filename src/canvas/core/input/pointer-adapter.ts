/**
 * Pointer Adapter
 *
 * Normalizes mouse/pointer events into platform-agnostic input events.
 *
 * @module canvas/core/input
 * @layer L4A-1
 */

import type { Point2D } from '@sn/types';

import { BaseInputAdapter, DEFAULT_INPUT_CONFIG } from './input-adapter';
import type { InputAdapterConfig } from './input-adapter';
import type {
  PointerDownEvent,
  PointerMoveEvent,
  PointerUpEvent,
  PointerCancelEvent,
  PointerEnterEvent,
  PointerLeaveEvent,
  WheelEvent as InputWheelEvent,
} from './input-event';
import {
  extractModifiers,
  getInputSource,
  mapMouseButton,
  getButtonsHeld,
  createDefaultModifiers,
} from './input-event';

/**
 * Pointer adapter for mouse/pointer events
 */
export class PointerAdapter extends BaseInputAdapter {
  private config: Required<InputAdapterConfig>;
  private lastPosition: Map<number, Point2D> = new Map();
  private boundHandlers: {
    pointerdown?: (e: globalThis.PointerEvent) => void;
    pointermove?: (e: globalThis.PointerEvent) => void;
    pointerup?: (e: globalThis.PointerEvent) => void;
    pointercancel?: (e: globalThis.PointerEvent) => void;
    pointerenter?: (e: globalThis.PointerEvent) => void;
    pointerleave?: (e: globalThis.PointerEvent) => void;
    wheel?: (e: globalThis.WheelEvent) => void;
    mousedown?: (e: MouseEvent) => void;
    mousemove?: (e: MouseEvent) => void;
    mouseup?: (e: MouseEvent) => void;
    mouseenter?: (e: MouseEvent) => void;
    mouseleave?: (e: MouseEvent) => void;
  } = {};

  constructor(target: HTMLElement, config: InputAdapterConfig = {}) {
    super(target);
    this.config = { ...DEFAULT_INPUT_CONFIG, ...config };
  }

  attach(): void {
    if (this.attached) return;

    // Prefer Pointer Events API if available
    if (this.config.enablePointer && 'PointerEvent' in window) {
      this.attachPointerEvents();
    } else if (this.config.enableMouse) {
      this.attachMouseEvents();
    }

    if (this.config.enableWheel) {
      this.attachWheelEvents();
    }

    this.attached = true;
  }

  detach(): void {
    if (!this.attached) return;

    // Remove pointer event listeners
    if (this.boundHandlers.pointerdown) {
      this.target.removeEventListener('pointerdown', this.boundHandlers.pointerdown);
      this.target.removeEventListener('pointermove', this.boundHandlers.pointermove!);
      this.target.removeEventListener('pointerup', this.boundHandlers.pointerup!);
      this.target.removeEventListener('pointercancel', this.boundHandlers.pointercancel!);
      this.target.removeEventListener('pointerenter', this.boundHandlers.pointerenter!);
      this.target.removeEventListener('pointerleave', this.boundHandlers.pointerleave!);
    }

    // Remove mouse event listeners
    if (this.boundHandlers.mousedown) {
      this.target.removeEventListener('mousedown', this.boundHandlers.mousedown);
      this.target.removeEventListener('mousemove', this.boundHandlers.mousemove!);
      this.target.removeEventListener('mouseup', this.boundHandlers.mouseup!);
      this.target.removeEventListener('mouseenter', this.boundHandlers.mouseenter!);
      this.target.removeEventListener('mouseleave', this.boundHandlers.mouseleave!);
    }

    // Remove wheel listener
    if (this.boundHandlers.wheel) {
      this.target.removeEventListener('wheel', this.boundHandlers.wheel);
    }

    this.boundHandlers = {};
    this.lastPosition.clear();
    this.attached = false;
  }

  private attachPointerEvents(): void {
    this.boundHandlers.pointerdown = (e) => this.handlePointerDown(e);
    this.boundHandlers.pointermove = (e) => this.handlePointerMove(e);
    this.boundHandlers.pointerup = (e) => this.handlePointerUp(e);
    this.boundHandlers.pointercancel = (e) => this.handlePointerCancel(e);
    this.boundHandlers.pointerenter = (e) => this.handlePointerEnter(e);
    this.boundHandlers.pointerleave = (e) => this.handlePointerLeave(e);

    this.target.addEventListener('pointerdown', this.boundHandlers.pointerdown);
    this.target.addEventListener('pointermove', this.boundHandlers.pointermove);
    this.target.addEventListener('pointerup', this.boundHandlers.pointerup);
    this.target.addEventListener('pointercancel', this.boundHandlers.pointercancel);
    this.target.addEventListener('pointerenter', this.boundHandlers.pointerenter);
    this.target.addEventListener('pointerleave', this.boundHandlers.pointerleave);
  }

  private attachMouseEvents(): void {
    this.boundHandlers.mousedown = (e) => this.handleMouseDown(e);
    this.boundHandlers.mousemove = (e) => this.handleMouseMove(e);
    this.boundHandlers.mouseup = (e) => this.handleMouseUp(e);
    this.boundHandlers.mouseenter = (e) => this.handleMouseEnter(e);
    this.boundHandlers.mouseleave = (e) => this.handleMouseLeave(e);

    this.target.addEventListener('mousedown', this.boundHandlers.mousedown);
    this.target.addEventListener('mousemove', this.boundHandlers.mousemove);
    this.target.addEventListener('mouseup', this.boundHandlers.mouseup);
    this.target.addEventListener('mouseenter', this.boundHandlers.mouseenter);
    this.target.addEventListener('mouseleave', this.boundHandlers.mouseleave);
  }

  private attachWheelEvents(): void {
    this.boundHandlers.wheel = (e) => this.handleWheel(e);
    this.target.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
  }

  private getScreenPosition(e: MouseEvent | globalThis.PointerEvent): Point2D {
    const rect = this.target.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handlePointerDown(e: globalThis.PointerEvent): void {
    const position = this.getScreenPosition(e);
    this.lastPosition.set(e.pointerId, position);

    const event: PointerDownEvent = {
      type: 'pointer.down',
      timestamp: e.timeStamp,
      screenPosition: position,
      source: getInputSource(e),
      modifiers: extractModifiers(e),
      handled: false,
      preventDefault: () => {
        event.handled = true;
        if (this.config.preventDefault) e.preventDefault();
        if (this.config.stopPropagation) e.stopPropagation();
      },
      button: mapMouseButton(e.button),
      pointerId: e.pointerId,
      pressure: e.pressure,
      tiltX: e.tiltX,
      tiltY: e.tiltY,
    };

    this.emit(event);
  }

  private handlePointerMove(e: globalThis.PointerEvent): void {
    const position = this.getScreenPosition(e);
    const lastPos = this.lastPosition.get(e.pointerId) ?? position;
    const delta: Point2D = {
      x: position.x - lastPos.x,
      y: position.y - lastPos.y,
    };
    this.lastPosition.set(e.pointerId, position);

    const event: PointerMoveEvent = {
      type: 'pointer.move',
      timestamp: e.timeStamp,
      screenPosition: position,
      source: getInputSource(e),
      modifiers: extractModifiers(e),
      handled: false,
      preventDefault: () => {
        event.handled = true;
        if (this.config.preventDefault) e.preventDefault();
        if (this.config.stopPropagation) e.stopPropagation();
      },
      pointerId: e.pointerId,
      buttons: getButtonsHeld(e.buttons),
      delta,
      pressure: e.pressure,
    };

    this.emit(event);
  }

  private handlePointerUp(e: globalThis.PointerEvent): void {
    const position = this.getScreenPosition(e);
    this.lastPosition.delete(e.pointerId);

    const event: PointerUpEvent = {
      type: 'pointer.up',
      timestamp: e.timeStamp,
      screenPosition: position,
      source: getInputSource(e),
      modifiers: extractModifiers(e),
      handled: false,
      preventDefault: () => {
        event.handled = true;
        if (this.config.preventDefault) e.preventDefault();
        if (this.config.stopPropagation) e.stopPropagation();
      },
      button: mapMouseButton(e.button),
      pointerId: e.pointerId,
    };

    this.emit(event);
  }

  private handlePointerCancel(e: globalThis.PointerEvent): void {
    const position = this.getScreenPosition(e);
    this.lastPosition.delete(e.pointerId);

    const event: PointerCancelEvent = {
      type: 'pointer.cancel',
      timestamp: e.timeStamp,
      screenPosition: position,
      source: getInputSource(e),
      modifiers: extractModifiers(e),
      handled: false,
      preventDefault: () => {
        event.handled = true;
      },
      pointerId: e.pointerId,
    };

    this.emit(event);
  }

  private handlePointerEnter(e: globalThis.PointerEvent): void {
    const position = this.getScreenPosition(e);

    const event: PointerEnterEvent = {
      type: 'pointer.enter',
      timestamp: e.timeStamp,
      screenPosition: position,
      source: getInputSource(e),
      modifiers: extractModifiers(e),
      handled: false,
      preventDefault: () => {
        event.handled = true;
      },
      pointerId: e.pointerId,
    };

    this.emit(event);
  }

  private handlePointerLeave(e: globalThis.PointerEvent): void {
    const position = this.getScreenPosition(e);
    this.lastPosition.delete(e.pointerId);

    const event: PointerLeaveEvent = {
      type: 'pointer.leave',
      timestamp: e.timeStamp,
      screenPosition: position,
      source: getInputSource(e),
      modifiers: extractModifiers(e),
      handled: false,
      preventDefault: () => {
        event.handled = true;
      },
      pointerId: e.pointerId,
    };

    this.emit(event);
  }

  // Mouse event fallbacks (for browsers without PointerEvent)
  private handleMouseDown(e: MouseEvent): void {
    const position = this.getScreenPosition(e);
    this.lastPosition.set(0, position);

    const event: PointerDownEvent = {
      type: 'pointer.down',
      timestamp: e.timeStamp,
      screenPosition: position,
      source: 'mouse',
      modifiers: extractModifiers(e),
      handled: false,
      preventDefault: () => {
        event.handled = true;
        if (this.config.preventDefault) e.preventDefault();
        if (this.config.stopPropagation) e.stopPropagation();
      },
      button: mapMouseButton(e.button),
      pointerId: 0,
      pressure: 0.5,
      tiltX: 0,
      tiltY: 0,
    };

    this.emit(event);
  }

  private handleMouseMove(e: MouseEvent): void {
    const position = this.getScreenPosition(e);
    const lastPos = this.lastPosition.get(0) ?? position;
    const delta: Point2D = {
      x: position.x - lastPos.x,
      y: position.y - lastPos.y,
    };
    this.lastPosition.set(0, position);

    const event: PointerMoveEvent = {
      type: 'pointer.move',
      timestamp: e.timeStamp,
      screenPosition: position,
      source: 'mouse',
      modifiers: extractModifiers(e),
      handled: false,
      preventDefault: () => {
        event.handled = true;
        if (this.config.preventDefault) e.preventDefault();
        if (this.config.stopPropagation) e.stopPropagation();
      },
      pointerId: 0,
      buttons: getButtonsHeld(e.buttons),
      delta,
      pressure: e.buttons > 0 ? 0.5 : 0,
    };

    this.emit(event);
  }

  private handleMouseUp(e: MouseEvent): void {
    const position = this.getScreenPosition(e);

    const event: PointerUpEvent = {
      type: 'pointer.up',
      timestamp: e.timeStamp,
      screenPosition: position,
      source: 'mouse',
      modifiers: extractModifiers(e),
      handled: false,
      preventDefault: () => {
        event.handled = true;
        if (this.config.preventDefault) e.preventDefault();
        if (this.config.stopPropagation) e.stopPropagation();
      },
      button: mapMouseButton(e.button),
      pointerId: 0,
    };

    this.emit(event);
  }

  private handleMouseEnter(e: MouseEvent): void {
    const position = this.getScreenPosition(e);

    const event: PointerEnterEvent = {
      type: 'pointer.enter',
      timestamp: e.timeStamp,
      screenPosition: position,
      source: 'mouse',
      modifiers: extractModifiers(e),
      handled: false,
      preventDefault: () => {
        event.handled = true;
      },
      pointerId: 0,
    };

    this.emit(event);
  }

  private handleMouseLeave(e: MouseEvent): void {
    const position = this.getScreenPosition(e);

    const event: PointerLeaveEvent = {
      type: 'pointer.leave',
      timestamp: e.timeStamp,
      screenPosition: position,
      source: 'mouse',
      modifiers: extractModifiers(e),
      handled: false,
      preventDefault: () => {
        event.handled = true;
      },
      pointerId: 0,
    };

    this.emit(event);
  }

  private handleWheel(e: globalThis.WheelEvent): void {
    const position = this.getScreenPosition(e);

    const deltaMode: 'pixel' | 'line' | 'page' =
      e.deltaMode === 0 ? 'pixel' : e.deltaMode === 1 ? 'line' : 'page';

    const event: InputWheelEvent = {
      type: 'wheel',
      timestamp: e.timeStamp,
      screenPosition: position,
      source: getInputSource(e),
      modifiers: extractModifiers(e),
      handled: false,
      preventDefault: () => {
        event.handled = true;
        if (this.config.preventDefault) e.preventDefault();
        if (this.config.stopPropagation) e.stopPropagation();
      },
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      deltaZ: e.deltaZ,
      deltaMode,
    };

    this.emit(event);
  }
}

/**
 * Create a pointer adapter for an element
 */
export function createPointerAdapter(
  target: HTMLElement,
  config?: InputAdapterConfig
): PointerAdapter {
  return new PointerAdapter(target, config);
}
