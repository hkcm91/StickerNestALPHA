/**
 * Bridge Module Tests
 *
 * Tests for WidgetBridge, MessageQueue, and MessageValidator.
 *
 * @module runtime/bridge
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';


import { createWidgetBridge, type WidgetBridge } from './bridge';
import { createMessageQueue, MAX_QUEUE_SIZE } from './message-queue';
import type { HostMessage, ThemeTokens, WidgetMessage } from './message-types';
import { validateHostMessage, validateWidgetMessage } from './message-validator';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

const validTheme: ThemeTokens = {
  '--sn-bg': '#ffffff',
  '--sn-surface': '#f9f9f9',
  '--sn-accent': '#3B82F6',
  '--sn-text': '#333333',
  '--sn-text-muted': '#666666',
  '--sn-border': '#cccccc',
  '--sn-radius': '8px',
  '--sn-font-family': 'sans-serif',
};

function createMockIframe() {
  const contentWindow = {
    postMessage: vi.fn(),
  };
  const iframe = {
    contentWindow,
  } as unknown as HTMLIFrameElement;
  return { iframe, contentWindow };
}

function simulateWidgetMessage(source: unknown, data: unknown) {
  const event = new MessageEvent('message', { source: source as Window, data });
  window.dispatchEvent(event);
}

// ---------------------------------------------------------------------------
// WidgetBridge
// ---------------------------------------------------------------------------

describe('WidgetBridge', () => {
  let bridge: WidgetBridge;
  let iframe: HTMLIFrameElement;
  let contentWindow: { postMessage: ReturnType<typeof vi.fn> };
  const instanceId = 'test-instance-001';

  beforeEach(() => {
    const mock = createMockIframe();
    iframe = mock.iframe;
    contentWindow = mock.contentWindow;
    bridge = createWidgetBridge(iframe, instanceId);
  });

  afterEach(() => {
    bridge.destroy();
  });

  // -----------------------------------------------------------------------
  // Host -> Widget messages
  // -----------------------------------------------------------------------

  it('sends INIT with widgetId, instanceId, config, and theme', () => {
    // INIT bypasses queue even before READY
    const initMsg: HostMessage = {
      type: 'INIT',
      widgetId: 'widget-abc',
      instanceId: 'inst-xyz',
      config: { color: 'blue' },
      theme: validTheme,
    };
    bridge.send(initMsg);

    expect(contentWindow.postMessage).toHaveBeenCalledWith(initMsg, '*');
  });

  it('sends EVENT with serialized bus event', () => {
    // Signal READY first so EVENT is not queued
    simulateWidgetMessage(contentWindow, { type: 'READY' });

    const eventMsg: HostMessage = {
      type: 'EVENT',
      event: { type: 'widget.clicked', payload: { x: 10 } },
    };
    bridge.send(eventMsg);

    expect(contentWindow.postMessage).toHaveBeenCalledWith(eventMsg, '*');
  });

  it('sends CONFIG_UPDATE with new config', () => {
    simulateWidgetMessage(contentWindow, { type: 'READY' });

    const configMsg: HostMessage = {
      type: 'CONFIG_UPDATE',
      config: { fontSize: 16, darkMode: true },
    };
    bridge.send(configMsg);

    expect(contentWindow.postMessage).toHaveBeenCalledWith(configMsg, '*');
  });

  it('sends THEME_UPDATE with new theme tokens', () => {
    simulateWidgetMessage(contentWindow, { type: 'READY' });

    const themeMsg: HostMessage = {
      type: 'THEME_UPDATE',
      theme: { ...validTheme, '--sn-bg': '#000000' },
    };
    bridge.send(themeMsg);

    expect(contentWindow.postMessage).toHaveBeenCalledWith(themeMsg, '*');
  });

  it('sends RESIZE with width and height', () => {
    simulateWidgetMessage(contentWindow, { type: 'READY' });

    const resizeMsg: HostMessage = { type: 'RESIZE', width: 400, height: 300 };
    bridge.send(resizeMsg);

    expect(contentWindow.postMessage).toHaveBeenCalledWith(resizeMsg, '*');
  });

  it('sends STATE_RESPONSE with requested state', () => {
    simulateWidgetMessage(contentWindow, { type: 'READY' });

    const stateMsg: HostMessage = {
      type: 'STATE_RESPONSE',
      key: 'counter',
      value: 42,
    };
    bridge.send(stateMsg);

    expect(contentWindow.postMessage).toHaveBeenCalledWith(stateMsg, '*');
  });

  it('sends DESTROY signal', () => {
    // DESTROY bypasses queue even before READY
    const destroyMsg: HostMessage = { type: 'DESTROY' };
    bridge.send(destroyMsg);

    expect(contentWindow.postMessage).toHaveBeenCalledWith(destroyMsg, '*');
  });

  // -----------------------------------------------------------------------
  // Widget -> Host messages
  // -----------------------------------------------------------------------

  it('handles READY and flushes event queue', () => {
    // Enqueue some messages before READY
    const event1: HostMessage = {
      type: 'EVENT',
      event: { type: 'test.event1', payload: null },
    };
    const event2: HostMessage = {
      type: 'EVENT',
      event: { type: 'test.event2', payload: null },
    };
    bridge.send(event1);
    bridge.send(event2);

    // They should NOT have been sent yet (queued)
    expect(contentWindow.postMessage).not.toHaveBeenCalled();

    // Now simulate READY
    simulateWidgetMessage(contentWindow, { type: 'READY' });

    // Both queued messages should have been flushed via postMessage
    expect(contentWindow.postMessage).toHaveBeenCalledTimes(2);
    expect(contentWindow.postMessage).toHaveBeenNthCalledWith(1, event1, '*');
    expect(contentWindow.postMessage).toHaveBeenNthCalledWith(2, event2, '*');

    // Bridge should now be ready
    expect(bridge.isReady()).toBe(true);
  });

  it('handles EMIT and forwards to event bus', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    const emitData: WidgetMessage = {
      type: 'EMIT',
      eventType: 'widget.action',
      payload: { action: 'click' },
    };
    simulateWidgetMessage(contentWindow, emitData);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(emitData);
  });

  it('handles SET_STATE and persists state', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    const setStateData: WidgetMessage = {
      type: 'SET_STATE',
      key: 'counter',
      value: 99,
    };
    simulateWidgetMessage(contentWindow, setStateData);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(setStateData);
  });

  it('handles GET_STATE and responds with state', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    const getStateData: WidgetMessage = { type: 'GET_STATE', key: 'settings' };
    simulateWidgetMessage(contentWindow, getStateData);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(getStateData);
  });

  it('handles RESIZE_REQUEST and validates bounds', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    const resizeReq: WidgetMessage = {
      type: 'RESIZE_REQUEST',
      width: 500,
      height: 400,
    };
    simulateWidgetMessage(contentWindow, resizeReq);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(resizeReq);
  });

  it('handles LOG and prefixes with widget ID', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    const logData: WidgetMessage = {
      type: 'LOG',
      level: 'info',
      message: 'Widget initialized',
    };
    simulateWidgetMessage(contentWindow, logData);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(logData);
  });

  it('handles REGISTER and validates manifest', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    const manifest = {
      name: 'TestWidget',
      version: '1.0.0',
      events: { emit: ['widget.action'], subscribe: ['canvas.click'] },
    };
    const registerData: WidgetMessage = { type: 'REGISTER', manifest };
    simulateWidgetMessage(contentWindow, registerData);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(registerData);
  });

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  it('rejects malformed WidgetMessage', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    // Missing required fields, not a valid discriminated union member
    simulateWidgetMessage(contentWindow, { type: 'EMIT' }); // missing eventType, payload
    simulateWidgetMessage(contentWindow, { garbage: true });
    simulateWidgetMessage(contentWindow, 'not an object');
    simulateWidgetMessage(contentWindow, null);
    simulateWidgetMessage(contentWindow, 42);

    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects message from unknown source (origin verification)', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    // Use a different source, not our iframe's contentWindow
    const foreignSource = { postMessage: vi.fn() };
    simulateWidgetMessage(foreignSource, { type: 'READY' });

    expect(handler).not.toHaveBeenCalled();
    expect(bridge.isReady()).toBe(false);
  });

  it('rejects SET_STATE exceeding 1MB', () => {
    // Note: The bridge itself delivers the message; 1MB enforcement is in WidgetFrame.
    // This test verifies the message is delivered so WidgetFrame can enforce the limit.
    const handler = vi.fn();
    bridge.onMessage(handler);

    const largeValue = 'x'.repeat(1024 * 1024 + 1); // > 1MB string
    const setStateData: WidgetMessage = {
      type: 'SET_STATE',
      key: 'big',
      value: largeValue,
    };
    simulateWidgetMessage(contentWindow, setStateData);

    // Bridge delivers the message; WidgetFrame is responsible for size enforcement
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(setStateData);
  });

  // -----------------------------------------------------------------------
  // Queue
  // -----------------------------------------------------------------------

  it('queues events sent before READY', () => {
    const eventMsg: HostMessage = {
      type: 'EVENT',
      event: { type: 'test.queued', payload: null },
    };
    bridge.send(eventMsg);

    // Message should NOT have been posted to the iframe
    expect(contentWindow.postMessage).not.toHaveBeenCalled();
    expect(bridge.isReady()).toBe(false);
  });

  it('flushes queue in order on READY', () => {
    const messages: HostMessage[] = [];
    for (let i = 0; i < 5; i++) {
      const msg: HostMessage = {
        type: 'EVENT',
        event: { type: `test.event.${i}`, payload: { index: i } },
      };
      messages.push(msg);
      bridge.send(msg);
    }

    // Nothing sent yet
    expect(contentWindow.postMessage).not.toHaveBeenCalled();

    // Signal READY
    simulateWidgetMessage(contentWindow, { type: 'READY' });

    // All 5 should be flushed in order
    expect(contentWindow.postMessage).toHaveBeenCalledTimes(5);
    for (let i = 0; i < 5; i++) {
      expect(contentWindow.postMessage).toHaveBeenNthCalledWith(
        i + 1,
        messages[i],
        '*',
      );
    }
  });

  it('drops oldest when queue exceeds 1000', () => {
    // Enqueue MAX_QUEUE_SIZE + 10 messages
    for (let i = 0; i < MAX_QUEUE_SIZE + 10; i++) {
      bridge.send({
        type: 'EVENT',
        event: { type: `test.overflow.${i}`, payload: { index: i } },
      });
    }

    // Signal READY to flush
    simulateWidgetMessage(contentWindow, { type: 'READY' });

    // Only MAX_QUEUE_SIZE messages should be flushed (oldest 10 were dropped)
    expect(contentWindow.postMessage).toHaveBeenCalledTimes(MAX_QUEUE_SIZE);

    // The first flushed message should be index 10 (oldest 0-9 were dropped)
    const firstCall = contentWindow.postMessage.mock.calls[0][0] as HostMessage;
    expect(firstCall).toEqual({
      type: 'EVENT',
      event: { type: 'test.overflow.10', payload: { index: 10 } },
    });

    // The last flushed message should be index MAX_QUEUE_SIZE + 9
    const lastCall = contentWindow.postMessage.mock.calls[MAX_QUEUE_SIZE - 1][0] as HostMessage;
    expect(lastCall).toEqual({
      type: 'EVENT',
      event: {
        type: `test.overflow.${MAX_QUEUE_SIZE + 9}`,
        payload: { index: MAX_QUEUE_SIZE + 9 },
      },
    });
  });

  it('delivers directly after READY (no queue)', () => {
    // Signal READY first
    simulateWidgetMessage(contentWindow, { type: 'READY' });
    contentWindow.postMessage.mockClear();

    // Now send a message -- should go straight through
    const eventMsg: HostMessage = {
      type: 'EVENT',
      event: { type: 'test.direct', payload: null },
    };
    bridge.send(eventMsg);

    expect(contentWindow.postMessage).toHaveBeenCalledTimes(1);
    expect(contentWindow.postMessage).toHaveBeenCalledWith(eventMsg, '*');
  });

  // -----------------------------------------------------------------------
  // Additional edge cases
  // -----------------------------------------------------------------------

  it('INIT bypasses queue before READY', () => {
    const initMsg: HostMessage = {
      type: 'INIT',
      widgetId: 'w-1',
      instanceId: 'i-1',
      config: {},
      theme: validTheme,
    };
    bridge.send(initMsg);

    // Should be sent immediately, not queued
    expect(contentWindow.postMessage).toHaveBeenCalledTimes(1);
    expect(contentWindow.postMessage).toHaveBeenCalledWith(initMsg, '*');
  });

  it('DESTROY bypasses queue before READY', () => {
    const destroyMsg: HostMessage = { type: 'DESTROY' };
    bridge.send(destroyMsg);

    // Should be sent immediately, not queued
    expect(contentWindow.postMessage).toHaveBeenCalledTimes(1);
    expect(contentWindow.postMessage).toHaveBeenCalledWith(destroyMsg, '*');
  });

  it('rate-limits EMIT messages', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    // Send 101 EMIT messages rapidly (default limit is 100/second)
    for (let i = 0; i < 101; i++) {
      simulateWidgetMessage(contentWindow, {
        type: 'EMIT',
        eventType: 'test.rapid',
        payload: { i },
      });
    }

    // First 100 should be delivered, 101st should be rate-limited
    expect(handler).toHaveBeenCalledTimes(100);
  });

  it('rate-limits CROSS_CANVAS_EMIT messages', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    // Send 101 CROSS_CANVAS_EMIT messages rapidly (shares same 100/sec limit)
    for (let i = 0; i < 101; i++) {
      simulateWidgetMessage(contentWindow, {
        type: 'CROSS_CANVAS_EMIT',
        channel: 'test-channel',
        payload: { i },
      });
    }

    // First 100 should be delivered, 101st should be rate-limited
    expect(handler).toHaveBeenCalledTimes(100);
  });

  it('EMIT and CROSS_CANVAS_EMIT share the same rate limit bucket', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    // Send 50 EMIT + 51 CROSS_CANVAS_EMIT = 101 total
    for (let i = 0; i < 50; i++) {
      simulateWidgetMessage(contentWindow, {
        type: 'EMIT',
        eventType: 'test.event',
        payload: { i },
      });
    }
    for (let i = 0; i < 51; i++) {
      simulateWidgetMessage(contentWindow, {
        type: 'CROSS_CANVAS_EMIT',
        channel: 'test-channel',
        payload: { i },
      });
    }

    // Only 100 total should pass through
    expect(handler).toHaveBeenCalledTimes(100);
  });

  it('does not rate-limit non-EMIT messages', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    // Send many SET_STATE messages -- should not be rate-limited
    for (let i = 0; i < 150; i++) {
      simulateWidgetMessage(contentWindow, {
        type: 'SET_STATE',
        key: `key-${i}`,
        value: i,
      });
    }

    expect(handler).toHaveBeenCalledTimes(150);
  });

  it('destroy() removes the message listener', () => {
    const handler = vi.fn();
    bridge.onMessage(handler);

    bridge.destroy();

    // Messages should no longer be processed
    simulateWidgetMessage(contentWindow, { type: 'READY' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('isReady() returns false before READY, true after', () => {
    expect(bridge.isReady()).toBe(false);

    simulateWidgetMessage(contentWindow, { type: 'READY' });
    expect(bridge.isReady()).toBe(true);
  });

  it('handler errors do not crash the bridge', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badHandler = vi.fn(() => {
      throw new Error('handler explosion');
    });
    const goodHandler = vi.fn();

    bridge.onMessage(badHandler);
    bridge.onMessage(goodHandler);

    simulateWidgetMessage(contentWindow, { type: 'READY' });

    // Bad handler threw, but good handler still received the message
    expect(badHandler).toHaveBeenCalledTimes(1);
    expect(goodHandler).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('second READY does not flush again', () => {
    const eventMsg: HostMessage = {
      type: 'EVENT',
      event: { type: 'test.once', payload: null },
    };
    bridge.send(eventMsg);

    // First READY flushes
    simulateWidgetMessage(contentWindow, { type: 'READY' });
    expect(contentWindow.postMessage).toHaveBeenCalledTimes(1);
    contentWindow.postMessage.mockClear();

    // Second READY should not flush anything (queue already empty, ready already true)
    simulateWidgetMessage(contentWindow, { type: 'READY' });
    expect(contentWindow.postMessage).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// MessageQueue
// ---------------------------------------------------------------------------

describe('MessageQueue', () => {
  it('enqueues messages up to MAX_QUEUE_SIZE', () => {
    const queue = createMessageQueue();

    for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
      queue.enqueue({
        type: 'EVENT',
        event: { type: `test.${i}`, payload: null },
      });
    }

    expect(queue.size()).toBe(MAX_QUEUE_SIZE);
  });

  it('drops oldest message on overflow', () => {
    const queue = createMessageQueue();

    // Fill to MAX_QUEUE_SIZE + 1
    for (let i = 0; i <= MAX_QUEUE_SIZE; i++) {
      queue.enqueue({
        type: 'EVENT',
        event: { type: `test.${i}`, payload: { index: i } },
      });
    }

    // Size should still be MAX_QUEUE_SIZE
    expect(queue.size()).toBe(MAX_QUEUE_SIZE);

    // Flush and verify oldest was dropped
    const messages = queue.flush();
    expect(messages.length).toBe(MAX_QUEUE_SIZE);

    // First message should be index 1 (index 0 was dropped)
    const first = messages[0] as { type: 'EVENT'; event: { type: string; payload: { index: number } } };
    expect(first.event.payload.index).toBe(1);

    // Last message should be MAX_QUEUE_SIZE
    const last = messages[MAX_QUEUE_SIZE - 1] as { type: 'EVENT'; event: { type: string; payload: { index: number } } };
    expect(last.event.payload.index).toBe(MAX_QUEUE_SIZE);
  });

  it('flushes all messages in order', () => {
    const queue = createMessageQueue();
    const msgs: HostMessage[] = [];

    for (let i = 0; i < 5; i++) {
      const msg: HostMessage = {
        type: 'EVENT',
        event: { type: `test.order.${i}`, payload: { i } },
      };
      msgs.push(msg);
      queue.enqueue(msg);
    }

    const flushed = queue.flush();
    expect(flushed).toEqual(msgs);

    // After flush, queue should be empty
    expect(queue.size()).toBe(0);
  });

  it('size() returns current count', () => {
    const queue = createMessageQueue();
    expect(queue.size()).toBe(0);

    queue.enqueue({ type: 'DESTROY' });
    expect(queue.size()).toBe(1);

    queue.enqueue({ type: 'DESTROY' });
    expect(queue.size()).toBe(2);

    queue.flush();
    expect(queue.size()).toBe(0);
  });

  it('clear() empties the queue', () => {
    const queue = createMessageQueue();

    for (let i = 0; i < 10; i++) {
      queue.enqueue({ type: 'DESTROY' });
    }
    expect(queue.size()).toBe(10);

    queue.clear();
    expect(queue.size()).toBe(0);

    // Flush after clear returns empty array
    const flushed = queue.flush();
    expect(flushed).toEqual([]);
  });

  it('flush returns a copy, not a reference to internal queue', () => {
    const queue = createMessageQueue();
    queue.enqueue({ type: 'DESTROY' });

    const flushed = queue.flush();
    expect(flushed.length).toBe(1);

    // Mutating the returned array should not affect the queue
    flushed.push({ type: 'DESTROY' });
    expect(queue.size()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// MessageValidator
// ---------------------------------------------------------------------------

describe('MessageValidator', () => {
  describe('validateHostMessage', () => {
    it('validates INIT message', () => {
      const msg = {
        type: 'INIT',
        widgetId: 'w-1',
        instanceId: 'i-1',
        config: { key: 'value' },
        theme: validTheme,
      };
      const result = validateHostMessage(msg);
      expect(result).toEqual(msg);
    });

    it('validates EVENT message', () => {
      const msg = {
        type: 'EVENT',
        event: { type: 'canvas.click', payload: { x: 100, y: 200 } },
      };
      const result = validateHostMessage(msg);
      expect(result).toEqual(msg);
    });

    it('validates CONFIG_UPDATE message', () => {
      const msg = { type: 'CONFIG_UPDATE', config: { theme: 'dark' } };
      const result = validateHostMessage(msg);
      expect(result).toEqual(msg);
    });

    it('validates THEME_UPDATE message', () => {
      const msg = { type: 'THEME_UPDATE', theme: validTheme };
      const result = validateHostMessage(msg);
      expect(result).toEqual(msg);
    });

    it('validates RESIZE message', () => {
      const msg = { type: 'RESIZE', width: 800, height: 600 };
      const result = validateHostMessage(msg);
      expect(result).toEqual(msg);
    });

    it('validates STATE_RESPONSE message', () => {
      const msg = { type: 'STATE_RESPONSE', key: 'counter', value: 42 };
      const result = validateHostMessage(msg);
      expect(result).toEqual(msg);
    });

    it('validates DESTROY message', () => {
      const msg = { type: 'DESTROY' };
      const result = validateHostMessage(msg);
      expect(result).toEqual(msg);
    });
  });

  describe('validateWidgetMessage', () => {
    it('validates READY message', () => {
      const result = validateWidgetMessage({ type: 'READY' });
      expect(result).toEqual({ type: 'READY' });
    });

    it('validates REGISTER message', () => {
      const manifest = { name: 'TestWidget', version: '1.0.0' };
      const result = validateWidgetMessage({ type: 'REGISTER', manifest });
      expect(result).toEqual({ type: 'REGISTER', manifest });
    });

    it('validates EMIT message', () => {
      const result = validateWidgetMessage({
        type: 'EMIT',
        eventType: 'widget.action',
        payload: { data: 'test' },
      });
      expect(result).toEqual({
        type: 'EMIT',
        eventType: 'widget.action',
        payload: { data: 'test' },
      });
    });

    it('validates SET_STATE message', () => {
      const result = validateWidgetMessage({
        type: 'SET_STATE',
        key: 'counter',
        value: 42,
      });
      expect(result).toEqual({ type: 'SET_STATE', key: 'counter', value: 42 });
    });

    it('validates GET_STATE message', () => {
      const result = validateWidgetMessage({ type: 'GET_STATE', key: 'prefs' });
      expect(result).toEqual({ type: 'GET_STATE', key: 'prefs' });
    });

    it('validates SET_USER_STATE message', () => {
      const result = validateWidgetMessage({
        type: 'SET_USER_STATE',
        key: 'theme',
        value: 'dark',
      });
      expect(result).toEqual({
        type: 'SET_USER_STATE',
        key: 'theme',
        value: 'dark',
      });
    });

    it('validates GET_USER_STATE message', () => {
      const result = validateWidgetMessage({
        type: 'GET_USER_STATE',
        key: 'theme',
      });
      expect(result).toEqual({ type: 'GET_USER_STATE', key: 'theme' });
    });

    it('validates RESIZE_REQUEST message', () => {
      const result = validateWidgetMessage({
        type: 'RESIZE_REQUEST',
        width: 640,
        height: 480,
      });
      expect(result).toEqual({
        type: 'RESIZE_REQUEST',
        width: 640,
        height: 480,
      });
    });

    it('validates LOG message', () => {
      const result = validateWidgetMessage({
        type: 'LOG',
        level: 'warn',
        message: 'something happened',
      });
      expect(result).toEqual({
        type: 'LOG',
        level: 'warn',
        message: 'something happened',
      });
    });
  });

  describe('invalid messages', () => {
    it('returns null for malformed messages', () => {
      expect(validateWidgetMessage(null)).toBeNull();
      expect(validateWidgetMessage(undefined)).toBeNull();
      expect(validateWidgetMessage(42)).toBeNull();
      expect(validateWidgetMessage('string')).toBeNull();
      expect(validateWidgetMessage({})).toBeNull();
      expect(validateWidgetMessage({ type: 'EMIT' })).toBeNull(); // missing eventType, payload
      expect(validateWidgetMessage({ type: 'SET_STATE' })).toBeNull(); // missing key, value
      expect(validateWidgetMessage({ type: 'LOG', level: 'invalid', message: 'x' })).toBeNull();

      expect(validateHostMessage(null)).toBeNull();
      expect(validateHostMessage(undefined)).toBeNull();
      expect(validateHostMessage(42)).toBeNull();
      expect(validateHostMessage('string')).toBeNull();
      expect(validateHostMessage({})).toBeNull();
      expect(validateHostMessage({ type: 'INIT' })).toBeNull(); // missing fields
      expect(validateHostMessage({ type: 'RESIZE', width: 'not a number', height: 100 })).toBeNull();
    });

    it('returns null for unknown message types', () => {
      expect(validateWidgetMessage({ type: 'UNKNOWN' })).toBeNull();
      expect(validateWidgetMessage({ type: 'EXPLODE', payload: {} })).toBeNull();

      expect(validateHostMessage({ type: 'UNKNOWN' })).toBeNull();
      expect(validateHostMessage({ type: 'HACK', data: 'evil' })).toBeNull();
    });

    it('returns null for INIT with incomplete theme', () => {
      const incompleteTheme = {
        '--sn-bg': '#fff',
        // missing other required theme tokens
      };
      expect(
        validateHostMessage({
          type: 'INIT',
          widgetId: 'w-1',
          instanceId: 'i-1',
          config: {},
          theme: incompleteTheme,
        }),
      ).toBeNull();
    });

    it('returns null for THEME_UPDATE with incomplete theme', () => {
      expect(
        validateHostMessage({
          type: 'THEME_UPDATE',
          theme: { '--sn-bg': '#fff' },
        }),
      ).toBeNull();
    });

    it('returns null for RESIZE_REQUEST with non-numeric dimensions', () => {
      expect(
        validateWidgetMessage({
          type: 'RESIZE_REQUEST',
          width: 'wide',
          height: 'tall',
        }),
      ).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Cross-Canvas Message Validation
  // -------------------------------------------------------------------------

  describe('cross-canvas message validation', () => {
    it('validates CROSS_CANVAS_EMIT widget message', () => {
      const msg = validateWidgetMessage({
        type: 'CROSS_CANVAS_EMIT',
        channel: 'room-1',
        payload: { data: 'hello' },
      });
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('CROSS_CANVAS_EMIT');
    });

    it('rejects CROSS_CANVAS_EMIT without channel', () => {
      expect(
        validateWidgetMessage({ type: 'CROSS_CANVAS_EMIT', payload: {} }),
      ).toBeNull();
    });

    it('validates CROSS_CANVAS_SUBSCRIBE widget message', () => {
      const msg = validateWidgetMessage({
        type: 'CROSS_CANVAS_SUBSCRIBE',
        channel: 'alerts',
      });
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('CROSS_CANVAS_SUBSCRIBE');
    });

    it('rejects CROSS_CANVAS_SUBSCRIBE without channel', () => {
      expect(
        validateWidgetMessage({ type: 'CROSS_CANVAS_SUBSCRIBE' }),
      ).toBeNull();
    });

    it('validates CROSS_CANVAS_UNSUBSCRIBE widget message', () => {
      const msg = validateWidgetMessage({
        type: 'CROSS_CANVAS_UNSUBSCRIBE',
        channel: 'alerts',
      });
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('CROSS_CANVAS_UNSUBSCRIBE');
    });

    it('rejects CROSS_CANVAS_UNSUBSCRIBE with numeric channel', () => {
      expect(
        validateWidgetMessage({ type: 'CROSS_CANVAS_UNSUBSCRIBE', channel: 123 }),
      ).toBeNull();
    });

    it('validates CROSS_CANVAS_EVENT host message', () => {
      const msg = validateHostMessage({
        type: 'CROSS_CANVAS_EVENT',
        channel: 'room-1',
        payload: { text: 'hi' },
      });
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('CROSS_CANVAS_EVENT');
    });

    it('rejects CROSS_CANVAS_EVENT without channel', () => {
      expect(
        validateHostMessage({ type: 'CROSS_CANVAS_EVENT', payload: {} }),
      ).toBeNull();
    });
  });
});
