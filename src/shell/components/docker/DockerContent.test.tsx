/**
 * DockerContent — Co-located Tests
 * @module shell/components/docker
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { DockerTab } from '@sn/types';

import { DockerContent } from './DockerContent';

const noopFn = vi.fn();

const createTab = (overrides: Partial<DockerTab> = {}): DockerTab => ({
  id: 'tab-1',
  name: 'Tab 1',
  widgets: [],
  ...overrides,
});

describe('DockerContent', () => {
  const defaultProps = {
    tab: createTab({
      widgets: [
        { widgetInstanceId: 'w-1', height: 200 },
        { widgetInstanceId: 'w-2', height: 200 },
      ],
    }),
    onWidgetResize: noopFn,
    onWidgetRemove: noopFn,
    renderWidget: (id: string) => <div data-testid={`widget-${id}`}>Widget {id}</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders widgets from the tab', () => {
    render(<DockerContent {...defaultProps} />);
    expect(screen.getByTestId('widget-w-1')).toBeTruthy();
    expect(screen.getByTestId('widget-w-2')).toBeTruthy();
  });

  it('renders empty state when tab has no widgets', () => {
    render(<DockerContent {...defaultProps} tab={createTab()} />);
    expect(screen.getByTestId('docker-content-empty')).toBeTruthy();
    expect(screen.getByText(/Drag widgets here/)).toBeTruthy();
  });

  it('renders dividers between widgets', () => {
    render(<DockerContent {...defaultProps} />);
    expect(screen.getAllByTestId('docker-divider')).toHaveLength(1);
  });

  it('does not render dividers for a single widget', () => {
    const singleTab = createTab({ widgets: [{ widgetInstanceId: 'w-1', height: 200 }] });
    render(<DockerContent {...defaultProps} tab={singleTab} />);
    expect(screen.queryByTestId('docker-divider')).toBeNull();
  });

  it('calls onWidgetResize when divider is dragged', () => {
    const onWidgetResize = vi.fn();
    render(<DockerContent {...defaultProps} onWidgetResize={onWidgetResize} />);
    const divider = screen.getByTestId('docker-divider');
    fireEvent.pointerDown(divider, { clientY: 200 });
    fireEvent.pointerMove(divider, { clientY: 230 });
    fireEvent.pointerUp(divider);
    expect(onWidgetResize).toHaveBeenCalled();
  });

  it('handles drag-over styling on empty state', () => {
    render(<DockerContent {...defaultProps} tab={createTab()} />);
    const empty = screen.getByTestId('docker-content-empty');
    fireEvent.dragOver(empty, { dataTransfer: { dropEffect: '' } });
    // After drag over, the text should change to "Drop to dock"
    expect(screen.getByText('Drop to dock')).toBeTruthy();
  });

  it('reverts drag-over styling on drag leave', () => {
    render(<DockerContent {...defaultProps} tab={createTab()} />);
    const empty = screen.getByTestId('docker-content-empty');
    fireEvent.dragOver(empty, { dataTransfer: { dropEffect: '' } });
    fireEvent.dragLeave(empty);
    expect(screen.getByText(/Drag widgets here/)).toBeTruthy();
  });
});
