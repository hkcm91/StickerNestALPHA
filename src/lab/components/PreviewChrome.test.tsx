/**
 * Tests for PreviewChrome component.
 *
 * @vitest-environment happy-dom
 * @module lab/components
 * @layer L2
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { PreviewChrome } from './PreviewChrome';

function createProps(overrides: Partial<Parameters<typeof PreviewChrome>[0]> = {}) {
  return {
    widgetName: 'My Widget',
    isRunning: true,
    onReload: vi.fn(),
    consoleOpen: false,
    onConsoleToggle: vi.fn(),
    expanded: false,
    onExpandToggle: vi.fn(),
    ...overrides,
  };
}

describe('PreviewChrome', () => {
  it('renders the widget name', () => {
    render(<PreviewChrome {...createProps()} />);
    expect(screen.getByTestId('preview-chrome-name').textContent).toBe('My Widget');
  });

  it('shows running status via PulseIndicator when widget is running', () => {
    render(<PreviewChrome {...createProps({ isRunning: true })} />);
    const indicator = screen.getByRole('status');
    expect(indicator.getAttribute('aria-label')).toBe('Widget running');
  });

  it('shows idle status via PulseIndicator when widget is not running', () => {
    render(<PreviewChrome {...createProps({ isRunning: false })} />);
    const indicator = screen.getByRole('status');
    expect(indicator.getAttribute('aria-label')).toBe('Widget stopped');
  });

  it('renders PulseIndicator with success state when running', () => {
    render(<PreviewChrome {...createProps({ isRunning: true })} />);
    const indicators = screen.getAllByRole('status');
    const runningIndicator = indicators.find(el => el.getAttribute('aria-label') === 'Widget running');
    expect(runningIndicator).toBeDefined();
  });

  it('renders PulseIndicator with idle state when not running', () => {
    render(<PreviewChrome {...createProps({ isRunning: false })} />);
    const indicators = screen.getAllByRole('status');
    const idleIndicator = indicators.find(el => el.getAttribute('aria-label') === 'Widget stopped');
    expect(idleIndicator).toBeDefined();
  });

  it('calls onReload when reload button is clicked', () => {
    const onReload = vi.fn();
    render(<PreviewChrome {...createProps({ onReload })} />);

    fireEvent.click(screen.getByLabelText('Reload widget'));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it('calls onConsoleToggle when console button is clicked', () => {
    const onConsoleToggle = vi.fn();
    render(<PreviewChrome {...createProps({ onConsoleToggle })} />);

    fireEvent.click(screen.getByLabelText('Show console'));
    expect(onConsoleToggle).toHaveBeenCalledOnce();
  });

  it('shows "Hide console" label when console is open', () => {
    render(<PreviewChrome {...createProps({ consoleOpen: true })} />);
    expect(screen.getByLabelText('Hide console')).toBeDefined();
  });

  it('shows "Show console" label when console is closed', () => {
    render(<PreviewChrome {...createProps({ consoleOpen: false })} />);
    expect(screen.getByLabelText('Show console')).toBeDefined();
  });

  it('marks console button as pressed when console is open', () => {
    render(<PreviewChrome {...createProps({ consoleOpen: true })} />);
    expect(screen.getByLabelText('Hide console').getAttribute('aria-pressed')).toBe('true');
  });

  it('calls onExpandToggle when expand button is clicked', () => {
    const onExpandToggle = vi.fn();
    render(<PreviewChrome {...createProps({ onExpandToggle })} />);

    fireEvent.click(screen.getByLabelText('Expand preview'));
    expect(onExpandToggle).toHaveBeenCalledOnce();
  });

  it('shows "Collapse preview" label when expanded', () => {
    render(<PreviewChrome {...createProps({ expanded: true })} />);
    expect(screen.getByLabelText('Collapse preview')).toBeDefined();
  });

  it('shows "Expand preview" label when not expanded', () => {
    render(<PreviewChrome {...createProps({ expanded: false })} />);
    expect(screen.getByLabelText('Expand preview')).toBeDefined();
  });

  it('marks expand button as pressed when expanded', () => {
    render(<PreviewChrome {...createProps({ expanded: true })} />);
    expect(screen.getByLabelText('Collapse preview').getAttribute('aria-pressed')).toBe('true');
  });

  it('renders the chrome container', () => {
    render(<PreviewChrome {...createProps()} />);
    expect(screen.getByTestId('preview-chrome')).toBeDefined();
  });

  it('truncates long widget names with ellipsis', () => {
    render(<PreviewChrome {...createProps({ widgetName: 'A Very Long Widget Name That Should Be Truncated' })} />);
    const nameEl = screen.getByTestId('preview-chrome-name');
    expect(nameEl.style.textOverflow).toBe('ellipsis');
    expect(nameEl.style.overflow).toBe('hidden');
  });
});
