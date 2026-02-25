/**
 * Touch Adapter
 *
 * Handles touch events and gesture recognition.
 * Builds on the PointerAdapter with gesture interpretation.
 *
 * @module canvas/core/input
 * @layer L4A-1
 */

import { createGestureInterpreter } from './gesture-interpreter';
import type { GestureConfig , GestureInterpreter} from './gesture-interpreter';
import type { InputAdapterConfig } from './input-adapter';
import type { PointerDownEvent, PointerMoveEvent, PointerUpEvent, PointerCancelEvent } from './input-event';
import { PointerAdapter } from './pointer-adapter';

/**
 * Touch adapter configuration
 */
export interface TouchAdapterConfig extends InputAdapterConfig {
  /** Gesture recognition config */
  gesture?: Partial<GestureConfig>;
  /** Enable gesture recognition */
  enableGestures?: boolean;
}

/**
 * Touch adapter
 *
 * Extends PointerAdapter with gesture recognition for multi-touch.
 */
export class TouchAdapter extends PointerAdapter {
  private gestureInterpreter: GestureInterpreter | null = null;
  private touchConfig: TouchAdapterConfig;
  private gestureUnsubscribe: (() => void) | null = null;

  constructor(target: HTMLElement, config: TouchAdapterConfig = {}) {
    super(target, config);
    this.touchConfig = {
      enableGestures: true,
      ...config,
    };

    if (this.touchConfig.enableGestures) {
      this.gestureInterpreter = createGestureInterpreter(config.gesture);
    }
  }

  attach(): void {
    super.attach();

    // Connect gesture interpreter to pointer events
    if (this.gestureInterpreter) {
      // Forward pointer events to gesture interpreter
      this.on('pointer.down', (event) => {
        this.gestureInterpreter!.handlePointerDown(event as PointerDownEvent);
      });
      this.on('pointer.move', (event) => {
        this.gestureInterpreter!.handlePointerMove(event as PointerMoveEvent);
      });
      this.on('pointer.up', (event) => {
        this.gestureInterpreter!.handlePointerUp(event as PointerUpEvent);
      });
      this.on('pointer.cancel', (event) => {
        this.gestureInterpreter!.handlePointerCancel(event as PointerCancelEvent);
      });

      // Forward gesture events
      this.gestureUnsubscribe = this.gestureInterpreter.onGesture((event) => {
        this.emit(event);
      });
    }
  }

  detach(): void {
    if (this.gestureUnsubscribe) {
      this.gestureUnsubscribe();
      this.gestureUnsubscribe = null;
    }

    if (this.gestureInterpreter) {
      this.gestureInterpreter.reset();
    }

    super.detach();
  }

  dispose(): void {
    this.gestureInterpreter = null;
    super.dispose();
  }
}

/**
 * Create a touch adapter for an element
 */
export function createTouchAdapter(
  target: HTMLElement,
  config?: TouchAdapterConfig
): TouchAdapter {
  return new TouchAdapter(target, config);
}
