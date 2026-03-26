/**
 * DockerHeader — Co-located Tests
 * @module shell/components/docker
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { DockerDockMode } from '@sn/types';

import { DockerHeader } from './DockerHeader';

const noopFn = vi.fn();

const defaultProps = {
  name: 'My Docker',
  dockMode: 'floating' as DockerDockMode,
  pinned: false,
  onDrag: noopFn,
  onDragStart: noopFn,
  onDragEnd: noopFn,
  onRename: noopFn,
  onDockModeChange: noopFn,
  onTogglePin: noopFn,
  onClose: noopFn,
};

describe('DockerHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders docker name', () => {
    render(<DockerHeader {...defaultProps} />);
    expect(screen.getByText('My Docker')).toBeTruthy();
  });

  it('renders close button and calls onClose', () => {
    const onClose = vi.fn();
    render(<DockerHeader {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('docker-header-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders pin button and calls onTogglePin', () => {
    const onTogglePin = vi.fn();
    render(<DockerHeader {...defaultProps} onTogglePin={onTogglePin} />);
    fireEvent.click(screen.getByTestId('docker-header-pin'));
    expect(onTogglePin).toHaveBeenCalledTimes(1);
  });

  it('shows pinned state via data-pinned attribute', () => {
    render(<DockerHeader {...defaultProps} pinned={true} />);
    expect(screen.getByTestId('docker-header-pin')).toHaveAttribute('data-pinned', 'true');
  });

  it('shows unpinned state via data-pinned attribute', () => {
    render(<DockerHeader {...defaultProps} pinned={false} />);
    expect(screen.getByTestId('docker-header-pin')).toHaveAttribute('data-pinned', 'false');
  });

  it('renders dock mode button and cycles dock mode on click', () => {
    const onDockModeChange = vi.fn();
    render(<DockerHeader {...defaultProps} onDockModeChange={onDockModeChange} />);
    fireEvent.click(screen.getByTestId('docker-dock-mode'));
    expect(onDockModeChange).toHaveBeenCalledWith('docked-left');
  });

  it('cycles from docked-left to docked-right', () => {
    const onDockModeChange = vi.fn();
    render(<DockerHeader {...defaultProps} dockMode="docked-left" onDockModeChange={onDockModeChange} />);
    fireEvent.click(screen.getByTestId('docker-dock-mode'));
    expect(onDockModeChange).toHaveBeenCalledWith('docked-right');
  });

  it('cycles from docked-right to floating', () => {
    const onDockModeChange = vi.fn();
    render(<DockerHeader {...defaultProps} dockMode="docked-right" onDockModeChange={onDockModeChange} />);
    fireEvent.click(screen.getByTestId('docker-dock-mode'));
    expect(onDockModeChange).toHaveBeenCalledWith('floating');
  });

  it('renders minimize button when onMinimize is provided', () => {
    render(<DockerHeader {...defaultProps} onMinimize={vi.fn()} />);
    expect(screen.getByTestId('docker-header-minimize')).toBeTruthy();
  });

  it('does not render minimize button when onMinimize is not provided', () => {
    render(<DockerHeader {...defaultProps} />);
    expect(screen.queryByTestId('docker-header-minimize')).toBeNull();
  });

  it('calls onMinimize when minimize button is clicked', () => {
    const onMinimize = vi.fn();
    render(<DockerHeader {...defaultProps} onMinimize={onMinimize} />);
    fireEvent.click(screen.getByTestId('docker-header-minimize'));
    expect(onMinimize).toHaveBeenCalledTimes(1);
  });
});
