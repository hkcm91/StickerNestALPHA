/**
 * DockerLayer — overlay layer that renders all visible dockers.
 *
 * @remarks
 * This component connects to the dockerStore and renders all visible
 * dockers in their appropriate positions (floating or docked).
 * It handles z-order for floating dockers and provides slots for
 * docked dockers on left and right sides.
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useCallback, useMemo } from 'react';

import type { Docker, DockerDockMode, Point2D, Size2D } from '@sn/types';

import {
  useDockerStore,
  selectVisibleDockers,
  selectLeftDockedDockers,
  selectRightDockedDockers,
  selectFloatingDockers,
  type DockerState,
  type DockerStore,
} from '../../../kernel/stores/docker';

import { DockerContainer } from './DockerContainer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerLayerProps {
  /** Render function for widget content */
  renderWidget: (widgetInstanceId: string) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DockerLayer: React.FC<DockerLayerProps> = ({ renderWidget }) => {
  // Get store state and actions
  const dockers = useDockerStore((state: DockerState) => state.dockers);
  const activeDockerOrder = useDockerStore((state: DockerState) => state.activeDockerOrder);

  // Actions
  const updateDocker = useDockerStore((state) => state.updateDocker);
  const setDockMode = useDockerStore((state) => state.setDockMode);
  const setPosition = useDockerStore((state) => state.setPosition);
  const setSize = useDockerStore((state) => state.setSize);
  const toggleVisible = useDockerStore((state) => state.toggleVisible);
  const togglePinned = useDockerStore((state) => state.togglePinned);
  const addTab = useDockerStore((state) => state.addTab);
  const removeTab = useDockerStore((state) => state.removeTab);
  const setActiveTab = useDockerStore((state) => state.setActiveTab);
  const renameTab = useDockerStore((state) => state.renameTab);
  const resizeWidgetInTab = useDockerStore((state) => state.resizeWidgetInTab);
  const removeWidgetFromTab = useDockerStore((state) => state.removeWidgetFromTab);
  const bringToFront = useDockerStore((state) => state.bringToFront);

  // Derive docker lists using full store state
  const visibleDockers = useMemo(
    () => selectVisibleDockers({ dockers, activeDockerOrder, isLoading: false, error: null } as DockerStore),
    [dockers, activeDockerOrder]
  );
  const leftDockedDockers = useMemo(
    () => selectLeftDockedDockers({ dockers, activeDockerOrder, isLoading: false, error: null } as DockerStore),
    [dockers, activeDockerOrder]
  );
  const rightDockedDockers = useMemo(
    () => selectRightDockedDockers({ dockers, activeDockerOrder, isLoading: false, error: null } as DockerStore),
    [dockers, activeDockerOrder]
  );
  const floatingDockers = useMemo(
    () => selectFloatingDockers({ dockers, activeDockerOrder, isLoading: false, error: null } as DockerStore),
    [dockers, activeDockerOrder]
  );

  // Handlers
  const handlePositionChange = useCallback(
    (id: string, position: Point2D) => {
      setPosition(id, position);
    },
    [setPosition]
  );

  const handleSizeChange = useCallback(
    (id: string, size: Size2D) => {
      setSize(id, size);
    },
    [setSize]
  );

  const handleDockModeChange = useCallback(
    (id: string, mode: DockerDockMode) => {
      setDockMode(id, mode);
    },
    [setDockMode]
  );

  const handleClose = useCallback(
    (id: string) => {
      toggleVisible(id);
    },
    [toggleVisible]
  );

  const handleTogglePin = useCallback(
    (id: string) => {
      togglePinned(id);
    },
    [togglePinned]
  );

  const handleRename = useCallback(
    (id: string, name: string) => {
      updateDocker(id, { name });
    },
    [updateDocker]
  );

  const handleTabClick = useCallback(
    (id: string, index: number) => {
      setActiveTab(id, index);
    },
    [setActiveTab]
  );

  const handleAddTab = useCallback(
    (id: string) => {
      addTab(id);
    },
    [addTab]
  );

  const handleRenameTab = useCallback(
    (id: string, index: number, name: string) => {
      renameTab(id, index, name);
    },
    [renameTab]
  );

  const handleRemoveTab = useCallback(
    (id: string, index: number) => {
      removeTab(id, index);
    },
    [removeTab]
  );

  const handleWidgetResize = useCallback(
    (dockerId: string, widgetInstanceId: string, height: number | undefined) => {
      const docker = dockers[dockerId];
      if (!docker) return;
      resizeWidgetInTab(dockerId, docker.activeTabIndex, widgetInstanceId, height);
    },
    [dockers, resizeWidgetInTab]
  );

  const handleWidgetRemove = useCallback(
    (dockerId: string, widgetInstanceId: string) => {
      const docker = dockers[dockerId];
      if (!docker) return;
      removeWidgetFromTab(dockerId, docker.activeTabIndex, widgetInstanceId);
    },
    [dockers, removeWidgetFromTab]
  );

  const handleFocus = useCallback(
    (id: string) => {
      bringToFront(id);
    },
    [bringToFront]
  );

  // Compute z-index for each floating docker based on activeDockerOrder
  const getZIndex = useCallback(
    (id: string): number => {
      const baseZ = 100;
      const index = activeDockerOrder.indexOf(id);
      return index >= 0 ? baseZ + index : baseZ;
    },
    [activeDockerOrder]
  );

  // If no visible dockers, render nothing
  if (visibleDockers.length === 0) {
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
        zIndex: 50, // Above canvas, below modals
      }}
    >
      {/* Left docked dockers container */}
      {leftDockedDockers.length > 0 && (
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
          {leftDockedDockers.map((docker: Docker) => (
            <DockerContainer
              key={docker.id}
              docker={docker}
              zIndex={100}
              onPositionChange={handlePositionChange}
              onSizeChange={handleSizeChange}
              onDockModeChange={handleDockModeChange}
              onClose={handleClose}
              onTogglePin={handleTogglePin}
              onRename={handleRename}
              onTabClick={handleTabClick}
              onAddTab={handleAddTab}
              onRenameTab={handleRenameTab}
              onRemoveTab={handleRemoveTab}
              onWidgetResize={handleWidgetResize}
              onWidgetRemove={handleWidgetRemove}
              renderWidget={renderWidget}
              onFocus={handleFocus}
            />
          ))}
        </div>
      )}

      {/* Right docked dockers container */}
      {rightDockedDockers.length > 0 && (
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
          {rightDockedDockers.map((docker: Docker) => (
            <DockerContainer
              key={docker.id}
              docker={docker}
              zIndex={100}
              onPositionChange={handlePositionChange}
              onSizeChange={handleSizeChange}
              onDockModeChange={handleDockModeChange}
              onClose={handleClose}
              onTogglePin={handleTogglePin}
              onRename={handleRename}
              onTabClick={handleTabClick}
              onAddTab={handleAddTab}
              onRenameTab={handleRenameTab}
              onRemoveTab={handleRemoveTab}
              onWidgetResize={handleWidgetResize}
              onWidgetRemove={handleWidgetRemove}
              renderWidget={renderWidget}
              onFocus={handleFocus}
            />
          ))}
        </div>
      )}

      {/* Floating dockers */}
      {floatingDockers.map((docker: Docker) => (
        <div
          key={docker.id}
          style={{
            pointerEvents: 'auto',
          }}
        >
          <DockerContainer
            docker={docker}
            zIndex={getZIndex(docker.id)}
            onPositionChange={handlePositionChange}
            onSizeChange={handleSizeChange}
            onDockModeChange={handleDockModeChange}
            onClose={handleClose}
            onTogglePin={handleTogglePin}
            onRename={handleRename}
            onTabClick={handleTabClick}
            onAddTab={handleAddTab}
            onRenameTab={handleRenameTab}
            onRemoveTab={handleRemoveTab}
            onWidgetResize={handleWidgetResize}
            onWidgetRemove={handleWidgetRemove}
            renderWidget={renderWidget}
            onFocus={handleFocus}
          />
        </div>
      ))}
    </div>
  );
};
