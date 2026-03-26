/**
 * Tool Layer — transparent input capture layer for canvas tool interactions.
 * Sits on top of everything and routes pointer/touch events to the active tool.
 *
 * Supported interactions:
 * - Space+drag or middle-click drag: pan the viewport
 * - Select tool: click to single-select, drag to move entities, drag-empty for marquee
 * - Text tool: click to place a new text entity
 * - Rect/Ellipse tool: click-drag to create a shape entity
 * - Pen tool: click-drag to create a freehand drawing entity
 *
 * @module shell/canvas
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { Point2D, CanvasEntity, DockerEntity, GridConfig } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { screenToCanvas, anchorsToSvgPath, resolveEntityTransform, setEntityPlatformTransform } from '../../canvas/core';
import type { ViewportState, SceneGraph } from '../../canvas/core';
import { snapToGridCell } from '../../canvas/tools/move/snap';
import { bus } from '../../kernel/bus';
import { useUIStore } from '../../kernel/stores/ui/ui.store';

import { CanvasViewportLayer } from './CanvasViewportLayer';
import { createLocalCanvas, slugifyCanvasName } from './hooks';
import type { CanvasToolId } from './hooks/useActiveTool';

export interface CanvasToolLayerProps {
  viewport: ViewportState;
  sceneGraph: SceneGraph | null;
  /** Current dashboard/canvas slug used to scope auto-created artboard canvases */
  dashboardSlug?: string;
  activeTool: CanvasToolId;
  toolsEnabled: boolean;
  /** Maximum number of artboards allowed in the current dashboard canvas */
  maxArtboardsPerDashboard?: number;
  selectedIds: Set<string>;
  openFolderIds?: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  /** Pan the viewport by a canvas-space delta */
  onPan?: (delta: Point2D) => void;
  /** Get current zoom level (for converting screen delta to canvas delta) */
  getZoom?: () => number;
  /** Optional ID of an element to portal the background capture layer into */
  backgroundPortalId?: string;
  /** Grid configuration for snap-to-grid during entity drag and placement */
  gridConfig?: GridConfig;
}

let entityCounter = 0;
function nextEntityId(prefix: string): string {
  entityCounter += 1;
  return `${prefix}-${Date.now()}-${entityCounter}`;
}

const DEMO_CANVAS_ID = '00000000-0000-4000-8000-000000000001';
const FOLDER_TOGGLE_EVENT = 'canvas.folder.toggled';

/** Drag modes — only one active at a time */
type DragMode = 'pan' | 'move-entities' | 'create-shape' | 'pen-draw' | 'marquee' | null;
const ENTITY_DRAG_THRESHOLD_PX = 4;
const ENTITY_DRAG_THRESHOLD_SQ = ENTITY_DRAG_THRESHOLD_PX * ENTITY_DRAG_THRESHOLD_PX;

/**
 * Local type for pen-path preview state received via bus.
 * Matches PenPathToolState from L4A-2 without importing across layer boundary.
 */
interface PenPathPreviewAnchor {
  readonly position: Point2D;
  readonly handleIn: Point2D | undefined;
  readonly handleOut: Point2D | undefined;
  readonly pointType: string;
}

interface PenPathPreview {
  readonly state: string;
  readonly anchors: ReadonlyArray<PenPathPreviewAnchor>;
  readonly mousePosition: Point2D | null;
}

/** Set of tool names that route input via the event bus bridge (L4A-2 init.ts). */
const BUS_BRIDGED_TOOLS = new Set<CanvasToolId>(['pen', 'direct-select', 'pathfinder']);

/** Cursor style per tool */
const TOOL_CURSORS: Partial<Record<CanvasToolId, string>> = {
  select: 'default',
  pan: 'grab',
  brush: 'crosshair',
  pen: 'crosshair',
  'direct-select': 'default',
  pathfinder: 'crosshair',
  text: 'text',
  rect: 'crosshair',
  ellipse: 'crosshair',
  line: 'crosshair',
  sticker: 'copy',
  widget: 'copy',
  lottie: 'copy',
  svg: 'copy',
};

/** Return the topmost visible, unlocked entity at a canvas-space point. */
function hitTestEntities(sceneGraph: SceneGraph, point: Point2D): CanvasEntity | null {
  const hits = sceneGraph.queryPoint(point);
  for (const entity of hits) {
    if (!entity.visible) continue;
    if (entity.locked) continue;
    return entity;
  }
  return null;
}

/** Walk up parentId chain to find the top-level ancestor group. */
function resolveTopGroup(entity: CanvasEntity, sceneGraph: SceneGraph): CanvasEntity {
  let current = entity;
  while (current.parentId) {
    const parent = sceneGraph.getEntity(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

function moveEntitiesIntoDocker(
  sceneGraph: SceneGraph,
  entityIds: ReadonlyArray<string>,
  dockerId: string,
): void {
  const dockerEntity = sceneGraph.getEntity(dockerId);
  if (!dockerEntity || dockerEntity.type !== 'docker') return;

  const nextDockerChildren = new Set<string>(dockerEntity.children);

  for (const entityId of entityIds) {
    if (entityId === dockerId) continue;
    const entity = sceneGraph.getEntity(entityId);
    if (!entity) continue;

    if (entity.parentId && entity.parentId !== dockerId) {
      const previousParent = sceneGraph.getEntity(entity.parentId);
      if (previousParent && 'children' in previousParent) {
        const parentChildren = previousParent.children.filter((childId) => childId !== entityId);
        bus.emit(CanvasEvents.ENTITY_UPDATED, {
          id: previousParent.id,
          updates: { children: parentChildren },
        });
      }
    }

    nextDockerChildren.add(entityId);
    if (entity.parentId !== dockerId) {
      bus.emit(CanvasEvents.ENTITY_UPDATED, {
        id: entity.id,
        updates: { parentId: dockerId },
      });
    }
  }

  bus.emit(CanvasEvents.ENTITY_UPDATED, {
    id: dockerId,
    updates: { children: Array.from(nextDockerChildren) },
  });
}

function removeEntitiesFromDocker(
  sceneGraph: SceneGraph,
  entityIds: ReadonlyArray<string>,
): void {
  for (const entityId of entityIds) {
    const entity = sceneGraph.getEntity(entityId);
    if (!entity || !entity.parentId) continue;

    const parent = sceneGraph.getEntity(entity.parentId);
    if (parent && 'children' in parent) {
      const parentWithChildren = parent as DockerEntity;
      const nextChildren = parentWithChildren.children.filter((id) => id !== entityId);
      bus.emit(CanvasEvents.ENTITY_UPDATED, {
        id: parent.id,
        updates: { children: nextChildren },
      });
    }

    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: entity.id,
      updates: { parentId: undefined },
    });
  }
}

/**
 * Invisible layer that captures pointer events and dispatches to the active tool.
 */
export const CanvasToolLayer: React.FC<CanvasToolLayerProps> = ({
  viewport,
  sceneGraph,
  dashboardSlug = 'dashboard',
  activeTool,
  toolsEnabled,
  maxArtboardsPerDashboard = 10,
  selectedIds,
  openFolderIds = new Set<string>(),
  onSelectionChange,
  onPan,
  getZoom,
  backgroundPortalId,
  gridConfig,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedTool: CanvasToolId =
    (activeTool as string) === 'move' ? 'select' : activeTool;
  const canvasPlatform = useUIStore((s) => s.canvasPlatform);

  /** Apply grid snap if enabled */
  const applySnap = useCallback(
    (pos: Point2D, entitySize?: { width: number; height: number }): Point2D => {
      if (!gridConfig || !gridConfig.enabled || gridConfig.snapMode === 'none') return pos;
      return snapToGridCell(pos, gridConfig, entitySize);
    },
    [gridConfig],
  );


  // ── Space key tracking for pan mode ──────────────────────────
  const isSpaceHeld = useRef(false);
  const [spaceDown, setSpaceDown] = useState(false); // for cursor reactivity
  const [altDown, setAltDown] = useState(false); // for shapebuilder cursor

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        // Don't prevent default if user is typing in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        isSpaceHeld.current = true;
        setSpaceDown(true);
      }
      if (e.altKey) {
        setAltDown(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceHeld.current = false;
        setSpaceDown(false);
      }
      if (!e.altKey) {
        setAltDown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ── Drag state ───────────────────────────────────────────────
  const dragModeRef = useRef<DragMode>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  // Canvas-space coordinates for tool operations
  const dragStartCanvas = useRef<Point2D>({ x: 0, y: 0 });
  const dragCurrentCanvas = useRef<Point2D>({ x: 0, y: 0 });

  // Screen-space coordinates for pan operations
  const panLastScreen = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Entity move state
  const dragEntityStartPositions = useRef<Map<string, Point2D>>(new Map());
  const dragRootEntityIds = useRef<Set<string>>(new Set());
  const hasEntityDragExceededThreshold = useRef(false);
  const pointerDownTargetId = useRef<string | null>(null);
  const pointerDownShift = useRef(false);
  const pointerDownWasAlreadySelected = useRef(false);

  // Pen tool state
  const penPointsRef = useRef<Point2D[]>([]);

  // Right-click pan state (distinguish right-click-drag=pan from right-click-tap=context menu)
  const rightClickStartScreen = useRef<Point2D>({ x: 0, y: 0 });
  const isRightClickDrag = useRef(false);

  // Marquee selection state
  const marqueeStartCanvas = useRef<Point2D>({ x: 0, y: 0 });
  const [marqueeRect, setMarqueeRect] = useState<{
    x: number; y: number; width: number; height: number;
  } | null>(null);

  // Group edit context — tracks which group the user has "entered" (via double-click).
  // When inside a group context, clicks target children directly instead of selecting the group.
  const groupEditContextRef = useRef<string | null>(null);

  // ── Pen-path preview state (received via bus from L4A-2) ──
  const [penPathPreview, setPenPathPreview] = useState<PenPathPreview | null>(null);
  const [pathfinderHover, setPathfinderHover] = useState<{ pathData?: string; bounds?: { x: number; y: number; width: number; height: number } } | null>(null);

  // ── Pathfinder effects ────────────────────────────────────────
  useEffect(() => {
    const unsub = bus.subscribe('widget.pathfinder.hover-region', (event: { payload: { pathData?: string; bounds?: any } }) => {
      setPathfinderHover(event.payload);
    });
    return unsub;
  }, []);

  // ── Bus-bridged tool: emit TOOL_CHANGED when switching to a bridged tool ──
  useEffect(() => {
    if (BUS_BRIDGED_TOOLS.has(activeTool)) {
      bus.emit(CanvasEvents.TOOL_CHANGED, { tool: activeTool });
    } else {
      // Clear pen-path preview when switching away
      setPenPathPreview(null);
    }
  }, [activeTool]);

  // ── Bus-bridged tool: subscribe to PEN_PATH_PREVIEW for overlay rendering ──
  useEffect(() => {
    if (activeTool !== 'pen') {
      setPenPathPreview(null);
      return;
    }
    const unsub = bus.subscribe(
      CanvasEvents.PEN_PATH_PREVIEW,
      (event: { payload: PenPathPreview }) => {
        setPenPathPreview(event.payload);
      },
    );
    return unsub;
  }, [activeTool]);

  // Publish widget-scoped selection events with full entity payload so
  // runtime widgets (e.g. text settings) can react to canvas selection.
  useEffect(() => {
    if (!sceneGraph) return;

    if (selectedIds.size === 0) {
      bus.emit(`widget.${CanvasEvents.SELECTION_CLEARED}`, {});
      return;
    }

    const entities = Array.from(selectedIds)
      .map((id) => sceneGraph.getEntity(id))
      .filter((entity): entity is CanvasEntity => Boolean(entity));
    if (entities.length === 0) return;

    const firstId = entities[0].id;
    bus.emit(`widget.${CanvasEvents.ENTITY_SELECTED}`, {
      id: firstId,
      entityId: firstId,
      ids: entities.map((entity) => entity.id),
      entities,
    });
  }, [sceneGraph, selectedIds]);

  // ── Bus-bridged tool: keyboard event forwarding ──
  useEffect(() => {
    if (!BUS_BRIDGED_TOOLS.has(activeTool)) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Only forward keys relevant to pen-path / direct-select tools
      const relevantKeys = ['Escape', 'Enter', 'Backspace', 'Delete'];
      if (!relevantKeys.includes(e.key)) return;

      e.preventDefault();
      bus.emit(CanvasEvents.TOOL_INPUT_KEY, {
        key: e.key,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool]);

  // ── Coordinate conversion ────────────────────────────────────
  const getCanvasPoint = useCallback(
    (e: React.PointerEvent): Point2D => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      return screenToCanvas(screenPt, viewport);
    },
    [viewport],
  );

  // ── Widget tool handler ─────────────────────────────────────
  const handleWidgetCreate = useCallback(
    (canvasPoint: Point2D) => {
      const pendingToolData = useUIStore.getState().pendingToolData;
      const widgetId = (pendingToolData?.widgetId as string) || 'unknown-widget';
      const instanceId = nextEntityId('widget-inst');
      const now = new Date().toISOString();

      const entity: CanvasEntity = {
        id: nextEntityId('widget'),
        type: 'widget',
        canvasId: DEMO_CANVAS_ID,
        transform: {
          position: { x: canvasPoint.x, y: canvasPoint.y },
          size: { width: 240, height: 180 },
          rotation: 0,
          scale: 1,
        },
        zIndex: sceneGraph ? sceneGraph.getEntitiesByZOrder().length + 1 : 1,
        visible: true,
        canvasVisibility: 'both',
        locked: false,
        flipH: false,
        flipV: false,
        opacity: 1,
        borderRadius: 8,
        name: widgetId,
        createdAt: now,
        updatedAt: now,
        createdBy: 'user',
        widgetInstanceId: instanceId,
        widgetId,
        config: {},
      } as CanvasEntity;

      bus.emit(CanvasEvents.ENTITY_CREATED, entity);
      onSelectionChange(new Set([entity.id]));

      // Switch back to select tool after placement
      useUIStore.getState().setActiveTool('select');
      useUIStore.getState().setPendingToolData(null);
    },
    [sceneGraph, onSelectionChange],
  );

  // ── Sticker tool handler ───────────────────────────────────
  const handleStickerCreate = useCallback(
    (canvasPoint: Point2D) => {
      const pendingToolData = useUIStore.getState().pendingToolData;
      const assetId = (pendingToolData?.assetId as string) || 'unknown-sticker';
      const metadata = (pendingToolData?.metadata as Record<string, unknown>) || {};
      const now = new Date().toISOString();

      const entity: CanvasEntity = {
        id: nextEntityId('sticker'),
        type: 'sticker',
        canvasId: DEMO_CANVAS_ID,
        transform: {
          position: { x: canvasPoint.x, y: canvasPoint.y },
          size: { width: 120, height: 120 },
          rotation: 0,
          scale: 1,
        },
        zIndex: sceneGraph ? sceneGraph.getEntitiesByZOrder().length + 1 : 1,
        visible: true,
        canvasVisibility: 'both',
        locked: false,
        flipH: false,
        flipV: false,
        opacity: 1,
        borderRadius: 0,
        name: assetId,
        createdAt: now,
        updatedAt: now,
        createdBy: 'user',
        assetUrl: '',
        assetType: 'image',
        ...metadata,
      } as CanvasEntity;

      bus.emit(CanvasEvents.ENTITY_CREATED, entity);
      onSelectionChange(new Set([entity.id]));

      // Switch back to select tool after placement
      useUIStore.getState().setActiveTool('select');
      useUIStore.getState().setPendingToolData(null);
    },
    [sceneGraph, onSelectionChange],
  );

  // - Lottie tool handler ----------------------------------------------------
  const handleLottieCreate = useCallback(
    (canvasPoint: Point2D) => {
      const pendingToolData = useUIStore.getState().pendingToolData;
      const assetId = (pendingToolData?.assetId as string) || 'unknown-lottie';
      const metadata = (pendingToolData?.metadata as Record<string, unknown>) || {};
      const assetUrl = typeof metadata.assetUrl === 'string' ? metadata.assetUrl : '';
      if (!assetUrl) return;
      const now = new Date().toISOString();

      const entity: CanvasEntity = {
        id: nextEntityId('lottie'),
        type: 'lottie',
        canvasId: DEMO_CANVAS_ID,
        transform: {
          position: { x: canvasPoint.x, y: canvasPoint.y },
          size: { width: 160, height: 160 },
          rotation: 0,
          scale: 1,
        },
        zIndex: sceneGraph ? sceneGraph.getEntitiesByZOrder().length + 1 : 1,
        visible: true,
        canvasVisibility: 'both',
        locked: false,
        flipH: false,
        flipV: false,
        opacity: 1,
        borderRadius: 0,
        name: typeof metadata.name === 'string' ? metadata.name : assetId,
        createdAt: now,
        updatedAt: now,
        createdBy: 'user',
        assetUrl,
        loop: metadata.loop === false ? false : true,
        speed: typeof metadata.speed === 'number' ? metadata.speed : 1,
        direction: metadata.direction === -1 ? -1 : 1,
        autoplay: metadata.autoplay === false ? false : true,
        altText: typeof metadata.altText === 'string' ? metadata.altText : undefined,
        aspectLocked: metadata.aspectLocked === false ? false : true,
        ...metadata,
      } as CanvasEntity;

      bus.emit(CanvasEvents.ENTITY_CREATED, entity);
      onSelectionChange(new Set([entity.id]));
      useUIStore.getState().setActiveTool('select');
      useUIStore.getState().setPendingToolData(null);
    },
    [sceneGraph, onSelectionChange],
  );

  // - SVG tool handler -------------------------------------------------------
  const handleSvgCreate = useCallback(
    (canvasPoint: Point2D) => {
      const pendingToolData = useUIStore.getState().pendingToolData;
      const assetId = (pendingToolData?.assetId as string) || 'unknown-svg';
      const metadata = (pendingToolData?.metadata as Record<string, unknown>) || {};
      const svgContent = typeof metadata.svgContent === 'string' ? metadata.svgContent : '';
      const defaultWidth =
        typeof metadata.defaultWidth === 'number' && metadata.defaultWidth > 0
          ? metadata.defaultWidth
          : 260;
      const defaultHeight =
        typeof metadata.defaultHeight === 'number' && metadata.defaultHeight > 0
          ? metadata.defaultHeight
          : 260;
      const fill = typeof metadata.fill === 'string' ? metadata.fill : undefined;
      const stroke = typeof metadata.stroke === 'string' ? metadata.stroke : undefined;
      if (!svgContent) return;
      const now = new Date().toISOString();

      const entity: CanvasEntity = {
        id: nextEntityId('svg'),
        type: 'svg',
        canvasId: DEMO_CANVAS_ID,
        transform: {
          position: { x: canvasPoint.x, y: canvasPoint.y },
          size: { width: defaultWidth, height: defaultHeight },
          rotation: 0,
          scale: 1,
        },
        zIndex: sceneGraph ? sceneGraph.getEntitiesByZOrder().length + 1 : 1,
        visible: true,
        canvasVisibility: 'both',
        locked: false,
        flipH: false,
        flipV: false,
        opacity: 1,
        borderRadius: 0,
        name: typeof metadata.name === 'string' ? metadata.name : assetId,
        createdAt: now,
        updatedAt: now,
        createdBy: 'user',
        svgContent,
        assetUrl: typeof metadata.assetUrl === 'string' ? metadata.assetUrl : undefined,
        altText: typeof metadata.altText === 'string' ? metadata.altText : undefined,
        fill,
        stroke,
        aspectLocked: metadata.aspectLocked === false ? false : true,
      } as CanvasEntity;

      bus.emit(CanvasEvents.ENTITY_CREATED, entity);
      onSelectionChange(new Set([entity.id]));
      useUIStore.getState().setActiveTool('select');
      useUIStore.getState().setPendingToolData(null);
    },
    [sceneGraph, onSelectionChange],
  );

  // ── Text tool handler ────────────────────────────────────────
  const handleTextCreate = useCallback(
    (canvasPoint: Point2D) => {
      const now = new Date().toISOString();
      const entity: CanvasEntity = {
        id: nextEntityId('text'),
        type: 'text',
        canvasId: DEMO_CANVAS_ID,
        transform: {
          position: { x: canvasPoint.x, y: canvasPoint.y },
          size: { width: 200, height: 40 },
          rotation: 0,
          scale: 1,
        },
        zIndex: sceneGraph ? sceneGraph.getEntitiesByZOrder().length + 1 : 1,
        visible: true,
        canvasVisibility: 'both',
        locked: false,
        flipH: false,
        flipV: false,
        opacity: 1,
        borderRadius: 0,
        name: 'New Text',
        createdAt: now,
        updatedAt: now,
        createdBy: 'user',
        content: 'Double-click to edit',
        fontSize: 16,
        fontFamily: 'var(--sn-font-family, sans-serif)',
        fontWeight: 400,
        color: 'var(--sn-text, #1a1a2e)',
        textAlign: 'left',
      } as CanvasEntity;

      bus.emit(CanvasEvents.ENTITY_CREATED, entity);
      onSelectionChange(new Set([entity.id]));
    },
    [sceneGraph, onSelectionChange],
  );

  // ── Start entity move (shared by select + move tools) ────────
  const startEntityMove = useCallback(
    (canvasPoint: Point2D, idsToMove: Set<string>, e: React.PointerEvent, target: HTMLElement) => {
      if (idsToMove.size === 0 || !sceneGraph) return;

      dragStartCanvas.current = canvasPoint;
      dragRootEntityIds.current = new Set(idsToMove);
      const startPositions = new Map<string, Point2D>();
      for (const id of idsToMove) {
        const ent = sceneGraph.getEntity(id);
        if (ent) {
          startPositions.set(id, { ...ent.transform.position });
          // Also collect descendants so children move with their group
          const descendants = sceneGraph.getDescendants(id);
          for (const desc of descendants) {
            if (!startPositions.has(desc.id)) {
              startPositions.set(desc.id, { ...desc.transform.position });
            }
          }
        }
      }
      dragEntityStartPositions.current = startPositions;
      hasEntityDragExceededThreshold.current = false;
      dragModeRef.current = 'move-entities';
      isDraggingRef.current = true;
      setIsDragging(true);
      target.setPointerCapture(e.pointerId);
    },
    [sceneGraph],
  );

  // ── Pointer down ─────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, hitEntity?: CanvasEntity) => {
      if (!sceneGraph) return;
      const target = e.target as HTMLElement;

      // ── Middle-click pan (button 1) ──
      if (e.button === 1 && onPan) {
        e.preventDefault();
        panLastScreen.current = { x: e.clientX, y: e.clientY };
        dragModeRef.current = 'pan';
        isDraggingRef.current = true;
        setIsDragging(true);
        target.setPointerCapture(e.pointerId);
        return;
      }

      // ── Right-click drag pan (button 2) ──
      if (e.button === 2 && onPan) {
        e.preventDefault();
        panLastScreen.current = { x: e.clientX, y: e.clientY };
        rightClickStartScreen.current = { x: e.clientX, y: e.clientY };
        isRightClickDrag.current = false;
        dragModeRef.current = 'pan';
        isDraggingRef.current = true;
        setIsDragging(true);
        target.setPointerCapture(e.pointerId);
        return;
      }

      // Only process left clicks from here
      if (e.button !== 0) return;

      // ── Space+left-click pan ──
      if (isSpaceHeld.current && onPan) {
        panLastScreen.current = { x: e.clientX, y: e.clientY };
        dragModeRef.current = 'pan';
        isDraggingRef.current = true;
        setIsDragging(true);
        target.setPointerCapture(e.pointerId);
        return;
      }

      if (!toolsEnabled) return;

      const canvasPoint = getCanvasPoint(e);

      switch (normalizedTool) {
        case 'select': {
          // Hit-test for topmost visible, unlocked entity under cursor
          const topEntity = hitEntity || hitTestEntities(sceneGraph, canvasPoint);

          if (topEntity) {
            const isDeepSelect = e.metaKey || e.ctrlKey;
            const isMultiSelect = e.shiftKey;

            let selectTarget = topEntity;

            if (topEntity.parentId && !isDeepSelect) {
              const topGroup = resolveTopGroup(topEntity, sceneGraph);
              if (groupEditContextRef.current === topGroup.id) {
                // Inside the top group context: select the direct child of the top group
                let current = topEntity;
                while (current.parentId && current.parentId !== topGroup.id) {
                  const parent = sceneGraph.getEntity(current.parentId);
                  if (!parent) break;
                  current = parent;
                }
                selectTarget = current;
              } else if (selectedIds.has(topGroup.id)) {
                // Top group is selected: "enter" it by selecting the direct child of the top group
                let current = topEntity;
                while (current.parentId && current.parentId !== topGroup.id) {
                  const parent = sceneGraph.getEntity(current.parentId);
                  if (!parent) break;
                  current = parent;
                }
                selectTarget = current;
                groupEditContextRef.current = topGroup.id;
              } else {
                // Otherwise select the top-level group
                selectTarget = topGroup;
              }
            }

            let nextSelection: Set<string>;
            const wasAlreadySelected = selectedIds.has(selectTarget.id);
            if (isMultiSelect) {
              nextSelection = new Set(selectedIds);
              if (nextSelection.has(selectTarget.id)) {
                nextSelection.delete(selectTarget.id);
              } else {
                nextSelection.add(selectTarget.id);
              }
            } else {
              // If clicking an already selected item without Shift, don't clear others yet 
              // (to allow dragging multiple items). If we UP without moving, then clear.
              if (selectedIds.has(selectTarget.id)) {
                nextSelection = selectedIds;
              } else {
                nextSelection = new Set([selectTarget.id]);
              }
            }

            onSelectionChange(nextSelection);
            pointerDownTargetId.current = selectTarget.id;
            pointerDownShift.current = isMultiSelect;
            pointerDownWasAlreadySelected.current = wasAlreadySelected;
            if (!isMultiSelect || !selectedIds.has(selectTarget.id)) {
              bus.emit(CanvasEvents.ENTITY_SELECTED, { id: selectTarget.id });
            }

            // In select mode, dragging follows the selection.
            startEntityMove(canvasPoint, nextSelection, e, target);
          } else {
            // Click on empty canvas → deselect + exit group context + start marquee selection
            if (!e.shiftKey) {
              onSelectionChange(new Set());
              groupEditContextRef.current = null;
            }
            marqueeStartCanvas.current = canvasPoint;
            setMarqueeRect({ x: canvasPoint.x, y: canvasPoint.y, width: 0, height: 0 });
            dragModeRef.current = 'marquee';
            isDraggingRef.current = true;
            setIsDragging(true);
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }
          break;
        }

        case 'pan': {
          if (onPan) {
            panLastScreen.current = { x: e.clientX, y: e.clientY };
            rightClickStartScreen.current = { x: e.clientX, y: e.clientY };
            isRightClickDrag.current = true; // always treat as drag for pan tool
            dragModeRef.current = 'pan';
            isDraggingRef.current = true;
            setIsDragging(true);
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }
          break;
        }

        case 'artboard':
        case 'rect':
        case 'ellipse': {
          dragStartCanvas.current = canvasPoint;
          dragCurrentCanvas.current = canvasPoint;
          dragModeRef.current = 'create-shape';
          isDraggingRef.current = true;
          setIsDragging(true);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          break;
        }

        case 'brush': {
          penPointsRef.current = [canvasPoint];
          dragStartCanvas.current = canvasPoint;
          dragModeRef.current = 'pen-draw';
          isDraggingRef.current = true;
          setIsDragging(true);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          break;
        }

        case 'text':
          handleTextCreate(canvasPoint);
          break;

        case 'widget':
          handleWidgetCreate(canvasPoint);
          break;

        case 'sticker':
          handleStickerCreate(canvasPoint);
          break;

        case 'lottie':
          handleLottieCreate(canvasPoint);
          break;

        case 'svg':
          handleSvgCreate(canvasPoint);
          break;

        case 'pen':
        case 'direct-select':
        case 'pathfinder': {
          // Bus-bridged tools: forward pointer down via event bus to L4A-2
          const rect = containerRef.current?.getBoundingClientRect();
          const screenPt = rect
            ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
            : { x: 0, y: 0 };
          const topEntity = hitTestEntities(sceneGraph, canvasPoint);

          // Also set capture on the target so we get move/up events correctly
          (e.target as HTMLElement).setPointerCapture(e.pointerId);

          bus.emit(CanvasEvents.TOOL_INPUT_DOWN, {
            canvasPosition: canvasPoint,
            screenPosition: screenPt,
            entityId: topEntity?.id ?? null,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
          });
          break;
        }

        default: {
          // Other tools — fall through to select behavior
          const topEntity = hitTestEntities(sceneGraph, canvasPoint);
          if (topEntity) {
            if (!selectedIds.has(topEntity.id)) {
              onSelectionChange(new Set([topEntity.id]));
            }
            bus.emit(CanvasEvents.ENTITY_SELECTED, { id: topEntity.id });
          } else if (selectedIds.size > 0) {
            onSelectionChange(new Set());
          }
          break;
        }
      }
    },
    [sceneGraph, toolsEnabled, normalizedTool, selectedIds, onSelectionChange,
     getCanvasPoint, handleTextCreate, handleWidgetCreate, handleStickerCreate,
     handleLottieCreate, handleSvgCreate, startEntityMove, onPan],
  );

  // ── Pointer move ─────────────────────────────────────────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Bus-bridged tools receive ALL pointer moves (rubber-band preview, hover)
      if (BUS_BRIDGED_TOOLS.has(normalizedTool)) {
        const cp = getCanvasPoint(e);
        const rect = containerRef.current?.getBoundingClientRect();
        const sp = rect
          ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
          : { x: 0, y: 0 };
        bus.emit(CanvasEvents.TOOL_INPUT_MOVE, {
          canvasPosition: cp,
          screenPosition: sp,
          entityId: null,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
        });
      }

      if (!isDraggingRef.current) return;
      const mode = dragModeRef.current;

      if (mode === 'pan' && onPan) {
        // Right-click drag threshold: 4px before starting pan (to distinguish from context menu tap)
        if (!isRightClickDrag.current) {
          const ddx = e.clientX - rightClickStartScreen.current.x;
          const ddy = e.clientY - rightClickStartScreen.current.y;
          if (ddx * ddx + ddy * ddy < 16) return; // < 4px
          isRightClickDrag.current = true;
        }
        // Screen-space delta → canvas-space delta (divide by zoom)
        const zoom = getZoom ? getZoom() : viewport.zoom;
        const dx = (e.clientX - panLastScreen.current.x) / zoom;
        const dy = (e.clientY - panLastScreen.current.y) / zoom;
        onPan({ x: dx, y: dy });
        panLastScreen.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (!sceneGraph) return;
      const canvasPoint = getCanvasPoint(e);

      if (mode === 'move-entities') {
        const dx = canvasPoint.x - dragStartCanvas.current.x;
        const dy = canvasPoint.y - dragStartCanvas.current.y;
        const distSq = dx * dx + dy * dy;
        if (!hasEntityDragExceededThreshold.current) {
          if (distSq < ENTITY_DRAG_THRESHOLD_SQ) return;
          hasEntityDragExceededThreshold.current = true;
        }
        
        // Check for undocking: if an entity is currently in an open folder and moves outside its bounds
        const entitiesToUndock: string[] = [];
        
        for (const [id, startPos] of dragEntityStartPositions.current) {
          const entity = sceneGraph.getEntity(id);
          if (!entity) continue;
          
          const rawPos = { x: startPos.x + dx, y: startPos.y + dy };
          const newPos = applySnap(rawPos, entity.transform.size);

          if (entity.parentId && openFolderIds.has(entity.parentId)) {
            const parent = sceneGraph.getEntity(entity.parentId);
            if (parent && parent.type === 'docker') {
              const winWidth = Math.max(parent.transform.size.width, 320);
              const winHeight = Math.max(parent.transform.size.height, 240);
              const px = parent.transform.position.x;
              const py = parent.transform.position.y;
              
              // Use cursor position (canvasPoint) to determine if we've dragged outside
              const isOutside = 
                canvasPoint.x < px || 
                canvasPoint.x > px + winWidth || 
                canvasPoint.y < py || 
                canvasPoint.y > py + winHeight;
                
              if (isOutside) {
                entitiesToUndock.push(id);
              }
            }
          }

          // Must send the FULL transform (deep merge) — scene graph does shallow merge
          // Platform-aware: write to correct transform slot for active platform
          const currentPlatform = useUIStore.getState().canvasPlatform;
          const resolvedTransform = resolveEntityTransform(entity, currentPlatform);
          const newTransform = { ...resolvedTransform, position: newPos };
          const updated = setEntityPlatformTransform(entity, currentPlatform, newTransform);
          bus.emit(CanvasEvents.ENTITY_UPDATED, {
            id,
            updates: {
              transform: updated.transform,
              ...(updated.platformTransforms ? { platformTransforms: updated.platformTransforms } : {}),
            },
          });
        }
        
        if (entitiesToUndock.length > 0) {
          removeEntitiesFromDocker(sceneGraph, entitiesToUndock);
        }
      } else if (mode === 'create-shape') {
        dragCurrentCanvas.current = canvasPoint;
      } else if (mode === 'pen-draw') {
        penPointsRef.current.push(canvasPoint);
      } else if (mode === 'marquee') {
        const sx = marqueeStartCanvas.current;
        setMarqueeRect({
          x: Math.min(sx.x, canvasPoint.x),
          y: Math.min(sx.y, canvasPoint.y),
          width: Math.abs(canvasPoint.x - sx.x),
          height: Math.abs(canvasPoint.y - sx.y),
        });
      }
    },
    [normalizedTool, sceneGraph, viewport, getCanvasPoint, onPan, getZoom, applySnap],
  );

  // ── Pointer up ───────────────────────────────────────────────
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Bus-bridged tools receive up events independently of drag state
      if (BUS_BRIDGED_TOOLS.has(normalizedTool)) {
        const cp = getCanvasPoint(e);
        const rect = containerRef.current?.getBoundingClientRect();
        const sp = rect
          ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
          : { x: 0, y: 0 };
        bus.emit(CanvasEvents.TOOL_INPUT_UP, {
          canvasPosition: cp,
          screenPosition: sp,
          entityId: null,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
        });
      }

      if (!isDraggingRef.current) return;
      const mode = dragModeRef.current;

      // Release pointer capture
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore — capture may already be released
      }

      isDraggingRef.current = false;
      setIsDragging(false);
      dragModeRef.current = null;

      if (mode === 'pan') {
        // If right-click was released without dragging far enough → emit context menu event
        if (!isRightClickDrag.current && e.button === 2) {
          const canvasPt = getCanvasPoint(e);
          const targetEntity = sceneGraph ? hitTestEntities(sceneGraph, canvasPt) : null;
          bus.emit('canvas.contextmenu.show', {
            screenX: e.clientX,
            screenY: e.clientY,
            canvasPoint: canvasPt,
            entityId: targetEntity?.id ?? null,
          });
        }
        isRightClickDrag.current = false;
        dragRootEntityIds.current.clear();
        return;
      }

      if (!sceneGraph) return;
      const canvasPoint = getCanvasPoint(e);

      if (mode === 'move-entities') {
        // Emit final position for each moved entity
        const dx = canvasPoint.x - dragStartCanvas.current.x;
        const dy = canvasPoint.y - dragStartCanvas.current.y;
        const distSq = dx * dx + dy * dy;
        const wasDrag = hasEntityDragExceededThreshold.current || distSq >= ENTITY_DRAG_THRESHOLD_SQ;

        if (!wasDrag) {
          // Click-only release on an already-selected item collapses multi-selection to that item.
          if (
            pointerDownTargetId.current &&
            pointerDownWasAlreadySelected.current &&
            !pointerDownShift.current &&
            selectedIds.size > 1
          ) {
            onSelectionChange(new Set([pointerDownTargetId.current]));
          }
          dragEntityStartPositions.current.clear();
          dragRootEntityIds.current.clear();
          hasEntityDragExceededThreshold.current = false;
          pointerDownTargetId.current = null;
          return;
        }

        for (const [id, startPos] of dragEntityStartPositions.current) {
          const entity = sceneGraph.getEntity(id);
          const rawPos = { x: startPos.x + dx, y: startPos.y + dy };
          const snappedPos = applySnap(rawPos, entity?.transform.size);
          bus.emit(CanvasEvents.ENTITY_MOVED, {
            id,
            position: snappedPos,
          });
        }

        const movedRootIds = dragRootEntityIds.current;
        const dropHits = sceneGraph.queryPoint(canvasPoint);
        const dropDocker = dropHits.find(
          (entity) => entity.type === 'docker' && !movedRootIds.has(entity.id),
        );
        if (dropDocker && dropDocker.type === 'docker') {
          moveEntitiesIntoDocker(sceneGraph, Array.from(movedRootIds), dropDocker.id);
        }

        dragEntityStartPositions.current.clear();
        dragRootEntityIds.current.clear();
        hasEntityDragExceededThreshold.current = false;
        pointerDownTargetId.current = null;
      } else if (mode === 'create-shape') {
        // Create shape from drag rectangle
        const start = dragStartCanvas.current;
        const end = canvasPoint;
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.max(Math.abs(end.x - start.x), 20);
        const height = Math.max(Math.abs(end.y - start.y), 20);
        const now = new Date().toISOString();

        if (activeTool === 'artboard') {
          // Check per-dashboard artboard limit (default 10)
          const existingArtboards = sceneGraph.getAllEntities().filter((entity) => entity.type === 'artboard');
          if (existingArtboards.length >= maxArtboardsPerDashboard) {
            console.warn(`[ArtboardTool] Limit reached (${maxArtboardsPerDashboard}). Cannot add another canvas.`);
            // Optionally emit a bus event for UI feedback
            bus.emit('shell.notification', { 
              type: 'warning', 
              message: `Artboard limit reached (${maxArtboardsPerDashboard} per dashboard).`,
            });
            return;
          }

          // Create a new local canvas for this artboard, scoped to the current dashboard slug.
          const artboardName = `Artboard ${existingArtboards.length + 1}`;
          const dashboardSlugBase = slugifyCanvasName(dashboardSlug);
          const artboardSlugBase = slugifyCanvasName(`${dashboardSlugBase}--${artboardName}`);
          const newCanvas = createLocalCanvas({ 
            name: artboardName,
            slug: artboardSlugBase,
          });

          const entity: CanvasEntity = {
            id: nextEntityId('artboard'),
            type: 'artboard',
            canvasId: DEMO_CANVAS_ID,
            transform: {
              position: { x, y },
              size: { width, height },
              rotation: 0,
              scale: 1,
            },
            zIndex: sceneGraph.getEntitiesByZOrder().length + 1,
            visible: true,
            canvasVisibility: 'both',
            locked: false,
            flipH: false,
            flipV: false,
            opacity: 1,
            borderRadius: 0,
            syncTransform2d3d: true,
            name: artboardName,
            createdAt: now,
            updatedAt: now,
            createdBy: 'user',
            children: [],
            devicePreset: 'Custom',
            childCanvasId: newCanvas.id,
            childCanvasSlug: newCanvas.slug,
          } as CanvasEntity;

          bus.emit(CanvasEvents.ENTITY_CREATED, entity);
          onSelectionChange(new Set([entity.id]));
        } else {
          const entity: CanvasEntity = {
            id: nextEntityId('shape'),
            type: 'shape',
            canvasId: DEMO_CANVAS_ID,
            transform: {
              position: { x, y },
              size: { width, height },
              rotation: 0,
              scale: 1,
            },
            zIndex: sceneGraph.getEntitiesByZOrder().length + 1,
            visible: true,
            canvasVisibility: 'both',
            locked: false,
            flipH: false,
            flipV: false,
            opacity: 1,
            borderRadius: activeTool === 'ellipse' ? Math.max(width, height) : 0,
            name: activeTool === 'ellipse' ? 'New Ellipse' : 'New Rectangle',
            createdAt: now,
            updatedAt: now,
            createdBy: 'user',
            shapeType: activeTool === 'ellipse' ? 'ellipse' : 'rect',
            fill: 'var(--sn-accent, #6366f1)',
            stroke: 'var(--sn-border, #e0e0e0)',
            strokeWidth: 2,
          } as CanvasEntity;

          bus.emit(CanvasEvents.ENTITY_CREATED, entity);
          onSelectionChange(new Set([entity.id]));
        }
      } else if (mode === 'pen-draw') {
        const points = penPointsRef.current;
        if (points.length < 2) {
          penPointsRef.current = [];
          return;
        }

        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        const width = Math.max(maxX - minX, 10);
        const height = Math.max(maxY - minY, 10);
        const now = new Date().toISOString();

        // Normalize points relative to entity position
        const normalizedPoints = points.map(p => ({
          x: p.x - minX,
          y: p.y - minY,
        }));

        const entity: CanvasEntity = {
          id: nextEntityId('drawing'),
          type: 'drawing',
          canvasId: DEMO_CANVAS_ID,
          transform: {
            position: { x: minX, y: minY },
            size: { width, height },
            rotation: 0,
            scale: 1,
          },
          zIndex: sceneGraph.getEntitiesByZOrder().length + 1,
          visible: true,
          canvasVisibility: 'both',
          locked: false,
          flipH: false,
          flipV: false,
          opacity: 1,
          borderRadius: 0,
          name: 'New Drawing',
          createdAt: now,
          updatedAt: now,
          createdBy: 'user',
          points: normalizedPoints,
          stroke: 'var(--sn-text, #1a1a2e)',
          strokeWidth: 3,
          smoothing: 0.5,
        } as CanvasEntity;

        bus.emit(CanvasEvents.ENTITY_CREATED, entity);
        onSelectionChange(new Set([entity.id]));
        penPointsRef.current = [];
      } else if (mode === 'marquee') {
        // Marquee selection — query scene graph for entities within the drag rectangle
        setMarqueeRect(null);
        if (sceneGraph) {
          const sx = marqueeStartCanvas.current;
          const bounds = {
            min: { x: Math.min(sx.x, canvasPoint.x), y: Math.min(sx.y, canvasPoint.y) },
            max: { x: Math.max(sx.x, canvasPoint.x), y: Math.max(sx.y, canvasPoint.y) },
          };
          const hits = sceneGraph.queryRegion(bounds);
          // Filter: visible, not locked; resolve children to top-level groups
          const selected = new Set<string>();
          for (const hit of hits) {
            if (!hit.visible || hit.locked) continue;
            // Group-aware: resolve to appropriate hierarchical level
            let target = hit;
            if (hit.parentId) {
              const topGroup = resolveTopGroup(hit, sceneGraph);
              if (groupEditContextRef.current === topGroup.id) {
                // Inside a group context: marquee selects the immediate child of that group
                let current = hit;
                while (current.parentId && current.parentId !== topGroup.id) {
                  const parent = sceneGraph.getEntity(current.parentId);
                  if (!parent) break;
                  current = parent;
                }
                target = current;
              } else {
                // Outside any context: marquee selects top-level group
                target = topGroup;
              }
            }
            selected.add(target.id);
          }
          if (e.shiftKey) {
            // Shift+Marquee: toggle selection for each hit
            const merged = new Set(selectedIds);
            for (const id of selected) {
              if (merged.has(id)) {
                merged.delete(id);
              } else {
                merged.add(id);
              }
            }
            onSelectionChange(merged);
          } else {
            onSelectionChange(selected);
          }
        }
      }

      if (mode !== 'move-entities') {
        dragRootEntityIds.current.clear();
      }
    },
    [sceneGraph, normalizedTool, selectedIds, getCanvasPoint, onSelectionChange, applySnap],
  );

  // ── Double-click: enter group edit context ──────────────────
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!sceneGraph || !toolsEnabled || normalizedTool !== 'select') return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const canvasPoint = screenToCanvas(screenPt, viewport);

      const topEntity = hitTestEntities(sceneGraph, canvasPoint);
      if (!topEntity) return;

      // Double-click folder to toggle it
      if (topEntity.type === 'docker') {
        bus.emit(FOLDER_TOGGLE_EVENT, { folderId: topEntity.id });
        return;
      }

      // If we clicked a group (or a selected group), enter the group context.
      if (topEntity.type === 'group' && selectedIds.has(topEntity.id)) {
        groupEditContextRef.current = topEntity.id;
        // Re-hit-test to find the child inside the group
        const hits = sceneGraph.queryPoint(canvasPoint);
        for (const hit of hits) {
          if (hit.id === topEntity.id) continue;
          if (!hit.visible || hit.locked) continue;
          if (hit.parentId === topEntity.id) {
            onSelectionChange(new Set([hit.id]));
            bus.emit(CanvasEvents.ENTITY_SELECTED, { id: hit.id });
            return;
          }
        }
      } else if (topEntity.parentId) {
        // Clicked a child whose parent group is selected → enter group, select this child
        const topGroup = resolveTopGroup(topEntity, sceneGraph);
        if (selectedIds.has(topGroup.id)) {
          groupEditContextRef.current = topGroup.id;
          onSelectionChange(new Set([topEntity.id]));
          bus.emit(CanvasEvents.ENTITY_SELECTED, { id: topEntity.id });
        }
      }
    },
    [sceneGraph, toolsEnabled, normalizedTool, viewport, selectedIds, onSelectionChange],
  );

  const cursor = spaceDown || (isDragging && dragModeRef.current === 'pan')
    ? (isDragging ? 'grabbing' : 'grab')
    : isDragging && dragModeRef.current === 'move-entities'
    ? 'grabbing'
    : isDragging && dragModeRef.current === 'marquee'
    ? 'crosshair'
    : normalizedTool === 'pan'
    ? 'grab'
    : normalizedTool === 'pathfinder'
    ? altDown ? 'not-allowed' : 'copy' // Placeholder for Illustrator cursors
    : toolsEnabled
    ? TOOL_CURSORS[normalizedTool] || 'crosshair'
    : 'default';

  // Find the portal target element for the background capture layer
  const bgPortalTarget = backgroundPortalId ? document.getElementById(backgroundPortalId) : null;

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* 1. Background capture portal — for empty space clicks (pan, marquee, deselect) */}
      {bgPortalTarget && createPortal(
        <div
          data-testid="canvas-background-capture"
          onPointerDown={(e) => handlePointerDown(e)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'auto',
            background: 'transparent',
            cursor,
          }}
        />,
        bgPortalTarget
      )}

      <div
        data-testid="canvas-tool-layer"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none', // Allow clicking through to iframes
          zIndex: 100,
        }}
      >
        {/* 2. Entity hit-boxes — for selecting/moving entities */}
        <CanvasViewportLayer viewport={viewport} style={{ pointerEvents: 'none' }}>
          {sceneGraph?.getEntitiesByZOrder().map((entity) => {
            if (!entity.visible || entity.locked) return null;

            const isWidget = entity.type === 'widget';
            // Widgets only have a hit-box for their top drag handle (28px)
            const handleHeight = 28;
            const resolvedT = resolveEntityTransform(entity, canvasPlatform);
            const hitHeight = isWidget ? handleHeight : resolvedT.size.height;
            const hitWidth = resolvedT.size.width;

            return (
              <div
                key={entity.id}
                data-testid={`hit-box-${entity.id}`}
                onPointerDown={(e) => handlePointerDown(e, entity)}
                onDoubleClick={handleDoubleClick}
                style={{
                  position: 'absolute',
                  left: resolvedT.position.x - resolvedT.size.width / 2,
                  top: resolvedT.position.y - resolvedT.size.height / 2,
                  width: hitWidth,
                  height: hitHeight,
                  pointerEvents: 'auto',
                  cursor: isWidget ? 'grab' : TOOL_CURSORS[normalizedTool] || 'default',
                  zIndex: entity.zIndex,
                  background: 'transparent',
                }}
              />
            );
          })}
        </CanvasViewportLayer>

        {marqueeRect && isDragging && dragModeRef.current === 'marquee' && (
          <div
            data-testid="marquee-selection"
            style={{
              position: 'absolute',
              left: (marqueeRect.x + viewport.offset.x) * viewport.zoom,
              top: (marqueeRect.y + viewport.offset.y) * viewport.zoom,
              width: marqueeRect.width * viewport.zoom,
              height: marqueeRect.height * viewport.zoom,
              border: '1px solid rgba(74, 144, 217, 0.8)',
              background: 'rgba(74, 144, 217, 0.15)',
              pointerEvents: 'none',
              zIndex: 999,
            }}
          />
        )}

        {/* ── Pathfinder interactive overlay ───────────────────────── */}
        {pathfinderHover && (
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              overflow: 'visible',
              zIndex: 997,
            }}
          >
            <defs>
              <pattern id="pathfinder-dot-mesh" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.8" fill="rgba(0,0,0,0.5)" />
              </pattern>
            </defs>
            {pathfinderHover.pathData && (
              <g transform={`translate(${viewport.offset.x * viewport.zoom}, ${viewport.offset.y * viewport.zoom}) scale(${viewport.zoom})`}>
                <path
                  d={pathfinderHover.pathData}
                  fill="url(#pathfinder-dot-mesh)"
                  stroke="#ef4444"
                  strokeWidth={1 / viewport.zoom}
                  style={{ opacity: 0.8 }}
                />
              </g>
            )}
          </svg>
        )}

        {/* ── Pen-path live preview overlay ─────────────────────────── */}
        {penPathPreview && penPathPreview.anchors.length > 0 && (
          <svg
            data-testid="pen-path-preview"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              overflow: 'visible',
              zIndex: 998,
            }}
          >
            {/* ... pen path SVG content ... */}
            {penPathPreview.anchors.length > 1 && (
              <path
                d={anchorsToSvgPath(
                  penPathPreview.anchors.map((a) => ({
                    position: {
                      x: (a.position.x + viewport.offset.x) * viewport.zoom,
                      y: (a.position.y + viewport.offset.y) * viewport.zoom,
                    },
                    handleIn: a.handleIn
                      ? { x: a.handleIn.x * viewport.zoom, y: a.handleIn.y * viewport.zoom }
                      : undefined,
                    handleOut: a.handleOut
                      ? { x: a.handleOut.x * viewport.zoom, y: a.handleOut.y * viewport.zoom }
                      : undefined,
                    pointType: a.pointType as 'corner' | 'smooth' | 'symmetric',
                  })),
                  false,
                )}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}

            {/* Rubber-band from last anchor to mouse */}
            {penPathPreview.mousePosition && (() => {
              const last = penPathPreview.anchors[penPathPreview.anchors.length - 1];
              const sx = (last.position.x + viewport.offset.x) * viewport.zoom;
              const sy = (last.position.y + viewport.offset.y) * viewport.zoom;
              const mx = (penPathPreview.mousePosition!.x + viewport.offset.x) * viewport.zoom;
              const my = (penPathPreview.mousePosition!.y + viewport.offset.y) * viewport.zoom;

              if (last.handleOut) {
                const cpx = sx + last.handleOut.x * viewport.zoom;
                const cpy = sy + last.handleOut.y * viewport.zoom;
                return (
                  <path
                    d={`M ${sx} ${sy} Q ${cpx} ${cpy} ${mx} ${my}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1}
                    strokeDasharray="6 3"
                    opacity={0.6}
                  />
                );
              }
              return (
                <line
                  x1={sx} y1={sy} x2={mx} y2={my}
                  stroke="#3b82f6"
                  strokeWidth={1}
                  strokeDasharray="6 3"
                  opacity={0.6}
                />
              );
            })()}

            {/* Handle bars and handle dots */}
            {penPathPreview.anchors.map((a, i) => {
              const ax = (a.position.x + viewport.offset.x) * viewport.zoom;
              const ay = (a.position.y + viewport.offset.y) * viewport.zoom;
              return (
                <g key={`handles-${i}`}>
                  {a.handleIn && (
                    <>
                      <line
                        x1={ax} y1={ay}
                        x2={ax + a.handleIn.x * viewport.zoom}
                        y2={ay + a.handleIn.y * viewport.zoom}
                        stroke="#94a3b8" strokeWidth={1}
                      />
                      <circle
                        cx={ax + a.handleIn.x * viewport.zoom}
                        cy={ay + a.handleIn.y * viewport.zoom}
                        r={3} fill="white" stroke="#94a3b8" strokeWidth={1}
                      />
                    </>
                  )}
                  {a.handleOut && (
                    <>
                      <line
                        x1={ax} y1={ay}
                        x2={ax + a.handleOut.x * viewport.zoom}
                        y2={ay + a.handleOut.y * viewport.zoom}
                        stroke="#94a3b8" strokeWidth={1}
                      />
                      <circle
                        cx={ax + a.handleOut.x * viewport.zoom}
                        cy={ay + a.handleOut.y * viewport.zoom}
                        r={3} fill="white" stroke="#94a3b8" strokeWidth={1}
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Anchor dots */}
            {penPathPreview.anchors.map((a, i) => {
              const ax = (a.position.x + viewport.offset.x) * viewport.zoom;
              const ay = (a.position.y + viewport.offset.y) * viewport.zoom;
              return (
                <circle
                  key={`anchor-${i}`}
                  cx={ax} cy={ay} r={4}
                  fill={i === 0 ? '#3b82f6' : 'white'}
                  stroke="#3b82f6" strokeWidth={2}
                />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};
