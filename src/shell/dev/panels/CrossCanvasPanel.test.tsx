/**
 * CrossCanvasPanel Tests
 *
 * @module shell/dev
 * @layer L6
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRegisterWidget = vi.fn();
const mockUnregisterWidget = vi.fn();
const mockRegistry: Record<string, unknown> = {};

vi.mock('../../../kernel/stores/widget/widget.store', () => ({
  useWidgetStore: Object.assign(
    vi.fn(() => ({ registry: mockRegistry, instances: {} })),
    {
      getState: vi.fn(() => ({
        registry: mockRegistry,
        registerWidget: mockRegisterWidget,
        unregisterWidget: mockUnregisterWidget,
        instances: {},
        updateInstanceState: vi.fn(),
      })),
    },
  ),
}));

vi.mock('../../../kernel/bus', () => ({
  bus: {
    emit: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    subscribeAll: vi.fn(() => vi.fn()),
    getHistory: vi.fn(),
  },
}));

vi.mock('../../../kernel/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      send: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock WidgetFrame to avoid iframe complexity in unit tests
vi.mock('../../../runtime', () => ({
  WidgetFrame: vi.fn(({ widgetId, instanceId }: { widgetId: string; instanceId: string }) => (
    <div data-testid={`widget-frame-${instanceId}`} data-widget-id={widgetId}>
      WidgetFrame:{widgetId}
    </div>
  )),
}));

import { bus } from '../../../kernel/bus';

import { CrossCanvasPanel } from './CrossCanvasPanel';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CrossCanvasPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRegistry).forEach((k) => delete mockRegistry[k]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without errors', () => {
    render(<CrossCanvasPanel />);
    expect(screen.getByText('Cross-Canvas Events')).toBeDefined();
    expect(screen.getByText('Canvas A')).toBeDefined();
    expect(screen.getByText('Canvas B')).toBeDefined();
  });

  it('registers cross-canvas widgets on mount with correct permissions', () => {
    render(<CrossCanvasPanel />);

    expect(mockRegisterWidget).toHaveBeenCalledTimes(2);

    const senderCall = mockRegisterWidget.mock.calls.find(
      (call: unknown[]) => (call[0] as { widgetId: string }).widgetId === 'cross-canvas-sender',
    );
    const receiverCall = mockRegisterWidget.mock.calls.find(
      (call: unknown[]) => (call[0] as { widgetId: string }).widgetId === 'cross-canvas-receiver',
    );

    expect(senderCall).toBeDefined();
    expect(receiverCall).toBeDefined();
    expect(senderCall![0].manifest.permissions).toContain('cross-canvas');
    expect(receiverCall![0].manifest.permissions).toContain('cross-canvas');
  });

  it('adds sender widgets to Canvas A', () => {
    render(<CrossCanvasPanel />);

    const senderButtons = screen.getAllByText('+ Sender');
    // First button is Canvas A
    fireEvent.click(senderButtons[0]);

    const frame = screen.getByTestId('widget-frame-xc-A-1');
    expect(frame).toBeDefined();
    expect(frame.getAttribute('data-widget-id')).toBe('cross-canvas-sender');
  });

  it('adds receiver widgets to Canvas B', () => {
    render(<CrossCanvasPanel />);

    const receiverButtons = screen.getAllByText('+ Receiver');
    // Second button is Canvas B
    fireEvent.click(receiverButtons[1]);

    const frame = screen.getByTestId('widget-frame-xc-B-1');
    expect(frame).toBeDefined();
    expect(frame.getAttribute('data-widget-id')).toBe('cross-canvas-receiver');
  });

  it('subscribes to crossCanvas.* bus events for the event log', () => {
    render(<CrossCanvasPanel />);
    expect(bus.subscribeAll).toHaveBeenCalled();
  });

  it('shows empty event log message', () => {
    render(<CrossCanvasPanel />);
    expect(screen.getByText('No cross-canvas events yet')).toBeDefined();
  });

  it('has a channel input defaulting to dev-test', () => {
    render(<CrossCanvasPanel />);
    const input = screen.getByDisplayValue('dev-test');
    expect(input).toBeDefined();
  });

  it('removes widget when x is clicked', () => {
    render(<CrossCanvasPanel />);

    // Add a sender to Canvas A
    const senderButtons = screen.getAllByText('+ Sender');
    fireEvent.click(senderButtons[0]);

    expect(screen.getByTestId('widget-frame-xc-A-1')).toBeDefined();

    // Click remove button
    const removeBtn = screen.getByText('x');
    fireEvent.click(removeBtn);

    expect(screen.queryByTestId('widget-frame-xc-A-1')).toBeNull();
  });
});
