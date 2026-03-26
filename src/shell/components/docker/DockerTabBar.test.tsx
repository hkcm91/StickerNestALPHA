/**
 * DockerTabBar — Co-located Tests
 * @module shell/components/docker
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { DockerTab } from '@sn/types';

import { DockerTabBar } from './DockerTabBar';

const noopFn = vi.fn();

const createTabs = (count: number): DockerTab[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `tab-${i}`,
    name: `Tab ${i + 1}`,
    widgets: [],
  }));

describe('DockerTabBar', () => {
  const defaultProps = {
    tabs: createTabs(2),
    activeTabIndex: 0,
    onTabClick: noopFn,
    onAddTab: noopFn,
    onRenameTab: noopFn,
    onRemoveTab: noopFn,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all tabs', () => {
    render(<DockerTabBar {...defaultProps} />);
    expect(screen.getByText('Tab 1')).toBeTruthy();
    expect(screen.getByText('Tab 2')).toBeTruthy();
  });

  it('marks active tab with data-active attribute', () => {
    render(<DockerTabBar {...defaultProps} activeTabIndex={0} />);
    expect(screen.getByTestId('docker-tab-0')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('docker-tab-1')).toHaveAttribute('data-active', 'false');
  });

  it('calls onTabClick when a tab is clicked', () => {
    const onTabClick = vi.fn();
    render(<DockerTabBar {...defaultProps} onTabClick={onTabClick} />);
    fireEvent.click(screen.getByText('Tab 2'));
    expect(onTabClick).toHaveBeenCalledWith(1);
  });

  it('renders the add tab button', () => {
    render(<DockerTabBar {...defaultProps} />);
    expect(screen.getByTestId('docker-tab-add')).toBeTruthy();
  });

  it('calls onAddTab when add button is clicked', () => {
    const onAddTab = vi.fn();
    render(<DockerTabBar {...defaultProps} onAddTab={onAddTab} />);
    fireEvent.click(screen.getByTestId('docker-tab-add'));
    expect(onAddTab).toHaveBeenCalledTimes(1);
  });

  it('shows close button on hover when multiple tabs exist', () => {
    render(<DockerTabBar {...defaultProps} />);
    fireEvent.mouseEnter(screen.getByTestId('docker-tab-0'));
    expect(screen.getByTestId('docker-tab-close-0')).toBeTruthy();
  });

  it('calls onRemoveTab when close button is clicked', () => {
    const onRemoveTab = vi.fn();
    render(<DockerTabBar {...defaultProps} onRemoveTab={onRemoveTab} />);
    fireEvent.mouseEnter(screen.getByTestId('docker-tab-0'));
    fireEvent.click(screen.getByTestId('docker-tab-close-0'));
    expect(onRemoveTab).toHaveBeenCalledWith(0);
  });

  it('shows context menu on right-click', () => {
    render(<DockerTabBar {...defaultProps} />);
    fireEvent.contextMenu(screen.getByTestId('docker-tab-0'));
    expect(screen.getByTestId('docker-tab-context-menu')).toBeTruthy();
    expect(screen.getByText('Rename')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('enters edit mode on double-click', () => {
    render(<DockerTabBar {...defaultProps} />);
    fireEvent.doubleClick(screen.getByTestId('docker-tab-0'));
    const input = screen.getByDisplayValue('Tab 1');
    expect(input).toBeTruthy();
  });
});
