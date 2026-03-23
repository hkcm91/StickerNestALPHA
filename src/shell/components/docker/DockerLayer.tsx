/**
 * DockerLayer — overlay layer that renders all visible dockers with dock zones.
 *
 * @remarks
 * Connects to dockerStore and renders all visible dockers in their
 * appropriate positions (floating or docked). Shows dock zone overlays
 * when a docker is being dragged.
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { DockerDockMode, Point2D, Size2D } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useDockerStore } from '../../../kernel/stores/docker';

import { SNAP_THRESHOLD } from './docker-palette';
import { DockerContainer } from './DockerContainer';
import { DockerDockZone } from './DockerDockZone';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerLayerProps {
  renderWidget: (widgetInstanceId: string) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DockerLayer: React.FC<DockerLayerProps> = ({ renderWidget }) => {
  // Store state — use individual selectors for minimal re-renders
  const dockers = useDockerStore((s) => s.dockers);
  const activeDockerOrder = useDockerStore((s) => s.activeDockerOrder);

  // Actions
  const updateDocker = useDockerStore((s) => s.updateDocker);
  const setDockMode = useDockerStore((s) => s.setDockMode);
  const setPosition = useDockerStore((s) => s.setPosition);
  const setSize = useDockerStore((s) => s.setSize);
  const toggleVisible = useDockerStore((s) => s.toggleVisible);
  const togglePinned = useDockerStore((s) => s.togglePinned);
  const addTab = useDockerStore((s) => s.addTab);
  const removeTab = useDockerStore((s) => s.removeTab);
  const setActiveTab = useDockerStore((s) => s.setActiveTab);
  const renameTab = useDockerStore((s) => s.renameTab);
  const _reorderTabs = useDockerStore((s) => s.reorderTabs);
  const addDocker = useDockerStore((s) => s.addDocker);
  const addWidgetToTab = useDockerStore((s) => s.addWidgetToTab);
  const resizeWidgetInTab = useDockerStore((s) => s.resizeWidgetInTab);
  const removeWidgetFromTab = useDockerStore((s) => s.removeWidgetFromTab);
  const bringToFront = useDockerStore((s) => s.bringToFront);
  const setVisible = useDockerStore((s) => s.setVisible);

  // Listen for "dock to panel" requests from context menu / floating toolbar
  useEffect(() => {
    const unsub = bus.subscribe('docker.widget.dockRequested', (event) => {
      const { entityIds } = event.payload as { entityIds: string[] };
      if (!entityIds?.length) return;

      // Find or create the default docker panel
      const DOCK_NAME = 'Docked Widgets';
      const existing = Object.values(dockers).find((d) => d.name === DOCK_NAME);
      let dockerId: string;

      if (existing) {
        dockerId = existing.id;
        setVisible(dockerId, true);
        bringToFront(dockerId);
      } else {
        dockerId = addDocker({
          name: DOCK_NAME,
          dockMode: 'docked-right',
          size: { width: 320, height: 400 },
        });
        bringToFront(dockerId);
      }

      // Add each entity as a widget slot in the active tab
      const docker = useDockerStore.getState().dockers[dockerId];
      const tabIndex = docker?.activeTabIndex ?? 0;
      for (const eid of entityIds) {
        addWidgetToTab(dockerId, tabIndex, eid, 200);
      }
    });
    return unsub;
  }, [dockers, addDocker, addWidgetToTab, setVisible, bringToFront]);

  // Drag state for dock zones
  const [isDragging, setIsDragging] = useState(false);
  const [dragMouseX, setDragMouseX] = useState(0);

  // Derive docker lists
  const { leftDocked, rightDocked, floating } = useMemo(() => {
    const left = [];
    const right = [];
    const floats = [];

    for (const id of activeDockerOrder) {
      const d = dockers[id];
      if (!d || !d.visible) continue;

      switch (d.dockMode) {
        case 'docked-left':
          left.push(d);
          break;
        case 'docked-right':
          right.push(d);
          break;
        case 'floating':
        default:
          floats.push(d);
          break;
      }
    }

    return { leftDocked: left, rightDocked: right, floating: floats };
  }, [dockers, activeDockerOrder]);

  const hasVisibleDockers = leftDocked.length > 0 || rightDocked.length > 0 || floating.length > 0;

  // Dock zone proximity (0-1)
  const leftProximity = isDragging ? Math.max(0, 1 - dragMouseX / (SNAP_THRESHOLD * 2)) : 0;
  const rightProximity = isDragging
    ? Math.max(0, 1 - (window.innerWidth - dragMouseX) / (SNAP_THRESHOLD * 2))
    : 0;

  // Track mouse during drag for dock zone proximity
  const handleDragStateChange = useCallback((dragging: boolean) => {
    setIsDragging(dragging);
    if (dragging) {
      const handleMouse = (e: MouseEvent) => setDragMouseX(e.clientX);
      const handleUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouse);
        document.removeEventListener('mouseup', handleUp);
      };
      document.addEventListener('mousemove', handleMouse, { passive: true });
      document.addEventListener('mouseup', handleUp);
    }
  }, []);

  // Handlers
  const handlePositionChange = useCallback((id: string, pos: Point2D) => setPosition(id, pos), [setPosition]);
  const handleSizeChange = useCallback((id: string, s: Size2D) => setSize(id, s), [setSize]);
  const handleDockModeChange = useCallback((id: string, mode: DockerDockMode) => setDockMode(id, mode), [setDockMode]);
  const handleClose = useCallback((id: string) => toggleVisible(id), [toggleVisible]);
  const handleTogglePin = useCallback((id: string) => togglePinned(id), [togglePinned]);
  const handleRename = useCallback((id: string, n: string) => updateDocker(id, { name: n }), [updateDocker]);
  const handleTabClick = useCallback((id: string, idx: number) => setActiveTab(id, idx), [setActiveTab]);
  const handleAddTab = useCallback((id: string) => addTab(id), [addTab]);
  const handleRenameTab = useCallback((id: string, idx: number, n: string) => renameTab(id, idx, n), [renameTab]);
  const handleRemoveTab = useCallback((id: string, idx: number) => removeTab(id, idx), [removeTab]);

  // Handle widget drop from canvas drag-and-drop
  const handleWidgetDrop = useCallback(
    (dockerId: string, entityId: string) => {
      const docker = dockers[dockerId];
      if (!docker) return;
      // Check if already docked
      const tab = docker.tabs[docker.activeTabIndex];
      if (tab?.widgets.some((w) => w.widgetInstanceId === entityId)) return;
      addWidgetToTab(dockerId, docker.activeTabIndex, entityId, 200);
    },
    [dockers, addWidgetToTab]
  );

  const handleWidgetResize = useCallback(
    (dockerId: string, widgetInstanceId: string, height: number | undefined) => {
      const docker = dockers[dockerId];
      if (docker) resizeWidgetInTab(dockerId, docker.activeTabIndex, widgetInstanceId, height);
    },
    [dockers, resizeWidgetInTab]
  );

  const handleWidgetRemove = useCallback(
    (dockerId: string, widgetInstanceId: string) => {
      const docker = dockers[dockerId];
      if (docker) removeWidgetFromTab(dockerId, docker.activeTabIndex, widgetInstanceId);
    },
    [dockers, removeWidgetFromTab]
  );

  const handleFocus = useCallback((id: string) => bringToFront(id), [bringToFront]);

  const getZIndex = useCallback(
    (id: string): number => {
      const baseZ = 100;
      const index = activeDockerOrder.indexOf(id);
      return index >= 0 ? baseZ + index : baseZ;
    },
    [activeDockerOrder]
  );

  // Shared props builder to reduce repetition
  const containerProps = useCallback(
    (docker: typeof leftDocked[0]) => ({
      docker,
      onPositionChange: handlePositionChange,
      onSizeChange: handleSizeChange,
      onDockModeChange: handleDockModeChange,
      onClose: handleClose,
      onTogglePin: handleTogglePin,
      onRename: handleRename,
      onTabClick: handleTabClick,
      onAddTab: handleAddTab,
      onRenameTab: handleRenameTab,
      onRemoveTab: handleRemoveTab,
      onWidgetResize: handleWidgetResize,
      onWidgetRemove: handleWidgetRemove,
      renderWidget,
      onFocus: handleFocus,
      onDragStateChange: handleDragStateChange,
      onWidgetDrop: handleWidgetDrop,
    }),
    [
      handlePositionChange, handleSizeChange, handleDockModeChange, handleClose,
      handleTogglePin, handleRename, handleTabClick, handleAddTab, handleRenameTab,
      handleRemoveTab, handleWidgetResize, handleWidgetRemove, renderWidget,
      handleFocus, handleDragStateChange,
    ]
  );

  if (!hasVisibleDockers && !isDragging) {
    return null;
  }

  return (
    <div
      data-testid="docker-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {/* Dock zones — visible during drag */}
      <DockerDockZone side="left" active={isDragging} proximity={leftProximity} />
      <DockerDockZone side="right" active={isDragging} proximity={rightProximity} />

      {/* Left docked dockers */}
      {leftDocked.length > 0 && (
        <div
          data-testid="docker-layer-left"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto',
          }}
        >
          {leftDocked.map((docker) => (
            <DockerContainer
              key={docker.id}
              {...containerProps(docker)}
              zIndex={100}
            />
          ))}
        </div>
      )}

      {/* Right docked dockers */}
      {rightDocked.length > 0 && (
        <div
          data-testid="docker-layer-right"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto',
          }}
        >
          {rightDocked.map((docker) => (
            <DockerContainer
              key={docker.id}
              {...containerProps(docker)}
              zIndex={100}
            />
          ))}
        </div>
      )}

      {/* Floating dockers */}
      {floating.map((docker) => (
        <div key={docker.id} style={{ pointerEvents: 'auto' }}>
          <DockerContainer
            {...containerProps(docker)}
            zIndex={getZIndex(docker.id)}
          />
        </div>
      ))}
    </div>
  );
};
