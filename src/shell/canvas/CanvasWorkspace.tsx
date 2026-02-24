/**
 * Canvas Workspace — main canvas component composing all layers.
 *
 * Architecture:
 * ```
 * <CanvasWorkspace>
 *   <CanvasOverlayLayer />       // Canvas2D: background, grid, guides (behind entities)
 *   <CanvasViewportLayer>        // CSS transform for pan/zoom
 *     <CanvasEntityLayer>        // Positioned entity divs
 *       <EntityRenderer />       // Per-entity type rendering
 *     </CanvasEntityLayer>
 *     <SelectionOverlay />       // Resize handles, crop UI, alignment guides
 *   </CanvasViewportLayer>
 *   <CanvasToolLayer />          // Transparent input capture layer
 * </CanvasWorkspace>
 *
 * @module shell/canvas
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { BackgroundSpec, GridConfig, Point2D } from '@sn/types';
import { DEFAULT_BACKGROUND, GridEvents } from '@sn/types';

import {
  DEFAULT_GRID_CONFIG,
  useInteractionStore,
} from '../../canvas/core';
import type { SceneGraph } from '../../canvas/core';
import { bus } from '../../kernel/bus';

import { CanvasEntityLayer } from './CanvasEntityLayer';
import { CanvasOverlayLayer } from './CanvasOverlayLayer';
import { CanvasToolLayer } from './CanvasToolLayer';
import { CanvasViewportLayer } from './CanvasViewportLayer';
import { SelectionOverlay } from './components';
import { initAlignHandler } from './handlers';
import { useActiveTool, useCanvasInput, useCanvasShortcuts, useSceneGraph, useSelection, useViewport } from './hooks';

export interface CanvasWorkspaceProps {
  /** Scene graph from Canvas Core — managed by the parent (CanvasPage) */
  sceneGraph: SceneGraph | null;
  /** Background specification (solid, gradient, or image) */
  background?: BackgroundSpec;
  /** Grid configuration */
  gridConfig?: GridConfig;
  /** Widget HTML lookup: widgetInstanceId -> html string */
  widgetHtmlMap?: Map<string, string>;
  /** Theme token map for widgets */
  theme?: Record<string, string>;
  /** Called when selection changes */
  onSelectionChange?: (ids: Set<string>) => void;
}

/**
 * Main canvas component — initializes Canvas Core and composes all layers.
 */
export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  sceneGraph,
  background = DEFAULT_BACKGROUND,
  gridConfig: gridConfigProp = DEFAULT_GRID_CONFIG,
  widgetHtmlMap,
  theme,
  onSelectionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Reactive grid config — merges prop defaults with bus event updates
  const [gridConfig, setGridConfig] = useState<GridConfig>(gridConfigProp);

  // Centralized selection state (shared with panels)
  const { selectedIds, select: setSelectedIds } = useSelection();

  // Subscribe to grid config bus events from Toolbar and other sources
  useEffect(() => {
    const unsubConfig = bus.subscribe(
      GridEvents.CONFIG_CHANGED,
      (event: { payload: { config: Partial<GridConfig> } }) => {
        setGridConfig((prev) => ({ ...prev, ...event.payload.config }));
      },
    );

    const unsubToggle = bus.subscribe(
      GridEvents.TOGGLED,
      (event: { payload: { enabled: boolean } }) => {
        setGridConfig((prev) => ({ ...prev, enabled: event.payload.enabled }));
      },
    );

    return () => {
      unsubConfig();
      unsubToggle();
    };
  }, []);

  // Initialize alignment handler — subscribes to align/distribute bus events
  useEffect(() => {
    const teardown = initAlignHandler(() => sceneGraph);
    return teardown;
  }, [sceneGraph]);

  // Viewport state (pan/zoom)
  const { viewport, store: viewportStore } = useViewport();

  // Subscribe to scene graph changes
  const entities = useSceneGraph(sceneGraph);

  // Active tool and interaction mode
  const { activeTool, toolsEnabled, setTool } = useActiveTool();

  // Wire pointer/wheel input to viewport
  useCanvasInput(containerRef, viewportStore);

  // Interaction mode from Canvas Core
  const interactionMode = useInteractionStore((s) => s.mode);

  // Canvas keyboard shortcuts (edit mode only)
  const { onKeyDown: handleKeyDown } = useCanvasShortcuts({
    sceneGraph,
    selectedIds,
    isEditMode: interactionMode === 'edit',
    selectIds: setSelectedIds,
    clearSelection: () => setSelectedIds(new Set()),
    setTool,
  });

  // Handle container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        viewportStore.resize(width, height);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [viewportStore]);

  // Selection change handler — updates centralized store + notifies parent
  const handleSelectionChange = useCallback(
    (ids: Set<string>) => {
      setSelectedIds(ids);
      onSelectionChange?.(ids);
    },
    [setSelectedIds, onSelectionChange],
  );

  // Map interaction mode 'edit' | 'play' to renderer mode 'edit' | 'preview'
  const rendererMode = interactionMode === 'edit' ? 'edit' : 'preview';

  // Pan callback for CanvasToolLayer (space+drag)
  const handlePan = useCallback(
    (delta: Point2D) => viewportStore.pan(delta),
    [viewportStore],
  );

  // Zoom getter for CanvasToolLayer (needed for pan delta calculation)
  const getZoom = useCallback(() => viewportStore.getState().zoom, [viewportStore]);

  return (
    <div
      ref={containerRef}
      data-testid="canvas-workspace"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--sn-bg, #f8f9fa)',
        touchAction: 'none',
        userSelect: 'none',
        outline: 'none',
      }}
    >
      {/* Layer 1: Background + Grid (behind entities) */}
      <CanvasOverlayLayer
        viewport={viewport}
        background={background}
        gridConfig={gridConfig}
      />

      {/* Layer 2: Viewport transform — entities render ON TOP of background */}
      <CanvasViewportLayer viewport={viewport}>
        <CanvasEntityLayer
          entities={entities}
          selectedIds={selectedIds}
          widgetHtmlMap={widgetHtmlMap}
          theme={theme}
          interactionMode={rendererMode}
        />
        <SelectionOverlay
          selectedIds={selectedIds}
          sceneGraph={sceneGraph}
          interactionMode={rendererMode}
        />
      </CanvasViewportLayer>

      {/* Layer 3: Tool interaction layer (transparent input capture) */}
      <CanvasToolLayer
        viewport={viewport}
        sceneGraph={sceneGraph}
        activeTool={activeTool}
        toolsEnabled={toolsEnabled}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        onPan={handlePan}
        getZoom={getZoom}
      />
    </div>
  );
};
