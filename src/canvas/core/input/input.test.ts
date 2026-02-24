/**
 * Input Module Tests
 *
 * Tests for normalized input handling, adapters, and gesture recognition.
 *
 * @module canvas/core/input
 * @layer L4A-1
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GestureInterpreter, createGestureInterpreter, DEFAULT_GESTURE_CONFIG } from './gesture-interpreter';
import { BaseInputAdapter, DEFAULT_INPUT_CONFIG } from './input-adapter';
import type { InputAdapterConfig } from './input-adapter';
import {
  createDefaultModifiers,
  extractModifiers,
  getInputSource,
  mapMouseButton,
  getButtonsHeld,
  ModifierKeysSchema,
  InputSourceSchema,
  PointerButtonSchema,
  GestureStateSchema,
} from './input-event';
import type { InputEvent, PointerDownEvent, PointerMoveEvent, PointerUpEvent } from './input-event';
import { PointerAdapter, createPointerAdapter } from './pointer-adapter';
import { TouchAdapter, createTouchAdapter } from './touch-adapter';

// =============================================================================
// Input Event Tests
// =============================================================================

describe('input-event', () => {
  describe('createDefaultModifiers', () => {
    it('creates modifiers with all values false', () => {
      const modifiers = createDefaultModifiers();
      expect(modifiers.shift).toBe(false);
      expect(modifiers.ctrl).toBe(false);
      expect(modifiers.alt).toBe(false);
      expect(modifiers.meta).toBe(false);
    });
  });

  describe('extractModifiers', () => {
    it('extracts modifier keys from keyboard event', () => {
      const event = {
        shiftKey: true,
        ctrlKey: false,
        altKey: true,
        metaKey: false,
      } as KeyboardEvent;

      const modifiers = extractModifiers(event);
      expect(modifiers.shift).toBe(true);
      expect(modifiers.ctrl).toBe(false);
      expect(modifiers.alt).toBe(true);
      expect(modifiers.meta).toBe(false);
    });

    it('extracts modifier keys from mouse event', () => {
      const event = {
        shiftKey: false,
        ctrlKey: true,
        altKey: false,
        metaKey: true,
      } as MouseEvent;

      const modifiers = extractModifiers(event);
      expect(modifiers.shift).toBe(false);
      expect(modifiers.ctrl).toBe(true);
      expect(modifiers.alt).toBe(false);
      expect(modifiers.meta).toBe(true);
    });
  });

  describe('getInputSource', () => {
    it('returns mouse for pointer events with mouse type', () => {
      const event = new PointerEvent('pointerdown', { pointerType: 'mouse' });
      expect(getInputSource(event)).toBe('mouse');
    });

    it('returns touch for pointer events with touch type', () => {
      const event = new PointerEvent('pointerdown', { pointerType: 'touch' });
      expect(getInputSource(event)).toBe('touch');
    });

    it('returns pen for pointer events with pen type', () => {
      const event = new PointerEvent('pointerdown', { pointerType: 'pen' });
      expect(getInputSource(event)).toBe('pen');
    });

    it('returns unknown for pointer events with unknown type', () => {
      const event = new PointerEvent('pointerdown', { pointerType: '' });
      expect(getInputSource(event)).toBe('unknown');
    });

    it('returns mouse for mouse events', () => {
      const event = new MouseEvent('mousedown');
      expect(getInputSource(event)).toBe('mouse');
    });
  });

  describe('mapMouseButton', () => {
    it('maps button 0 to primary', () => {
      expect(mapMouseButton(0)).toBe('primary');
    });

    it('maps button 1 to middle', () => {
      expect(mapMouseButton(1)).toBe('middle');
    });

    it('maps button 2 to secondary', () => {
      expect(mapMouseButton(2)).toBe('secondary');
    });

    it('maps unknown buttons to none', () => {
      expect(mapMouseButton(3)).toBe('none');
      expect(mapMouseButton(4)).toBe('none');
      expect(mapMouseButton(99)).toBe('none');
    });
  });

  describe('getButtonsHeld', () => {
    it('returns empty array when no buttons held', () => {
      expect(getButtonsHeld(0)).toEqual([]);
    });

    it('returns primary for buttons = 1', () => {
      expect(getButtonsHeld(1)).toEqual(['primary']);
    });

    it('returns secondary for buttons = 2', () => {
      expect(getButtonsHeld(2)).toEqual(['secondary']);
    });

    it('returns middle for buttons = 4', () => {
      expect(getButtonsHeld(4)).toEqual(['middle']);
    });

    it('returns multiple buttons held', () => {
      const buttons = getButtonsHeld(3); // primary (1) + secondary (2)
      expect(buttons).toContain('primary');
      expect(buttons).toContain('secondary');
    });

    it('handles all three standard buttons held', () => {
      const buttons = getButtonsHeld(7); // primary (1) + secondary (2) + middle (4)
      expect(buttons).toContain('primary');
      expect(buttons).toContain('secondary');
      expect(buttons).toContain('middle');
      expect(buttons.length).toBe(3);
    });
  });

  describe('Zod schemas', () => {
    it('validates ModifierKeysSchema', () => {
      const valid = { shift: true, ctrl: false, alt: true, meta: false };
      expect(ModifierKeysSchema.safeParse(valid).success).toBe(true);
    });

    it('validates InputSourceSchema', () => {
      expect(InputSourceSchema.safeParse('mouse').success).toBe(true);
      expect(InputSourceSchema.safeParse('touch').success).toBe(true);
      expect(InputSourceSchema.safeParse('pen').success).toBe(true);
      expect(InputSourceSchema.safeParse('unknown').success).toBe(true);
      expect(InputSourceSchema.safeParse('keyboard').success).toBe(false);
    });

    it('validates PointerButtonSchema', () => {
      expect(PointerButtonSchema.safeParse('primary').success).toBe(true);
      expect(PointerButtonSchema.safeParse('secondary').success).toBe(true);
      expect(PointerButtonSchema.safeParse('middle').success).toBe(true);
      expect(PointerButtonSchema.safeParse('none').success).toBe(true);
      expect(PointerButtonSchema.safeParse('unknown').success).toBe(false);
    });

    it('validates GestureStateSchema', () => {
      expect(GestureStateSchema.safeParse('start').success).toBe(true);
      expect(GestureStateSchema.safeParse('update').success).toBe(true);
      expect(GestureStateSchema.safeParse('end').success).toBe(true);
      expect(GestureStateSchema.safeParse('cancel').success).toBe(true);
      expect(GestureStateSchema.safeParse('invalid').success).toBe(false);
    });
  });
});

// =============================================================================
// Input Adapter Tests
// =============================================================================

describe('input-adapter', () => {
  describe('DEFAULT_INPUT_CONFIG', () => {
    it('has expected default values', () => {
      expect(DEFAULT_INPUT_CONFIG.preventDefault).toBe(true);
      expect(DEFAULT_INPUT_CONFIG.stopPropagation).toBe(false);
      expect(DEFAULT_INPUT_CONFIG.enableTouch).toBe(true);
      expect(DEFAULT_INPUT_CONFIG.enableMouse).toBe(true);
      expect(DEFAULT_INPUT_CONFIG.enablePointer).toBe(true);
      expect(DEFAULT_INPUT_CONFIG.enableKeyboard).toBe(true);
      expect(DEFAULT_INPUT_CONFIG.enableWheel).toBe(true);
    });
  });

  describe('BaseInputAdapter', () => {
    // Create a concrete implementation for testing
    class TestAdapter extends BaseInputAdapter {
      attachCalled = false;
      detachCalled = false;

      attach(): void {
        this.attachCalled = true;
        this.attached = true;
      }

      detach(): void {
        this.detachCalled = true;
        this.attached = false;
      }
    }

    let element: HTMLElement;
    let adapter: TestAdapter;

    beforeEach(() => {
      element = document.createElement('div');
      adapter = new TestAdapter(element);
    });

    afterEach(() => {
      adapter.dispose();
    });

    it('starts unattached', () => {
      expect(adapter.isAttached()).toBe(false);
    });

    it('becomes attached after attach()', () => {
      adapter.attach();
      expect(adapter.isAttached()).toBe(true);
      expect(adapter.attachCalled).toBe(true);
    });

    it('becomes unattached after detach()', () => {
      adapter.attach();
      adapter.detach();
      expect(adapter.isAttached()).toBe(false);
      expect(adapter.detachCalled).toBe(true);
    });

    it('registers and calls handlers', () => {
      const handler = vi.fn();
      adapter.on('pointer.down', handler);

      const event: PointerDownEvent = {
        type: 'pointer.down',
        timestamp: Date.now(),
        screenPosition: { x: 10, y: 20 },
        source: 'mouse',
        modifiers: createDefaultModifiers(),
        handled: false,
        preventDefault: vi.fn(),
        button: 'primary',
        pointerId: 1,
        pressure: 0.5,
        tiltX: 0,
        tiltY: 0,
      };

      adapter.emit(event);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('calls wildcard handlers for all events', () => {
      const handler = vi.fn();
      adapter.on('*', handler);

      const downEvent: PointerDownEvent = {
        type: 'pointer.down',
        timestamp: Date.now(),
        screenPosition: { x: 10, y: 20 },
        source: 'mouse',
        modifiers: createDefaultModifiers(),
        handled: false,
        preventDefault: vi.fn(),
        button: 'primary',
        pointerId: 1,
        pressure: 0.5,
        tiltX: 0,
        tiltY: 0,
      };

      adapter.emit(downEvent);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('removes handlers via unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = adapter.on('pointer.down', handler);

      unsubscribe();

      const event: PointerDownEvent = {
        type: 'pointer.down',
        timestamp: Date.now(),
        screenPosition: { x: 10, y: 20 },
        source: 'mouse',
        modifiers: createDefaultModifiers(),
        handled: false,
        preventDefault: vi.fn(),
        button: 'primary',
        pointerId: 1,
        pressure: 0.5,
        tiltX: 0,
        tiltY: 0,
      };

      adapter.emit(event);
      expect(handler).not.toHaveBeenCalled();
    });

    it('removes handlers via off()', () => {
      const handler = vi.fn();
      adapter.on('pointer.move', handler);
      adapter.off('pointer.move', handler);

      const event: PointerMoveEvent = {
        type: 'pointer.move',
        timestamp: Date.now(),
        screenPosition: { x: 10, y: 20 },
        source: 'mouse',
        modifiers: createDefaultModifiers(),
        handled: false,
        preventDefault: vi.fn(),
        pointerId: 1,
        buttons: [],
        delta: { x: 5, y: 5 },
        pressure: 0.5,
      };

      adapter.emit(event);
      expect(handler).not.toHaveBeenCalled();
    });

    it('stops calling handlers after event is handled', () => {
      const handler1 = vi.fn((event: InputEvent) => {
        event.handled = true;
      });
      const handler2 = vi.fn();

      adapter.on('pointer.down', handler1);
      adapter.on('pointer.down', handler2);

      const event: PointerDownEvent = {
        type: 'pointer.down',
        timestamp: Date.now(),
        screenPosition: { x: 10, y: 20 },
        source: 'mouse',
        modifiers: createDefaultModifiers(),
        handled: false,
        preventDefault: vi.fn(),
        button: 'primary',
        pointerId: 1,
        pressure: 0.5,
        tiltX: 0,
        tiltY: 0,
      };

      adapter.emit(event);
      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('dispose calls detach and clears handlers', () => {
      const handler = vi.fn();
      adapter.on('pointer.down', handler);
      adapter.attach();

      adapter.dispose();

      expect(adapter.isAttached()).toBe(false);

      // Emitting after dispose should not call handler
      const event: PointerDownEvent = {
        type: 'pointer.down',
        timestamp: Date.now(),
        screenPosition: { x: 10, y: 20 },
        source: 'mouse',
        modifiers: createDefaultModifiers(),
        handled: false,
        preventDefault: vi.fn(),
        button: 'primary',
        pointerId: 1,
        pressure: 0.5,
        tiltX: 0,
        tiltY: 0,
      };

      adapter.emit(event);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Pointer Adapter Tests
// =============================================================================

describe('pointer-adapter', () => {
  let element: HTMLElement;
  let adapter: PointerAdapter;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    element.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    });
    adapter = createPointerAdapter(element);
  });

  afterEach(() => {
    adapter.dispose();
    document.body.removeChild(element);
  });

  it('creates a pointer adapter', () => {
    expect(adapter).toBeInstanceOf(PointerAdapter);
    expect(adapter.isAttached()).toBe(false);
  });

  it('attaches to element', () => {
    adapter.attach();
    expect(adapter.isAttached()).toBe(true);
  });

  it('detaches from element', () => {
    adapter.attach();
    adapter.detach();
    expect(adapter.isAttached()).toBe(false);
  });

  it('emits pointer.down on pointerdown', () => {
    const handler = vi.fn();
    adapter.on('pointer.down', handler);
    adapter.attach();

    const pointerEvent = new PointerEvent('pointerdown', {
      clientX: 100,
      clientY: 200,
      button: 0,
      pointerId: 1,
      pressure: 0.5,
    });
    element.dispatchEvent(pointerEvent);

    expect(handler).toHaveBeenCalled();
    const emittedEvent = handler.mock.calls[0][0] as PointerDownEvent;
    expect(emittedEvent.type).toBe('pointer.down');
    expect(emittedEvent.screenPosition.x).toBe(100);
    expect(emittedEvent.screenPosition.y).toBe(200);
    expect(emittedEvent.button).toBe('primary');
    expect(emittedEvent.pointerId).toBe(1);
  });

  it('emits pointer.move on pointermove', () => {
    const handler = vi.fn();
    adapter.on('pointer.move', handler);
    adapter.attach();

    const pointerEvent = new PointerEvent('pointermove', {
      clientX: 150,
      clientY: 250,
      pointerId: 1,
      buttons: 1,
    });
    element.dispatchEvent(pointerEvent);

    expect(handler).toHaveBeenCalled();
    const emittedEvent = handler.mock.calls[0][0] as PointerMoveEvent;
    expect(emittedEvent.type).toBe('pointer.move');
    expect(emittedEvent.screenPosition.x).toBe(150);
    expect(emittedEvent.screenPosition.y).toBe(250);
  });

  it('emits pointer.up on pointerup', () => {
    const handler = vi.fn();
    adapter.on('pointer.up', handler);
    adapter.attach();

    const pointerEvent = new PointerEvent('pointerup', {
      clientX: 100,
      clientY: 200,
      button: 0,
      pointerId: 1,
    });
    element.dispatchEvent(pointerEvent);

    expect(handler).toHaveBeenCalled();
    const emittedEvent = handler.mock.calls[0][0] as PointerUpEvent;
    expect(emittedEvent.type).toBe('pointer.up');
  });

  it('calculates delta between moves', () => {
    const handler = vi.fn();
    adapter.on('pointer.move', handler);
    adapter.attach();

    // First move
    element.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
      })
    );

    // Second move
    element.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 110,
        clientY: 105,
        pointerId: 1,
      })
    );

    const secondEvent = handler.mock.calls[1][0] as PointerMoveEvent;
    expect(secondEvent.delta.x).toBe(10);
    expect(secondEvent.delta.y).toBe(5);
  });

  it('emits wheel events', () => {
    const handler = vi.fn();
    adapter.on('wheel', handler);
    adapter.attach();

    const wheelEvent = new WheelEvent('wheel', {
      clientX: 100,
      clientY: 100,
      deltaX: 0,
      deltaY: -100,
      deltaMode: 0,
    });
    element.dispatchEvent(wheelEvent);

    expect(handler).toHaveBeenCalled();
    const emittedEvent = handler.mock.calls[0][0];
    expect(emittedEvent.type).toBe('wheel');
    expect(emittedEvent.deltaY).toBe(-100);
    expect(emittedEvent.deltaMode).toBe('pixel');
  });

  it('does not emit events when detached', () => {
    const handler = vi.fn();
    adapter.on('pointer.down', handler);

    // Not attached
    const pointerEvent = new PointerEvent('pointerdown', {
      clientX: 100,
      clientY: 200,
      button: 0,
      pointerId: 1,
    });
    element.dispatchEvent(pointerEvent);

    expect(handler).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Gesture Interpreter Tests
// =============================================================================

describe('gesture-interpreter', () => {
  let interpreter: GestureInterpreter;

  beforeEach(() => {
    interpreter = createGestureInterpreter();
  });

  afterEach(() => {
    interpreter.reset();
  });

  describe('DEFAULT_GESTURE_CONFIG', () => {
    it('has expected default values', () => {
      expect(DEFAULT_GESTURE_CONFIG.swipeThreshold).toBe(50);
      expect(DEFAULT_GESTURE_CONFIG.tapTimeout).toBe(300);
      expect(DEFAULT_GESTURE_CONFIG.doubleTapTimeout).toBe(300);
      expect(DEFAULT_GESTURE_CONFIG.longPressTimeout).toBe(500);
      expect(DEFAULT_GESTURE_CONFIG.pinchThreshold).toBe(0.05);
      expect(DEFAULT_GESTURE_CONFIG.panThreshold).toBe(10);
    });
  });

  it('creates a gesture interpreter', () => {
    expect(interpreter).toBeInstanceOf(GestureInterpreter);
  });

  it('accepts custom config', () => {
    const customInterpreter = createGestureInterpreter({
      swipeThreshold: 100,
      tapTimeout: 500,
    });
    expect(customInterpreter).toBeInstanceOf(GestureInterpreter);
    customInterpreter.reset();
  });

  describe('double-tap detection', () => {
    it('emits gesture.doubletap for quick consecutive taps', () => {
      const handler = vi.fn();
      interpreter.onGesture(handler);

      const baseEvent = {
        timestamp: 1000,
        screenPosition: { x: 100, y: 100 },
        source: 'touch' as const,
        modifiers: createDefaultModifiers(),
        handled: false,
        preventDefault: vi.fn(),
        pointerId: 1,
      };

      // First tap
      interpreter.handlePointerDown({
        ...baseEvent,
        type: 'pointer.down',
        button: 'primary',
        pressure: 0.5,
        tiltX: 0,
        tiltY: 0,
      });
      interpreter.handlePointerUp({
        ...baseEvent,
        type: 'pointer.up',
        timestamp: 1050,
        button: 'primary',
      });

      // Second tap within doubleTapTimeout
      interpreter.handlePointerDown({
        ...baseEvent,
        type: 'pointer.down',
        timestamp: 1150,
        button: 'primary',
        pressure: 0.5,
        tiltX: 0,
        tiltY: 0,
      });
      interpreter.handlePointerUp({
        ...baseEvent,
        type: 'pointer.up',
        timestamp: 1200,
        button: 'primary',
      });

      const doubleTapEvents = handler.mock.calls.filter(
        (call) => call[0].type === 'gesture.doubletap'
      );
      expect(doubleTapEvents.length).toBe(1);
    });
  });

  describe('pan detection', () => {
    it('emits gesture.pan when moving beyond threshold', () => {
      const handler = vi.fn();
      interpreter.onGesture(handler);

      const baseEvent = {
        source: 'touch' as const,
        modifiers: createDefaultModifiers(),
        handled: false,
        preventDefault: vi.fn(),
        pointerId: 1,
      };

      // Start touch
      interpreter.handlePointerDown({
        ...baseEvent,
        type: 'pointer.down',
        timestamp: 1000,
        screenPosition: { x: 100, y: 100 },
        button: 'primary',
        pressure: 0.5,
        tiltX: 0,
        tiltY: 0,
      });

      // Move beyond pan threshold
      interpreter.handlePointerMove({
        ...baseEvent,
        type: 'pointer.move',
        timestamp: 1050,
        screenPosition: { x: 120, y: 100 },
        buttons: ['primary'],
        delta: { x: 20, y: 0 },
        pressure: 0.5,
      });

      const panEvents = handler.mock.calls.filter(
        (call) => call[0].type === 'gesture.pan'
      );
      expect(panEvents.length).toBeGreaterThan(0);
      expect(panEvents[0][0].state).toBe('start');
    });
  });

  describe('pinch detection', () => {
    it('emits gesture.pinch when two fingers move', () => {
      const handler = vi.fn();
      interpreter.onGesture(handler);

      const baseEvent = {
        source: 'touch' as const,
        modifiers: createDefaultModifiers(),
        handled: false,
        preventDefault: vi.fn(),
        button: 'primary' as const,
        pressure: 0.5,
        tiltX: 0,
        tiltY: 0,
      };

      // First finger down
      interpreter.handlePointerDown({
        ...baseEvent,
        type: 'pointer.down',
        timestamp: 1000,
        screenPosition: { x: 100, y: 100 },
        pointerId: 1,
      });

      // Second finger down
      interpreter.handlePointerDown({
        ...baseEvent,
        type: 'pointer.down',
        timestamp: 1010,
        screenPosition: { x: 200, y: 100 },
        pointerId: 2,
      });

      const pinchStartEvents = handler.mock.calls.filter(
        (call) => call[0].type === 'gesture.pinch' && call[0].state === 'start'
      );
      expect(pinchStartEvents.length).toBe(1);
    });
  });

  describe('swipe detection', () => {
    it('emits gesture.swipe for quick horizontal movement', () => {
      const handler = vi.fn();
      interpreter.onGesture(handler);

      const baseEvent = {
        source: 'touch' as const,
        modifiers: createDefaultModifiers(),
        handled: false,
        preventDefault: vi.fn(),
        pointerId: 1,
      };

      // Start touch
      interpreter.handlePointerDown({
        ...baseEvent,
        type: 'pointer.down',
        timestamp: 1000,
        screenPosition: { x: 100, y: 100 },
        button: 'primary',
        pressure: 0.5,
        tiltX: 0,
        tiltY: 0,
      });

      // Move past pan threshold first
      interpreter.handlePointerMove({
        ...baseEvent,
        type: 'pointer.move',
        timestamp: 1050,
        screenPosition: { x: 120, y: 100 },
        buttons: ['primary'],
        delta: { x: 20, y: 0 },
        pressure: 0.5,
      });

      // Move further
      interpreter.handlePointerMove({
        ...baseEvent,
        type: 'pointer.move',
        timestamp: 1100,
        screenPosition: { x: 200, y: 100 },
        buttons: ['primary'],
        delta: { x: 80, y: 0 },
        pressure: 0.5,
      });

      // End touch (quick enough for swipe)
      interpreter.handlePointerUp({
        ...baseEvent,
        type: 'pointer.up',
        timestamp: 1150,
        screenPosition: { x: 200, y: 100 },
        button: 'primary',
      });

      const swipeEvents = handler.mock.calls.filter(
        (call) => call[0].type === 'gesture.swipe'
      );
      expect(swipeEvents.length).toBe(1);
      expect(swipeEvents[0][0].direction).toBe('right');
    });
  });

  it('unsubscribes handlers correctly', () => {
    const handler = vi.fn();
    const unsubscribe = interpreter.onGesture(handler);

    unsubscribe();

    // Trigger a double tap
    const baseEvent = {
      timestamp: 1000,
      screenPosition: { x: 100, y: 100 },
      source: 'touch' as const,
      modifiers: createDefaultModifiers(),
      handled: false,
      preventDefault: vi.fn(),
      pointerId: 1,
    };

    interpreter.handlePointerDown({
      ...baseEvent,
      type: 'pointer.down',
      button: 'primary',
      pressure: 0.5,
      tiltX: 0,
      tiltY: 0,
    });
    interpreter.handlePointerUp({
      ...baseEvent,
      type: 'pointer.up',
      timestamp: 1050,
      button: 'primary',
    });
    interpreter.handlePointerDown({
      ...baseEvent,
      type: 'pointer.down',
      timestamp: 1150,
      button: 'primary',
      pressure: 0.5,
      tiltX: 0,
      tiltY: 0,
    });
    interpreter.handlePointerUp({
      ...baseEvent,
      type: 'pointer.up',
      timestamp: 1200,
      button: 'primary',
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('reset clears all state', () => {
    const handler = vi.fn();
    interpreter.onGesture(handler);

    const baseEvent = {
      timestamp: 1000,
      screenPosition: { x: 100, y: 100 },
      source: 'touch' as const,
      modifiers: createDefaultModifiers(),
      handled: false,
      preventDefault: vi.fn(),
      pointerId: 1,
    };

    // Start a gesture
    interpreter.handlePointerDown({
      ...baseEvent,
      type: 'pointer.down',
      button: 'primary',
      pressure: 0.5,
      tiltX: 0,
      tiltY: 0,
    });

    // Reset
    interpreter.reset();

    // The tap should not be tracked anymore
    interpreter.handlePointerDown({
      ...baseEvent,
      type: 'pointer.down',
      timestamp: 1150,
      button: 'primary',
      pressure: 0.5,
      tiltX: 0,
      tiltY: 0,
    });
    interpreter.handlePointerUp({
      ...baseEvent,
      type: 'pointer.up',
      timestamp: 1200,
      button: 'primary',
    });

    // No double-tap should be detected because reset cleared the first tap
    const doubleTapEvents = handler.mock.calls.filter(
      (call) => call[0].type === 'gesture.doubletap'
    );
    expect(doubleTapEvents.length).toBe(0);
  });
});

// =============================================================================
// Touch Adapter Tests
// =============================================================================

describe('touch-adapter', () => {
  let element: HTMLElement;
  let adapter: TouchAdapter;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    element.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    });
    adapter = createTouchAdapter(element);
  });

  afterEach(() => {
    adapter.dispose();
    document.body.removeChild(element);
  });

  it('creates a touch adapter', () => {
    expect(adapter).toBeInstanceOf(TouchAdapter);
  });

  it('extends PointerAdapter', () => {
    expect(adapter).toBeInstanceOf(PointerAdapter);
  });

  it('emits both pointer and gesture events when attached', () => {
    const pointerHandler = vi.fn();
    const gestureHandler = vi.fn();

    adapter.on('pointer.down', pointerHandler);
    adapter.on('gesture.doubletap', gestureHandler);
    adapter.attach();

    // Simulate double-tap
    const baseProps = {
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerId: 1,
      pointerType: 'touch',
      pressure: 0.5,
    };

    // First tap
    element.dispatchEvent(new PointerEvent('pointerdown', baseProps));
    element.dispatchEvent(new PointerEvent('pointerup', baseProps));

    // Second tap (quickly)
    element.dispatchEvent(new PointerEvent('pointerdown', baseProps));
    element.dispatchEvent(new PointerEvent('pointerup', baseProps));

    expect(pointerHandler).toHaveBeenCalled();
    expect(gestureHandler).toHaveBeenCalled();
  });

  it('can disable gestures', () => {
    const adapter2 = createTouchAdapter(element, { enableGestures: false });
    adapter2.attach();

    const gestureHandler = vi.fn();
    adapter2.on('gesture.doubletap', gestureHandler);

    // Simulate double-tap
    const baseProps = {
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerId: 1,
      pointerType: 'touch',
    };

    element.dispatchEvent(new PointerEvent('pointerdown', baseProps));
    element.dispatchEvent(new PointerEvent('pointerup', baseProps));
    element.dispatchEvent(new PointerEvent('pointerdown', baseProps));
    element.dispatchEvent(new PointerEvent('pointerup', baseProps));

    expect(gestureHandler).not.toHaveBeenCalled();

    adapter2.dispose();
  });
});
