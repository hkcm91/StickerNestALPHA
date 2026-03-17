/**
 * Tests for Widget SDK Template and SDK Builder
 *
 * @module runtime/sdk
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { buildSrcdoc } from './sdk-builder';
import { generateSDKTemplate } from './sdk-template';

// ---------------------------------------------------------------------------
// 1. SDK Template Tests
// ---------------------------------------------------------------------------

describe('StickerNest SDK Template', () => {
  let parentPostMessage: ReturnType<typeof vi.fn>;
  let sdk: any;
  let originalParent: typeof window.parent;

  beforeEach(() => {
    // Save original parent reference
    originalParent = window.parent;

    // Mock window.parent.postMessage
    parentPostMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: parentPostMessage },
      writable: true,
      configurable: true,
    });

    // Evaluate the SDK template to create window.StickerNest
    const template = generateSDKTemplate();
    // eslint-disable-next-line no-eval
    eval(template);
    sdk = (window as any).StickerNest;
  });

  afterEach(() => {
    delete (window as any).StickerNest;
    // Restore original parent
    Object.defineProperty(window, 'parent', {
      value: originalParent,
      writable: true,
      configurable: true,
    });
  });

  it('generateSDKTemplate() returns a string that creates window.StickerNest', () => {
    expect(sdk).toBeDefined();
    expect(typeof sdk).toBe('object');
  });

  it('emit() posts EMIT message to parent', () => {
    sdk.emit('widget.clicked', { x: 10, y: 20 });

    expect(parentPostMessage).toHaveBeenCalledWith(
      { type: 'EMIT', eventType: 'widget.clicked', payload: { x: 10, y: 20 } },
      '*',
    );
  });

  it('subscribe() registers handler for event type', () => {
    const handler = vi.fn();
    sdk.subscribe('test.event', handler);

    // Simulate an EVENT message from the host
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'EVENT', event: { type: 'test.event', payload: { value: 42 } } },
      }),
    );

    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });

  it('unsubscribe() removes specific handler', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    sdk.subscribe('test.event', handler1);
    sdk.subscribe('test.event', handler2);

    sdk.unsubscribe('test.event', handler1);

    // Dispatch an event -- only handler2 should fire
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'EVENT', event: { type: 'test.event', payload: 'hello' } },
      }),
    );

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledWith('hello');
  });

  it('setState() posts SET_STATE to parent', () => {
    sdk.setState('color', 'blue');

    expect(parentPostMessage).toHaveBeenCalledWith(
      { type: 'SET_STATE', key: 'color', value: 'blue' },
      '*',
    );
  });

  it('getState() sends GET_STATE and awaits STATE_RESPONSE', async () => {
    const promise = sdk.getState('mykey');

    // Verify GET_STATE was posted
    expect(parentPostMessage).toHaveBeenCalledWith(
      { type: 'GET_STATE', key: 'mykey' },
      '*',
    );

    // Simulate the STATE_RESPONSE from host
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'STATE_RESPONSE', key: 'mykey', value: 42 },
      }),
    );

    await expect(promise).resolves.toBe(42);
  });

  it('setUserState() posts SET_USER_STATE to parent', () => {
    sdk.setUserState('pref', 'dark');

    expect(parentPostMessage).toHaveBeenCalledWith(
      { type: 'SET_USER_STATE', key: 'pref', value: 'dark' },
      '*',
    );
  });

  it('getUserState() sends GET_USER_STATE and awaits response', async () => {
    const promise = sdk.getUserState('pref');

    // Verify GET_USER_STATE was posted
    expect(parentPostMessage).toHaveBeenCalledWith(
      { type: 'GET_USER_STATE', key: 'pref' },
      '*',
    );

    // Simulate the STATE_RESPONSE from host (uses same key-based resolution)
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'STATE_RESPONSE', key: 'pref', value: 'dark' },
      }),
    );

    await expect(promise).resolves.toBe('dark');
  });

  it('getState() and getUserState() with same key do not collide', async () => {
    // Call both concurrently with the same key name
    const statePromise = sdk.getState('settings');
    const userStatePromise = sdk.getUserState('settings');

    // Verify both messages were posted
    const stateCalls = parentPostMessage.mock.calls.filter(
      (call: any[]) => call[0]?.type === 'GET_STATE' && call[0]?.key === 'settings',
    );
    const userStateCalls = parentPostMessage.mock.calls.filter(
      (call: any[]) => call[0]?.type === 'GET_USER_STATE' && call[0]?.key === 'settings',
    );
    expect(stateCalls).toHaveLength(1);
    expect(userStateCalls).toHaveLength(1);

    // Simulate STATE_RESPONSE for getState (host responds synchronously first)
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'STATE_RESPONSE', key: 'settings', value: 'instance-value' },
      }),
    );

    // Simulate STATE_RESPONSE for getUserState (arrives second via bus)
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'STATE_RESPONSE', key: 'settings', value: 'user-value' },
      }),
    );

    // Both promises should resolve to their correct values
    await expect(statePromise).resolves.toBe('instance-value');
    await expect(userStatePromise).resolves.toBe('user-value');
  });

  it('getConfig() returns config from last INIT', () => {
    // Before INIT, config should be empty
    expect(sdk.getConfig()).toEqual({});

    // Simulate an INIT message
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'INIT',
          config: { foo: 'bar', count: 5 },
          theme: { '--sn-bg': '#fff' },
        },
      }),
    );

    const config = sdk.getConfig();
    expect(config).toEqual({ foo: 'bar', count: 5 });

    // getConfig returns a copy, not the original reference
    config.foo = 'mutated';
    expect(sdk.getConfig().foo).toBe('bar');
  });

  it('register() posts REGISTER with manifest — must be before ready()', () => {
    const manifest = { name: 'test-widget', version: '1.0.0', events: [] };
    sdk.register(manifest);

    expect(parentPostMessage).toHaveBeenCalledWith(
      { type: 'REGISTER', manifest },
      '*',
    );
  });

  it('ready() signals READY to host — must be within 500ms', () => {
    sdk.ready();

    expect(parentPostMessage).toHaveBeenCalledWith({ type: 'READY' }, '*');
  });

  it('ready() is idempotent — calling twice posts READY only once', () => {
    sdk.ready();
    sdk.ready();

    const readyCalls = parentPostMessage.mock.calls.filter(
      (call: any[]) => call[0]?.type === 'READY',
    );
    expect(readyCalls).toHaveLength(1);
  });

  it('onThemeChange() receives theme tokens on load and on change', () => {
    const themeHandler = vi.fn();
    sdk.onThemeChange(themeHandler);

    // Simulate INIT with theme
    const initTheme = { '--sn-bg': '#ffffff', '--sn-text': '#000000' };
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'INIT', config: {}, theme: initTheme },
      }),
    );

    expect(themeHandler).toHaveBeenCalledTimes(1);
    expect(themeHandler).toHaveBeenCalledWith(initTheme);

    // Simulate THEME_UPDATE
    const updatedTheme = { '--sn-bg': '#1a1a1a', '--sn-text': '#eeeeee' };
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'THEME_UPDATE', theme: updatedTheme },
      }),
    );

    expect(themeHandler).toHaveBeenCalledTimes(2);
    expect(themeHandler).toHaveBeenCalledWith(updatedTheme);
  });

  it('onResize() receives viewport dimensions', () => {
    const resizeHandler = vi.fn();
    sdk.onResize(resizeHandler);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'RESIZE', width: 800, height: 600 },
      }),
    );

    expect(resizeHandler).toHaveBeenCalledWith(800, 600);
  });

  it('integration().query() sends INTEGRATION_QUERY with requestId and resolves on INTEGRATION_RESPONSE', async () => {
    const promise = sdk.integration('github').query({ repo: 'my-repo' });

    // Verify INTEGRATION_QUERY was posted
    const queryCalls = parentPostMessage.mock.calls.filter(
      (call: any[]) => call[0]?.type === 'INTEGRATION_QUERY',
    );
    expect(queryCalls).toHaveLength(1);

    const queryMsg = queryCalls[0][0];
    expect(queryMsg.name).toBe('github');
    expect(queryMsg.params).toEqual({ repo: 'my-repo' });
    expect(typeof queryMsg.requestId).toBe('string');

    // Simulate INTEGRATION_RESPONSE from host
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'INTEGRATION_RESPONSE', requestId: queryMsg.requestId, result: { repos: ['a', 'b'] } },
      }),
    );

    await expect(promise).resolves.toEqual({ repos: ['a', 'b'] });
  });

  it('integration().mutate() sends INTEGRATION_MUTATE with requestId and resolves on INTEGRATION_RESPONSE', async () => {
    const promise = sdk.integration('github').mutate({ action: 'create-issue', title: 'Bug' });

    // Verify INTEGRATION_MUTATE was posted
    const mutateCalls = parentPostMessage.mock.calls.filter(
      (call: any[]) => call[0]?.type === 'INTEGRATION_MUTATE',
    );
    expect(mutateCalls).toHaveLength(1);

    const mutateMsg = mutateCalls[0][0];
    expect(mutateMsg.name).toBe('github');
    expect(mutateMsg.params).toEqual({ action: 'create-issue', title: 'Bug' });
    expect(typeof mutateMsg.requestId).toBe('string');

    // Simulate INTEGRATION_RESPONSE from host
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'INTEGRATION_RESPONSE', requestId: mutateMsg.requestId, result: { id: 'issue-123' } },
      }),
    );

    await expect(promise).resolves.toEqual({ id: 'issue-123' });
  });

  it('integration().query() rejects when INTEGRATION_RESPONSE has error', async () => {
    const promise = sdk.integration('github').query({ repo: 'private' });

    const queryCalls = parentPostMessage.mock.calls.filter(
      (call: any[]) => call[0]?.type === 'INTEGRATION_QUERY',
    );
    const queryMsg = queryCalls[0][0];

    // Simulate error response
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'INTEGRATION_RESPONSE', requestId: queryMsg.requestId, result: null, error: 'Unauthorized' },
      }),
    );

    await expect(promise).rejects.toThrow('Unauthorized');
  });

  it('register() before ready() succeeds; reverse order errors', () => {
    // Create a fresh SDK instance to test the reverse order
    delete (window as any).StickerNest;
    const template = generateSDKTemplate();
    // eslint-disable-next-line no-eval
    eval(template);
    const freshSdk = (window as any).StickerNest;

    // First: calling ready(), then register() should throw
    freshSdk.ready();
    expect(() => {
      freshSdk.register({ name: 'test', version: '1.0.0' });
    }).toThrow('StickerNest.register() must be called before StickerNest.ready()');
  });

  it('subscribe() can register multiple handlers for the same event type', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    sdk.subscribe('multi.event', handler1);
    sdk.subscribe('multi.event', handler2);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'EVENT', event: { type: 'multi.event', payload: 'data' } },
      }),
    );

    expect(handler1).toHaveBeenCalledWith('data');
    expect(handler2).toHaveBeenCalledWith('data');
  });

  it('unsubscribe() on last handler for a type cleans up the handler list', () => {
    const handler = vi.fn();
    sdk.subscribe('cleanup.event', handler);
    sdk.unsubscribe('cleanup.event', handler);

    // Dispatching should not call the handler
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'EVENT', event: { type: 'cleanup.event', payload: 'data' } },
      }),
    );

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores messages with no type field', () => {
    // Should not throw
    window.dispatchEvent(
      new MessageEvent('message', {
        data: null,
      }),
    );

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { noType: true },
      }),
    );

    // No error means the guard clause works
    expect(true).toBe(true);
  });

  it('DESTROY message clears all handlers', () => {
    const eventHandler = vi.fn();
    const themeHandler = vi.fn();
    const resizeHandler = vi.fn();

    sdk.subscribe('some.event', eventHandler);
    sdk.onThemeChange(themeHandler);
    sdk.onResize(resizeHandler);

    // Dispatch DESTROY
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'DESTROY' },
      }),
    );

    // Now dispatch events -- none of the handlers should fire
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'EVENT', event: { type: 'some.event', payload: 'x' } },
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'THEME_UPDATE', theme: { '--sn-bg': '#000' } },
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'RESIZE', width: 100, height: 100 },
      }),
    );

    expect(eventHandler).not.toHaveBeenCalled();
    expect(themeHandler).not.toHaveBeenCalled();
    expect(resizeHandler).not.toHaveBeenCalled();
  });

  it('CONFIG_UPDATE replaces config', () => {
    // Set initial config via INIT
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'INIT', config: { a: 1 } },
      }),
    );
    expect(sdk.getConfig()).toEqual({ a: 1 });

    // Update config
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'CONFIG_UPDATE', config: { b: 2 } },
      }),
    );
    expect(sdk.getConfig()).toEqual({ b: 2 });
  });

  it('emitCrossCanvas() posts CROSS_CANVAS_EMIT to parent', () => {
    sdk.emitCrossCanvas('notifications', { text: 'hello' });

    expect(parentPostMessage).toHaveBeenCalledWith(
      {
        type: 'CROSS_CANVAS_EMIT',
        channel: 'notifications',
        payload: { text: 'hello' },
      },
      '*',
    );
  });

  it('subscribeCrossCanvas() sends CROSS_CANVAS_SUBSCRIBE and registers handler for CROSS_CANVAS_EVENT', () => {
    const handler = vi.fn();
    sdk.subscribeCrossCanvas('notifications', handler);

    // Verify CROSS_CANVAS_SUBSCRIBE was posted
    expect(parentPostMessage).toHaveBeenCalledWith(
      { type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'notifications' },
      '*',
    );

    // Dispatch a CROSS_CANVAS_EVENT from the host
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'CROSS_CANVAS_EVENT',
          channel: 'notifications',
          payload: { text: 'hi' },
        },
      }),
    );

    expect(handler).toHaveBeenCalledWith({ text: 'hi' });
  });

  it('subscribeCrossCanvas() only sends CROSS_CANVAS_SUBSCRIBE once per channel', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    sdk.subscribeCrossCanvas('notifications', handler1);
    sdk.subscribeCrossCanvas('notifications', handler2);

    // CROSS_CANVAS_SUBSCRIBE should only have been sent once
    const subscribeCalls = parentPostMessage.mock.calls.filter(
      (call: any[]) => call[0]?.type === 'CROSS_CANVAS_SUBSCRIBE' && call[0]?.channel === 'notifications',
    );
    expect(subscribeCalls).toHaveLength(1);

    // Both handlers should receive events
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'CROSS_CANVAS_EVENT',
          channel: 'notifications',
          payload: { text: 'both' },
        },
      }),
    );

    expect(handler1).toHaveBeenCalledWith({ text: 'both' });
    expect(handler2).toHaveBeenCalledWith({ text: 'both' });
  });

  it('unsubscribeCrossCanvas() posts CROSS_CANVAS_UNSUBSCRIBE and stops receiving events', () => {
    const handler = vi.fn();
    sdk.subscribeCrossCanvas('alerts', handler);

    // Verify subscription works
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'CROSS_CANVAS_EVENT', channel: 'alerts', payload: { n: 1 } },
      }),
    );
    expect(handler).toHaveBeenCalledTimes(1);

    // Unsubscribe
    sdk.unsubscribeCrossCanvas('alerts');

    expect(parentPostMessage).toHaveBeenCalledWith(
      { type: 'CROSS_CANVAS_UNSUBSCRIBE', channel: 'alerts' },
      '*',
    );

    // No more events should reach the handler
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'CROSS_CANVAS_EVENT', channel: 'alerts', payload: { n: 2 } },
      }),
    );
    expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  it('unsubscribeCrossCanvas() for unknown channel does not error', () => {
    // Should not throw
    sdk.unsubscribeCrossCanvas('nonexistent');

    expect(parentPostMessage).toHaveBeenCalledWith(
      { type: 'CROSS_CANVAS_UNSUBSCRIBE', channel: 'nonexistent' },
      '*',
    );
  });

  it('STATE_REJECTED message logs a warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'STATE_REJECTED', key: 'bigdata', reason: 'exceeds 1MB limit' },
      }),
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('State rejected for key "bigdata"'),
    );

    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 2. SDK Builder Tests
// ---------------------------------------------------------------------------

describe('SDK Builder', () => {
  const defaultOptions = {
    widgetHtml: '<div>Hello</div>',
    widgetId: 'test.widget',
    instanceId: 'inst-123',
  };

  it('builds complete srcdoc HTML with SDK injection', () => {
    const html = buildSrcdoc(defaultOptions);

    // Must be a valid HTML document
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<head>');
    expect(html).toContain('</head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</body>');

    // Must include the SDK script
    expect(html).toContain('<script>');
    expect(html).toContain('window.StickerNest');
  });

  it('includes CSP meta tag in srcdoc', () => {
    const html = buildSrcdoc(defaultOptions);

    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'unsafe-inline'");
    expect(html).toContain("style-src 'unsafe-inline'");
  });

  it('includes widget code after SDK', () => {
    const html = buildSrcdoc(defaultOptions);

    const sdkScriptIndex = html.indexOf('<script>');
    const widgetHtmlIndex = html.indexOf('<div>Hello</div>');

    // Both must exist
    expect(sdkScriptIndex).toBeGreaterThan(-1);
    expect(widgetHtmlIndex).toBeGreaterThan(-1);

    // SDK script must come before widget HTML in the document
    expect(sdkScriptIndex).toBeLessThan(widgetHtmlIndex);
  });

  it('includes base styles (margin:0, box-sizing)', () => {
    const html = buildSrcdoc(defaultOptions);

    expect(html).toContain('box-sizing: border-box');
    expect(html).toContain('margin: 0');
  });

  it('widget code has access to StickerNest global', () => {
    const html = buildSrcdoc(defaultOptions);

    // The SDK script (which creates window.StickerNest) is in the <head>,
    // widget HTML is in <body>. Scripts in the body run after head scripts,
    // so the widget has access to the global.
    const headEnd = html.indexOf('</head>');
    const bodyStart = html.indexOf('<body>');
    const sdkScript = html.indexOf('window.StickerNest');

    // SDK is defined in <head> (before </head>)
    expect(sdkScript).toBeLessThan(headEnd);
    // Widget HTML is in <body> (after <body> tag)
    expect(html.indexOf(defaultOptions.widgetHtml)).toBeGreaterThan(bodyStart);
  });

  it('includes meta tags for sn-widget-id and sn-instance-id', () => {
    const html = buildSrcdoc(defaultOptions);

    expect(html).toContain('name="sn-widget-id" content="test.widget"');
    expect(html).toContain('name="sn-instance-id" content="inst-123"');
  });

  it('HTML-escapes widgetId and instanceId in meta tags', () => {
    const html = buildSrcdoc({
      widgetHtml: '<div>Test</div>',
      widgetId: 'widget"><script>alert(1)</script>',
      instanceId: 'inst&"<>\'',
    });

    // Angle brackets, quotes, and ampersands must be escaped
    expect(html).not.toContain('content="widget"><script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
    expect(html).toContain('&#39;');
  });

  it('includes charset and viewport meta tags', () => {
    const html = buildSrcdoc(defaultOptions);

    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('name="viewport"');
  });
});
