/**
 * SelectionOverlay — renders interactive resize handles on selected entities.
 *
 * Mounted inside CanvasViewportLayer so handles transform with the viewport.
 * In edit mode with exactly 1 entity selected, renders 8 resize handles
 * at bounding box corners and edge midpoints.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React, { useRef, useState } from 'react';

import type { CanvasEntity, BoundingBox2D, Point2D, Size2D } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import type { SceneGraph } from '../../../canvas/core';
import { bus } from '../../../kernel/bus';
import type { HandlePosition } from '../utils/resize';
import { computeResize, getResizeHandles } from '../utils/resize';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HANDLE_SIZE = 8;
const HALF_HANDLE = HANDLE_SIZE / 2;
const MIN_ENTITY_SIZE = 20;
const SELECTION_BORDER_WIDTH = 1;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectionOverlayProps {
  /** Currently selected entity IDs */
  selectedIds: Set<string>;
  /** Scene graph reference for entity lookups */
  sceneGraph: SceneGraph | null;
  /** Interaction mode — handles only render in edit mode */
  interactionMode: 'edit' | 'preview';
}

interface DragState {
  handle: HandlePosition;
  entityId: string;
  startPointer: Point2D;
  originalBounds: BoundingBox2D;
  originalTransform: CanvasEntity['transform'];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the pixel position for a resize handle relative to the entity. */
function getHandleOffset(
  handle: HandlePosition,
  width: number,
  height: number,
): Point2D {
  switch (handle) {
    case 'top-left':
      return { x: -HALF_HANDLE, y: -HALF_HANDLE };
    case 'top':
      return { x: width / 2 - HALF_HANDLE, y: -HALF_HANDLE };
    case 'top-right':
      return { x: width - HALF_HANDLE, y: -HALF_HANDLE };
    case 'right':
      return { x: width - HALF_HANDLE, y: height / 2 - HALF_HANDLE };
    case 'bottom-right':
      return { x: width - HALF_HANDLE, y: height - HALF_HANDLE };
    case 'bottom':
      return { x: width / 2 - HALF_HANDLE, y: height - HALF_HANDLE };
    case 'bottom-left':
      return { x: -HALF_HANDLE, y: height - HALF_HANDLE };
    case 'left':
      return { x: -HALF_HANDLE, y: height / 2 - HALF_HANDLE };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders selection outline and resize handles over selected entities.
 * Handles pointer events for interactive resizing.
 */
export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  selectedIds,
  sceneGraph,
  interactionMode,
}) => {
  const [_dragState, setDragState] = useState<DragState | null>(null);
  const [livePreview, setLivePreview] = useState<{
    position: Point2D;
    size: Size2D;
  } | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Only render in edit mode
  if (interactionMode !== 'edit') return null;
  if (selectedIds.size === 0) return null;
  if (!sceneGraph) return null;

  const handles = getResizeHandles();

  // Collect selected entities
  const selectedEntities: CanvasEntity[] = [];
  for (const id of selectedIds) {
    const entity = sceneGraph.getEntity(id);
    if (entity) selectedEntities.push(entity);
  }

  if (selectedEntities.length === 0) return null;

  // For resize: only enable handles when exactly 1 entity is selected
  const canResize = selectedEntities.length === 1 && !selectedEntities[0].locked;

  // Compute bounding box encompassing all selected entities
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const entity of selectedEntities) {
    const { position, size } = entity.transform;
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x + size.width);
    maxY = Math.max(maxY, position.y + size.height);
  }

  // If we're actively resizing, use the live preview dimensions
  const displayPosition = livePreview
    ? livePreview.position
    : { x: minX, y: minY };
  const displaySize = livePreview
    ? livePreview.size
    : { width: maxX - minX, height: maxY - minY };

  // --- Pointer handlers for resize ---

  const handlePointerDown = (
    e: React.PointerEvent,
    handle: HandlePosition,
  ) => {
    if (!canResize) return;
    e.preventDefault();
    e.stopPropagation();

    const entity = selectedEntities[0];
    const { position, size } = entity.transform;

    const state: DragState = {
      handle,
      entityId: entity.id,
      startPointer: { x: e.clientX, y: e.clientY },
      originalBounds: {
        min: { x: position.x, y: position.y },
        max: { x: position.x + size.width, y: position.y + size.height },
      },
      originalTransform: { ...entity.transform },
    };

    dragRef.current = state;
    setDragState(state);

    // Capture pointer for smooth drag
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = dragRef.current;
    if (!state) return;

    e.preventDefault();
    e.stopPropagation();

    const delta: Point2D = {
      x: e.clientX - state.startPointer.x,
      y: e.clientY - state.startPointer.y,
    };

    const result = computeResize(state.handle, delta, state.originalBounds, {
      aspectLock: e.shiftKey,
      centerResize: e.altKey,
    });

    // Enforce minimum entity size
    const clampedSize: Size2D = {
      width: Math.max(MIN_ENTITY_SIZE, result.size.width),
      height: Math.max(MIN_ENTITY_SIZE, result.size.height),
    };

    setLivePreview({
      position: result.position,
      size: clampedSize,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const state = dragRef.current;
    if (!state) return;

    e.preventDefault();
    e.stopPropagation();

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Compute final size
    const delta: Point2D = {
      x: e.clientX - state.startPointer.x,
      y: e.clientY - state.startPointer.y,
    };

    const result = computeResize(state.handle, delta, state.originalBounds, {
      aspectLock: e.shiftKey,
      centerResize: e.altKey,
    });

    const clampedSize: Size2D = {
      width: Math.max(MIN_ENTITY_SIZE, result.size.width),
      height: Math.max(MIN_ENTITY_SIZE, result.size.height),
    };

    // Emit resize event with full transform to avoid shallow merge issues
    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: state.entityId,
      transform: {
        ...state.originalTransform,
        position: result.position,
        size: clampedSize,
      },
    });

    // Clean up drag state
    dragRef.current = null;
    setDragState(null);
    setLivePreview(null);
  };

  return (
    <>
      {/* Selection bounding box outline */}
      <div
        data-testid="selection-overlay"
        style={{
          position: 'absolute',
          left: displayPosition.x,
          top: displayPosition.y,
          width: displaySize.width,
          height: displaySize.height,
          border: `${SELECTION_BORDER_WIDTH}px solid #4a90d9`,
          pointerEvents: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Resize handles — only for single selection on non-locked entity */}
      {canResize &&
        handles.map((h) => {
          const offset = getHandleOffset(
            h.position,
            displaySize.width,
            displaySize.height,
          );

          return (
            <div
              key={h.position}
              data-testid={`resize-handle-${h.position}`}
              onPointerDown={(e) => handlePointerDown(e, h.position)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                position: 'absolute',
                left: displayPosition.x + offset.x,
                top: displayPosition.y + offset.y,
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                background: '#ffffff',
                border: '1px solid #4a90d9',
                borderRadius: 1,
                cursor: h.cursor,
                pointerEvents: 'auto',
                boxSizing: 'border-box',
                zIndex: 1,
              }}
            />
          );
        })}
    </>
  );
};
