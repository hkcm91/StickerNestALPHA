/**
 * DockerResizeHandle — Co-located Tests
 * @module shell/components/docker
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { DockerResizeHandle, DockerResizeHandles, type ResizeDirection } from './DockerResizeHandle';

const noopFn = vi.fn();

describe('DockerResizeHandle', () => {
  const defaultProps = {
    direction: 'se' as ResizeDirection,
    onResize: noopFn,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders handle with correct test id', () => {
    render(<DockerResizeHandle {...defaultProps} />);
    expect(screen.getByTestId('docker-resize-se')).toBeTruthy();
  });

  it('does not render when disabled', () => {
    const { container } = render(<DockerResizeHandle {...defaultProps} disabled />);
    expect(container.innerHTML).toBe('');
  });

  it('calls onResizeStart on mouseDown', () => {
    const onResizeStart = vi.fn();
    render(<DockerResizeHandle {...defaultProps} onResizeStart={onResizeStart} />);
    fireEvent.mouseDown(screen.getByTestId('docker-resize-se'));
    expect(onResizeStart).toHaveBeenCalledTimes(1);
  });

  it('applies correct cursor for each direction', () => {
    const { rerender } = render(<DockerResizeHandle direction="n" onResize={noopFn} />);
    expect(screen.getByTestId('docker-resize-n').style.cursor).toBe('ns-resize');

    rerender(<DockerResizeHandle direction="e" onResize={noopFn} />);
    expect(screen.getByTestId('docker-resize-e').style.cursor).toBe('ew-resize');

    rerender(<DockerResizeHandle direction="se" onResize={noopFn} />);
    expect(screen.getByTestId('docker-resize-se').style.cursor).toBe('nwse-resize');
  });

  it('has position absolute', () => {
    render(<DockerResizeHandle {...defaultProps} />);
    expect(screen.getByTestId('docker-resize-se').style.position).toBe('absolute');
  });
});

describe('DockerResizeHandles', () => {
  it('renders all 8 directions by default', () => {
    render(<DockerResizeHandles onResize={noopFn} />);
    const all: ResizeDirection[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    all.forEach((dir) => {
      expect(screen.getByTestId(`docker-resize-${dir}`)).toBeTruthy();
    });
  });

  it('renders only enabled directions', () => {
    render(<DockerResizeHandles onResize={noopFn} enabledDirections={['e']} />);
    expect(screen.getByTestId('docker-resize-e')).toBeTruthy();
    expect(screen.queryByTestId('docker-resize-w')).toBeNull();
    expect(screen.queryByTestId('docker-resize-n')).toBeNull();
  });

  it('disables directions not in enabledDirections', () => {
    render(<DockerResizeHandles onResize={noopFn} enabledDirections={['n', 's']} />);
    expect(screen.getByTestId('docker-resize-n')).toBeTruthy();
    expect(screen.getByTestId('docker-resize-s')).toBeTruthy();
    expect(screen.queryByTestId('docker-resize-e')).toBeNull();
  });
});
