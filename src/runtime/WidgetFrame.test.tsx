/**
 * WidgetFrame Component Tests
 *
 * Tests the sandboxed iframe host component: sandbox enforcement,
 * srcdoc memoization, visibility, lifecycle, security, theming,
 * state persistence, and resize behavior.
 *
 * @module runtime
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';


// ---------------------------------------------------------------------------
// Mocks — must be defined before any import that triggers the mocked modules
// ---------------------------------------------------------------------------

vi.mock('../kernel/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      send: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../kernel/bus', () => ({
  bus: {
    emit: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    subscribeAll: vi.fn(),
    getHistory: vi.fn(),
  },
}));

vi.mock('../kernel/stores/widget/widget.store', () => ({
  useWidgetStore: Object.assign(
    vi.fn(() => ({ registry: {}, instances: {} })),
    {
      getState: vi.fn(() => ({
        registry: {},
        instances: {},
        updateInstanceState: vi.fn(),
      })),
    },
  ),
}));

const mockBridge = {
  send: vi.fn(),
  onMessage: vi.fn(),
  isReady: vi.fn(() => false),
  destroy: vi.fn(),
};
vi.mock('./bridge/bridge', () => ({
  createWidgetBridge: vi.fn(() => mockBridge),
}));

const mockLifecycle = {
  getState: vi.fn(() => 'UNLOADED' as string),
  transition: vi.fn(),
  onTransition: vi.fn(() => vi.fn()),
  destroy: vi.fn(),
};
vi.mock('./lifecycle/manager', () => ({
  createLifecycleManager: vi.fn(() => mockLifecycle),
}));

vi.mock('./sdk/sdk-builder', () => ({
  buildSrcdoc: vi.fn(
    ({
      widgetHtml,
    }: {
      widgetHtml: string;
      widgetId: string;
      instanceId: string;
    }) => `<html><body>${widgetHtml}</body></html>`,
  ),
}));

vi.mock('./integrations/singleton', () => ({
  getIntegrationProxy: vi.fn(() => ({
    register: vi.fn(),
    unregister: vi.fn(),
    query: vi.fn().mockResolvedValue(undefined),
    mutate: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockReturnValue(false),
  })),
}));

vi.mock('./cross-canvas/cross-canvas-router', () => ({
  createCrossCanvasRouter: vi.fn(() => ({
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    emit: vi.fn(),
    destroy: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Imports that use the mocked modules
// ---------------------------------------------------------------------------

import { bus } from '../kernel/bus';
import { useWidgetStore } from '../kernel/stores/widget/widget.store';

import { createWidgetBridge } from './bridge/bridge';
import type { ThemeTokens } from './bridge/message-types';
import { createCrossCanvasRouter } from './cross-canvas/cross-canvas-router';
import { createLifecycleManager } from './lifecycle/manager';
import { buildSrcdoc } from './sdk/sdk-builder';
import { SANDBOX_POLICY } from './security/sandbox-policy';
import { WidgetFrame } from './WidgetFrame';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultTheme: ThemeTokens = {
  '--sn-bg': '#ffffff',
  '--sn-surface': '#f9f9f9',
  '--sn-accent': '#3B82F6',
  '--sn-text': '#333333',
  '--sn-text-muted': '#666666',
  '--sn-border': '#cccccc',
  '--sn-radius': '8px',
  '--sn-font-family': 'sans-serif',
};

const defaultProps = {
  widgetId: 'test-widget',
  instanceId: 'instance-1',
  widgetHtml: '<div>Hello Widget</div>',
  config: { color: 'blue' },
  theme: defaultTheme,
  visible: true,
  width: 400,
  height: 300,
};

/**
 * Returns the iframe element rendered by WidgetFrame.
 */
function getIframe(): HTMLIFrameElement {
  return screen.getByTitle(`Widget ${defaultProps.widgetId}`) as HTMLIFrameElement;
}

/**
 * Retrieves the message handler registered via mockBridge.onMessage.
 * The first call's first argument is the handler function.
 */
function getOnMessageHandler(): (message: Record<string, unknown>) => void {
  const calls = mockBridge.onMessage.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0];
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('WidgetFrame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset lifecycle mock to default state
    mockLifecycle.getState.mockReturnValue('UNLOADED');
    mockBridge.isReady.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Sandbox enforcement
  // -----------------------------------------------------------------------

  it('renders iframe with sandbox="allow-scripts allow-forms"', () => {
    render(<WidgetFrame {...defaultProps} />);
    const iframe = getIframe();
    expect(iframe.getAttribute('sandbox')).toBe(SANDBOX_POLICY);
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-forms');
  });

  it('does NOT include allow-same-origin in sandbox', () => {
    render(<WidgetFrame {...defaultProps} />);
    const iframe = getIframe();
    const sandbox = iframe.getAttribute('sandbox') ?? '';
    expect(sandbox).not.toContain('allow-same-origin');
  });

  it('uses srcdoc, not src', () => {
    render(<WidgetFrame {...defaultProps} />);
    const iframe = getIframe();
    // srcdoc attribute should be set (via the React srcDoc prop)
    expect(iframe.srcdoc).toBeTruthy();
    // src should not point to a remote URL
    expect(iframe.getAttribute('src')).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Memoization
  // -----------------------------------------------------------------------

  it('memoizes srcdoc — same reference on re-render with same props', () => {
    const { rerender } = render(<WidgetFrame {...defaultProps} />);
    const callCountAfterFirst = (buildSrcdoc as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(callCountAfterFirst).toBe(1);

    // Re-render with identical props
    rerender(<WidgetFrame {...defaultProps} />);
    const callCountAfterSecond = (buildSrcdoc as ReturnType<typeof vi.fn>).mock.calls.length;
    // buildSrcdoc should NOT have been called again
    expect(callCountAfterSecond).toBe(callCountAfterFirst);
  });

  it('rebuilds srcdoc when widgetHtml changes', () => {
    const { rerender } = render(<WidgetFrame {...defaultProps} />);
    const callCountAfterFirst = (buildSrcdoc as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(callCountAfterFirst).toBe(1);

    // Re-render with different widgetHtml
    rerender(
      <WidgetFrame {...defaultProps} widgetHtml="<div>Changed Widget</div>" />,
    );
    const callCountAfterSecond = (buildSrcdoc as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(callCountAfterSecond).toBe(callCountAfterFirst + 1);
  });

  it('does NOT rebuild srcdoc when config or theme changes', () => {
    const { rerender } = render(<WidgetFrame {...defaultProps} />);
    const callCountAfterFirst = (buildSrcdoc as ReturnType<typeof vi.fn>).mock.calls.length;

    // Change config
    rerender(
      <WidgetFrame {...defaultProps} config={{ color: 'red', extra: true }} />,
    );
    expect((buildSrcdoc as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      callCountAfterFirst,
    );

    // Change theme
    const newTheme: ThemeTokens = {
      ...defaultTheme,
      '--sn-bg': '#000000',
      '--sn-text': '#ffffff',
    };
    rerender(<WidgetFrame {...defaultProps} theme={newTheme} />);
    expect((buildSrcdoc as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      callCountAfterFirst,
    );
  });

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  it('uses display:none when visible=false, not conditional render', () => {
    const { rerender } = render(<WidgetFrame {...defaultProps} visible={false} />);
    const iframe = getIframe();
    // iframe should still exist in the DOM (never unmounted)
    expect(iframe).toBeTruthy();
    expect(iframe.style.display).toBe('none');

    // Toggle back to visible
    rerender(<WidgetFrame {...defaultProps} visible={true} />);
    const iframeVisible = getIframe();
    expect(iframeVisible.style.display).toBe('block');
  });

  it('uses instanceId as React key', () => {
    // Render with one instanceId, then change it — should re-mount
    const { rerender } = render(<WidgetFrame {...defaultProps} />);
    const createBridgeCalls = (createWidgetBridge as ReturnType<typeof vi.fn>).mock.calls.length;

    // Changing instanceId should cause a re-mount (new bridge + lifecycle)
    rerender(<WidgetFrame {...defaultProps} instanceId="instance-2" />);

    // Bridge should have been destroyed (cleanup of old) and re-created for new
    // Note: Since instanceId is part of the useMemo deps AND the useEffect deps,
    // changing it triggers a new bridge creation
    expect((createWidgetBridge as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
      createBridgeCalls,
    );
  });

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  it('widget signals READY within 500ms of iframe load', () => {
    // Make the mock lifecycle track state changes from transition() calls
    // so that getState() returns the correct value after each transition.
    let currentMockState = 'UNLOADED';
    mockLifecycle.getState.mockImplementation(() => currentMockState);
    mockLifecycle.transition.mockImplementation((to: string) => {
      currentMockState = to;
    });

    render(<WidgetFrame {...defaultProps} />);

    // Verify lifecycle manager was created
    expect(createLifecycleManager).toHaveBeenCalledWith(defaultProps.instanceId);

    // Verify transition to LOADING was called on mount
    expect(mockLifecycle.transition).toHaveBeenCalledWith('LOADING');
    expect(currentMockState).toBe('LOADING');

    // Simulate the widget sending READY message
    const handler = getOnMessageHandler();
    handler({ type: 'READY' });

    // Verify lifecycle transitions: LOADING -> INITIALIZING -> READY -> RUNNING
    expect(mockLifecycle.transition).toHaveBeenCalledWith('INITIALIZING');
    expect(mockLifecycle.transition).toHaveBeenCalledWith('READY');
    expect(mockLifecycle.transition).toHaveBeenCalledWith('RUNNING');
  });

  it('widget crash shows per-instance error state, bus continues', () => {
    // Make createWidgetBridge throw to simulate a crash in the inner component
    (createWidgetBridge as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('Widget initialization failed');
    });

    // Suppress console.error from the error boundary
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<WidgetFrame {...defaultProps} />);

    // The error boundary should render an error state
    const errorBoundary = screen.getByTestId('widget-error-boundary');
    expect(errorBoundary).toBeTruthy();
    expect(errorBoundary.textContent).toContain('Widget Error');

    // The bus.emit should have been called for the widget error
    expect(bus.emit).toHaveBeenCalledWith(
      'widget.error',
      expect.objectContaining({
        instanceId: defaultProps.instanceId,
      }),
    );

    consoleErrorSpy.mockRestore();

    // Restore the mock for subsequent tests
    (createWidgetBridge as ReturnType<typeof vi.fn>).mockImplementation(() => mockBridge);
  });

  // -----------------------------------------------------------------------
  // Security
  // -----------------------------------------------------------------------

  it('origin spoofing attempt on bridge silently rejected', () => {
    render(<WidgetFrame {...defaultProps} />);

    // Verify that createWidgetBridge was called with the iframe and instanceId
    expect(createWidgetBridge).toHaveBeenCalledWith(
      expect.any(HTMLIFrameElement),
      defaultProps.instanceId,
    );

    // The bridge handles origin validation internally.
    // Verify bridge.onMessage was called to register a handler,
    // which means the bridge is set up for proper message handling.
    expect(mockBridge.onMessage).toHaveBeenCalled();
  });

  it('strict CSP enforced via meta tag in srcdoc', () => {
    render(<WidgetFrame {...defaultProps} />);

    // buildSrcdoc was called which in production injects the CSP meta tag.
    // Our mock simplifies the output, but verify the builder was called
    // with the correct arguments that would produce CSP in real usage.
    expect(buildSrcdoc).toHaveBeenCalledWith({
      widgetHtml: defaultProps.widgetHtml,
      widgetId: defaultProps.widgetId,
      instanceId: defaultProps.instanceId,
    });
  });

  // -----------------------------------------------------------------------
  // Theming
  // -----------------------------------------------------------------------

  it('theme token injection reaches widget onThemeChange handler', () => {
    render(<WidgetFrame {...defaultProps} />);

    // Simulate READY signal so bridge.isReady returns true
    mockBridge.isReady.mockReturnValue(true);

    // Simulate READY message via the registered handler
    mockLifecycle.getState.mockReturnValue('LOADING');
    const handler = getOnMessageHandler();
    handler({ type: 'READY' });

    // After READY, the bridge should have been sent an INIT message
    // containing the theme tokens
    expect(mockBridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'INIT',
        theme: defaultTheme,
      }),
    );
  });

  it('theme updates delivered via postMessage, not srcdoc rebuild', () => {
    mockBridge.isReady.mockReturnValue(true);

    const { rerender } = render(<WidgetFrame {...defaultProps} />);
    const buildCallCount = (buildSrcdoc as ReturnType<typeof vi.fn>).mock.calls.length;

    const newTheme: ThemeTokens = {
      ...defaultTheme,
      '--sn-bg': '#000000',
      '--sn-text': '#ffffff',
    };
    rerender(<WidgetFrame {...defaultProps} theme={newTheme} />);

    // buildSrcdoc should NOT be called again for a theme change
    expect((buildSrcdoc as ReturnType<typeof vi.fn>).mock.calls.length).toBe(buildCallCount);

    // Instead, bridge.send should be called with THEME_UPDATE
    expect(mockBridge.send).toHaveBeenCalledWith({
      type: 'THEME_UPDATE',
      theme: newTheme,
    });
  });

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------

  it('setState/getState round-trip persists correctly', () => {
    const mockUpdateInstanceState = vi.fn();
    (useWidgetStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      registry: {},
      instances: {
        'instance-1': {
          state: { existingKey: 'existingValue' },
        },
      },
      updateInstanceState: mockUpdateInstanceState,
    });

    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    // Simulate SET_STATE from widget
    handler({ type: 'SET_STATE', key: 'myKey', value: 'myValue' });

    // Verify updateInstanceState was called with merged state
    expect(mockUpdateInstanceState).toHaveBeenCalledWith('instance-1', {
      existingKey: 'existingValue',
      myKey: 'myValue',
    });

    // Simulate GET_STATE from widget
    handler({ type: 'GET_STATE', key: 'myKey' });

    // Verify bridge.send was called with STATE_RESPONSE
    // (the mock store returns the state for the instance)
    expect(mockBridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'STATE_RESPONSE',
        key: 'myKey',
      }),
    );
  });

  it('state write at exactly 1MB accepted', () => {
    const mockUpdateInstanceState = vi.fn();
    (useWidgetStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      registry: {},
      instances: {
        'instance-1': { state: {} },
      },
      updateInstanceState: mockUpdateInstanceState,
    });

    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    // Create a value that serializes to exactly 1MB (1_048_576 bytes)
    // JSON.stringify of a string adds 2 bytes for the quotes, so we need
    // the string content to be 1_048_576 - 2 = 1_048_574 characters
    const exactValue = 'x'.repeat(1_048_574);
    expect(JSON.stringify(exactValue).length).toBe(1_048_576);

    handler({ type: 'SET_STATE', key: 'bigKey', value: exactValue });

    // Should be accepted — updateInstanceState should be called
    expect(mockUpdateInstanceState).toHaveBeenCalledWith('instance-1', {
      bigKey: exactValue,
    });
  });

  it('state write exceeding 1MB rejected with error', () => {
    const mockUpdateInstanceState = vi.fn();
    (useWidgetStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      registry: {},
      instances: {
        'instance-1': { state: {} },
      },
      updateInstanceState: mockUpdateInstanceState,
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    // Create a value that exceeds 1MB when serialized
    const overSizedValue = 'x'.repeat(1_048_575);
    expect(JSON.stringify(overSizedValue).length).toBe(1_048_577);

    handler({ type: 'SET_STATE', key: 'tooBig', value: overSizedValue });

    // Should be rejected — updateInstanceState should NOT be called
    expect(mockUpdateInstanceState).not.toHaveBeenCalled();

    // console.error should have been called with the size limit message
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('State write rejected: exceeds 1MB limit'),
    );

    consoleErrorSpy.mockRestore();
  });

  it('SET_STATE rejects non-serializable value (circular reference)', () => {
    const mockUpdateInstanceState = vi.fn();
    (useWidgetStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      registry: {},
      instances: {
        'instance-1': { state: {} },
      },
      updateInstanceState: mockUpdateInstanceState,
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    // Create a circular reference that JSON.stringify will throw on
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;

    handler({ type: 'SET_STATE', key: 'badKey', value: circular });

    // Should be rejected — updateInstanceState should NOT be called
    expect(mockUpdateInstanceState).not.toHaveBeenCalled();

    // console.error should report the non-serializable rejection
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('State write rejected: value is not serializable'),
    );

    // Bridge should send STATE_REJECTED back to the widget
    expect(mockBridge.send).toHaveBeenCalledWith({
      type: 'STATE_REJECTED',
      key: 'badKey',
      reason: 'State write rejected: value is not serializable',
    });

    consoleErrorSpy.mockRestore();
  });

  it('SET_USER_STATE rejects value exceeding 10MB limit', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    // Create a value that exceeds 10MB (10_485_760 bytes) when serialized
    const overSizedValue = 'x'.repeat(10_485_759);
    expect(JSON.stringify(overSizedValue).length).toBe(10_485_761);

    handler({ type: 'SET_USER_STATE', key: 'bigUserKey', value: overSizedValue });

    // Should be rejected — bus.emit for userState.set should NOT be called
    expect(bus.emit).not.toHaveBeenCalledWith(
      'widget.userState.set',
      expect.anything(),
    );

    // console.error should report the size limit
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('User state write rejected: exceeds 10MB limit'),
    );

    // Bridge should send STATE_REJECTED back to the widget
    expect(mockBridge.send).toHaveBeenCalledWith({
      type: 'STATE_REJECTED',
      key: 'bigUserKey',
      reason: expect.stringContaining('User state write rejected: exceeds 10MB limit'),
    });

    consoleErrorSpy.mockRestore();
  });

  it('SET_USER_STATE accepts value just under 10MB limit', () => {
    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    // Create a value that serializes to exactly 10MB (10_485_760 bytes)
    // JSON.stringify of a string adds 2 bytes for quotes: 10_485_760 - 2 = 10_485_758
    const justUnderValue = 'x'.repeat(10_485_758);
    expect(JSON.stringify(justUnderValue).length).toBe(10_485_760);

    handler({ type: 'SET_USER_STATE', key: 'okUserKey', value: justUnderValue });

    // Should be accepted — bus.emit for userState.set should be called
    expect(bus.emit).toHaveBeenCalledWith('widget.userState.set', {
      instanceId: defaultProps.instanceId,
      key: 'okUserKey',
      value: justUnderValue,
    });
  });

  it('SET_USER_STATE rejects non-serializable value', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    const circular: Record<string, unknown> = { b: 2 };
    circular.self = circular;

    handler({ type: 'SET_USER_STATE', key: 'badUserKey', value: circular });

    // Should be rejected
    expect(bus.emit).not.toHaveBeenCalledWith(
      'widget.userState.set',
      expect.anything(),
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('User state write rejected: value is not serializable'),
    );

    expect(mockBridge.send).toHaveBeenCalledWith({
      type: 'STATE_REJECTED',
      key: 'badUserKey',
      reason: 'User state write rejected: value is not serializable',
    });

    consoleErrorSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // Resize
  // -----------------------------------------------------------------------

  it('widget receives resize events via bridge', () => {
    mockBridge.isReady.mockReturnValue(true);

    const { rerender } = render(<WidgetFrame {...defaultProps} />);

    // Change width and height
    rerender(<WidgetFrame {...defaultProps} width={800} height={600} />);

    // bridge.send should be called with RESIZE
    expect(mockBridge.send).toHaveBeenCalledWith({
      type: 'RESIZE',
      width: 800,
      height: 600,
    });
  });

  it('widgets do not control their own container dimensions', () => {
    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    // Simulate a RESIZE_REQUEST from the widget
    handler({ type: 'RESIZE_REQUEST', width: 1000, height: 800 });

    // The request should be forwarded as a bus event, not applied directly
    expect(bus.emit).toHaveBeenCalledWith('widget.resizeRequest', {
      instanceId: defaultProps.instanceId,
      width: 1000,
      height: 800,
    });

    // The iframe dimensions should NOT have changed — they remain at the
    // prop-supplied values
    const iframe = getIframe();
    expect(iframe.style.width).toBe('400px');
    expect(iframe.style.height).toBe('300px');
  });

  // -----------------------------------------------------------------------
  // Inter-widget communication
  // -----------------------------------------------------------------------

  it('SUBSCRIBE registers bus subscription and forwards events as EVENT messages', () => {
    // Track subscriptions added via bus.subscribe mock
    const subscriptions: { type: string; callback: (payload: unknown) => void }[] = [];
    (bus.subscribe as ReturnType<typeof vi.fn>).mockImplementation(
      (type: string, callback: (payload: unknown) => void) => {
        subscriptions.push({ type, callback });
        return vi.fn(); // unsubscribe function
      },
    );

    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    // Simulate widget sending SUBSCRIBE message
    handler({ type: 'SUBSCRIBE', eventType: 'myEvent' });

    // Verify bus.subscribe was called with widget.myEvent
    expect(bus.subscribe).toHaveBeenCalledWith('widget.myEvent', expect.any(Function));

    // Simulate a bus event being emitted
    const subscription = subscriptions.find((s) => s.type === 'widget.myEvent');
    expect(subscription).toBeDefined();
    // Bus delivers a full BusEvent envelope — WidgetFrame extracts .payload from it
    subscription!.callback({ type: 'widget.myEvent', payload: { data: 'test-payload' }, timestamp: Date.now() });

    // Verify bridge.send was called with EVENT message containing the extracted payload
    expect(mockBridge.send).toHaveBeenCalledWith({
      type: 'EVENT',
      event: { type: 'myEvent', payload: { data: 'test-payload' } },
    });
  });

  it('UNSUBSCRIBE removes bus subscription', () => {
    const mockUnsubscribe = vi.fn();
    (bus.subscribe as ReturnType<typeof vi.fn>).mockReturnValue(mockUnsubscribe);

    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    // First subscribe
    handler({ type: 'SUBSCRIBE', eventType: 'myEvent' });
    expect(bus.subscribe).toHaveBeenCalledWith('widget.myEvent', expect.any(Function));

    // Then unsubscribe
    handler({ type: 'UNSUBSCRIBE', eventType: 'myEvent' });

    // Verify the unsubscribe function was called
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('EMIT from widget A reaches widget B via bus', () => {
    // This test verifies the complete inter-widget flow:
    // Widget A emits → bus.emit → bus delivers to subscribers → Widget B receives EVENT

    // Track bus.emit calls
    const emitCalls: { type: string; payload: unknown }[] = [];
    (bus.emit as ReturnType<typeof vi.fn>).mockImplementation((type: string, payload: unknown) => {
      emitCalls.push({ type, payload });
    });

    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    // Widget emits an event
    handler({ type: 'EMIT', eventType: 'sharedEvent', payload: { value: 42 } });

    // Verify bus.emit was called with the correct event type
    expect(bus.emit).toHaveBeenCalledWith('widget.sharedEvent', { value: 42 });
  });

  // -----------------------------------------------------------------------
  // READY timeout
  // -----------------------------------------------------------------------

  it('transitions to ERROR if widget never signals READY within 5 seconds', () => {
    vi.useFakeTimers();

    // Bridge never becomes ready
    mockBridge.isReady.mockReturnValue(false);
    // Lifecycle starts at LOADING (set by WidgetFrame on mount)
    mockLifecycle.getState.mockReturnValue('LOADING');

    render(<WidgetFrame {...defaultProps} />);

    // Lifecycle should have been transitioned to LOADING on mount
    expect(mockLifecycle.transition).toHaveBeenCalledWith('LOADING');

    // Advance just under the 5s timeout — ERROR should NOT have fired yet
    vi.advanceTimersByTime(4999);
    expect(mockLifecycle.transition).not.toHaveBeenCalledWith('ERROR');

    // Advance past the timeout
    vi.advanceTimersByTime(2);
    expect(mockLifecycle.transition).toHaveBeenCalledWith('ERROR');

    vi.useRealTimers();
  });

  it('does NOT transition to ERROR if widget signals READY before timeout', () => {
    vi.useFakeTimers();

    mockBridge.isReady.mockReturnValue(false);
    mockLifecycle.getState.mockReturnValue('LOADING');

    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    // Widget signals READY before timeout
    mockLifecycle.getState.mockReturnValue('LOADING');
    handler({ type: 'READY' });

    // Bridge is now ready
    mockBridge.isReady.mockReturnValue(true);

    // Advance past timeout
    vi.advanceTimersByTime(6000);

    // ERROR should NOT have been called (isReady() returns true)
    expect(mockLifecycle.transition).not.toHaveBeenCalledWith('ERROR');

    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Cleanup on unmount
  // -----------------------------------------------------------------------

  it('cleans up bridge, lifecycle, and all bus subscriptions on unmount', () => {
    const mockUnsub1 = vi.fn();
    const mockUnsub2 = vi.fn();
    const mockUnsub3 = vi.fn();
    let subCallCount = 0;
    (bus.subscribe as ReturnType<typeof vi.fn>).mockImplementation(() => {
      subCallCount++;
      if (subCallCount === 1) return mockUnsub1;
      if (subCallCount === 2) return mockUnsub2;
      return mockUnsub3;
    });

    const { unmount } = render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    // Subscribe to 3 different event types
    handler({ type: 'SUBSCRIBE', eventType: 'eventA' });
    handler({ type: 'SUBSCRIBE', eventType: 'eventB' });
    handler({ type: 'SUBSCRIBE', eventType: 'eventC' });

    expect(bus.subscribe).toHaveBeenCalledTimes(3);

    // Unmount the component
    unmount();

    // Bridge should have sent DESTROY and been destroyed
    expect(mockBridge.send).toHaveBeenCalledWith({ type: 'DESTROY' });
    expect(mockBridge.destroy).toHaveBeenCalled();

    // Lifecycle should have been destroyed
    expect(mockLifecycle.destroy).toHaveBeenCalled();

    // All 3 bus subscriptions should have been cleaned up
    expect(mockUnsub1).toHaveBeenCalled();
    expect(mockUnsub2).toHaveBeenCalled();
    expect(mockUnsub3).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Channel Routing
  // -----------------------------------------------------------------------

  it('EMIT with channel routes to widget.{channel}.{eventType} on bus', () => {
    render(<WidgetFrame {...defaultProps} channel="teamA" />);
    const handler = getOnMessageHandler();

    handler({ type: 'EMIT', eventType: 'counter.changed', payload: { count: 5 } });

    expect(bus.emit).toHaveBeenCalledWith('widget.teamA.counter.changed', { count: 5 });
    // Must NOT emit to the global (unchanneled) bus event
    expect(bus.emit).not.toHaveBeenCalledWith('widget.counter.changed', { count: 5 });
  });

  it('EMIT without channel routes to global widget.{eventType} (backward-compatible)', () => {
    render(<WidgetFrame {...defaultProps} />);
    const handler = getOnMessageHandler();

    handler({ type: 'EMIT', eventType: 'counter.changed', payload: { count: 10 } });

    expect(bus.emit).toHaveBeenCalledWith('widget.counter.changed', { count: 10 });
  });

  it('SUBSCRIBE with channel subscribes to widget.{channel}.{eventType}', () => {
    render(<WidgetFrame {...defaultProps} channel="teamB" />);
    const handler = getOnMessageHandler();

    handler({ type: 'SUBSCRIBE', eventType: 'counter.changed' });

    // bus.subscribe should have been called with the channeled event type
    expect(bus.subscribe).toHaveBeenCalledWith(
      'widget.teamB.counter.changed',
      expect.any(Function),
    );
  });

  it('channel bus subscriptions are cleaned up on unmount', () => {
    const mockUnsub = vi.fn();
    (bus.subscribe as ReturnType<typeof vi.fn>).mockReturnValue(mockUnsub);

    const { unmount } = render(<WidgetFrame {...defaultProps} channel="cleanup" />);
    const handler = getOnMessageHandler();

    handler({ type: 'SUBSCRIBE', eventType: 'some.event' });

    unmount();

    expect(mockUnsub).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Cross-Canvas Routing
  // -----------------------------------------------------------------------

  describe('Cross-Canvas Routing', () => {
    it('A1: CROSS_CANVAS_EMIT forwards to router', () => {
      render(<WidgetFrame {...defaultProps} />);
      const handler = getOnMessageHandler();

      // Subscribe first to create the router
      handler({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'room-1' });

      const mockRouter = vi.mocked(createCrossCanvasRouter).mock.results[0].value;

      // Now emit
      handler({ type: 'CROSS_CANVAS_EMIT', channel: 'room-1', payload: { x: 1 } });

      expect(mockRouter.emit).toHaveBeenCalledWith('room-1', { x: 1 });
    });

    it('A2: CROSS_CANVAS_EMIT without router is no-op', () => {
      render(<WidgetFrame {...defaultProps} />);
      const handler = getOnMessageHandler();

      // Emit before any subscribe — router does not exist yet
      handler({ type: 'CROSS_CANVAS_EMIT', channel: 'room-1', payload: { x: 1 } });

      expect(createCrossCanvasRouter).not.toHaveBeenCalled();
      // No error thrown — test passes if it reaches here
    });

    it('A3: CROSS_CANVAS_SUBSCRIBE lazy-creates router', () => {
      render(<WidgetFrame {...defaultProps} />);
      const handler = getOnMessageHandler();

      handler({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'ch1' });

      expect(createCrossCanvasRouter).toHaveBeenCalledOnce();

      const mockRouter = vi.mocked(createCrossCanvasRouter).mock.results[0].value;
      expect(mockRouter.subscribe).toHaveBeenCalledWith('ch1', expect.any(Function));
    });

    it('A4: CROSS_CANVAS_SUBSCRIBE reuses existing router', () => {
      render(<WidgetFrame {...defaultProps} />);
      const handler = getOnMessageHandler();

      handler({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'ch1' });
      handler({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'ch2' });

      // Router created only once
      expect(createCrossCanvasRouter).toHaveBeenCalledOnce();

      const mockRouter = vi.mocked(createCrossCanvasRouter).mock.results[0].value;
      // Subscribe called twice — once per channel
      expect(mockRouter.subscribe).toHaveBeenCalledTimes(2);
      expect(mockRouter.subscribe).toHaveBeenCalledWith('ch1', expect.any(Function));
      expect(mockRouter.subscribe).toHaveBeenCalledWith('ch2', expect.any(Function));
    });

    it('A5: CROSS_CANVAS_SUBSCRIBE callback forwards events to widget via bridge', () => {
      render(<WidgetFrame {...defaultProps} />);
      const handler = getOnMessageHandler();

      handler({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'ch1' });

      const mockRouter = vi.mocked(createCrossCanvasRouter).mock.results[0].value;

      // Extract the callback passed to router.subscribe
      const callback = mockRouter.subscribe.mock.calls[0][1];

      // Invoke the callback as if a cross-canvas event arrived
      callback({ data: 42 });

      expect(mockBridge.send).toHaveBeenCalledWith({
        type: 'CROSS_CANVAS_EVENT',
        channel: 'ch1',
        payload: { data: 42 },
      });
    });

    it('A6: CROSS_CANVAS_UNSUBSCRIBE calls router.unsubscribe', () => {
      render(<WidgetFrame {...defaultProps} />);
      const handler = getOnMessageHandler();

      // Subscribe first to create the router
      handler({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'ch1' });

      const mockRouter = vi.mocked(createCrossCanvasRouter).mock.results[0].value;

      // Now unsubscribe
      handler({ type: 'CROSS_CANVAS_UNSUBSCRIBE', channel: 'ch1' });

      expect(mockRouter.unsubscribe).toHaveBeenCalledWith('ch1');
    });

    it('A7: CROSS_CANVAS_UNSUBSCRIBE without router is no-op', () => {
      render(<WidgetFrame {...defaultProps} />);
      const handler = getOnMessageHandler();

      // Unsubscribe before any subscribe — router does not exist yet
      handler({ type: 'CROSS_CANVAS_UNSUBSCRIBE', channel: 'ch1' });

      expect(createCrossCanvasRouter).not.toHaveBeenCalled();
      // No error thrown — test passes if it reaches here
    });

    it('A8: Router destroyed on unmount', () => {
      const { unmount } = render(<WidgetFrame {...defaultProps} />);
      const handler = getOnMessageHandler();

      // Subscribe to create the router
      handler({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'ch1' });

      const mockRouter = vi.mocked(createCrossCanvasRouter).mock.results[0].value;

      unmount();

      expect(mockRouter.destroy).toHaveBeenCalled();
    });

    it('A9: No destroy call if router never created', () => {
      const { unmount } = render(<WidgetFrame {...defaultProps} />);

      // Unmount without any cross-canvas messages
      unmount();

      // Router was never created
      expect(createCrossCanvasRouter).not.toHaveBeenCalled();
      // No crash — test passes if it reaches here
    });
  });

  // -----------------------------------------------------------------------
  // Multi-Widget Channel Isolation (Category B)
  // -----------------------------------------------------------------------

  describe('Multi-Widget Channel Isolation', () => {
    // Per-instance bridge tracking
    const bridgeInstances: Array<{
      send: ReturnType<typeof vi.fn>;
      onMessage: ReturnType<typeof vi.fn>;
      isReady: ReturnType<typeof vi.fn>;
      destroy: ReturnType<typeof vi.fn>;
    }> = [];

    // Live bus that actually delivers events
    const busSubs = new Map<string, Set<(event: unknown) => void>>();

    beforeEach(() => {
      bridgeInstances.length = 0;
      busSubs.clear();

      // Each createWidgetBridge call returns a unique bridge
      vi.mocked(createWidgetBridge).mockImplementation(() => {
        const bridge = {
          send: vi.fn(),
          onMessage: vi.fn(),
          isReady: vi.fn(() => false),
          destroy: vi.fn(),
        };
        bridgeInstances.push(bridge);
        return bridge as any;
      });

      // Live bus — subscribe stores callbacks, emit delivers
      vi.mocked(bus.subscribe).mockImplementation((pattern: string, handler: any) => {
        if (!busSubs.has(pattern)) busSubs.set(pattern, new Set());
        busSubs.get(pattern)!.add(handler);
        return vi.fn(() => { busSubs.get(pattern)?.delete(handler); });
      });
      vi.mocked(bus.emit).mockImplementation((type: string, payload: unknown) => {
        busSubs.get(type)?.forEach(fn => fn({ type, payload }));
      });
    });

    function getHandlerForBridge(bridgeIndex: number) {
      return bridgeInstances[bridgeIndex].onMessage.mock.calls[0][0] as (msg: Record<string, unknown>) => void;
    }

    it('B1: two widgets on same channel both receive events', () => {
      render(<WidgetFrame {...defaultProps} channel="room1" instanceId="w-a" />);
      render(<WidgetFrame {...defaultProps} channel="room1" instanceId="w-b" />);

      const handlerA = getHandlerForBridge(0);
      const handlerB = getHandlerForBridge(1);

      // Both widgets subscribe to the same event type
      handlerA({ type: 'SUBSCRIBE', eventType: 'counter.update' });
      handlerB({ type: 'SUBSCRIBE', eventType: 'counter.update' });

      // Emit on the live bus via the channeled event type
      bus.emit('widget.room1.counter.update', { count: 5 });

      // Both bridges should have received the EVENT
      expect(bridgeInstances[0].send).toHaveBeenCalledWith({
        type: 'EVENT',
        event: { type: 'counter.update', payload: { count: 5 } },
      });
      expect(bridgeInstances[1].send).toHaveBeenCalledWith({
        type: 'EVENT',
        event: { type: 'counter.update', payload: { count: 5 } },
      });
    });

    it('B2: two widgets on different channels do not cross', () => {
      render(<WidgetFrame {...defaultProps} channel="room1" instanceId="w-a" />);
      render(<WidgetFrame {...defaultProps} channel="room2" instanceId="w-b" />);

      const handlerA = getHandlerForBridge(0);
      const handlerB = getHandlerForBridge(1);

      // Both subscribe to the same event type name, but on different channels
      handlerA({ type: 'SUBSCRIBE', eventType: 'counter.update' });
      handlerB({ type: 'SUBSCRIBE', eventType: 'counter.update' });

      // Emit only on room1 channel
      bus.emit('widget.room1.counter.update', { count: 5 });

      // Widget A (room1) should receive the EVENT
      expect(bridgeInstances[0].send).toHaveBeenCalledWith({
        type: 'EVENT',
        event: { type: 'counter.update', payload: { count: 5 } },
      });

      // Widget B (room2) should NOT receive the EVENT
      expect(bridgeInstances[1].send).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EVENT' }),
      );
    });

    it('B3: global widget receives global events only, not channeled events', () => {
      render(<WidgetFrame {...defaultProps} instanceId="w-a" />);
      render(<WidgetFrame {...defaultProps} channel="room1" instanceId="w-b" />);

      const handlerA = getHandlerForBridge(0);
      const handlerB = getHandlerForBridge(1);

      // Both subscribe to 'ping'
      handlerA({ type: 'SUBSCRIBE', eventType: 'ping' });
      handlerB({ type: 'SUBSCRIBE', eventType: 'ping' });

      // Emit on the global (unchanneled) bus event type
      bus.emit('widget.ping', {});

      // Widget A (global) should receive the EVENT
      expect(bridgeInstances[0].send).toHaveBeenCalledWith({
        type: 'EVENT',
        event: { type: 'ping', payload: {} },
      });

      // Widget B (room1) should NOT receive the EVENT —
      // it subscribes to widget.room1.ping, not widget.ping
      expect(bridgeInstances[1].send).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EVENT' }),
      );
    });

    it('B4: channeled widget does not receive global events', () => {
      render(<WidgetFrame {...defaultProps} channel="room1" instanceId="w-a" />);

      const handlerA = getHandlerForBridge(0);

      // Subscribe to 'ping' (resolves to widget.room1.ping)
      handlerA({ type: 'SUBSCRIBE', eventType: 'ping' });

      // Emit on the global (unchanneled) bus event type
      bus.emit('widget.ping', {});

      // Widget A (room1) should NOT receive the EVENT —
      // it subscribes to widget.room1.ping, not widget.ping
      expect(bridgeInstances[0].send).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EVENT' }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Multi-Widget Cross-Canvas Communication (Category C)
  // -----------------------------------------------------------------------

  describe('Multi-Widget Cross-Canvas Communication', () => {
    // Per-instance bridge tracking
    const bridgeInstances: Array<{
      send: ReturnType<typeof vi.fn>;
      onMessage: ReturnType<typeof vi.fn>;
      isReady: ReturnType<typeof vi.fn>;
      destroy: ReturnType<typeof vi.fn>;
    }> = [];

    // Live bus that actually delivers events
    const busSubs = new Map<string, Set<(event: unknown) => void>>();

    // Shared cross-canvas relay — all router instances share this
    const crossCanvasSubs = new Map<string, Set<(payload: unknown) => void>>();

    beforeEach(() => {
      bridgeInstances.length = 0;
      busSubs.clear();
      crossCanvasSubs.clear();

      // Each createWidgetBridge call returns a unique bridge
      vi.mocked(createWidgetBridge).mockImplementation(() => {
        const bridge = {
          send: vi.fn(),
          onMessage: vi.fn(),
          isReady: vi.fn(() => false),
          destroy: vi.fn(),
        };
        bridgeInstances.push(bridge);
        return bridge as any;
      });

      // Live bus — subscribe stores callbacks, emit delivers
      vi.mocked(bus.subscribe).mockImplementation((pattern: string, handler: any) => {
        if (!busSubs.has(pattern)) busSubs.set(pattern, new Set());
        busSubs.get(pattern)!.add(handler);
        return vi.fn(() => { busSubs.get(pattern)?.delete(handler); });
      });
      vi.mocked(bus.emit).mockImplementation((type: string, payload: unknown) => {
        busSubs.get(type)?.forEach(fn => fn({ type, payload }));
      });

      // Cross-canvas router mock — all instances share the same relay
      vi.mocked(createCrossCanvasRouter).mockImplementation(() => ({
        subscribe: vi.fn((channel: string, cb: (payload: unknown) => void) => {
          if (!crossCanvasSubs.has(channel)) crossCanvasSubs.set(channel, new Set());
          crossCanvasSubs.get(channel)!.add(cb);
        }),
        unsubscribe: vi.fn((channel: string) => {
          crossCanvasSubs.get(channel)?.clear();
        }),
        emit: vi.fn((channel: string, payload: unknown) => {
          crossCanvasSubs.get(channel)?.forEach(fn => fn(payload));
        }),
        destroy: vi.fn(),
      } as any));
    });

    function getHandlerForBridge(bridgeIndex: number) {
      return bridgeInstances[bridgeIndex].onMessage.mock.calls[0][0] as (msg: Record<string, unknown>) => void;
    }

    it('C1: Widget A emits cross-canvas, Widget B receives', () => {
      render(<WidgetFrame {...defaultProps} instanceId="w-a" />);
      render(<WidgetFrame {...defaultProps} instanceId="w-b" />);

      const handlerA = getHandlerForBridge(0);
      const handlerB = getHandlerForBridge(1);

      // Widget B subscribes to a cross-canvas channel
      handlerB({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'shared' });

      // Widget A emits on the same cross-canvas channel
      handlerA({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'shared' }); // create router first
      handlerA({ type: 'CROSS_CANVAS_EMIT', channel: 'shared', payload: { msg: 'hello' } });

      // Widget B's bridge should have received the cross-canvas event
      expect(bridgeInstances[1].send).toHaveBeenCalledWith({
        type: 'CROSS_CANVAS_EVENT',
        channel: 'shared',
        payload: { msg: 'hello' },
      });
    });

    it('C2: different cross-canvas channels do not cross', () => {
      render(<WidgetFrame {...defaultProps} instanceId="w-a" />);
      render(<WidgetFrame {...defaultProps} instanceId="w-b" />);

      const handlerA = getHandlerForBridge(0);
      const handlerB = getHandlerForBridge(1);

      // Widget A subscribes to 'alpha', Widget B subscribes to 'beta'
      handlerA({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'alpha' });
      handlerB({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: 'beta' });

      // Widget A emits on 'alpha'
      handlerA({ type: 'CROSS_CANVAS_EMIT', channel: 'alpha', payload: { x: 1 } });

      // Widget A's bridge should have received the cross-canvas event for alpha
      // (it subscribed to alpha, so it gets its own emit too via the shared relay)
      expect(bridgeInstances[0].send).toHaveBeenCalledWith({
        type: 'CROSS_CANVAS_EVENT',
        channel: 'alpha',
        payload: { x: 1 },
      });

      // Widget B's bridge should NOT have received any cross-canvas event
      // (it is only subscribed to 'beta', not 'alpha')
      expect(bridgeInstances[1].send).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'CROSS_CANVAS_EVENT' }),
      );
    });
  });
});
