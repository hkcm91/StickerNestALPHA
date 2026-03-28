/**
 * CanvasToolLayer helpers — types, constants, utility functions, and entity factories.
 * Extracted from CanvasToolLayer.tsx for file-size management.
 *
 * @module shell/canvas
 * @layer L6
 */

import type { Point2D, CanvasEntity, DockerEntity, GridConfig } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import type { ViewportState, SceneGraph } from '../../canvas/core';
import { bus } from '../../kernel/bus';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';

import type { CanvasToolId } from './hooks/useActiveTool';

// ── Props ────────────────────────────────────────────────────────

export interface CanvasToolLayerProps {
  viewport: ViewportState;
  sceneGraph: SceneGraph | null;
  dashboardSlug?: string;
  activeTool: CanvasToolId;
  toolsEnabled: boolean;
  maxArtboardsPerDashboard?: number;
  selectedIds: Set<string>;
  openFolderIds?: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onPan?: (delta: Point2D) => void;
  getZoom?: () => number;
  backgroundPortalId?: string;
  gridConfig?: GridConfig;
}

// ── Drag types ───────────────────────────────────────────────────

export type DragMode = 'pan' | 'move-entities' | 'create-shape' | 'pen-draw' | 'marquee' | null;

// ── Pen path preview types (mirrors L4A-2 without cross-layer import) ──

export interface PenPathPreviewAnchor {
  readonly position: Point2D;
  readonly handleIn: Point2D | undefined;
  readonly handleOut: Point2D | undefined;
  readonly pointType: string;
}

export interface PenPathPreview {
  readonly state: string;
  readonly anchors: ReadonlyArray<PenPathPreviewAnchor>;
  readonly mousePosition: Point2D | null;
}

// ── Constants ────────────────────────────────────────────────────

export const DEMO_CANVAS_ID = '00000000-0000-4000-8000-000000000001';
export const ANON_USER_ID = '00000000-0000-4000-a000-000000000000';
export const FOLDER_TOGGLE_EVENT = 'canvas.folder.toggled';
export const ENTITY_DRAG_THRESHOLD_PX = 4;
export const ENTITY_DRAG_THRESHOLD_SQ = ENTITY_DRAG_THRESHOLD_PX * ENTITY_DRAG_THRESHOLD_PX;

/** Set of tool names that route input via the event bus bridge (L4A-2 init.ts). */
export const BUS_BRIDGED_TOOLS = new Set<CanvasToolId>(['pen', 'direct-select', 'pathfinder']);

/** Cursor style per tool */
export const TOOL_CURSORS: Partial<Record<CanvasToolId, string>> = {
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

// ── Utility functions ────────────────────────────────────────────

export function nextEntityId(_prefix?: string): string {
  return crypto.randomUUID();
}

export function currentUserId(): string {
  return useAuthStore.getState().user?.id ?? ANON_USER_ID;
}

/** Return the topmost visible, unlocked entity at a canvas-space point. */
export function hitTestEntities(sceneGraph: SceneGraph, point: Point2D): CanvasEntity | null {
  const hits = sceneGraph.queryPoint(point);
  for (const entity of hits) {
    if (!entity.visible) continue;
    if (entity.locked) continue;
    return entity;
  }
  return null;
}

/** Walk up parentId chain to find the top-level ancestor group. */
export function resolveTopGroup(entity: CanvasEntity, sceneGraph: SceneGraph): CanvasEntity {
  let current = entity;
  while (current.parentId) {
    const parent = sceneGraph.getEntity(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

export function moveEntitiesIntoDocker(
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

export function removeEntitiesFromDocker(
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
 * Resolve the select target inside a group hierarchy.
 * Returns the entity to select and an optional new group-edit context.
 */
export function resolveSelectTarget(
  topEntity: CanvasEntity,
  sceneGraph: SceneGraph,
  selectedIds: Set<string>,
  groupEditContext: string | null,
  isDeepSelect: boolean,
): { target: CanvasEntity; newGroupContext: string | null } {
  if (!topEntity.parentId || isDeepSelect) {
    return { target: topEntity, newGroupContext: groupEditContext };
  }

  const topGroup = resolveTopGroup(topEntity, sceneGraph);

  // Inside the group context: select the direct child of the top group
  if (groupEditContext === topGroup.id) {
    let current = topEntity;
    while (current.parentId && current.parentId !== topGroup.id) {
      const parent = sceneGraph.getEntity(current.parentId);
      if (!parent) break;
      current = parent;
    }
    return { target: current, newGroupContext: groupEditContext };
  }

  // Top group is selected: "enter" it
  if (selectedIds.has(topGroup.id)) {
    let current = topEntity;
    while (current.parentId && current.parentId !== topGroup.id) {
      const parent = sceneGraph.getEntity(current.parentId);
      if (!parent) break;
      current = parent;
    }
    return { target: current, newGroupContext: topGroup.id };
  }

  // Otherwise select the top-level group
  return { target: topGroup, newGroupContext: groupEditContext };
}

/**
 * Compute marquee selection from a drag rectangle.
 */
export function computeMarqueeSelection(
  sceneGraph: SceneGraph,
  startCanvas: Point2D,
  endCanvas: Point2D,
  groupEditContext: string | null,
  currentSelection: Set<string>,
  shiftKey: boolean,
): Set<string> {
  const bounds = {
    min: { x: Math.min(startCanvas.x, endCanvas.x), y: Math.min(startCanvas.y, endCanvas.y) },
    max: { x: Math.max(startCanvas.x, endCanvas.x), y: Math.max(startCanvas.y, endCanvas.y) },
  };
  const hits = sceneGraph.queryRegion(bounds);
  const selected = new Set<string>();

  for (const hit of hits) {
    if (!hit.visible || hit.locked) continue;
    let target = hit;
    if (hit.parentId) {
      const topGroup = resolveTopGroup(hit, sceneGraph);
      if (groupEditContext === topGroup.id) {
        let current = hit;
        while (current.parentId && current.parentId !== topGroup.id) {
          const parent = sceneGraph.getEntity(current.parentId);
          if (!parent) break;
          current = parent;
        }
        target = current;
      } else {
        target = topGroup;
      }
    }
    selected.add(target.id);
  }

  if (shiftKey) {
    const merged = new Set(currentSelection);
    for (const id of selected) {
      if (merged.has(id)) merged.delete(id);
      else merged.add(id);
    }
    return merged;
  }
  return selected;
}

// ── Entity creation factories ────────────────────────────────────

interface BaseEntityParams {
  canvasPoint: Point2D;
  zOrderLength: number;
  applySnap: (pos: Point2D, size?: { width: number; height: number }) => Point2D;
}

function baseFields(now: string) {
  return {
    canvasId: DEMO_CANVAS_ID,
    visible: true,
    canvasVisibility: 'both' as const,
    locked: false,
    flipH: false,
    flipV: false,
    opacity: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: currentUserId(),
  };
}

export function createWidgetEntity(
  p: BaseEntityParams,
  widgetId: string,
): CanvasEntity {
  const now = new Date().toISOString();
  return {
    id: nextEntityId('widget'),
    type: 'widget',
    ...baseFields(now),
    transform: {
      position: p.applySnap(p.canvasPoint, { width: 240, height: 180 }),
      size: { width: 240, height: 180 },
      rotation: 0, scale: 1,
    },
    zIndex: p.zOrderLength + 1,
    borderRadius: 8,
    name: widgetId,
    widgetInstanceId: nextEntityId('widget-inst'),
    widgetId,
    config: {},
  } as CanvasEntity;
}

export function createStickerEntity(
  p: BaseEntityParams,
  assetId: string,
  metadata: Record<string, unknown>,
): CanvasEntity {
  const now = new Date().toISOString();
  return {
    id: nextEntityId('sticker'),
    type: 'sticker',
    ...baseFields(now),
    transform: {
      position: p.applySnap(p.canvasPoint, { width: 120, height: 120 }),
      size: { width: 120, height: 120 },
      rotation: 0, scale: 1,
    },
    zIndex: p.zOrderLength + 1,
    borderRadius: 0,
    name: assetId,
    assetUrl: (typeof metadata?.assetUrl === 'string' && metadata.assetUrl) || 'https://placeholder.stickernest.invalid/asset.png',
    assetType: 'image',
    ...metadata,
  } as CanvasEntity;
}

export function createLottieEntity(
  p: BaseEntityParams,
  assetId: string,
  metadata: Record<string, unknown>,
): CanvasEntity | null {
  const assetUrl = typeof metadata.assetUrl === 'string' ? metadata.assetUrl : '';
  if (!assetUrl) return null;
  const now = new Date().toISOString();
  return {
    id: nextEntityId('lottie'),
    type: 'lottie',
    ...baseFields(now),
    transform: {
      position: p.applySnap(p.canvasPoint, { width: 160, height: 160 }),
      size: { width: 160, height: 160 },
      rotation: 0, scale: 1,
    },
    zIndex: p.zOrderLength + 1,
    borderRadius: 0,
    name: typeof metadata.name === 'string' ? metadata.name : assetId,
    assetUrl,
    loop: metadata.loop !== false,
    speed: typeof metadata.speed === 'number' ? metadata.speed : 1,
    direction: metadata.direction === -1 ? -1 : 1,
    autoplay: metadata.autoplay !== false,
    altText: typeof metadata.altText === 'string' ? metadata.altText : undefined,
    aspectLocked: metadata.aspectLocked !== false,
    ...metadata,
  } as CanvasEntity;
}

export function createSvgEntity(
  p: BaseEntityParams,
  assetId: string,
  metadata: Record<string, unknown>,
): CanvasEntity | null {
  const svgContent = typeof metadata.svgContent === 'string' ? metadata.svgContent : '';
  if (!svgContent) return null;
  const dw = typeof metadata.defaultWidth === 'number' && metadata.defaultWidth > 0 ? metadata.defaultWidth : 260;
  const dh = typeof metadata.defaultHeight === 'number' && metadata.defaultHeight > 0 ? metadata.defaultHeight : 260;
  const now = new Date().toISOString();
  return {
    id: nextEntityId('svg'),
    type: 'svg',
    ...baseFields(now),
    transform: {
      position: p.applySnap(p.canvasPoint, { width: dw, height: dh }),
      size: { width: dw, height: dh },
      rotation: 0, scale: 1,
    },
    zIndex: p.zOrderLength + 1,
    borderRadius: 0,
    name: typeof metadata.name === 'string' ? metadata.name : assetId,
    svgContent,
    assetUrl: typeof metadata.assetUrl === 'string' ? metadata.assetUrl : undefined,
    altText: typeof metadata.altText === 'string' ? metadata.altText : undefined,
    fill: typeof metadata.fill === 'string' ? metadata.fill : undefined,
    stroke: typeof metadata.stroke === 'string' ? metadata.stroke : undefined,
    aspectLocked: metadata.aspectLocked !== false,
  } as CanvasEntity;
}

export function createTextEntity(p: BaseEntityParams): CanvasEntity {
  const now = new Date().toISOString();
  return {
    id: nextEntityId('text'),
    type: 'text',
    ...baseFields(now),
    transform: {
      position: p.applySnap(p.canvasPoint, { width: 200, height: 40 }),
      size: { width: 200, height: 40 },
      rotation: 0, scale: 1,
    },
    zIndex: p.zOrderLength + 1,
    borderRadius: 0,
    name: 'New Text',
    content: 'Double-click to edit',
    fontSize: 16,
    fontFamily: 'var(--sn-font-family, sans-serif)',
    fontWeight: 400,
    color: 'var(--sn-text, #1a1a2e)',
    textAlign: 'left',
  } as CanvasEntity;
}

export function createShapeEntity(
  p: BaseEntityParams & { start: Point2D; end: Point2D },
  shapeType: 'rect' | 'ellipse',
): CanvasEntity {
  const x = Math.min(p.start.x, p.end.x);
  const y = Math.min(p.start.y, p.end.y);
  const width = Math.max(Math.abs(p.end.x - p.start.x), 20);
  const height = Math.max(Math.abs(p.end.y - p.start.y), 20);
  const now = new Date().toISOString();
  return {
    id: nextEntityId('shape'),
    type: 'shape',
    ...baseFields(now),
    transform: { position: { x, y }, size: { width, height }, rotation: 0, scale: 1 },
    zIndex: p.zOrderLength + 1,
    borderRadius: shapeType === 'ellipse' ? Math.max(width, height) : 0,
    name: shapeType === 'ellipse' ? 'New Ellipse' : 'New Rectangle',
    shapeType,
    fill: 'var(--sn-accent, #6366f1)',
    stroke: 'var(--sn-border, #e0e0e0)',
    strokeWidth: 2,
  } as CanvasEntity;
}

export function createArtboardEntity(
  p: BaseEntityParams & { start: Point2D; end: Point2D },
  childCanvasId: string,
  childCanvasSlug: string,
  artboardName: string,
): CanvasEntity {
  const x = Math.min(p.start.x, p.end.x);
  const y = Math.min(p.start.y, p.end.y);
  const width = Math.max(Math.abs(p.end.x - p.start.x), 20);
  const height = Math.max(Math.abs(p.end.y - p.start.y), 20);
  const now = new Date().toISOString();
  return {
    id: nextEntityId('artboard'),
    type: 'artboard',
    ...baseFields(now),
    transform: { position: { x, y }, size: { width, height }, rotation: 0, scale: 1 },
    zIndex: p.zOrderLength + 1,
    borderRadius: 0,
    syncTransform2d3d: true,
    name: artboardName,
    children: [],
    devicePreset: 'Custom',
    childCanvasId,
    childCanvasSlug,
  } as CanvasEntity;
}

export function createDrawingEntity(
  p: BaseEntityParams & { points: Point2D[] },
): CanvasEntity | null {
  if (p.points.length < 2) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of p.points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }
  const width = Math.max(maxX - minX, 10);
  const height = Math.max(maxY - minY, 10);
  const normalizedPoints = p.points.map((pt) => ({ x: pt.x - minX, y: pt.y - minY }));
  const now = new Date().toISOString();
  return {
    id: nextEntityId('drawing'),
    type: 'drawing',
    ...baseFields(now),
    transform: { position: { x: minX, y: minY }, size: { width, height }, rotation: 0, scale: 1 },
    zIndex: p.zOrderLength + 1,
    borderRadius: 0,
    name: 'New Drawing',
    points: normalizedPoints,
    stroke: 'var(--sn-text, #1a1a2e)',
    strokeWidth: 3,
    smoothing: 0.5,
  } as CanvasEntity;
}
