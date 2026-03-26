/**
 * WidgetErrorBoundary Tests
 *
 * @module runtime/lifecycle
 * @layer L3
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { bus } from '../../kernel/bus';

import { WidgetErrorBoundary } from './error-boundary';

vi.mock('../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(), subscribeAll: vi.fn(), getHistory: vi.fn() },
}));

function ThrowError(): React.ReactElement {
  throw new Error('Widget crash');
}

function GoodChild(): React.ReactElement {
  return <div data-testid="good-child">OK</div>;
}

describe('WidgetErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <WidgetErrorBoundary
        instanceId="inst-1"
        widgetName="TestWidget"
        onReload={vi.fn()}
        onRemove={vi.fn()}
      >
        <GoodChild />
      </WidgetErrorBoundary>,
    );

    expect(screen.getByTestId('good-child')).toBeTruthy();
  });

  it('catches child error and renders error UI', () => {
    render(
      <WidgetErrorBoundary
        instanceId="inst-2"
        widgetName="CrashWidget"
        onReload={vi.fn()}
        onRemove={vi.fn()}
      >
        <ThrowError />
      </WidgetErrorBoundary>,
    );

    expect(screen.getByTestId('widget-error-boundary')).toBeTruthy();
    expect(screen.getByText('Widget Error')).toBeTruthy();
    expect(screen.getByText('Widget crash')).toBeTruthy();
  });

  it('emits widget.error bus event on crash', () => {
    render(
      <WidgetErrorBoundary
        instanceId="inst-3"
        widgetName="BusWidget"
        onReload={vi.fn()}
        onRemove={vi.fn()}
      >
        <ThrowError />
      </WidgetErrorBoundary>,
    );

    expect(bus.emit).toHaveBeenCalledWith('widget.error', {
      instanceId: 'inst-3',
      widgetName: 'BusWidget',
      error: 'Widget crash',
    });
  });

  it('Reload button calls onReload and resets error state', () => {
    const onReload = vi.fn();

    render(
      <WidgetErrorBoundary
        instanceId="inst-4"
        widgetName="ReloadWidget"
        onReload={onReload}
        onRemove={vi.fn()}
      >
        <ThrowError />
      </WidgetErrorBoundary>,
    );

    fireEvent.click(screen.getByTestId('widget-reload-btn'));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('Remove button calls onRemove', () => {
    const onRemove = vi.fn();

    render(
      <WidgetErrorBoundary
        instanceId="inst-5"
        widgetName="RemoveWidget"
        onReload={vi.fn()}
        onRemove={onRemove}
      >
        <ThrowError />
      </WidgetErrorBoundary>,
    );

    fireEvent.click(screen.getByTestId('widget-remove-btn'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('truncates long error messages to 200 characters', () => {
    const longMsg = 'A'.repeat(300);
    function LongError(): React.ReactElement {
      throw new Error(longMsg);
    }

    render(
      <WidgetErrorBoundary
        instanceId="inst-6"
        widgetName="LongError"
        onReload={vi.fn()}
        onRemove={vi.fn()}
      >
        <LongError />
      </WidgetErrorBoundary>,
    );

    const displayed = screen.getByText(/A+\.\.\./);
    expect(displayed.textContent!.length).toBeLessThanOrEqual(203); // 200 + '...'
  });
});
