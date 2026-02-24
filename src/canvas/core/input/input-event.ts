/**
 * Normalized Input Events
 *
 * Platform-agnostic input event types that abstract away
 * the differences between mouse, touch, and pen input.
 *
 * @module canvas/core/input
 * @layer L4A-1
 */

import { z } from 'zod';

import type { Point2D } from '@sn/types';

/**
 * Input source type
 */
export type InputSource = 'mouse' | 'touch' | 'pen' | 'unknown';

/**
 * Pointer button
 */
export type PointerButton = 'primary' | 'secondary' | 'middle' | 'none';

/**
 * Modifier keys state
 */
export interface ModifierKeys {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
}

/**
 * Base input event with common properties
 */
export interface BaseInputEvent {
  /** Event type */
  type: string;
  /** Timestamp when event occurred */
  timestamp: number;
  /** Screen-space position */
  screenPosition: Point2D;
  /** Canvas-space position (if viewport known) */
  canvasPosition?: Point2D;
  /** Input source */
  source: InputSource;
  /** Modifier keys */
  modifiers: ModifierKeys;
  /** Whether the event has been handled */
  handled: boolean;
  /** Prevent further handling */
  preventDefault(): void;
}

// =============================================================================
// Pointer Events
// =============================================================================

/**
 * Pointer down event
 */
export interface PointerDownEvent extends BaseInputEvent {
  type: 'pointer.down';
  /** Which button was pressed */
  button: PointerButton;
  /** Pointer ID for multi-touch */
  pointerId: number;
  /** Pressure (0-1, for stylus/touch) */
  pressure: number;
  /** Tilt angle in degrees (for stylus) */
  tiltX: number;
  tiltY: number;
}

/**
 * Pointer move event
 */
export interface PointerMoveEvent extends BaseInputEvent {
  type: 'pointer.move';
  /** Pointer ID for multi-touch */
  pointerId: number;
  /** Current buttons held */
  buttons: PointerButton[];
  /** Movement delta since last event */
  delta: Point2D;
  /** Pressure (0-1, for stylus/touch) */
  pressure: number;
}

/**
 * Pointer up event
 */
export interface PointerUpEvent extends BaseInputEvent {
  type: 'pointer.up';
  /** Which button was released */
  button: PointerButton;
  /** Pointer ID for multi-touch */
  pointerId: number;
}

/**
 * Pointer cancel event (e.g., touch cancelled)
 */
export interface PointerCancelEvent extends BaseInputEvent {
  type: 'pointer.cancel';
  /** Pointer ID for multi-touch */
  pointerId: number;
  /** Reason for cancellation */
  reason?: string;
}

/**
 * Pointer enter event (enters canvas area)
 */
export interface PointerEnterEvent extends BaseInputEvent {
  type: 'pointer.enter';
  /** Pointer ID */
  pointerId: number;
}

/**
 * Pointer leave event (leaves canvas area)
 */
export interface PointerLeaveEvent extends BaseInputEvent {
  type: 'pointer.leave';
  /** Pointer ID */
  pointerId: number;
}

/**
 * Wheel/scroll event
 */
export interface WheelEvent extends BaseInputEvent {
  type: 'wheel';
  /** Scroll delta */
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  /** Delta mode (pixel, line, page) */
  deltaMode: 'pixel' | 'line' | 'page';
}

// =============================================================================
// Gesture Events
// =============================================================================

/**
 * Pinch gesture state
 */
export type GestureState = 'start' | 'update' | 'end' | 'cancel';

/**
 * Pinch/zoom gesture event
 */
export interface GesturePinchEvent extends BaseInputEvent {
  type: 'gesture.pinch';
  /** Gesture state */
  state: GestureState;
  /** Scale factor (1.0 = no change) */
  scale: number;
  /** Scale delta since last event */
  scaleDelta: number;
  /** Center point of the pinch */
  center: Point2D;
  /** Rotation in degrees (for two-finger rotation) */
  rotation: number;
}

/**
 * Pan gesture event (two-finger pan)
 */
export interface GesturePanEvent extends BaseInputEvent {
  type: 'gesture.pan';
  /** Gesture state */
  state: GestureState;
  /** Pan delta since start */
  translation: Point2D;
  /** Pan delta since last event */
  translationDelta: Point2D;
  /** Velocity of pan */
  velocity: Point2D;
}

/**
 * Double-tap gesture event
 */
export interface GestureDoubleTapEvent extends BaseInputEvent {
  type: 'gesture.doubletap';
  /** Tap position */
  position: Point2D;
  /** Number of taps (usually 2) */
  tapCount: number;
}

/**
 * Long-press gesture event
 */
export interface GestureLongPressEvent extends BaseInputEvent {
  type: 'gesture.longpress';
  /** Press position */
  position: Point2D;
  /** Press duration in milliseconds */
  duration: number;
}

/**
 * Swipe gesture event
 */
export interface GestureSwipeEvent extends BaseInputEvent {
  type: 'gesture.swipe';
  /** Swipe direction */
  direction: 'up' | 'down' | 'left' | 'right';
  /** Swipe velocity */
  velocity: Point2D;
  /** Start position */
  startPosition: Point2D;
  /** End position */
  endPosition: Point2D;
}

// =============================================================================
// Union Types
// =============================================================================

/**
 * All pointer event types
 */
export type PointerEvent =
  | PointerDownEvent
  | PointerMoveEvent
  | PointerUpEvent
  | PointerCancelEvent
  | PointerEnterEvent
  | PointerLeaveEvent;

/**
 * All gesture event types
 */
export type GestureEvent =
  | GesturePinchEvent
  | GesturePanEvent
  | GestureDoubleTapEvent
  | GestureLongPressEvent
  | GestureSwipeEvent;

/**
 * All input event types
 */
export type InputEvent = PointerEvent | GestureEvent | WheelEvent;

/**
 * Input event type string
 */
export type InputEventType = InputEvent['type'];

// =============================================================================
// Zod Schemas (for validation)
// =============================================================================

export const ModifierKeysSchema = z.object({
  shift: z.boolean(),
  ctrl: z.boolean(),
  alt: z.boolean(),
  meta: z.boolean(),
});

export const InputSourceSchema = z.enum(['mouse', 'touch', 'pen', 'unknown']);

export const PointerButtonSchema = z.enum(['primary', 'secondary', 'middle', 'none']);

export const GestureStateSchema = z.enum(['start', 'update', 'end', 'cancel']);

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create default modifier keys
 */
export function createDefaultModifiers(): ModifierKeys {
  return {
    shift: false,
    ctrl: false,
    alt: false,
    meta: false,
  };
}

/**
 * Extract modifier keys from a DOM event
 */
export function extractModifiers(event: MouseEvent | TouchEvent | KeyboardEvent): ModifierKeys {
  return {
    shift: event.shiftKey,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    meta: event.metaKey,
  };
}

/**
 * Determine input source from a DOM event
 */
export function getInputSource(event: Event): InputSource {
  if (event instanceof MouseEvent && !(event instanceof window.PointerEvent)) {
    return 'mouse';
  }
  if ('pointerType' in event) {
    const pointerEvent = event as globalThis.PointerEvent;
    switch (pointerEvent.pointerType) {
      case 'mouse':
        return 'mouse';
      case 'touch':
        return 'touch';
      case 'pen':
        return 'pen';
      default:
        return 'unknown';
    }
  }
  if (event instanceof TouchEvent) {
    return 'touch';
  }
  return 'unknown';
}

/**
 * Map mouse button number to PointerButton
 */
export function mapMouseButton(button: number): PointerButton {
  switch (button) {
    case 0:
      return 'primary';
    case 1:
      return 'middle';
    case 2:
      return 'secondary';
    default:
      return 'none';
  }
}

/**
 * Get buttons held from buttons bitmask
 */
export function getButtonsHeld(buttons: number): PointerButton[] {
  const held: PointerButton[] = [];
  if (buttons & 1) held.push('primary');
  if (buttons & 2) held.push('secondary');
  if (buttons & 4) held.push('middle');
  return held;
}
