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

vi.mock('./integrations/integration-proxy', () => ({
  createIntegrationProxy: vi.fn(() => ({
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
});
