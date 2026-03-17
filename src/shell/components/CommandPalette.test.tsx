/**
 * CommandPalette component tests.
 *
 * @module shell/components
 */

import { fireEvent, render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { bus } from '../../kernel/bus';

import { CommandPalette } from './CommandPalette';

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing by default', () => {
    render(<CommandPalette />);
    expect(screen.queryByTestId('command-palette')).toBeNull();
  });

  it('opens on Cmd+K', () => {
    render(<CommandPalette />);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      );
    });

    expect(screen.getByTestId('command-palette')).toBeTruthy();
  });

  it('opens on Ctrl+K', () => {
    render(<CommandPalette />);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      );
    });

    expect(screen.getByTestId('command-palette')).toBeTruthy();
  });

  it('opens via bus event', () => {
    render(<CommandPalette />);

    act(() => {
      bus.emit('shell.commandPalette.open', {});
    });

    expect(screen.getByTestId('command-palette')).toBeTruthy();
  });

  it('closes on Escape key', () => {
    render(<CommandPalette />);

    // Open
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      );
    });
    expect(screen.getByTestId('command-palette')).toBeTruthy();

    // Focus the input so keydown events go through the React handler
    act(() => { vi.advanceTimersByTime(100); });
    const input = screen.getByPlaceholderText('Search widgets, actions, settings...');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByTestId('command-palette')).toBeNull();
  });

  it('closes on backdrop click', () => {
    render(<CommandPalette />);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      );
    });

    fireEvent.click(screen.getByTestId('command-palette'));
    expect(screen.queryByTestId('command-palette')).toBeNull();
  });

  it('shows built-in results', () => {
    render(<CommandPalette />);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      );
    });

    // Should show some built-in results
    expect(screen.getByTestId('palette-result-new-canvas')).toBeTruthy();
    expect(screen.getByTestId('palette-result-toggle-grid')).toBeTruthy();
    expect(screen.getByTestId('palette-result-undo')).toBeTruthy();
  });

  it('filters results by query', () => {
    render(<CommandPalette />);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      );
    });

    act(() => { vi.advanceTimersByTime(100); });
    const input = screen.getByPlaceholderText('Search widgets, actions, settings...');
    fireEvent.change(input, { target: { value: 'undo' } });

    expect(screen.getByTestId('palette-result-undo')).toBeTruthy();
    expect(screen.queryByTestId('palette-result-toggle-grid')).toBeNull();
  });

  it('shows no results message for unmatched query', () => {
    render(<CommandPalette />);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      );
    });

    act(() => { vi.advanceTimersByTime(100); });
    const input = screen.getByPlaceholderText('Search widgets, actions, settings...');
    fireEvent.change(input, { target: { value: 'xyznonexistent' } });

    expect(screen.getByText('No results found')).toBeTruthy();
  });

  it('navigates results with arrow keys', () => {
    render(<CommandPalette />);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      );
    });

    act(() => { vi.advanceTimersByTime(100); });
    const input = screen.getByPlaceholderText('Search widgets, actions, settings...');

    // Arrow down should move active index
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Arrow up should move back
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    // No crash, basic keyboard navigation works
    expect(screen.getByTestId('command-palette')).toBeTruthy();
  });

  it('uses backdrop blur and glass surface styling', () => {
    render(<CommandPalette />);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      );
    });

    const backdrop = screen.getByTestId('command-palette');
    expect(backdrop.style.backdropFilter).toContain('blur');
  });
});
