/**
 * Tool Layer — transparent input capture layer for canvas tool interactions.
 * Sits on top of everything and routes pointer/touch events to the active tool.
 *
 * Supported interactions:
 * - Space+drag or middle-click drag: pan the viewport
 * - Select tool: click to select, shift+click multi-select, drag to move entities
 * - Move tool: click-drag to move selected entities
 * - Text tool: click to place a new text entity
 * - Rect/Ellipse tool: click-drag to create a shape entity
 * - Pen tool: click-drag to create a freehand drawing entity
 *
 * @module shell/canvas
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { Point2D, CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { screenToCanvas } from '../../canvas/core';
import type { ViewportState, SceneGraph } from '../../canvas/core';
import { bus } from '../../kernel/bus';
import { useUIStore } from '../../kernel/stores/ui/ui.store';

import type { CanvasToolId } from './hooks/useActiveTool';

export interface CanvasToolLayerProps {
  viewport: ViewportState;
  sceneGraph: SceneGraph | null;
  activeTool: CanvasToolId;
  toolsEnabled: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  /** Pan the viewport by a canvas-space delta */
  onPan?: (delta: Point2D) => void;
  /** Get current zoom level (for converting screen delta to canvas delta) */
  getZoom?: () => number;
}

let entityCounter = 0;
function nextEntityId(prefix: string): string {
  entityCounter += 1;
  return `${prefix}-${Date.now()}-${entityCounter}`;
}

const DEMO_CANVAS_ID = '00000000-0000-4000-8000-000000000001';

/** Drag modes — only one active at a time */
type DragMode = 'pan' | 'move-entities' | 'create-shape' | 'pen-draw' | 'marquee' | null;

/** Cursor style per tool */
const TOOL_CURSORS: Partial<Record<CanvasToolId, string>> = {
  select: 'default',
  pan: 'grab',
  move: 'grab',
  pen: 'crosshair',
  text: 'text',
  rect: 'crosshair',
  ellipse: 'crosshair',
  line: 'crosshair',
  sticker: 'copy',
  widget: 'copy',
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

/**
 * Invisible layer that captures pointer events and dispatches to the active tool.
 */
export const CanvasToolLayer: React.FC<CanvasToolLayerProps> = ({
  viewport,
  sceneGraph,
  activeTool,
  toolsEnabled,
  selectedIds,
  onSelectionChange,
  onPan,
  getZoom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Space key tracking for pan mode ──────────────────────────
  const isSpaceHeld = useRef(false);
  const [spaceDown, setSpaceDown] = useState(false); // for cursor reactivity

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
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceHeld.current = false;
        setSpaceDown(false);
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
  const [isDragging, setIsDragging] = useState(false);

  // Canvas-space coordinates for tool operations
  const dragStartCanvas = useRef<Point2D>({ x: 0, y: 0 });
  const dragCurrentCanvas = useRef<Point2D>({ x: 0, y: 0 });

  // Screen-space coordinates for pan operations
  const panLastScreen = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Entity move state
  const dragEntityStartPositions = useRef<Map<string, Point2D>>(new Map());

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
        locked: false,
        opacity: 1,
        borderRadius: 8,
        name: widgetId,
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
        locked: false,
        opacity: 1,
        borderRadius: 0,
        name: assetId,
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

  // ── Text tool handler ────────────────────────────────────────
  const handleTextCreate = useCallback(
    (canvasPoint: Point2D) => {
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
        locked: false,
        opacity: 1,
        borderRadius: 0,
        name: 'New Text',
        content: 'Double-click to edit',
        fontSize: 16,
        fontFamily: 'var(--sn-font-family, sans-serif)',
        fontWeight: 'normal',
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
    (canvasPoint: Point2D, idsToMove: Set<string>, e: React.PointerEvent) => {
      if (idsToMove.size === 0 || !sceneGraph) return;

      dragStartCanvas.current = canvasPoint;
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
      dragModeRef.current = 'move-entities';
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [sceneGraph],
  );

  // ── Pointer down ─────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!sceneGraph) return;

      // ── Middle-click pan (button 1) ──
      if (e.button === 1 && onPan) {
        e.preventDefault();
        panLastScreen.current = { x: e.clientX, y: e.clientY };
        dragModeRef.current = 'pan';
        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      // ── Right-click drag pan (button 2) ──
      if (e.button === 2 && onPan) {
        e.preventDefault();
        panLastScreen.current = { x: e.clientX, y: e.clientY };
        rightClickStartScreen.current = { x: e.clientX, y: e.clientY };
        isRightClickDrag.current = false;
        dragModeRef.current = 'pan';
        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      // Only process left clicks from here
      if (e.button !== 0) return;

      // ── Space+left-click pan ──
      if (isSpaceHeld.current && onPan) {
        panLastScreen.current = { x: e.clientX, y: e.clientY };
        dragModeRef.current = 'pan';
        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      if (!toolsEnabled) return;

      const canvasPoint = getCanvasPoint(e);

      switch (activeTool) {
        case 'select': {
          // Hit-test for topmost visible, unlocked entity under cursor
          const topEntity = hitTestEntities(sceneGraph, canvasPoint);

          if (topEntity) {
            // Group-aware selection: resolve up to the top-level group,
            // unless the user is inside a group edit context (entered via double-click).
            let selectTarget = topEntity;
            if (topEntity.parentId) {
              const topGroup = resolveTopGroup(topEntity, sceneGraph);
              // If we're inside the group edit context for this group, target the child directly
              if (groupEditContextRef.current !== topGroup.id) {
                selectTarget = topGroup;
              }
            }

            // Select the entity
            if (e.shiftKey) {
              const next = new Set(selectedIds);
              if (next.has(selectTarget.id)) {
                next.delete(selectTarget.id);
              } else {
                next.add(selectTarget.id);
              }
              onSelectionChange(next);
            } else if (!selectedIds.has(selectTarget.id)) {
              onSelectionChange(new Set([selectTarget.id]));
            }
            bus.emit(CanvasEvents.ENTITY_SELECTED, { id: selectTarget.id });

            // Prepare for drag-to-move
            const idsToMove = selectedIds.has(selectTarget.id)
              ? selectedIds
              : new Set([selectTarget.id]);
            startEntityMove(canvasPoint, idsToMove, e);
          } else {
            // Click on empty canvas → deselect + exit group context + start marquee selection
            if (!e.shiftKey && selectedIds.size > 0) {
              onSelectionChange(new Set());
            }
            groupEditContextRef.current = null;
            // Start marquee selection drag
            marqueeStartCanvas.current = canvasPoint;
            dragModeRef.current = 'marquee';
            setIsDragging(true);
            setMarqueeRect(null);
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }
          break;
        }

        case 'move': {
          const topEntity = hitTestEntities(sceneGraph, canvasPoint);
          if (topEntity && !selectedIds.has(topEntity.id)) {
            onSelectionChange(new Set([topEntity.id]));
          }
          const idsToMove = topEntity
            ? selectedIds.has(topEntity.id) ? selectedIds : new Set([topEntity.id])
            : selectedIds;

          startEntityMove(canvasPoint, idsToMove, e);
          break;
        }

        case 'pan': {
          if (onPan) {
            panLastScreen.current = { x: e.clientX, y: e.clientY };
            rightClickStartScreen.current = { x: e.clientX, y: e.clientY };
            isRightClickDrag.current = true; // always treat as drag for pan tool
            dragModeRef.current = 'pan';
            setIsDragging(true);
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }
          break;
        }

        case 'rect':
        case 'ellipse': {
          dragStartCanvas.current = canvasPoint;
          dragCurrentCanvas.current = canvasPoint;
          dragModeRef.current = 'create-shape';
          setIsDragging(true);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          break;
        }

        case 'pen': {
          penPointsRef.current = [canvasPoint];
          dragStartCanvas.current = canvasPoint;
          dragModeRef.current = 'pen-draw';
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
    [sceneGraph, toolsEnabled, activeTool, selectedIds, onSelectionChange,
     getCanvasPoint, handleTextCreate, handleWidgetCreate, handleStickerCreate,
     startEntityMove, onPan],
  );

  // ── Pointer move ─────────────────────────────────────────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
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
        for (const [id, startPos] of dragEntityStartPositions.current) {
          // Must send the FULL transform (deep merge) — scene graph does shallow merge
          const entity = sceneGraph.getEntity(id);
          if (!entity) continue;
          bus.emit(CanvasEvents.ENTITY_UPDATED, {
            id,
            updates: {
              transform: {
                ...entity.transform,
                position: { x: startPos.x + dx, y: startPos.y + dy },
              },
            },
          });
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
    [isDragging, sceneGraph, viewport, getCanvasPoint, onPan, getZoom],
  );

  // ── Pointer up ───────────────────────────────────────────────
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const mode = dragModeRef.current;

      // Release pointer capture
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore — capture may already be released
      }

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
        return;
      }

      if (!sceneGraph) return;
      const canvasPoint = getCanvasPoint(e);

      if (mode === 'move-entities') {
        // Emit final position for each moved entity
        const dx = canvasPoint.x - dragStartCanvas.current.x;
        const dy = canvasPoint.y - dragStartCanvas.current.y;
        for (const [id, startPos] of dragEntityStartPositions.current) {
          bus.emit(CanvasEvents.ENTITY_MOVED, {
            id,
            position: { x: startPos.x + dx, y: startPos.y + dy },
          });
        }
        dragEntityStartPositions.current.clear();
      } else if (mode === 'create-shape') {
        // Create shape from drag rectangle
        const start = dragStartCanvas.current;
        const end = canvasPoint;
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.max(Math.abs(end.x - start.x), 20);
        const height = Math.max(Math.abs(end.y - start.y), 20);

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
          locked: false,
          opacity: 1,
          borderRadius: activeTool === 'ellipse' ? Math.max(width, height) : 0,
          name: activeTool === 'ellipse' ? 'New Ellipse' : 'New Rectangle',
          shapeType: activeTool === 'ellipse' ? 'ellipse' : 'rect',
          fill: 'var(--sn-accent, #6366f1)',
          stroke: 'var(--sn-border, #e0e0e0)',
          strokeWidth: 2,
        } as CanvasEntity;

        bus.emit(CanvasEvents.ENTITY_CREATED, entity);
        onSelectionChange(new Set([entity.id]));
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
          locked: false,
          opacity: 1,
          borderRadius: 0,
          name: 'New Drawing',
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
            // Group-aware: resolve to top group (unless in group edit context)
            let target = hit;
            if (hit.parentId) {
              const topGroup = resolveTopGroup(hit, sceneGraph);
              if (groupEditContextRef.current !== topGroup.id) {
                target = topGroup;
              }
            }
            selected.add(target.id);
          }
          if (e.shiftKey) {
            // Merge with existing selection
            const merged = new Set(selectedIds);
            for (const id of selected) merged.add(id);
            onSelectionChange(merged);
          } else {
            onSelectionChange(selected);
          }
        }
      }
    },
    [isDragging, sceneGraph, activeTool, selectedIds, getCanvasPoint, onSelectionChange],
  );

  // ── Double-click: enter group edit context ──────────────────
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!sceneGraph || !toolsEnabled || activeTool !== 'select') return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const canvasPoint = screenToCanvas(screenPt, viewport);

      const topEntity = hitTestEntities(sceneGraph, canvasPoint);
      if (!topEntity) return;

      // If we clicked a group (or a selected group), enter the group context
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
    [sceneGraph, toolsEnabled, activeTool, viewport, selectedIds, onSelectionChange],
  );

  // ── Cursor logic ─────────────────────────────────────────────
  let cursor: string;
  if (spaceDown || (isDragging && dragModeRef.current === 'pan')) {
    cursor = isDragging ? 'grabbing' : 'grab';
  } else if (isDragging && dragModeRef.current === 'move-entities') {
    cursor = 'grabbing';
  } else if (isDragging && dragModeRef.current === 'marquee') {
    cursor = 'crosshair';
  } else if (activeTool === 'pan') {
    cursor = 'grab';
  } else {
    cursor = toolsEnabled
      ? TOOL_CURSORS[activeTool] || 'crosshair'
      : 'default';
  }

  return (
    <>
      <div
        ref={containerRef}
        data-testid="canvas-tool-layer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'absolute',
          inset: 0,
          cursor,
          background: 'transparent',
        }}
      />
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
    </>
  );
};
