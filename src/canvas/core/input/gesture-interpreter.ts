/**
 * Gesture Interpreter
 *
 * Interprets touch/pointer events as higher-level gestures:
 * pinch, pan, double-tap, long-press, swipe.
 *
 * @module canvas/core/input
 * @layer L4A-1
 */

import type { Point2D } from '@sn/types';

import type {
  PointerDownEvent,
  PointerMoveEvent,
  PointerUpEvent,
  PointerCancelEvent,
  GesturePinchEvent,
  GesturePanEvent,
  GestureDoubleTapEvent,
  GestureLongPressEvent,
  GestureSwipeEvent,
  GestureState,
  GestureEvent,
} from './input-event';
import { createDefaultModifiers } from './input-event';

/**
 * Active touch/pointer tracking
 */
interface ActivePointer {
  pointerId: number;
  startPosition: Point2D;
  currentPosition: Point2D;
  startTime: number;
}

/**
 * Gesture interpreter configuration
 */
export interface GestureConfig {
  /** Minimum distance to recognize a swipe (pixels) */
  swipeThreshold: number;
  /** Maximum time for a tap (ms) */
  tapTimeout: number;
  /** Maximum time between taps for double-tap (ms) */
  doubleTapTimeout: number;
  /** Minimum time for long-press (ms) */
  longPressTimeout: number;
  /** Minimum scale change to recognize pinch */
  pinchThreshold: number;
  /** Minimum distance to recognize pan (pixels) */
  panThreshold: number;
}

/**
 * Default gesture configuration
 */
export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  swipeThreshold: 50,
  tapTimeout: 300,
  doubleTapTimeout: 300,
  longPressTimeout: 500,
  pinchThreshold: 0.05,
  panThreshold: 10,
};

/**
 * Gesture event handler
 */
export type GestureEventHandler = (event: GestureEvent) => void;

/**
 * Gesture interpreter
 *
 * Processes pointer events and emits gesture events.
 */
export class GestureInterpreter {
  private config: GestureConfig;
  private activePointers = new Map<number, ActivePointer>();
  private handlers = new Set<GestureEventHandler>();

  // Tap tracking
  private lastTapTime = 0;
  private lastTapPosition: Point2D | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  // Gesture state
  private gestureState: 'idle' | 'pan' | 'pinch' = 'idle';
  private initialPinchDistance = 0;
  private initialPinchAngle = 0;
  private lastPinchScale = 1;
  private lastPinchRotation = 0;
  private panStartPosition: Point2D | null = null;
  private lastPanPosition: Point2D | null = null;
  private lastPanTimestamp = 0;
  private panVelocity: Point2D = { x: 0, y: 0 };

  constructor(config: Partial<GestureConfig> = {}) {
    this.config = { ...DEFAULT_GESTURE_CONFIG, ...config };
  }

  /**
   * Register a gesture event handler
   */
  onGesture(handler: GestureEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Emit a gesture event to all handlers
   */
  private emit(event: GestureEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  /**
   * Process a pointer down event
   */
  handlePointerDown(event: PointerDownEvent): void {
    const pointer: ActivePointer = {
      pointerId: event.pointerId,
      startPosition: { ...event.screenPosition },
      currentPosition: { ...event.screenPosition },
      startTime: event.timestamp,
    };

    this.activePointers.set(event.pointerId, pointer);

    // Start long-press timer for single touch
    if (this.activePointers.size === 1) {
      this.startLongPressTimer(event);
    }

    // Check for pinch start
    if (this.activePointers.size === 2) {
      this.cancelLongPressTimer();
      this.startPinchGesture();
    }
  }

  /**
   * Process a pointer move event
   */
  handlePointerMove(event: PointerMoveEvent): void {
    const pointer = this.activePointers.get(event.pointerId);
    if (!pointer) return;

    pointer.currentPosition = { ...event.screenPosition };

    // Cancel long-press if moved too far
    const moveDistance = this.distance(pointer.startPosition, pointer.currentPosition);
    if (moveDistance > this.config.panThreshold) {
      this.cancelLongPressTimer();
    }

    // Handle active gestures
    if (this.activePointers.size === 2) {
      this.updatePinchGesture(event.timestamp);
    } else if (this.activePointers.size === 1 && this.gestureState === 'pan') {
      this.updatePanGesture(event);
    } else if (
      this.activePointers.size === 1 &&
      this.gestureState === 'idle' &&
      moveDistance > this.config.panThreshold
    ) {
      // Start pan gesture
      this.startPanGesture(event);
    }
  }

  /**
   * Process a pointer up event
   */
  handlePointerUp(event: PointerUpEvent): void {
    const pointer = this.activePointers.get(event.pointerId);
    if (!pointer) return;

    this.cancelLongPressTimer();

    // Check for tap
    const duration = event.timestamp - pointer.startTime;
    const moveDistance = this.distance(pointer.startPosition, event.screenPosition);

    if (duration < this.config.tapTimeout && moveDistance < this.config.panThreshold) {
      this.handleTap(event);
    }

    // End gestures
    if (this.activePointers.size === 2) {
      this.endPinchGesture(event.timestamp);
    } else if (this.gestureState === 'pan') {
      this.endPanGesture(event);
    }

    this.activePointers.delete(event.pointerId);

    // Reset state when no pointers active
    if (this.activePointers.size === 0) {
      this.gestureState = 'idle';
    }
  }

  /**
   * Process a pointer cancel event
   */
  handlePointerCancel(event: PointerCancelEvent): void {
    this.cancelLongPressTimer();

    if (this.activePointers.size === 2) {
      this.cancelPinchGesture(event.timestamp);
    } else if (this.gestureState === 'pan') {
      this.cancelPanGesture(event);
    }

    this.activePointers.delete(event.pointerId);

    if (this.activePointers.size === 0) {
      this.gestureState = 'idle';
    }
  }

  /**
   * Clear all state
   */
  reset(): void {
    this.cancelLongPressTimer();
    this.activePointers.clear();
    this.gestureState = 'idle';
    this.lastTapTime = 0;
    this.lastTapPosition = null;
  }

  // ==========================================================================
  // Private methods
  // ==========================================================================

  private distance(p1: Point2D, p2: Point2D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private angle(p1: Point2D, p2: Point2D): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  private midpoint(p1: Point2D, p2: Point2D): Point2D {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  }

  private startLongPressTimer(event: PointerDownEvent): void {
    this.cancelLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      const pointer = this.activePointers.get(event.pointerId);
      if (pointer && this.activePointers.size === 1) {
        const moveDistance = this.distance(pointer.startPosition, pointer.currentPosition);
        if (moveDistance < this.config.panThreshold) {
          this.emitLongPress(event);
        }
      }
    }, this.config.longPressTimeout);
  }

  private cancelLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private emitLongPress(event: PointerDownEvent): void {
    const pointer = this.activePointers.get(event.pointerId);
    if (!pointer) return;

    const gestureEvent: GestureLongPressEvent = {
      type: 'gesture.longpress',
      timestamp: Date.now(),
      screenPosition: pointer.currentPosition,
      source: event.source,
      modifiers: createDefaultModifiers(),
      handled: false,
      preventDefault: () => {
        gestureEvent.handled = true;
      },
      position: pointer.currentPosition,
      duration: this.config.longPressTimeout,
    };

    this.emit(gestureEvent);
  }

  private handleTap(event: PointerUpEvent): void {
    const now = event.timestamp;
    const position = event.screenPosition;

    // Check for double-tap
    if (
      this.lastTapPosition &&
      now - this.lastTapTime < this.config.doubleTapTimeout &&
      this.distance(position, this.lastTapPosition) < this.config.panThreshold
    ) {
      this.emitDoubleTap(event);
      this.lastTapTime = 0;
      this.lastTapPosition = null;
    } else {
      // Record tap for potential double-tap
      this.lastTapTime = now;
      this.lastTapPosition = { ...position };
    }
  }

  private emitDoubleTap(event: PointerUpEvent): void {
    const gestureEvent: GestureDoubleTapEvent = {
      type: 'gesture.doubletap',
      timestamp: event.timestamp,
      screenPosition: event.screenPosition,
      source: event.source,
      modifiers: event.modifiers,
      handled: false,
      preventDefault: () => {
        gestureEvent.handled = true;
      },
      position: event.screenPosition,
      tapCount: 2,
    };

    this.emit(gestureEvent);
  }

  private startPinchGesture(): void {
    if (this.activePointers.size !== 2) return;

    this.gestureState = 'pinch';
    const [p1, p2] = Array.from(this.activePointers.values());
    this.initialPinchDistance = this.distance(p1.currentPosition, p2.currentPosition);
    this.initialPinchAngle = this.angle(p1.currentPosition, p2.currentPosition);
    this.lastPinchScale = 1;
    this.lastPinchRotation = 0;

    this.emitPinchEvent('start', 1, 0, 0);
  }

  private updatePinchGesture(_timestamp: number): void {
    if (this.activePointers.size !== 2) return;

    const [p1, p2] = Array.from(this.activePointers.values());
    const currentDistance = this.distance(p1.currentPosition, p2.currentPosition);
    const scale = currentDistance / this.initialPinchDistance;
    const scaleDelta = scale - this.lastPinchScale;
    this.lastPinchScale = scale;

    const currentAngle = this.angle(p1.currentPosition, p2.currentPosition);
    const rotation = currentAngle - this.initialPinchAngle;
    this.lastPinchRotation = rotation;

    if (Math.abs(scale - 1) > this.config.pinchThreshold) {
      this.emitPinchEvent('update', scale, scaleDelta, rotation);
    }
  }

  private endPinchGesture(_timestamp: number): void {
    this.emitPinchEvent('end', this.lastPinchScale, 0, this.lastPinchRotation);
    this.gestureState = 'idle';
  }

  private cancelPinchGesture(_timestamp: number): void {
    this.emitPinchEvent('cancel', this.lastPinchScale, 0, this.lastPinchRotation);
    this.gestureState = 'idle';
  }

  private emitPinchEvent(state: GestureState, scale: number, scaleDelta: number, rotation: number): void {
    if (this.activePointers.size < 2) return;

    const [p1, p2] = Array.from(this.activePointers.values());
    const center = this.midpoint(p1.currentPosition, p2.currentPosition);

    const event: GesturePinchEvent = {
      type: 'gesture.pinch',
      timestamp: Date.now(),
      screenPosition: center,
      source: 'touch',
      modifiers: createDefaultModifiers(),
      handled: false,
      preventDefault: () => {
        event.handled = true;
      },
      state,
      scale,
      scaleDelta,
      center,
      rotation,
    };

    this.emit(event);
  }

  private startPanGesture(event: PointerMoveEvent): void {
    const pointer = this.activePointers.get(event.pointerId);
    if (!pointer) return;

    this.gestureState = 'pan';
    this.panStartPosition = { ...pointer.startPosition };
    this.lastPanPosition = { ...pointer.startPosition };
    this.lastPanTimestamp = event.timestamp;
    this.panVelocity = { x: 0, y: 0 };

    this.emitPanEvent('start', event);
  }

  private updatePanGesture(event: PointerMoveEvent): void {
    // Calculate instantaneous velocity (pixels per second) with EMA smoothing
    if (this.lastPanPosition && this.lastPanTimestamp > 0) {
      const dt = (event.timestamp - this.lastPanTimestamp) / 1000; // seconds
      if (dt > 0) {
        const vx = (event.screenPosition.x - this.lastPanPosition.x) / dt;
        const vy = (event.screenPosition.y - this.lastPanPosition.y) / dt;
        // Exponential moving average (alpha = 0.4) for smooth velocity
        const alpha = 0.4;
        this.panVelocity = {
          x: alpha * vx + (1 - alpha) * this.panVelocity.x,
          y: alpha * vy + (1 - alpha) * this.panVelocity.y,
        };
      }
    }

    this.emitPanEvent('update', event);
    this.lastPanPosition = { ...event.screenPosition };
    this.lastPanTimestamp = event.timestamp;
  }

  private endPanGesture(event: PointerUpEvent): void {
    // Check for swipe
    const pointer = this.activePointers.get(event.pointerId);
    if (pointer) {
      const dx = event.screenPosition.x - pointer.startPosition.x;
      const dy = event.screenPosition.y - pointer.startPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = event.timestamp - pointer.startTime;

      if (distance > this.config.swipeThreshold) {
        this.emitSwipe(event, pointer, dx, dy, duration);
      }
    }

    this.emitPanEndEvent('end', event);
    this.gestureState = 'idle';
    this.panStartPosition = null;
    this.lastPanPosition = null;
  }

  private cancelPanGesture(event: PointerCancelEvent): void {
    this.emitPanCancelEvent('cancel', event);
    this.gestureState = 'idle';
    this.panStartPosition = null;
    this.lastPanPosition = null;
  }

  private emitPanEvent(state: GestureState, event: PointerMoveEvent): void {
    if (!this.panStartPosition || !this.lastPanPosition) return;

    const translation: Point2D = {
      x: event.screenPosition.x - this.panStartPosition.x,
      y: event.screenPosition.y - this.panStartPosition.y,
    };

    const translationDelta: Point2D = {
      x: event.screenPosition.x - this.lastPanPosition.x,
      y: event.screenPosition.y - this.lastPanPosition.y,
    };

    const panEvent: GesturePanEvent = {
      type: 'gesture.pan',
      timestamp: event.timestamp,
      screenPosition: event.screenPosition,
      source: event.source,
      modifiers: event.modifiers,
      handled: false,
      preventDefault: () => {
        panEvent.handled = true;
      },
      state,
      translation,
      translationDelta,
      velocity: { ...this.panVelocity },
    };

    this.emit(panEvent);
  }

  private emitPanEndEvent(state: GestureState, event: PointerUpEvent): void {
    if (!this.panStartPosition || !this.lastPanPosition) return;

    const translation: Point2D = {
      x: event.screenPosition.x - this.panStartPosition.x,
      y: event.screenPosition.y - this.panStartPosition.y,
    };

    const panEvent: GesturePanEvent = {
      type: 'gesture.pan',
      timestamp: event.timestamp,
      screenPosition: event.screenPosition,
      source: event.source,
      modifiers: event.modifiers,
      handled: false,
      preventDefault: () => {
        panEvent.handled = true;
      },
      state,
      translation,
      translationDelta: { x: 0, y: 0 },
      velocity: { ...this.panVelocity },
    };

    this.emit(panEvent);
  }

  private emitPanCancelEvent(state: GestureState, event: PointerCancelEvent): void {
    if (!this.panStartPosition) return;

    const panEvent: GesturePanEvent = {
      type: 'gesture.pan',
      timestamp: event.timestamp,
      screenPosition: event.screenPosition,
      source: event.source,
      modifiers: event.modifiers,
      handled: false,
      preventDefault: () => {
        panEvent.handled = true;
      },
      state,
      translation: { x: 0, y: 0 },
      translationDelta: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
    };

    this.emit(panEvent);
  }

  private emitSwipe(
    event: PointerUpEvent,
    pointer: ActivePointer,
    dx: number,
    dy: number,
    duration: number
  ): void {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let direction: 'up' | 'down' | 'left' | 'right';
    if (absDx > absDy) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }

    const velocity: Point2D = {
      x: dx / duration * 1000,
      y: dy / duration * 1000,
    };

    const swipeEvent: GestureSwipeEvent = {
      type: 'gesture.swipe',
      timestamp: event.timestamp,
      screenPosition: event.screenPosition,
      source: event.source,
      modifiers: event.modifiers,
      handled: false,
      preventDefault: () => {
        swipeEvent.handled = true;
      },
      direction,
      velocity,
      startPosition: pointer.startPosition,
      endPosition: event.screenPosition,
    };

    this.emit(swipeEvent);
  }
}

/**
 * Create a gesture interpreter
 */
export function createGestureInterpreter(config?: Partial<GestureConfig>): GestureInterpreter {
  return new GestureInterpreter(config);
}
