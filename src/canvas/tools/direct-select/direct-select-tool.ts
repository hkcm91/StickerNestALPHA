/**
 * Direct Select Tool — post-creation path editing
 *
 * Allows editing of individual anchor points and control handles
 * on existing path entities.
 *
 * Capabilities:
 *   - Click anchor → select, show handles
 *   - Drag anchor → move anchor (handles follow)
 *   - Drag handle → adjust curve; enforce smooth/symmetric constraints
 *   - Alt+drag handle → break constraint (convert to corner)
 *   - Double-click segment → add anchor (De Casteljau subdivision)
 *   - Alt+click anchor → toggle point type (corner ↔ smooth)
 *   - Delete key → remove selected anchor
 *
 * @module canvas/tools/direct-select
 * @layer L4A-2
 */

import type { Point2D, AnchorPoint, PathEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import {
  enforceSmooth,
  enforceSymmetric,
} from '../../core';
import type { SceneGraph } from '../../core';
import type { Tool, CanvasPointerEvent, CanvasKeyEvent } from '../registry';

/** Hit radius for anchor points (px in canvas space) */
const ANCHOR_HIT_RADIUS = 8;

/** Hit radius for control handles (px in canvas space) */
const HANDLE_HIT_RADIUS = 6;

/** Drag threshold */
const DRAG_THRESHOLD = 2;

type DragTarget =
  | { type: 'anchor'; entityId: string; anchorIndex: number }
  | { type: 'handleIn'; entityId: string; anchorIndex: number }
  | { type: 'handleOut'; entityId: string; anchorIndex: number }
  | null;

export interface DirectSelectToolState {
  readonly selectedEntityId: string | null;
  readonly selectedAnchorIndex: number | null;
  readonly isDragging: boolean;
}

export function createDirectSelectTool(
  sceneGraph: SceneGraph,
  getMode: () => 'edit' | 'preview',
): Tool & { getToolState(): DirectSelectToolState } {
  let selectedEntityId: string | null = null;
  let selectedAnchorIndex: number | null = null;
  let dragTarget: DragTarget = null;
  let isDragging = false;
  let downPosition: Point2D | null = null;
  let altKeyOnDrag = false;

  function dist(a: Point2D, b: Point2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getPathEntity(entityId: string): PathEntity | null {
    const entity = sceneGraph.getEntity(entityId);
    if (!entity || entity.type !== 'path') return null;
    return entity as PathEntity;
  }

  /** Convert entity-local anchor position to canvas-space */
  function toCanvas(entity: PathEntity, localPos: Point2D): Point2D {
    return {
      x: entity.transform.position.x + localPos.x,
      y: entity.transform.position.y + localPos.y,
    };
  }

  /** Convert canvas-space position to entity-local */
  function toLocal(entity: PathEntity, canvasPos: Point2D): Point2D {
    return {
      x: canvasPos.x - entity.transform.position.x,
      y: canvasPos.y - entity.transform.position.y,
    };
  }

  /** Find the nearest anchor at a canvas position across all path entities */
  function hitTestAnchors(canvasPos: Point2D): { entityId: string; anchorIndex: number } | null {
    const entities = sceneGraph.getAllEntities();
    let bestDist = ANCHOR_HIT_RADIUS;
    let bestResult: { entityId: string; anchorIndex: number } | null = null;

    for (const entity of entities) {
      if (entity.type !== 'path') continue;
      const pathEntity = entity as PathEntity;
      for (let i = 0; i < pathEntity.anchors.length; i++) {
        const anchorCanvas = toCanvas(pathEntity, pathEntity.anchors[i].position);
        const d = dist(canvasPos, anchorCanvas);
        if (d < bestDist) {
          bestDist = d;
          bestResult = { entityId: entity.id, anchorIndex: i };
        }
      }
    }
    return bestResult;
  }

  /** Find the nearest handle at a canvas position for the selected entity */
  function hitTestHandles(
    canvasPos: Point2D,
  ): { type: 'handleIn' | 'handleOut'; entityId: string; anchorIndex: number } | null {
    if (!selectedEntityId || selectedAnchorIndex === null) return null;
    const entity = getPathEntity(selectedEntityId);
    if (!entity) return null;

    const anchor = entity.anchors[selectedAnchorIndex];
    if (!anchor) return null;

    const anchorCanvas = toCanvas(entity, anchor.position);

    if (anchor.handleIn) {
      const handlePos = { x: anchorCanvas.x + anchor.handleIn.x, y: anchorCanvas.y + anchor.handleIn.y };
      if (dist(canvasPos, handlePos) < HANDLE_HIT_RADIUS) {
        return { type: 'handleIn', entityId: selectedEntityId, anchorIndex: selectedAnchorIndex };
      }
    }

    if (anchor.handleOut) {
      const handlePos = { x: anchorCanvas.x + anchor.handleOut.x, y: anchorCanvas.y + anchor.handleOut.y };
      if (dist(canvasPos, handlePos) < HANDLE_HIT_RADIUS) {
        return { type: 'handleOut', entityId: selectedEntityId, anchorIndex: selectedAnchorIndex };
      }
    }

    return null;
  }

  // TODO: hitTestSegment — segment subdivision via double-click (future enhancement)
  // Will use distanceToCubicBezier + splitCubicBezier from geometry utils

  function updatePathEntity(entityId: string, newAnchors: AnchorPoint[]): void {
    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: entityId,
      anchors: newAnchors,
    });
  }

  function clearSelection(): void {
    selectedEntityId = null;
    selectedAnchorIndex = null;
  }

  const tool: Tool & { getToolState(): DirectSelectToolState } = {
    name: 'direct-select',

    onActivate() {
      clearSelection();
    },

    onDeactivate() {
      clearSelection();
      isDragging = false;
      dragTarget = null;
    },

    onPointerDown(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;
      const pos = event.canvasPosition;
      downPosition = pos;
      isDragging = false;
      altKeyOnDrag = event.altKey;

      // Priority: handles > anchors > segments > deselect
      const handleHit = hitTestHandles(pos);
      if (handleHit) {
        dragTarget = {
          type: handleHit.type,
          entityId: handleHit.entityId,
          anchorIndex: handleHit.anchorIndex,
        };
        return;
      }

      const anchorHit = hitTestAnchors(pos);
      if (anchorHit) {
        selectedEntityId = anchorHit.entityId;
        selectedAnchorIndex = anchorHit.anchorIndex;
        dragTarget = { type: 'anchor', entityId: anchorHit.entityId, anchorIndex: anchorHit.anchorIndex };

        // Alt+click toggles point type
        if (event.altKey) {
          const entity = getPathEntity(anchorHit.entityId);
          if (entity) {
            const newAnchors = [...entity.anchors];
            const anchor = { ...newAnchors[anchorHit.anchorIndex] };
            anchor.pointType = anchor.pointType === 'corner' ? 'smooth' : 'corner';
            if (anchor.pointType === 'smooth' && anchor.handleIn && anchor.handleOut) {
              anchor.handleOut = enforceSmooth(anchor.handleIn, anchor.handleOut);
            }
            newAnchors[anchorHit.anchorIndex] = anchor;
            updatePathEntity(anchorHit.entityId, newAnchors);
            bus.emit(CanvasEvents.PATH_POINT_CONVERTED, {
              entityId: anchorHit.entityId,
              anchorIndex: anchorHit.anchorIndex,
              newType: anchor.pointType,
            });
            dragTarget = null;
          }
        }
        return;
      }

      // No anchor/handle hit — deselect
      clearSelection();
      dragTarget = null;
    },

    onPointerMove(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;
      if (!dragTarget || !downPosition) return;

      const pos = event.canvasPosition;

      if (!isDragging && dist(pos, downPosition) < DRAG_THRESHOLD) return;
      isDragging = true;

      const entity = getPathEntity(dragTarget.entityId);
      if (!entity) return;

      const newAnchors = entity.anchors.map((a) => ({ ...a }));
      const anchor = { ...newAnchors[dragTarget.anchorIndex] };

      if (dragTarget.type === 'anchor') {
        // Move anchor: compute delta and apply
        const localPos = toLocal(entity, pos);
        anchor.position = localPos;
        newAnchors[dragTarget.anchorIndex] = anchor;
        updatePathEntity(dragTarget.entityId, newAnchors);
      } else if (dragTarget.type === 'handleOut' || dragTarget.type === 'handleIn') {
        const anchorCanvas = toCanvas(entity, anchor.position);
        const offset = { x: pos.x - anchorCanvas.x, y: pos.y - anchorCanvas.y };

        if (dragTarget.type === 'handleOut') {
          anchor.handleOut = offset;

          if (altKeyOnDrag) {
            // Alt+drag: break constraint → corner
            anchor.pointType = 'corner';
          } else if (anchor.pointType === 'symmetric') {
            anchor.handleIn = enforceSymmetric(offset);
          } else if (anchor.pointType === 'smooth' && anchor.handleIn) {
            anchor.handleIn = enforceSmooth(offset, anchor.handleIn);
          }
        } else {
          anchor.handleIn = offset;

          if (altKeyOnDrag) {
            anchor.pointType = 'corner';
          } else if (anchor.pointType === 'symmetric' && anchor.handleOut) {
            anchor.handleOut = enforceSymmetric(offset);
          } else if (anchor.pointType === 'smooth' && anchor.handleOut) {
            anchor.handleOut = enforceSmooth(offset, anchor.handleOut);
          }
        }

        newAnchors[dragTarget.anchorIndex] = anchor;
        updatePathEntity(dragTarget.entityId, newAnchors);
      }
    },

    onPointerUp(_event: CanvasPointerEvent) {
      isDragging = false;
      dragTarget = null;
      downPosition = null;
    },

    onKeyDown(event: CanvasKeyEvent) {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedEntityId && selectedAnchorIndex !== null) {
          const entity = getPathEntity(selectedEntityId);
          if (!entity) return;

          if (entity.anchors.length <= 1) {
            // Last anchor — delete the whole entity
            bus.emit(CanvasEvents.ENTITY_DELETED, { id: selectedEntityId });
            clearSelection();
          } else {
            const newAnchors = entity.anchors.filter((_, i) => i !== selectedAnchorIndex);
            updatePathEntity(selectedEntityId, newAnchors);
            clearSelection();
          }
        }
      }
    },

    cancel() {
      clearSelection();
      isDragging = false;
      dragTarget = null;
    },

    getToolState(): DirectSelectToolState {
      return {
        selectedEntityId,
        selectedAnchorIndex,
        isDragging,
      };
    },
  };

  return tool;
}
