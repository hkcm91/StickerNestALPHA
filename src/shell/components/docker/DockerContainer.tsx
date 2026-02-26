/**
 * DockerContainer — main docker panel component.
 *
 * @remarks
 * Composes DockerHeader, DockerTabBar, DockerContent, and DockerResizeHandles
 * into a complete docker panel. Supports floating and docked modes.
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useCallback, useMemo, useRef } from 'react';

import type { Docker, Point2D, Size2D, DockerDockMode } from '@sn/types';

import { DockerContent } from './DockerContent';
import { DockerHeader } from './DockerHeader';
import { DockerResizeHandles, type ResizeDirection } from './DockerResizeHandle';
import { DockerTabBar } from './DockerTabBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerContainerProps {
  /** Docker data */
  docker: Docker;
  /** Z-index for stacking floating dockers */
  zIndex?: number;
  /** Called when position changes (floating mode drag) */
  onPositionChange: (id: string, position: Point2D) => void;
  /** Called when size changes */
  onSizeChange: (id: string, size: Size2D) => void;
  /** Called when dock mode changes */
  onDockModeChange: (id: string, mode: DockerDockMode) => void;
  /** Called to toggle visibility */
  onClose: (id: string) => void;
  /** Called to toggle pin state */
  onTogglePin: (id: string) => void;
  /** Called to rename the docker */
  onRename: (id: string, name: string) => void;
  /** Called when a tab is clicked */
  onTabClick: (id: string, index: number) => void;
  /** Called to add a new tab */
  onAddTab: (id: string) => void;
  /** Called to rename a tab */
  onRenameTab: (id: string, index: number, name: string) => void;
  /** Called to remove a tab */
  onRemoveTab: (id: string, index: number) => void;
  /** Called when a widget is resized */
  onWidgetResize: (id: string, widgetInstanceId: string, height: number | undefined) => void;
  /** Called when a widget is removed */
  onWidgetRemove: (id: string, widgetInstanceId: string) => void;
  /** Render function for widget content */
  renderWidget: (widgetInstanceId: string) => React.ReactNode;
  /** Called when this docker is clicked (for z-order) */
  onFocus?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DockerContainer: React.FC<DockerContainerProps> = ({
  docker,
  zIndex = 100,
  onPositionChange,
  onSizeChange,
  onDockModeChange,
  onClose,
  onTogglePin,
  onRename,
  onTabClick,
  onAddTab,
  onRenameTab,
  onRemoveTab,
  onWidgetResize,
  onWidgetRemove,
  renderWidget,
  onFocus,
}) => {
  const { id, name, dockMode, position, size, pinned, tabs, activeTabIndex } = docker;

  // Refs for stable dragging/resizing
  const dragStartState = useRef<{ position: Point2D; size: Size2D } | null>(null);

  // Get active tab
  const activeTab = tabs[activeTabIndex] ?? tabs[0];

  // Compute enabled resize directions based on dock mode
  const enabledResizeDirections = useMemo<ResizeDirection[]>(() => {
    switch (dockMode) {
      case 'docked-left':
        return ['e']; // Only resize width from right edge
      case 'docked-right':
        return ['w']; // Only resize width from left edge
      case 'floating':
      default:
        return ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    }
  }, [dockMode]);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    dragStartState.current = {
      position: position || { x: 100, y: 100 },
      size,
    };
    onFocus?.(id);
  }, [id, position, size, onFocus]);

  // Handle drag
  const handleDrag = useCallback(
    (totalDelta: Point2D) => {
      if (dockMode !== 'floating' || !dragStartState.current) return;

      const newPosition = {
        x: Math.max(0, dragStartState.current.position.x + totalDelta.x),
        y: Math.max(0, dragStartState.current.position.y + totalDelta.y),
      };

      onPositionChange(id, newPosition);
    },
    [id, dockMode, onPositionChange]
  );

  // Handle drag end (Snap-to-dock logic)
  const handleDragEnd = useCallback(
    (finalMousePos: Point2D) => {
      dragStartState.current = null;

      // Snap to dock logic
      const snapThreshold = 40;
      const screenWidth = window.innerWidth;

      if (finalMousePos.x < snapThreshold) {
        onDockModeChange(id, 'docked-left');
      } else if (finalMousePos.x > screenWidth - snapThreshold) {
        onDockModeChange(id, 'docked-right');
      }
    },
    [id, onDockModeChange]
  );

  // Handle resize start
  const handleResizeStart = useCallback(() => {
    dragStartState.current = {
      position: position || { x: 100, y: 100 },
      size,
    };
    onFocus?.(id);
  }, [id, position, size, onFocus]);

  // Handle resize
  const handleResize = useCallback(
    (totalDeltaX: number, totalDeltaY: number, direction: ResizeDirection) => {
      if (!dragStartState.current) return;

      const startSize = dragStartState.current.size;
      const startPos = dragStartState.current.position;

      let newWidth = startSize.width;
      let newHeight = startSize.height;
      let newX = startPos.x;
      let newY = startPos.y;

      // Adjust size and position based on direction
      if (direction.includes('e')) {
        newWidth = Math.max(MIN_WIDTH, startSize.width + totalDeltaX);
      }
      if (direction.includes('w')) {
        const widthDelta = Math.min(totalDeltaX, startSize.width - MIN_WIDTH);
        newWidth = startSize.width - widthDelta;
        if (dockMode === 'floating') {
          newX = startPos.x + widthDelta;
        }
      }
      if (direction.includes('s')) {
        newHeight = Math.max(MIN_HEIGHT, startSize.height + totalDeltaY);
      }
      if (direction.includes('n')) {
        const heightDelta = Math.min(totalDeltaY, startSize.height - MIN_HEIGHT);
        newHeight = startSize.height - heightDelta;
        if (dockMode === 'floating') {
          newY = startPos.y + heightDelta;
        }
      }

      onSizeChange(id, { width: newWidth, height: newHeight });

      // Update position if needed (floating mode north/west resize)
      if (dockMode === 'floating' && (direction.includes('n') || direction.includes('w'))) {
        onPositionChange(id, { x: newX, y: newY });
      }
    },
    [id, dockMode, onSizeChange, onPositionChange]
  );

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    dragStartState.current = null;
  }, []);

  // Handle widget resize in active tab
  const handleWidgetResize = useCallback(
    (widgetInstanceId: string, height: number | undefined) => {
      onWidgetResize(id, widgetInstanceId, height);
    },
    [id, onWidgetResize]
  );

  // Handle widget remove in active tab
  const handleWidgetRemove = useCallback(
    (widgetInstanceId: string) => {
      onWidgetRemove(id, widgetInstanceId);
    },
    [id, onWidgetRemove]
  );

  // Compute container styles based on dock mode
  const containerStyle = useMemo<React.CSSProperties>(() => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--sn-surface, #fff)',
      border: '1px solid var(--sn-border, #e0e0e0)',
      borderRadius: dockMode === 'floating' ? '12px' : '0',
      boxShadow: dockMode === 'floating' ? '0 8px 32px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
      overflow: 'hidden',
      zIndex,
      transition: dragStartState.current ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    switch (dockMode) {
      case 'docked-left':
        return {
          ...baseStyle,
          top: 0,
          left: 0,
          bottom: 0,
          width: size.width,
          borderLeft: 'none',
          borderTop: 'none',
          borderBottom: 'none',
        };

      case 'docked-right':
        return {
          ...baseStyle,
          top: 0,
          right: 0,
          bottom: 0,
          width: size.width,
          borderRight: 'none',
          borderTop: 'none',
          borderBottom: 'none',
        };

      case 'floating':
      default:
        return {
          ...baseStyle,
          top: position?.y ?? 100,
          left: position?.x ?? 100,
          width: size.width,
          height: size.height,
        };
    }
  }, [dockMode, position, size, zIndex]);

  // Handle container click for z-order focus
  const handleContainerClick = useCallback(() => {
    onFocus?.(id);
  }, [id, onFocus]);

  if (!activeTab) {
    return null;
  }

  return (
    <div
      data-testid={`docker-container-${id}`}
      style={containerStyle}
      onMouseDown={handleContainerClick}
    >
      {/* Header */}
      <DockerHeader
        name={name}
        dockMode={dockMode}
        pinned={pinned}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onRename={(newName) => onRename(id, newName)}
        onDockModeChange={(mode) => onDockModeChange(id, mode)}
        onTogglePin={() => onTogglePin(id)}
        onClose={() => onClose(id)}
      />

      {/* Tab bar */}
      <DockerTabBar
        tabs={tabs}
        activeTabIndex={activeTabIndex}
        onTabClick={(index) => onTabClick(id, index)}
        onAddTab={() => onAddTab(id)}
        onRenameTab={(index, tabName) => onRenameTab(id, index, tabName)}
        onRemoveTab={(index) => onRemoveTab(id, index)}
      />

      {/* Content */}
      <DockerContent
        tab={activeTab}
        onWidgetResize={handleWidgetResize}
        onWidgetRemove={handleWidgetRemove}
        renderWidget={renderWidget}
      />

      {/* Resize handles */}
      <DockerResizeHandles
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
        enabledDirections={enabledResizeDirections}
      />
    </div>
  );
};
