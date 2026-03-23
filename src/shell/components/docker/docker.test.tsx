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
import { DockerDockZone } from './DockerDockZone';
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
  const createDefaultProps = (overrides: { height?: number; effectiveHeight?: number } = {}) => ({
    slot: { widgetInstanceId: 'widget-1', height: overrides.height },
    onRemove: noopFn,
    children: <div data-testid="widget-widget-1">Widget widget-1</div>,
    effectiveHeight: overrides.effectiveHeight,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render widget content', () => {
    render(<DockerWidgetSlot {...createDefaultProps()} />);
    expect(screen.getByTestId('widget-widget-1')).toBeInTheDocument();
    expect(screen.getByText('Widget widget-1')).toBeInTheDocument();
  });

  it('should render with effectiveHeight when provided', () => {
    render(<DockerWidgetSlot {...createDefaultProps({ effectiveHeight: 200 })} />);
    const slot = screen.getByTestId('docker-widget-slot-widget-1');
    expect(slot).toHaveStyle({ height: '200px' });
  });

  it('should render with slot height when no effectiveHeight', () => {
    render(<DockerWidgetSlot {...createDefaultProps({ height: 180 })} />);
    const slot = screen.getByTestId('docker-widget-slot-widget-1');
    expect(slot).toHaveStyle({ height: '180px' });
  });

  it('should render with auto height when no height provided', () => {
    render(<DockerWidgetSlot {...createDefaultProps()} />);
    const slot = screen.getByTestId('docker-widget-slot-widget-1');
    expect(slot).toHaveStyle({ height: 'auto' });
  });

  it('should not render a per-slot resize handle', () => {
    render(<DockerWidgetSlot {...createDefaultProps()} />);
    expect(screen.queryByTestId('docker-widget-resize-widget-1')).not.toBeInTheDocument();
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

  it('should render a divider between two widgets', () => {
    render(<DockerContent {...defaultProps} />);
    const dividers = screen.getAllByTestId('docker-divider');
    expect(dividers).toHaveLength(1);
  });

  it('should not render a divider when only one widget', () => {
    const singleTab = createMockTab({
      widgets: [{ widgetInstanceId: 'widget-1', height: 200 }],
    });
    render(<DockerContent {...defaultProps} tab={singleTab} />);
    expect(screen.queryByTestId('docker-divider')).not.toBeInTheDocument();
  });

  it('should call onWidgetResize for both slots when divider is dragged', () => {
    const onWidgetResize = vi.fn();
    const twoWidgetTab = createMockTab({
      widgets: [
        { widgetInstanceId: 'widget-1', height: 200 },
        { widgetInstanceId: 'widget-2', height: 200 },
      ],
    });
    render(<DockerContent {...defaultProps} tab={twoWidgetTab} onWidgetResize={onWidgetResize} />);

    const divider = screen.getByTestId('docker-divider');

    // Simulate pointer drag: down, move 50px, up
    fireEvent.pointerDown(divider, { clientY: 200 });
    fireEvent.pointerMove(divider, { clientY: 250 });
    fireEvent.pointerUp(divider);

    // Both slots should have been resized
    expect(onWidgetResize).toHaveBeenCalledWith('widget-1', 250);
    expect(onWidgetResize).toHaveBeenCalledWith('widget-2', 150);
  });

  it('should clamp divider drag to minHeight (60px)', () => {
    const onWidgetResize = vi.fn();
    const twoWidgetTab = createMockTab({
      widgets: [
        { widgetInstanceId: 'widget-1', height: 100 },
        { widgetInstanceId: 'widget-2', height: 100 },
      ],
    });
    render(<DockerContent {...defaultProps} tab={twoWidgetTab} onWidgetResize={onWidgetResize} />);

    const divider = screen.getByTestId('docker-divider');

    // Drag far enough to exceed the bottom slot's min height
    fireEvent.pointerDown(divider, { clientY: 100 });
    fireEvent.pointerMove(divider, { clientY: 200 }); // +100px delta
    fireEvent.pointerUp(divider);

    // Bottom slot should clamp to 60px, top gets the rest (140px)
    expect(onWidgetResize).toHaveBeenCalledWith('widget-1', 140);
    expect(onWidgetResize).toHaveBeenCalledWith('widget-2', 60);
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

  it('should apply glass surface styles (backdrop-filter)', () => {
    render(<DockerContainer {...defaultProps} />);
    const container = screen.getByTestId('docker-container-docker-1');
    const style = container.style;
    expect(style.backdropFilter).toContain('blur');
  });

  it('should apply rounded corners for docked-left (right side only)', () => {
    const docker = createMockDocker({ dockMode: 'docked-left' });
    render(<DockerContainer {...defaultProps} docker={docker} />);
    const container = screen.getByTestId('docker-container-docker-1');
    expect(container.style.borderRadius).toBe('0px 14px 14px 0px');
  });

  it('should call onDragStateChange when drag starts', () => {
    const onDragStateChange = vi.fn();
    render(<DockerContainer {...defaultProps} onDragStateChange={onDragStateChange} />);

    const header = screen.getByTestId('docker-header');
    fireEvent.mouseDown(header);
    expect(onDragStateChange).toHaveBeenCalledWith(true);
  });
});

// =============================================================================
// DockerDockZone Tests
// =============================================================================

describe('DockerDockZone', () => {
  it('should not render when not active', () => {
    render(<DockerDockZone side="left" active={false} />);
    expect(screen.queryByTestId('docker-dock-zone-left')).not.toBeInTheDocument();
  });

  it('should render when active', () => {
    render(<DockerDockZone side="left" active={true} />);
    expect(screen.getByTestId('docker-dock-zone-left')).toBeInTheDocument();
  });

  it('should render right zone on the right side', () => {
    render(<DockerDockZone side="right" active={true} />);
    const zone = screen.getByTestId('docker-dock-zone-right');
    expect(zone).toBeInTheDocument();
  });
});

// =============================================================================
// DockerTabBar — Close button tests
// =============================================================================

describe('DockerTabBar — close button', () => {
  const tabs: DockerTab[] = [
    { id: 'tab-1', name: 'Tab 1', widgets: [] },
    { id: 'tab-2', name: 'Tab 2', widgets: [] },
  ];

  it('should show close button on tab hover when multiple tabs', () => {
    render(
      <DockerTabBar
        tabs={tabs}
        activeTabIndex={0}
        onTabClick={noopFn}
        onAddTab={noopFn}
        onRenameTab={noopFn}
        onRemoveTab={noopFn}
      />
    );

    const tab = screen.getByTestId('docker-tab-0');
    fireEvent.mouseEnter(tab);
    expect(screen.getByTestId('docker-tab-close-0')).toBeInTheDocument();
  });

  it('should call onRemoveTab when close button clicked', () => {
    const onRemoveTab = vi.fn();
    render(
      <DockerTabBar
        tabs={tabs}
        activeTabIndex={0}
        onTabClick={noopFn}
        onAddTab={noopFn}
        onRenameTab={noopFn}
        onRemoveTab={onRemoveTab}
      />
    );

    const tab = screen.getByTestId('docker-tab-0');
    fireEvent.mouseEnter(tab);
    fireEvent.click(screen.getByTestId('docker-tab-close-0'));
    expect(onRemoveTab).toHaveBeenCalledWith(0);
  });
});
