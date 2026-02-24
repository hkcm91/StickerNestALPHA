/**
 * Input Module
 *
 * Provides normalized input handling for canvas interactions.
 * Abstracts mouse, touch, and pen input into a unified event system.
 *
 * @module canvas/core/input
 * @layer L4A-1
 */

// Input event types
export type {
  InputSource,
  PointerButton,
  ModifierKeys,
  BaseInputEvent,
  PointerDownEvent,
  PointerMoveEvent,
  PointerUpEvent,
  PointerCancelEvent,
  PointerEnterEvent,
  PointerLeaveEvent,
  WheelEvent,
  GestureState,
  GesturePinchEvent,
  GesturePanEvent,
  GestureDoubleTapEvent,
  GestureLongPressEvent,
  GestureSwipeEvent,
  PointerEvent,
  GestureEvent,
  InputEvent,
  InputEventType,
} from './input-event';

export {
  ModifierKeysSchema,
  InputSourceSchema,
  PointerButtonSchema,
  GestureStateSchema,
  createDefaultModifiers,
  extractModifiers,
  getInputSource,
  mapMouseButton,
  getButtonsHeld,
} from './input-event';

// Input adapter
export type { InputEventHandler, InputAdapter, InputAdapterConfig } from './input-adapter';
export { BaseInputAdapter, DEFAULT_INPUT_CONFIG } from './input-adapter';

// Pointer adapter
export { PointerAdapter, createPointerAdapter } from './pointer-adapter';

// Gesture interpreter
export type { GestureConfig, GestureEventHandler } from './gesture-interpreter';
export { GestureInterpreter, createGestureInterpreter, DEFAULT_GESTURE_CONFIG } from './gesture-interpreter';

// Touch adapter
export type { TouchAdapterConfig } from './touch-adapter';
export { TouchAdapter, createTouchAdapter } from './touch-adapter';
