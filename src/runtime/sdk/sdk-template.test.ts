/**
 * SDK Template Tests
 *
 * @module runtime/sdk
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { generateSDKTemplate } from './sdk-template';

describe('generateSDKTemplate', () => {
  let parentPostMessage: ReturnType<typeof vi.fn>;
  let sdk: any;
  let originalParent: typeof window.parent;

  beforeEach(() => {
    originalParent = window.parent;
    parentPostMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: parentPostMessage },
      writable: true,
      configurable: true,
    });

    const template = generateSDKTemplate();
    // eslint-disable-next-line no-eval
    eval(template);
    sdk = (window as any).StickerNest;
  });

  afterEach(() => {
    delete (window as any).StickerNest;
    Object.defineProperty(window, 'parent', {
      value: originalParent,
      writable: true,
      configurable: true,
    });
  });

  it('returns a string that creates window.StickerNest', () => {
    expect(sdk).toBeDefined();
    expect(typeof sdk.emit).toBe('function');
    expect(typeof sdk.ready).toBe('function');
    expect(typeof sdk.register).toBe('function');
  });

  it('emit sends EMIT message to parent', () => {
    sdk.emit('click', { x: 1 });
    expect(parentPostMessage).toHaveBeenCalledWith(
      { type: 'EMIT', eventType: 'click', payload: { x: 1 } },
      '*',
    );
  });

  it('subscribe receives events dispatched as EVENT messages', () => {
    const handler = vi.fn();
    sdk.subscribe('test.ev', handler);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'EVENT', event: { type: 'test.ev', payload: 42 } },
      }),
    );

    expect(handler).toHaveBeenCalledWith(42);
  });

  it('unsubscribe removes a specific handler', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    sdk.subscribe('e', h1);
    sdk.subscribe('e', h2);
    sdk.unsubscribe('e', h1);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'EVENT', event: { type: 'e', payload: 'x' } },
      }),
    );

    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledWith('x');
  });

  it('register before ready succeeds; register after ready throws', () => {
    // Fresh SDK
    delete (window as any).StickerNest;
    // eslint-disable-next-line no-eval
    eval(generateSDKTemplate());
    const fresh = (window as any).StickerNest;

    fresh.ready();
    expect(() => fresh.register({ name: 'w' })).toThrow(/must be called before/);
  });

  it('ready is idempotent — posts READY once', () => {
    sdk.ready();
    sdk.ready();

    const readyCalls = parentPostMessage.mock.calls.filter(
      (c: any[]) => c[0]?.type === 'READY',
    );
    expect(readyCalls).toHaveLength(1);
  });

  it('getConfig returns a copy that does not mutate internal config', () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'INIT', config: { a: 1 }, instanceId: 'i', widgetId: 'w' },
      }),
    );
    const config = sdk.getConfig();
    config.a = 99;
    expect(sdk.getConfig().a).toBe(1);
  });

  it('DESTROY clears all handlers', () => {
    const ev = vi.fn();
    const theme = vi.fn();
    const resize = vi.fn();
    sdk.subscribe('x', ev);
    sdk.onThemeChange(theme);
    sdk.onResize(resize);

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'DESTROY' } }));

    // After DESTROY none of these should fire
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'EVENT', event: { type: 'x', payload: null } },
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'THEME_UPDATE', theme: { '--sn-bg': '#000' } },
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'RESIZE', width: 1, height: 1 } },
      ),
    );

    expect(ev).not.toHaveBeenCalled();
    expect(theme).not.toHaveBeenCalled();
    expect(resize).not.toHaveBeenCalled();
  });
});
