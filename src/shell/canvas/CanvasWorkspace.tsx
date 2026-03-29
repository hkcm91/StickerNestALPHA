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

import React, { useCallback, useEffect, useRef, useState } from "react";

import type { BackgroundSpec, GridConfig, Point2D } from "@sn/types";
import { DEFAULT_BACKGROUND, GridEvents } from "@sn/types";

import { DEFAULT_GRID_CONFIG, useInteractionStore } from "../../canvas/core";
import type { SceneGraph } from "../../canvas/core";
import { bus } from "../../kernel/bus";
import { useAuthStore } from "../../kernel/stores/auth/auth.store";
import { useUIStore } from "../../kernel/stores/ui/ui.store";
import { themeVar } from "../theme/theme-vars";

import { CanvasEntityLayer } from "./CanvasEntityLayer";
import { CanvasOverlayLayer } from "./CanvasOverlayLayer";
import { CanvasToolLayer } from "./CanvasToolLayer";
import { CanvasViewportLayer } from "./CanvasViewportLayer";
import {
  CanvasContextMenu,
  ConstellationLines,
  CursorGlow,
  FocusOverlay,
  PresenceCursorsLayer,
  RothkoField,
  SelectionOverlay,
} from "./components";
import {
  initAlignHandler,
  initCropHandler,
  initGroupHandler,
} from "./handlers";
import {
  useActiveTool,
  useCanvasInput,
  useCanvasShortcuts,
  useSceneGraph,
  useSelection,
  useViewport,
} from "./hooks";
import { SpatialCanvasLayer } from "./SpatialCanvasLayer";

const FOLDER_TOGGLE_EVENT = "canvas.folder.toggled";

export interface CanvasWorkspaceProps {
  /** Scene graph from Canvas Core — managed by the parent (CanvasPage) */
  sceneGraph: SceneGraph | null;
  /** Current dashboard/canvas slug for artboard-linked canvas creation */
  dashboardSlug?: string;
  /** Background specification (solid, gradient, or image) */
  background?: BackgroundSpec;
  /** Grid configuration */
  gridConfig?: GridConfig;
  /** Maximum artboards allowed in this dashboard canvas */
  maxArtboardsPerDashboard?: number;
  /** Widget HTML lookup: widgetInstanceId -> html string */
  widgetHtmlMap?: Map<string, string>;
  /** Theme token map for widgets */
  theme?: Record<string, string>;
  /** Called when selection changes */
  onSelectionChange?: (ids: Set<string>) => void;
  /** Canvas background opacity (0-1) — only affects background, not entities */
  canvasOpacity?: number;
}

/**
 * Main canvas component — initializes Canvas Core and composes all layers.
 */
export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  sceneGraph,
  dashboardSlug,
  background = DEFAULT_BACKGROUND,
  gridConfig: gridConfigProp = DEFAULT_GRID_CONFIG,
  maxArtboardsPerDashboard,
  widgetHtmlMap,
  theme,
  onSelectionChange,
  canvasOpacity = 1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track last cursor position for cursor-centered keyboard zoom
  const lastCursorScreen = useRef<{ x: number; y: number } | null>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      lastCursorScreen.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);
  const handleMouseLeave = useCallback(() => {
    lastCursorScreen.current = null;
  }, []);

  // Reactive grid config — merges prop defaults with bus event updates
  const [gridConfig, setGridConfig] = useState<GridConfig>(gridConfigProp);
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    const unsubFolderToggle = bus.subscribe(
      FOLDER_TOGGLE_EVENT,
      (event: { payload: { folderId: string } }) => {
        const folderId = event.payload.folderId;
        setOpenFolderIds((prev) => {
          const next = new Set(prev);
          if (next.has(folderId)) {
            next.delete(folderId);
          } else {
            next.add(folderId);
          }
          return next;
        });
      },
    );

    return unsubFolderToggle;
  }, []);

  // Initialize alignment handler — subscribes to align/distribute bus events
  useEffect(() => {
    const teardown = initAlignHandler(() => sceneGraph);
    return teardown;
  }, [sceneGraph]);

  // Initialize group handler — subscribes to group/ungroup bus events
  useEffect(() => {
    const teardown = initGroupHandler(() => sceneGraph);
    return teardown;
  }, [sceneGraph]);

  // Initialize crop handler — subscribes to crop bus events
  useEffect(() => {
    const teardown = initCropHandler(() => sceneGraph);
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

  // Spatial mode state (used by shortcuts and rendering)
  const spatialMode = useUIStore((s) => s.spatialMode);
  const setSpatialMode = useUIStore((s) => s.setSpatialMode);

  // Canvas keyboard shortcuts (edit mode only)
  const { onKeyDown: handleKeyDown } = useCanvasShortcuts({
    sceneGraph,
    selectedIds,
    isEditMode: interactionMode === "edit",
    selectIds: setSelectedIds,
    clearSelection: () => setSelectedIds(new Set()),
    setTool,
    viewportStore,
    lastCursorScreen,
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
      // Emit selection change on bus for Toolbar (outside workspace)
      bus.emit("shell.selection.changed", { ids: Array.from(ids) });
    },
    [setSelectedIds, onSelectionChange],
  );

  // Map interaction mode 'edit' | 'play' to renderer mode 'edit' | 'preview'
  const rendererMode = interactionMode === "edit" ? "edit" : "preview";

  // Pan callback for CanvasToolLayer (space+drag)
  const handlePan = useCallback(
    (delta: Point2D) => viewportStore.pan(delta),
    [viewportStore],
  );

  // Zoom getter for CanvasToolLayer (needed for pan delta calculation)
  const getZoom = useCallback(
    () => viewportStore.getState().zoom,
    [viewportStore],
  );

  const focusMode = useUIStore((s) => s.focusMode);

  // Track which entities are being dragged (for z-index boost + iframe suppression)
  const [draggingEntityIds, setDraggingEntityIds] = useState<Set<string>>(new Set());
  const emptySet = useRef(new Set<string>()).current;
  const setCanvasDragging = useCallback((dragging: boolean, entityIds?: Set<string>) => {
    containerRef.current?.setAttribute('data-canvas-dragging', String(dragging));
    setDraggingEntityIds(dragging && entityIds ? entityIds : emptySet);
  }, [emptySet]);

  return (
    <div
      ref={containerRef}
      data-testid="canvas-viewport"
      data-canvas-dragging="false"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: themeVar("--sn-bg"),
        touchAction: "none",
        userSelect: "none",
        outline: "none",
      }}
    >
      {/* Suppress iframe pointer events during canvas entity drag */}
      <style>{`[data-canvas-dragging="true"] iframe { pointer-events: none !important; }`}</style>

      {spatialMode !== '2d' ? (
        <>
          <div
            style={{
              position: "absolute",
              top: 70,
              right: 16,
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <button
              onClick={() => {
                bus.emit("canvas.entity.created", {
                  entity: {
                    id: crypto.randomUUID(),
                    type: "object3d",
                    canvasId: "00000000-0000-4000-8000-000000000001",
                    transform: {
                      position: { x: 0, y: 0 },
                      size: { width: 100, height: 100 },
                      rotation: 0,
                      scale: 1,
                    },
                    spatialTransform: {
                      position: { x: 0, y: 0.5, z: 0 },
                      rotation: { x: 0, y: 0, z: 0, w: 1 },
                      scale: { x: 1, y: 1, z: 1 },
                    },
                    zIndex: 10,
                    visible: true,
                    canvasVisibility: 'both',
                    locked: false,
                    flipH: false,
                    flipV: false,
                    primitive: "box",
                    color: "#6366f1",
                    opacity: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: useAuthStore.getState().user?.id ?? "00000000-0000-4000-a000-000000000000",
                  },
                });
              }}
              style={{
                background: "var(--sn-surface)",
                color: "var(--sn-text)",
                border: "1px solid var(--sn-border)",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              + Add Box
            </button>
            <button
              onClick={() => {
                bus.emit("canvas.entity.created", {
                  entity: {
                    id: crypto.randomUUID(),
                    type: "object3d",
                    canvasId: "00000000-0000-4000-8000-000000000001",
                    transform: {
                      position: { x: 100, y: 100 },
                      size: { width: 100, height: 100 },
                      rotation: 0,
                      scale: 1,
                    },
                    spatialTransform: {
                      position: { x: 1, y: 0.5, z: 0 },
                      rotation: { x: 0, y: 0, z: 0, w: 1 },
                      scale: { x: 1, y: 1, z: 1 },
                    },
                    zIndex: 10,
                    visible: true,
                    canvasVisibility: "3d",
                    locked: false,
                    primitive: "sphere",
                    color: "#f43f5e",
                    opacity: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: useAuthStore.getState().user?.id ?? "00000000-0000-4000-a000-000000000000",
                  },
                });
              }}
              style={{
                background: "var(--sn-surface)",
                color: "var(--sn-text)",
                border: "1px solid var(--sn-border)",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              + Add 3D Sphere
            </button>
            <button
              onClick={() => {
                bus.emit("canvas.entity.created", {
                  entity: {
                    id: crypto.randomUUID(),
                    type: "object3d",
                    canvasId: "00000000-0000-4000-8000-000000000001",
                    transform: {
                      position: { x: 200, y: 200 },
                      size: { width: 80, height: 80 },
                      rotation: 0,
                      scale: 1,
                    },
                    zIndex: 10,
                    visible: true,
                    canvasVisibility: "2d",
                    locked: false,
                    primitive: "box",
                    color: "#10b981",
                    opacity: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: useAuthStore.getState().user?.id ?? "00000000-0000-4000-a000-000000000000",
                  },
                });
              }}
              style={{
                background: "var(--sn-surface)",
                color: "var(--sn-text)",
                border: "1px solid var(--sn-border)",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              + Add 2D Box
            </button>
            <button
              onClick={() => {
                const instanceId = crypto.randomUUID();
                bus.emit("canvas.entity.created", {
                  entity: {
                    id: crypto.randomUUID(),
                    type: "widget",
                    canvasId: "00000000-0000-4000-8000-000000000001",
                    widgetId: "builtin:sticky-note",
                    widgetInstanceId: instanceId,
                    config: {},
                    transform: {
                      position: { x: 0, y: 0 },
                      size: { width: 320, height: 240 },
                      rotation: 0,
                      scale: 1,
                    },
                    spatialTransform: {
                      position: { x: -1, y: 1.2, z: 0 },
                      rotation: { x: 0, y: 0, z: 0, w: 1 },
                      scale: { x: 1, y: 1, z: 1 },
                    },
                    zIndex: 10,
                    visible: true,
                    canvasVisibility: "3d",
                    locked: false,
                    flipH: false,
                    flipV: false,
                    opacity: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: useAuthStore.getState().user?.id ?? "00000000-0000-4000-a000-000000000000",
                  },
                });
              }}
              style={{
                background: "var(--sn-surface)",
                color: "var(--sn-text)",
                border: "1px solid var(--sn-border)",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              + Add 3D Widget
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={() => {
                  const id = Array.from(selectedIds)[0];
                  const entity = entities.find((e) => e.id === id);
                  if (entity) {
                    const nextMode: "2d" | "3d" | "both" =
                      entity.canvasVisibility === "both"
                        ? "2d"
                        : entity.canvasVisibility === "2d"
                          ? "3d"
                          : "both";
                    bus.emit("canvas.entity.updated", {
                      entity: { ...entity, canvasVisibility: nextMode },
                    });
                  }
                }}
                style={{
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: 11,
                  marginTop: 8,
                }}
              >
                Visibility:{" "}
                {entities.find((e) => e.id === Array.from(selectedIds)[0])
                  ?.canvasVisibility || "both"}
              </button>
            )}
          </div>
          <SpatialCanvasLayer
            entities={entities}
            selectedIds={selectedIds}
            widgetHtmlMap={widgetHtmlMap}
            theme={theme}
            spatialMode={spatialMode}
            setSpatialMode={setSpatialMode}
            onSelect={(id) => {
              const newSet = new Set<string>();
              newSet.add(id);
              handleSelectionChange(newSet);
            }}
          />
        </>
      ) : (
        <>
          {/* Layer 0: P17/P19 — Rothko field (ambient color washes + grain) */}
          <RothkoField enabled={rendererMode === "edit"} />

          {/* Layer 0.5: P7 — Cursor ambient glow (follows mouse with deliberate lag) */}
          <CursorGlow enabled={rendererMode === "edit"} />

          {/* Layer 1: Background + Grid (behind entities) */}
          <CanvasOverlayLayer
            viewport={viewport}
            background={background}
            gridConfig={gridConfig}
            canvasOpacity={canvasOpacity}
          />

          {/* Layer 1.5: Background Interaction (portal target for tool-layer empty space clicks) */}
          <div
            id="canvas-bg-interaction"
            style={{ position: "absolute", inset: 0, zIndex: 1 }}
          />

          {/* Layer 2: Viewport transform — entities render ON TOP of background */}
          <CanvasViewportLayer viewport={viewport} style={{ zIndex: 2, pointerEvents: "none" }}>
            <CanvasEntityLayer
              entities={entities}
              selectedIds={selectedIds}
              openFolderIds={openFolderIds}
              widgetHtmlMap={widgetHtmlMap}
              theme={theme}
              interactionMode={rendererMode}
              draggingEntityIds={draggingEntityIds}
            />
            {/* Remote user cursors — rendered in canvas space */}
            <PresenceCursorsLayer zoom={viewport.zoom} />
          </CanvasViewportLayer>

          {/* Layer 3: Tool interaction layer (foreground hit-boxes and tool previews) */}
          <CanvasToolLayer
            viewport={viewport}
            sceneGraph={sceneGraph}
            dashboardSlug={dashboardSlug}
            activeTool={activeTool}
            toolsEnabled={toolsEnabled}
            maxArtboardsPerDashboard={maxArtboardsPerDashboard}
            selectedIds={selectedIds}
            openFolderIds={openFolderIds}
            onSelectionChange={handleSelectionChange}
            onPan={handlePan}
            getZoom={getZoom}
            backgroundPortalId="canvas-bg-interaction"
            gridConfig={gridConfig}
            onDragStateChange={setCanvasDragging}
          />

          {/* Layer 4: Selection handles — ABOVE tool layer so handles receive pointer events.
              Wrapper has pointer-events: none; individual handles set pointer-events: auto. */}
          <CanvasViewportLayer
            viewport={viewport}
            style={{ pointerEvents: "none", zIndex: 3 }}
          >
            {/* P13: Constellation lines between multi-selected entities */}
            <ConstellationLines
              selectedIds={selectedIds}
              sceneGraph={sceneGraph}
              interactionMode={rendererMode}
            />
            <SelectionOverlay
              selectedIds={selectedIds}
              sceneGraph={sceneGraph}
              interactionMode={rendererMode}
            />
          </CanvasViewportLayer>

          {/* Layer 5: P10 — Context menu (fixed position, above everything) */}
          <CanvasContextMenu
            selectedIds={selectedIds}
            interactionMode={rendererMode}
          />

          {/* Layer 6: Focus Mode overlay (above everything) */}
          {focusMode?.active && (
            <FocusOverlay
              focusedEntityIds={focusMode.focusedEntityIds}
              activeIndex={focusMode.activeIndex}
              entities={entities}
              widgetHtmlMap={widgetHtmlMap}
              theme={theme}
            />
          )}
        </>
      )}
    </div>
  );
};
