/**
 * DockerContainer — Co-located Tests
 * @module shell/components/docker
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Docker, DockerDockMode } from '@sn/types';

import { DockerContainer } from './DockerContainer';

const createMockDocker = (overrides: Partial<Docker> = {}): Docker => ({
  id: 'docker-1',
  name: 'Test Docker',
  dockMode: 'floating',
  position: { x: 100, y: 100 },
  size: { width: 300, height: 400 },
  visible: true,
  pinned: false,
  tabs: [{ id: 'tab-1', name: 'Tab 1', widgets: [] }],
  activeTabIndex: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const noopFn = vi.fn();

const defaultProps = {
  docker: createMockDocker(),
  zIndex: 100,
  onPositionChange: noopFn,
  onSizeChange: noopFn,
  onDockModeChange: noopFn,
  onClose: noopFn,
  onTogglePin: noopFn,
  onRename: noopFn,
  onTabClick: noopFn,
  onAddTab: noopFn,
  onRenameTab: noopFn,
  onRemoveTab: noopFn,
  onWidgetResize: noopFn,
  onWidgetRemove: noopFn,
  renderWidget: (id: string) => <div data-testid={`widget-${id}`}>Widget {id}</div>,
};

describe('DockerContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders container with correct test id', () => {
    render(<DockerContainer {...defaultProps} />);
    expect(screen.getByTestId('docker-container-docker-1')).toBeTruthy();
  });

  it('renders header with docker name', () => {
    render(<DockerContainer {...defaultProps} />);
    expect(screen.getByText('Test Docker')).toBeTruthy();
  });

  it('renders tab bar with tab names', () => {
    render(<DockerContainer {...defaultProps} />);
    expect(screen.getByText('Tab 1')).toBeTruthy();
  });

  it('returns null when no active tab exists', () => {
    const docker = createMockDocker({ tabs: [], activeTabIndex: 0 });
    const { container } = render(<DockerContainer {...defaultProps} docker={docker} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders resize handles for floating mode', () => {
    render(<DockerContainer {...defaultProps} />);
    expect(screen.getByTestId('docker-resize-se')).toBeTruthy();
    expect(screen.getByTestId('docker-resize-n')).toBeTruthy();
  });

  it('limits resize handles for docked-left mode', () => {
    const docker = createMockDocker({ dockMode: 'docked-left' });
    render(<DockerContainer {...defaultProps} docker={docker} />);
    expect(screen.getByTestId('docker-resize-e')).toBeTruthy();
    expect(screen.queryByTestId('docker-resize-w')).toBeNull();
  });

  it('limits resize handles for docked-right mode', () => {
    const docker = createMockDocker({ dockMode: 'docked-right' });
    render(<DockerContainer {...defaultProps} docker={docker} />);
    expect(screen.getByTestId('docker-resize-w')).toBeTruthy();
    expect(screen.queryByTestId('docker-resize-e')).toBeNull();
  });

  it('calls onClose with docker id when close button clicked', () => {
    const onClose = vi.fn();
    render(<DockerContainer {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('docker-header-close'));
    expect(onClose).toHaveBeenCalledWith('docker-1');
  });

  it('calls onTogglePin with docker id when pin button clicked', () => {
    const onTogglePin = vi.fn();
    render(<DockerContainer {...defaultProps} onTogglePin={onTogglePin} />);
    fireEvent.click(screen.getByTestId('docker-header-pin'));
    expect(onTogglePin).toHaveBeenCalledWith('docker-1');
  });

  it('applies glass surface backdrop-filter', () => {
    render(<DockerContainer {...defaultProps} />);
    const container = screen.getByTestId('docker-container-docker-1');
    expect(container.style.backdropFilter).toContain('blur');
  });
});
