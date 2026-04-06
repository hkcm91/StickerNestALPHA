/**
 * Tool Layer — transparent input capture layer for canvas tool interactions.
 * Sits on top of everything and routes pointer/touch events to the active tool.
 *
 * @module shell/canvas
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { Point2D, CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { screenToCanvas, resolveEntityTransform, setEntityPlatformTransform } from '../../canvas/core';
import { snapToGridCell } from '../../canvas/tools/move/snap';
import { bus } from '../../kernel/bus';
import { useUIStore } from '../../kernel/stores/ui/ui.store';

import { CanvasViewportLayer } from './CanvasViewportLayer';
import { createLocalCanvas, slugifyCanvasName } from './hooks';
import type { CanvasToolId } from './hooks/useActiveTool';
import {
  type CanvasToolLayerProps,
  type DragMode,
  type PenPathPreview,
  BUS_BRIDGED_TOOLS,
  TOOL_CURSORS,
  ENTITY_DRAG_THRESHOLD_SQ,
  FOLDER_TOGGLE_EVENT,
  hitTestEntities,
  resolveTopGroup,
  resolveSelectTarget,
  moveEntitiesIntoDocker,
  removeEntitiesFromDocker,
  computeMarqueeSelection,
  createWidgetEntity,
  createStickerEntity,
  createLottieEntity,
  createSvgEntity,
  createTextEntity,
  createShapeEntity,
  createArtboardEntity,
  createDrawingEntity,
} from './tool-layer-helpers';
import { PathfinderOverlay, PenPathPreviewOverlay } from './ToolOverlays';

/**
 * Invisible layer that captures pointer events and dispatches to the active tool.
 */
export const CanvasToolLayer: React.FC<CanvasToolLayerProps> = ({
  viewport, sceneGraph, dashboardSlug = 'dashboard', activeTool, toolsEnabled,
  maxArtboardsPerDashboard = 10, selectedIds, openFolderIds = new Set<string>(),
  onSelectionChange, onPan, getZoom, backgroundPortalId, gridConfig, onDragStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedTool: CanvasToolId = (activeTool as string) === 'move' ? 'select' : activeTool;
  const canvasPlatform = useUIStore((s) => s.canvasPlatform);
  const zLen = sceneGraph ? sceneGraph.getEntitiesByZOrder().length : 0;

  const applySnap = useCallback(
    (pos: Point2D, entitySize?: { width: number; height: number }): Point2D => {
      if (!gridConfig || !gridConfig.enabled || gridConfig.snapMode === 'none') return pos;
      return snapToGridCell(pos, gridConfig, entitySize);
    },
    [gridConfig],
  );

  // ── Space / Alt key tracking ───────────────────────────────────
  const isSpaceHeld = useRef(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [altDown, setAltDown] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault(); isSpaceHeld.current = true; setSpaceDown(true);
      }
      if (e.altKey) setAltDown(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') { isSpaceHeld.current = false; setSpaceDown(false); }
      if (!e.altKey) setAltDown(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ── Drag state refs ────────────────────────────────────────────
  const dragModeRef = useRef<DragMode>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartCanvas = useRef<Point2D>({ x: 0, y: 0 });
  const dragCurrentCanvas = useRef<Point2D>({ x: 0, y: 0 });
  const panLastScreen = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragEntityStartPositions = useRef<Map<string, Point2D>>(new Map());
  const dragRootEntityIds = useRef<Set<string>>(new Set());
  const hasEntityDragExceededThreshold = useRef(false);
  const pointerDownTargetId = useRef<string | null>(null);
  const pointerDownShift = useRef(false);
  const pointerDownWasAlreadySelected = useRef(false);
  const penPointsRef = useRef<Point2D[]>([]);
  const rightClickStartScreen = useRef<Point2D>({ x: 0, y: 0 });
  const isRightClickDrag = useRef(false);
  const marqueeStartCanvas = useRef<Point2D>({ x: 0, y: 0 });
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const groupEditContextRef = useRef<string | null>(null);

  // ── Pen-path / pathfinder preview state ────────────────────────
  const [penPathPreview, setPenPathPreview] = useState<PenPathPreview | null>(null);
  const [pathfinderHover, setPathfinderHover] = useState<{ pathData?: string; bounds?: any } | null>(null);

  useEffect(() => {
    const u = bus.subscribe('widget.pathfinder.hover-region', (ev: { payload: any }) => setPathfinderHover(ev.payload));
    return u;
  }, []);

  useEffect(() => {
    if (BUS_BRIDGED_TOOLS.has(activeTool)) bus.emit(CanvasEvents.TOOL_CHANGED, { tool: activeTool });
    else setPenPathPreview(null);
  }, [activeTool]);

  useEffect(() => {
    if (activeTool !== 'pen') { setPenPathPreview(null); return; }
    const u = bus.subscribe(CanvasEvents.PEN_PATH_PREVIEW, (ev: { payload: PenPathPreview }) => setPenPathPreview(ev.payload));
    return u;
  }, [activeTool]);

  // Publish selection events for runtime widgets
  useEffect(() => {
    if (!sceneGraph) return;
    if (selectedIds.size === 0) { bus.emit(`widget.${CanvasEvents.SELECTION_CLEARED}`, {}); return; }
    const entities = Array.from(selectedIds).map((id) => sceneGraph.getEntity(id)).filter((e): e is CanvasEntity => Boolean(e));
    if (entities.length === 0) return;
    bus.emit(`widget.${CanvasEvents.ENTITY_SELECTED}`, {
      id: entities[0].id, entityId: entities[0].id,
      ids: entities.map((e) => e.id), entities,
    });
  }, [sceneGraph, selectedIds]);

  // Keyboard forwarding for bus-bridged tools
  useEffect(() => {
    if (!BUS_BRIDGED_TOOLS.has(activeTool)) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!['Escape', 'Enter', 'Backspace', 'Delete'].includes(e.key)) return;
      e.preventDefault();
      bus.emit(CanvasEvents.TOOL_INPUT_KEY, { key: e.key, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTool]);

  // ── Coordinate conversion ──────────────────────────────────────
  const getCanvasPoint = useCallback((e: React.PointerEvent): Point2D => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return screenToCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top }, viewport);
  }, [viewport]);

  // ── Entity creation (thin wrappers over factories) ─────────────
  const baseParams = useCallback((cp: Point2D) => ({ canvasPoint: cp, zOrderLength: zLen, applySnap }), [zLen, applySnap]);

  const emitCreated = useCallback((entity: CanvasEntity | null, resetTool = true) => {
    if (!entity) return;
    bus.emit(CanvasEvents.ENTITY_CREATED, entity);
    onSelectionChange(new Set([entity.id]));
    if (resetTool) { useUIStore.getState().setActiveTool('select'); useUIStore.getState().setPendingToolData(null); }
  }, [onSelectionChange]);

  // ── Start entity move ──────────────────────────────────────────
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
          for (const desc of sceneGraph.getDescendants(id)) {
            if (!startPositions.has(desc.id)) startPositions.set(desc.id, { ...desc.transform.position });
          }
        }
      }
      dragEntityStartPositions.current = startPositions;
      hasEntityDragExceededThreshold.current = false;
      dragModeRef.current = 'move-entities';
      isDraggingRef.current = true; setIsDragging(true);
      onDragStateChange?.(true, new Set(startPositions.keys()));
      target.setPointerCapture(e.pointerId);
    },
    [sceneGraph, onDragStateChange],
  );

  // ── Pointer down ───────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, hitEntity?: CanvasEntity) => {
      if (!sceneGraph) return;
      const target = e.target as HTMLElement;

      // Middle-click or right-click pan
      if ((e.button === 1 || e.button === 2) && onPan) {
        e.preventDefault();
        panLastScreen.current = { x: e.clientX, y: e.clientY };
        if (e.button === 2) { rightClickStartScreen.current = { x: e.clientX, y: e.clientY }; isRightClickDrag.current = false; }
        else { isRightClickDrag.current = true; }
        dragModeRef.current = 'pan'; isDraggingRef.current = true; setIsDragging(true);
        target.setPointerCapture(e.pointerId); return;
      }
      if (e.button !== 0) return;

      // Space+left-click pan
      if (isSpaceHeld.current && onPan) {
        panLastScreen.current = { x: e.clientX, y: e.clientY };
        dragModeRef.current = 'pan'; isDraggingRef.current = true; setIsDragging(true);
        target.setPointerCapture(e.pointerId); return;
      }
      if (!toolsEnabled) return;

      const canvasPoint = getCanvasPoint(e);

      switch (normalizedTool) {
        case 'select': {
          const topEntity = hitEntity || hitTestEntities(sceneGraph, canvasPoint);
          if (topEntity) {
            const { target: selectTarget, newGroupContext } = resolveSelectTarget(
              topEntity, sceneGraph, selectedIds, groupEditContextRef.current, e.metaKey || e.ctrlKey,
            );
            groupEditContextRef.current = newGroupContext;

            const wasAlreadySelected = selectedIds.has(selectTarget.id);
            let nextSelection: Set<string>;
            if (e.shiftKey) {
              nextSelection = new Set(selectedIds);
              if (nextSelection.has(selectTarget.id)) nextSelection.delete(selectTarget.id);
              else nextSelection.add(selectTarget.id);
            } else {
              nextSelection = selectedIds.has(selectTarget.id) ? selectedIds : new Set([selectTarget.id]);
            }
            onSelectionChange(nextSelection);
            pointerDownTargetId.current = selectTarget.id;
            pointerDownShift.current = e.shiftKey;
            pointerDownWasAlreadySelected.current = wasAlreadySelected;
            if (!e.shiftKey || !selectedIds.has(selectTarget.id)) {
              bus.emit(CanvasEvents.ENTITY_SELECTED, { id: selectTarget.id });
            }
            startEntityMove(canvasPoint, nextSelection, e, target);
          } else {
            if (!e.shiftKey) { onSelectionChange(new Set()); groupEditContextRef.current = null; }
            marqueeStartCanvas.current = canvasPoint;
            setMarqueeRect({ x: canvasPoint.x, y: canvasPoint.y, width: 0, height: 0 });
            dragModeRef.current = 'marquee'; isDraggingRef.current = true; setIsDragging(true);
            target.setPointerCapture(e.pointerId);
          }
          break;
        }
        case 'pan': {
          if (onPan) {
            panLastScreen.current = { x: e.clientX, y: e.clientY };
            rightClickStartScreen.current = { x: e.clientX, y: e.clientY };
            isRightClickDrag.current = true;
            dragModeRef.current = 'pan'; isDraggingRef.current = true; setIsDragging(true);
            target.setPointerCapture(e.pointerId);
          }
          break;
        }
        case 'artboard': case 'rect': case 'ellipse': {
          dragStartCanvas.current = canvasPoint; dragCurrentCanvas.current = canvasPoint;
          dragModeRef.current = 'create-shape'; isDraggingRef.current = true; setIsDragging(true);
          target.setPointerCapture(e.pointerId); break;
        }
        case 'brush': {
          penPointsRef.current = [canvasPoint]; dragStartCanvas.current = canvasPoint;
          dragModeRef.current = 'pen-draw'; isDraggingRef.current = true; setIsDragging(true);
          target.setPointerCapture(e.pointerId); break;
        }
        case 'text': emitCreated(createTextEntity(baseParams(canvasPoint)), false); break;
        case 'widget': {
          const pd = useUIStore.getState().pendingToolData;
          emitCreated(createWidgetEntity(baseParams(canvasPoint), (pd?.widgetId as string) || 'unknown-widget'));
          break;
        }
        case 'sticker': {
          const pd = useUIStore.getState().pendingToolData;
          emitCreated(createStickerEntity(baseParams(canvasPoint), (pd?.assetId as string) || 'unknown-sticker', (pd?.metadata as Record<string, unknown>) || {}));
          break;
        }
        case 'lottie': {
          const pd = useUIStore.getState().pendingToolData;
          emitCreated(createLottieEntity(baseParams(canvasPoint), (pd?.assetId as string) || 'unknown-lottie', (pd?.metadata as Record<string, unknown>) || {}));
          break;
        }
        case 'svg': {
          const pd = useUIStore.getState().pendingToolData;
          emitCreated(createSvgEntity(baseParams(canvasPoint), (pd?.assetId as string) || 'unknown-svg', (pd?.metadata as Record<string, unknown>) || {}));
          break;
        }
        case 'pen': case 'direct-select': case 'pathfinder': {
          const rect = containerRef.current?.getBoundingClientRect();
          const sp = rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 };
          const topE = hitTestEntities(sceneGraph, canvasPoint);
          target.setPointerCapture(e.pointerId);
          bus.emit(CanvasEvents.TOOL_INPUT_DOWN, {
            canvasPosition: canvasPoint, screenPosition: sp, entityId: topE?.id ?? null,
            shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey,
          });
          break;
        }
        default: {
          const topE = hitTestEntities(sceneGraph, canvasPoint);
          if (topE) { if (!selectedIds.has(topE.id)) onSelectionChange(new Set([topE.id])); bus.emit(CanvasEvents.ENTITY_SELECTED, { id: topE.id }); }
          else if (selectedIds.size > 0) onSelectionChange(new Set());
          break;
        }
      }
    },
    [sceneGraph, toolsEnabled, normalizedTool, selectedIds, onSelectionChange, getCanvasPoint, startEntityMove, onPan, baseParams, emitCreated],
  );

  // ── Pointer move ───────────────────────────────────────────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (BUS_BRIDGED_TOOLS.has(normalizedTool)) {
        const cp = getCanvasPoint(e);
        const rect = containerRef.current?.getBoundingClientRect();
        const sp = rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 };
        bus.emit(CanvasEvents.TOOL_INPUT_MOVE, {
          canvasPosition: cp, screenPosition: sp, entityId: null,
          shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey,
        });
      }
      if (!isDraggingRef.current) return;
      const mode = dragModeRef.current;

      if (mode === 'pan' && onPan) {
        if (!isRightClickDrag.current) {
          const ddx = e.clientX - rightClickStartScreen.current.x;
          const ddy = e.clientY - rightClickStartScreen.current.y;
          if (ddx * ddx + ddy * ddy < 16) return;
          isRightClickDrag.current = true;
        }
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
        if (!hasEntityDragExceededThreshold.current) {
          if (dx * dx + dy * dy < ENTITY_DRAG_THRESHOLD_SQ) return;
          hasEntityDragExceededThreshold.current = true;
        }
        const entitiesToUndock: string[] = [];
        for (const [id, startPos] of dragEntityStartPositions.current) {
          const entity = sceneGraph.getEntity(id);
          if (!entity) continue;
          const newPos = applySnap({ x: startPos.x + dx, y: startPos.y + dy }, entity.transform.size);
          if (entity.parentId && openFolderIds.has(entity.parentId)) {
            const parent = sceneGraph.getEntity(entity.parentId);
            if (parent && parent.type === 'docker') {
              const ww = Math.max(parent.transform.size.width, 320);
              const wh = Math.max(parent.transform.size.height, 240);
              const px = parent.transform.position.x, py = parent.transform.position.y;
              if (canvasPoint.x < px || canvasPoint.x > px + ww || canvasPoint.y < py || canvasPoint.y > py + wh) {
                entitiesToUndock.push(id);
              }
            }
          }
          const currentPlatform = useUIStore.getState().canvasPlatform;
          const resolved = resolveEntityTransform(entity, currentPlatform);
          const updated = setEntityPlatformTransform(entity, currentPlatform, { ...resolved, position: newPos });
          bus.emit(CanvasEvents.ENTITY_UPDATED, {
            id, updates: { transform: updated.transform, ...(updated.platformTransforms ? { platformTransforms: updated.platformTransforms } : {}) },
          });
        }
        if (entitiesToUndock.length > 0) removeEntitiesFromDocker(sceneGraph, entitiesToUndock);
      } else if (mode === 'create-shape') {
        dragCurrentCanvas.current = canvasPoint;
      } else if (mode === 'pen-draw') {
        penPointsRef.current.push(canvasPoint);
      } else if (mode === 'marquee') {
        const sx = marqueeStartCanvas.current;
        setMarqueeRect({
          x: Math.min(sx.x, canvasPoint.x), y: Math.min(sx.y, canvasPoint.y),
          width: Math.abs(canvasPoint.x - sx.x), height: Math.abs(canvasPoint.y - sx.y),
        });
      }
    },
    [normalizedTool, sceneGraph, viewport, getCanvasPoint, onPan, getZoom, applySnap, openFolderIds],
  );

  // ── Pointer up ─────────────────────────────────────────────────
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (BUS_BRIDGED_TOOLS.has(normalizedTool)) {
        const cp = getCanvasPoint(e);
        const rect = containerRef.current?.getBoundingClientRect();
        const sp = rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 };
        bus.emit(CanvasEvents.TOOL_INPUT_UP, {
          canvasPosition: cp, screenPosition: sp, entityId: null,
          shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey,
        });
      }
      if (!isDraggingRef.current) return;
      const mode = dragModeRef.current;
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
      isDraggingRef.current = false; setIsDragging(false); onDragStateChange?.(false); dragModeRef.current = null;

      if (mode === 'pan') {
        if (!isRightClickDrag.current && e.button === 2) {
          const canvasPt = getCanvasPoint(e);
          const te = sceneGraph ? hitTestEntities(sceneGraph, canvasPt) : null;
          bus.emit('canvas.contextmenu.show', { screenX: e.clientX, screenY: e.clientY, canvasPoint: canvasPt, entityId: te?.id ?? null });
        }
        isRightClickDrag.current = false; dragRootEntityIds.current.clear(); return;
      }
      if (!sceneGraph) return;
      const canvasPoint = getCanvasPoint(e);

      if (mode === 'move-entities') {
        const dx = canvasPoint.x - dragStartCanvas.current.x;
        const dy = canvasPoint.y - dragStartCanvas.current.y;
        const wasDrag = hasEntityDragExceededThreshold.current || dx * dx + dy * dy >= ENTITY_DRAG_THRESHOLD_SQ;
        if (!wasDrag) {
          if (pointerDownTargetId.current && pointerDownWasAlreadySelected.current && !pointerDownShift.current && selectedIds.size > 1) {
            onSelectionChange(new Set([pointerDownTargetId.current]));
          }
          dragEntityStartPositions.current.clear(); dragRootEntityIds.current.clear();
          hasEntityDragExceededThreshold.current = false; pointerDownTargetId.current = null; return;
        }
        for (const [id, startPos] of dragEntityStartPositions.current) {
          const ent = sceneGraph.getEntity(id);
          const snapped = applySnap({ x: startPos.x + dx, y: startPos.y + dy }, ent?.transform.size);
          bus.emit(CanvasEvents.ENTITY_MOVED, { id, position: snapped });
        }
        const movedRoots = dragRootEntityIds.current;
        const dropDocker = sceneGraph.queryPoint(canvasPoint).find((e) => e.type === 'docker' && !movedRoots.has(e.id));
        if (dropDocker) moveEntitiesIntoDocker(sceneGraph, Array.from(movedRoots), dropDocker.id);
        dragEntityStartPositions.current.clear(); dragRootEntityIds.current.clear();
        hasEntityDragExceededThreshold.current = false; pointerDownTargetId.current = null;
      } else if (mode === 'create-shape') {
        const start = dragStartCanvas.current;
        if (activeTool === 'artboard') {
          const existing = sceneGraph.getAllEntities().filter((e) => e.type === 'artboard');
          if (existing.length >= maxArtboardsPerDashboard) {
            bus.emit('shell.notification', { type: 'warning', message: `Artboard limit reached (${maxArtboardsPerDashboard} per dashboard).` });
            return;
          }
          const name = `Artboard ${existing.length + 1}`;
          const slug = slugifyCanvasName(`${slugifyCanvasName(dashboardSlug)}--${name}`);
          const newCanvas = createLocalCanvas({ name, slug });
          emitCreated(createArtboardEntity({ ...baseParams(canvasPoint), start, end: canvasPoint }, newCanvas.id, newCanvas.slug, name), false);
        } else {
          const shape = activeTool === 'ellipse' ? 'ellipse' as const : 'rect' as const;
          emitCreated(createShapeEntity({ ...baseParams(canvasPoint), start, end: canvasPoint }, shape), false);
        }
      } else if (mode === 'pen-draw') {
        emitCreated(createDrawingEntity({ ...baseParams(canvasPoint), points: penPointsRef.current }), false);
        penPointsRef.current = [];
      } else if (mode === 'marquee') {
        setMarqueeRect(null);
        const result = computeMarqueeSelection(sceneGraph, marqueeStartCanvas.current, canvasPoint, groupEditContextRef.current, selectedIds, e.shiftKey);
        onSelectionChange(result);
      }
      if (mode !== 'move-entities') dragRootEntityIds.current.clear();
    },
    [sceneGraph, normalizedTool, selectedIds, getCanvasPoint, onSelectionChange, applySnap, activeTool, dashboardSlug, maxArtboardsPerDashboard, baseParams, emitCreated, onDragStateChange],
  );

  // ── Double-click: enter group / toggle folder ──────────────────
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!sceneGraph || !toolsEnabled || normalizedTool !== 'select') return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const canvasPoint = screenToCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top }, viewport);
      const topEntity = hitTestEntities(sceneGraph, canvasPoint);
      if (!topEntity) return;

      if (topEntity.type === 'docker') { bus.emit(FOLDER_TOGGLE_EVENT, { folderId: topEntity.id }); return; }

      if (topEntity.type === 'group' && selectedIds.has(topEntity.id)) {
        groupEditContextRef.current = topEntity.id;
        for (const hit of sceneGraph.queryPoint(canvasPoint)) {
          if (hit.id === topEntity.id || !hit.visible || hit.locked) continue;
          if (hit.parentId === topEntity.id) {
            onSelectionChange(new Set([hit.id])); bus.emit(CanvasEvents.ENTITY_SELECTED, { id: hit.id }); return;
          }
        }
      } else if (topEntity.parentId) {
        const topGroup = resolveTopGroup(topEntity, sceneGraph);
        if (selectedIds.has(topGroup.id)) {
          groupEditContextRef.current = topGroup.id;
          onSelectionChange(new Set([topEntity.id])); bus.emit(CanvasEvents.ENTITY_SELECTED, { id: topEntity.id });
        }
      }
    },
    [sceneGraph, toolsEnabled, normalizedTool, viewport, selectedIds, onSelectionChange],
  );

  // ── Cursor ─────────────────────────────────────────────────────
  const cursor = spaceDown || (isDragging && dragModeRef.current === 'pan')
    ? (isDragging ? 'grabbing' : 'grab')
    : isDragging && dragModeRef.current === 'move-entities' ? 'grabbing'
    : isDragging && dragModeRef.current === 'marquee' ? 'crosshair'
    : normalizedTool === 'pan' ? 'grab'
    : normalizedTool === 'pathfinder' ? (altDown ? 'not-allowed' : 'copy')
    : toolsEnabled ? (TOOL_CURSORS[normalizedTool] || 'crosshair') : 'default';

  const bgPortalTarget = backgroundPortalId ? document.getElementById(backgroundPortalId) : null;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {bgPortalTarget && createPortal(
        <div data-testid="canvas-background-capture"
          onPointerDown={(e) => handlePointerDown(e)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', background: 'transparent', cursor }} />,
        bgPortalTarget,
      )}

      <div data-testid="canvas-tool-layer"
        onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onContextMenu={(e) => e.preventDefault()}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}>

        {/* Entity hit-boxes */}
        <CanvasViewportLayer viewport={viewport} style={{ pointerEvents: 'none' }}>
          {sceneGraph?.getEntitiesByZOrder().map((entity) => {
            if (!entity.visible || entity.locked) return null;
            const isWidget = entity.type === 'widget';
            const resolvedT = resolveEntityTransform(entity, canvasPlatform);
            return (
              <div key={entity.id} data-testid={`hit-box-${entity.id}`}
                onPointerDown={(e) => handlePointerDown(e, entity)} onDoubleClick={handleDoubleClick}
                style={{
                  position: 'absolute',
                  left: resolvedT.position.x - resolvedT.size.width / 2,
                  top: resolvedT.position.y - resolvedT.size.height / 2,
                  width: resolvedT.size.width,
                  height: isWidget && !isDragging ? 28 : resolvedT.size.height,
                  pointerEvents: 'auto',
                  cursor: isWidget ? 'grab' : TOOL_CURSORS[normalizedTool] || 'default',
                  zIndex: entity.zIndex,
                  background: 'transparent',
                }} />
            );
          })}
        </CanvasViewportLayer>

        {/* Marquee selection rectangle */}
        {marqueeRect && isDragging && dragModeRef.current === 'marquee' && (
          <div data-testid="marquee-selection" style={{
            position: 'absolute',
            left: (marqueeRect.x + viewport.offset.x) * viewport.zoom,
            top: (marqueeRect.y + viewport.offset.y) * viewport.zoom,
            width: marqueeRect.width * viewport.zoom, height: marqueeRect.height * viewport.zoom,
            border: '1px solid rgba(74, 144, 217, 0.8)', background: 'rgba(74, 144, 217, 0.15)',
            pointerEvents: 'none', zIndex: 999,
          }} />
        )}

        <PathfinderOverlay hover={pathfinderHover} viewport={viewport} />
        {/* Full-viewport overlay during entity drag — prevents iframes from stealing pointer */}
        {isDragging && dragModeRef.current === 'move-entities' && (
          <div
            data-testid="drag-capture-overlay"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              cursor: 'grabbing', pointerEvents: 'auto',
            }}
          />
        )}

        {penPathPreview && <PenPathPreviewOverlay preview={penPathPreview} viewport={viewport} />}
      </div>
    </div>
  );
};
