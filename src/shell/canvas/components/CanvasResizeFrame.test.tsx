/**
 * Tests for CanvasResizeFrame component.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { CanvasResizeFrame } from './CanvasResizeFrame';

// Mock the bus
vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

describe('CanvasResizeFrame', () => {
  const defaultProps = {
    isActive: true,
    width: 1920,
    height: 1080,
    onDismiss: vi.fn(),
    canvasRef: { current: document.createElement('div') },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Stub offsetParent for position calculation
    Object.defineProperty(defaultProps.canvasRef.current, 'offsetParent', {
      value: document.createElement('div'),
      configurable: true,
    });
    Object.defineProperty(defaultProps.canvasRef.current, 'offsetTop', {
      value: 72,
      configurable: true,
    });
    Object.defineProperty(defaultProps.canvasRef.current, 'offsetLeft', {
      value: 100,
      configurable: true,
    });
  });

  it('renders nothing when isActive is false', () => {
    const { container } = render(
      <CanvasResizeFrame {...defaultProps} isActive={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders 8 resize handles when active', () => {
    render(<CanvasResizeFrame {...defaultProps} />);
    const frame = screen.getByTestId('canvas-resize-frame');
    expect(frame).toBeTruthy();

    const handles = [
      'top-left', 'top', 'top-right', 'right',
      'bottom-right', 'bottom', 'bottom-left', 'left',
    ];
    for (const pos of handles) {
      expect(screen.getByTestId(`resize-handle-${pos}`)).toBeTruthy();
    }
  });

  it('displays current dimensions', () => {
    render(<CanvasResizeFrame {...defaultProps} />);
    expect(screen.getByText('1920 × 1080')).toBeTruthy();
  });

  it('calls onDismiss on Escape key', () => {
    render(<CanvasResizeFrame {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss on non-Escape key', () => {
    render(<CanvasResizeFrame {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(defaultProps.onDismiss).not.toHaveBeenCalled();
  });
});
