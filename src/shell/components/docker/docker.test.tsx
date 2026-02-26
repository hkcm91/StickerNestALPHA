/**
 * Docker Components — Tests
 * @module shell/components/docker
 *
 * @remarks
 * Tests for docker shell components: DockerContainer, DockerHeader,
 * DockerTabBar, DockerContent, DockerWidgetSlot, DockerResizeHandle.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import type { Docker, DockerTab, DockerDockMode } from '@sn/types';

import { DockerContainer } from './DockerContainer';
import { DockerContent } from './DockerContent';
import { DockerHeader } from './DockerHeader';
import { DockerResizeHandle, DockerResizeHandles, type ResizeDirection } from './DockerResizeHandle';
import { DockerTabBar } from './DockerTabBar';
import { DockerWidgetSlot } from './DockerWidgetSlot';

// =============================================================================
// Test Helpers
// =============================================================================

const createMockDocker = (overrides: Partial<Docker> = {}): Docker => ({
  id: 'docker-1',
  name: 'Test Docker',
  dockMode: 'floating',
  position: { x: 100, y: 100 },
  size: { width: 300, height: 400 },
  visible: true,
  pinned: false,
  tabs: [
    { id: 'tab-1', name: 'Tab 1', widgets: [] },
  ],
  activeTabIndex: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockTab = (overrides: Partial<DockerTab> = {}): DockerTab => ({
  id: 'tab-1',
  name: 'Tab 1',
  widgets: [],
  ...overrides,
});

const noopFn = vi.fn();

// =============================================================================
// DockerHeader Tests
// =============================================================================

describe('DockerHeader', () => {
  const defaultProps = {
    name: 'Test Docker',
    dockMode: 'floating' as DockerDockMode,
    pinned: false,
    onDrag: noopFn,
    onRename: noopFn,
    onDockModeChange: noopFn,
    onTogglePin: noopFn,
    onClose: noopFn,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render docker name', () => {
    render(<DockerHeader {...defaultProps} />);
    expect(screen.getByText('Test Docker')).toBeInTheDocument();
  });

  it('should render pin button', () => {
    render(<DockerHeader {...defaultProps} />);
    expect(screen.getByTestId('docker-header-pin')).toBeInTheDocument();
  });

  it('should render close button', () => {
    render(<DockerHeader {...defaultProps} />);
    expect(screen.getByTestId('docker-header-close')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<DockerHeader {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('docker-header-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onTogglePin when pin button is clicked', () => {
    const onTogglePin = vi.fn();
    render(<DockerHeader {...defaultProps} onTogglePin={onTogglePin} />);

    fireEvent.click(screen.getByTestId('docker-header-pin'));
    expect(onTogglePin).toHaveBeenCalledTimes(1);
  });

  it('should show pinned indicator when pinned', () => {
    render(<DockerHeader {...defaultProps} pinned={true} />);
    const pinButton = screen.getByTestId('docker-header-pin');
    expect(pinButton).toHaveAttribute('data-pinned', 'true');
  });

  it('should show unpinned indicator when not pinned', () => {
    render(<DockerHeader {...defaultProps} pinned={false} />);
    const pinButton = screen.getByTestId('docker-header-pin');
    expect(pinButton).toHaveAttribute('data-pinned', 'false');
  });
});

// =============================================================================
// DockerTabBar Tests
// =============================================================================

describe('DockerTabBar', () => {
  const tabs: DockerTab[] = [
    { id: 'tab-1', name: 'Tab 1', widgets: [] },
    { id: 'tab-2', name: 'Tab 2', widgets: [] },
  ];

  const defaultProps = {
    tabs,
    activeTabIndex: 0,
    onTabClick: noopFn,
    onAddTab: noopFn,
    onRenameTab: noopFn,
    onRemoveTab: noopFn,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all tabs', () => {
    render(<DockerTabBar {...defaultProps} />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(<DockerTabBar {...defaultProps} activeTabIndex={1} />);
    const tab2 = screen.getByTestId('docker-tab-1');
    expect(tab2).toHaveAttribute('data-active', 'true');
  });

  it('should call onTabClick when tab is clicked', () => {
    const onTabClick = vi.fn();
    render(<DockerTabBar {...defaultProps} onTabClick={onTabClick} />);

    fireEvent.click(screen.getByText('Tab 2'));
    expect(onTabClick).toHaveBeenCalledWith(1);
  });

  it('should render add tab button', () => {
    render(<DockerTabBar {...defaultProps} />);
    expect(screen.getByTestId('docker-tab-add')).toBeInTheDocument();
  });

  it('should call onAddTab when add button is clicked', () => {
    const onAddTab = vi.fn();
    render(<DockerTabBar {...defaultProps} onAddTab={onAddTab} />);

    fireEvent.click(screen.getByTestId('docker-tab-add'));
    expect(onAddTab).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// DockerWidgetSlot Tests
// =============================================================================

describe('DockerWidgetSlot', () => {
  const createDefaultProps = (overrides: { height?: number } = {}) => ({
    slot: { widgetInstanceId: 'widget-1', height: overrides.height },
    onResize: noopFn,
    onRemove: noopFn,
    children: <div data-testid="widget-widget-1">Widget widget-1</div>,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render widget content', () => {
    render(<DockerWidgetSlot {...createDefaultProps()} />);
    expect(screen.getByTestId('widget-widget-1')).toBeInTheDocument();
    expect(screen.getByText('Widget widget-1')).toBeInTheDocument();
  });

  it('should render with fixed height when provided', () => {
    render(<DockerWidgetSlot {...createDefaultProps({ height: 200 })} />);
    const slot = screen.getByTestId('docker-widget-slot-widget-1');
    expect(slot).toHaveStyle({ height: '200px' });
  });

  it('should render with auto height when no height provided', () => {
    render(<DockerWidgetSlot {...createDefaultProps()} />);
    const slot = screen.getByTestId('docker-widget-slot-widget-1');
    expect(slot).toHaveStyle({ height: 'auto' });
  });

  it('should render resize handle', () => {
    render(<DockerWidgetSlot {...createDefaultProps()} />);
    expect(screen.getByTestId('docker-widget-resize-widget-1')).toBeInTheDocument();
  });
});

// =============================================================================
// DockerContent Tests
// =============================================================================

describe('DockerContent', () => {
  const tab = createMockTab({
    widgets: [
      { widgetInstanceId: 'widget-1' },
      { widgetInstanceId: 'widget-2', height: 150 },
    ],
  });

  const defaultProps = {
    tab,
    onWidgetResize: noopFn,
    onWidgetRemove: noopFn,
    renderWidget: (id: string) => <div data-testid={`widget-${id}`}>Widget {id}</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all widgets in tab', () => {
    render(<DockerContent {...defaultProps} />);
    expect(screen.getByTestId('widget-widget-1')).toBeInTheDocument();
    expect(screen.getByTestId('widget-widget-2')).toBeInTheDocument();
  });

  it('should render empty state when no widgets', () => {
    const emptyTab = createMockTab({ widgets: [] });
    render(<DockerContent {...defaultProps} tab={emptyTab} />);
    expect(screen.getByTestId('docker-content-empty')).toBeInTheDocument();
  });
});

// =============================================================================
// DockerResizeHandle Tests
// =============================================================================

describe('DockerResizeHandle', () => {
  const defaultProps = {
    direction: 'se' as ResizeDirection,
    onResize: noopFn,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render handle element', () => {
    render(<DockerResizeHandle {...defaultProps} />);
    expect(screen.getByTestId('docker-resize-se')).toBeInTheDocument();
  });

  it('should not render when disabled', () => {
    render(<DockerResizeHandle {...defaultProps} disabled={true} />);
    expect(screen.queryByTestId('docker-resize-se')).not.toBeInTheDocument();
  });

  it('should call onResizeStart when mouse down', () => {
    const onResizeStart = vi.fn();
    render(<DockerResizeHandle {...defaultProps} onResizeStart={onResizeStart} />);

    fireEvent.mouseDown(screen.getByTestId('docker-resize-se'));
    expect(onResizeStart).toHaveBeenCalledTimes(1);
  });
});

describe('DockerResizeHandles', () => {
  const defaultProps = {
    onResize: noopFn,
  };

  it('should render all 8 handles by default', () => {
    render(<DockerResizeHandles {...defaultProps} />);

    const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    directions.forEach((dir) => {
      expect(screen.getByTestId(`docker-resize-${dir}`)).toBeInTheDocument();
    });
  });

  it('should render only enabled directions', () => {
    render(<DockerResizeHandles {...defaultProps} enabledDirections={['e', 'w']} />);

    expect(screen.getByTestId('docker-resize-e')).toBeInTheDocument();
    expect(screen.getByTestId('docker-resize-w')).toBeInTheDocument();
    expect(screen.queryByTestId('docker-resize-n')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docker-resize-s')).not.toBeInTheDocument();
  });
});

// =============================================================================
// DockerContainer Tests
// =============================================================================

describe('DockerContainer', () => {
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
    renderWidget: (id: string) => <div>Widget {id}</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render docker container', () => {
    render(<DockerContainer {...defaultProps} />);
    expect(screen.getByTestId('docker-container-docker-1')).toBeInTheDocument();
  });

  it('should render docker header', () => {
    render(<DockerContainer {...defaultProps} />);
    expect(screen.getByText('Test Docker')).toBeInTheDocument();
  });

  it('should render tab bar', () => {
    render(<DockerContainer {...defaultProps} />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
  });

  it('should apply floating styles when dockMode is floating', () => {
    render(<DockerContainer {...defaultProps} />);
    const container = screen.getByTestId('docker-container-docker-1');
    expect(container).toHaveStyle({ position: 'absolute' });
  });

  it('should call onFocus when container is clicked', () => {
    const onFocus = vi.fn();
    render(<DockerContainer {...defaultProps} onFocus={onFocus} />);

    fireEvent.mouseDown(screen.getByTestId('docker-container-docker-1'));
    expect(onFocus).toHaveBeenCalledWith('docker-1');
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<DockerContainer {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('docker-header-close'));
    expect(onClose).toHaveBeenCalledWith('docker-1');
  });

  it('should render all resize handles when floating', () => {
    render(<DockerContainer {...defaultProps} />);
    const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    directions.forEach((dir) => {
      expect(screen.getByTestId(`docker-resize-${dir}`)).toBeInTheDocument();
    });
  });

  it('should render only east handle when docked-left', () => {
    const docker = createMockDocker({ dockMode: 'docked-left' });
    render(<DockerContainer {...defaultProps} docker={docker} />);

    expect(screen.getByTestId('docker-resize-e')).toBeInTheDocument();
    expect(screen.queryByTestId('docker-resize-w')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docker-resize-n')).not.toBeInTheDocument();
  });

  it('should render only west handle when docked-right', () => {
    const docker = createMockDocker({ dockMode: 'docked-right' });
    render(<DockerContainer {...defaultProps} docker={docker} />);

    expect(screen.getByTestId('docker-resize-w')).toBeInTheDocument();
    expect(screen.queryByTestId('docker-resize-e')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docker-resize-n')).not.toBeInTheDocument();
  });
});
