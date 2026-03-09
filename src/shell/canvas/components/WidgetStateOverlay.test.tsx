/**
 * WidgetStateOverlay component tests.
 *
 * @module shell/canvas/components
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WidgetStateOverlay } from './WidgetStateOverlay';

describe('WidgetStateOverlay', () => {
  it('renders loading state with pulsing dots', () => {
    render(<WidgetStateOverlay state="loading" />);

    const el = screen.getByTestId('widget-state-loading');
    expect(el).toBeTruthy();
    expect(el.textContent).toContain('Waking up...');
  });

  it('renders empty state with widget name and action text', () => {
    render(
      <WidgetStateOverlay
        state="empty"
        widgetName="My Notes"
        emptyAction="Click to add a note"
      />,
    );

    const el = screen.getByTestId('widget-state-empty');
    expect(el.textContent).toContain('My Notes is empty');
    expect(el.textContent).toContain('Click to add a note');
  });

  it('renders empty state with default widget name', () => {
    render(<WidgetStateOverlay state="empty" />);

    const el = screen.getByTestId('widget-state-empty');
    expect(el.textContent).toContain('Widget is empty');
  });

  it('renders error state with error message', () => {
    render(
      <WidgetStateOverlay
        state="error"
        errorMessage="Connection lost"
      />,
    );

    const el = screen.getByTestId('widget-state-error');
    expect(el.textContent).toContain('Connection lost');
  });

  it('renders error state with default error message', () => {
    render(<WidgetStateOverlay state="error" />);

    const el = screen.getByTestId('widget-state-error');
    expect(el.textContent).toContain('Something went wrong');
  });

  it('shows retry button in error state when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<WidgetStateOverlay state="error" onRetry={onRetry} />);

    const button = screen.getByText('Try again');
    expect(button).toBeTruthy();

    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides retry button when onRetry is not provided', () => {
    render(<WidgetStateOverlay state="error" />);
    expect(screen.queryByText('Try again')).toBeNull();
  });

  it('renders syncing state with widget name', () => {
    render(<WidgetStateOverlay state="syncing" widgetName="Clock" />);

    const el = screen.getByTestId('widget-state-syncing');
    expect(el.textContent).toContain('Syncing Clock');
  });

  it('uses fade-in animation', () => {
    render(<WidgetStateOverlay state="loading" />);

    const el = screen.getByTestId('widget-state-loading');
    expect(el.style.animation).toContain('sn-fade-in');
  });
});
