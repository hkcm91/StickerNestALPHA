/**
 * Input Adapter Interface
 *
 * Defines the contract for input adapters that normalize
 * platform-specific input events.
 *
 * @module canvas/core/input
 * @layer L4A-1
 */

import type { InputEvent, InputEventType } from './input-event';

/**
 * Input event handler function
 */
export type InputEventHandler = (event: InputEvent) => void;

/**
 * Input adapter interface
 *
 * Adapters listen to DOM events on a target element and
 * emit normalized input events to registered handlers.
 */
export interface InputAdapter {
  /**
   * Start listening for input events on the target element
   */
  attach(): void;

  /**
   * Stop listening for input events
   */
  detach(): void;

  /**
   * Check if the adapter is attached
   */
  isAttached(): boolean;

  /**
   * Register a handler for input events
   *
   * @param type - Event type to listen for, or '*' for all events
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  on(type: InputEventType | '*', handler: InputEventHandler): () => void;

  /**
   * Remove a handler
   *
   * @param type - Event type
   * @param handler - Handler function to remove
   */
  off(type: InputEventType | '*', handler: InputEventHandler): void;

  /**
   * Emit an event to all registered handlers
   *
   * @param event - The event to emit
   */
  emit(event: InputEvent): void;

  /**
   * Dispose of the adapter and clean up resources
   */
  dispose(): void;
}

/**
 * Base input adapter implementation
 *
 * Provides event registration and emission logic.
 * Subclasses implement the attach/detach methods for specific input types.
 */
export abstract class BaseInputAdapter implements InputAdapter {
  protected target: HTMLElement;
  protected attached = false;
  protected handlers = new Map<string, Set<InputEventHandler>>();

  constructor(target: HTMLElement) {
    this.target = target;
  }

  abstract attach(): void;
  abstract detach(): void;

  isAttached(): boolean {
    return this.attached;
  }

  on(type: InputEventType | '*', handler: InputEventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => this.off(type, handler);
  }

  off(type: InputEventType | '*', handler: InputEventHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(event: InputEvent): void {
    // Call specific handlers
    const specificHandlers = this.handlers.get(event.type);
    if (specificHandlers) {
      for (const handler of specificHandlers) {
        if (!event.handled) {
          handler(event);
        }
      }
    }

    // Call wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        if (!event.handled) {
          handler(event);
        }
      }
    }
  }

  dispose(): void {
    this.detach();
    this.handlers.clear();
  }
}

/**
 * Input adapter configuration
 */
export interface InputAdapterConfig {
  /** Whether to prevent default browser behavior for handled events */
  preventDefault?: boolean;
  /** Whether to stop propagation for handled events */
  stopPropagation?: boolean;
  /** Enable touch events */
  enableTouch?: boolean;
  /** Enable mouse events */
  enableMouse?: boolean;
  /** Enable pointer events (preferred over mouse/touch when available) */
  enablePointer?: boolean;
  /** Enable keyboard events */
  enableKeyboard?: boolean;
  /** Enable wheel events */
  enableWheel?: boolean;
}

/**
 * Default input adapter configuration
 */
export const DEFAULT_INPUT_CONFIG: Required<InputAdapterConfig> = {
  preventDefault: true,
  stopPropagation: false,
  enableTouch: true,
  enableMouse: true,
  enablePointer: true,
  enableKeyboard: true,
  enableWheel: true,
};
