/**
 * SelectionOverlay — renders interactive resize and crop handles on selected entities.
 *
 * Mounted inside CanvasViewportLayer so handles transform with the viewport.
 * In edit mode with exactly 1 entity selected, renders 8 resize handles
 * at bounding box corners and edge midpoints.
 *
 * When an entity is in crop mode (toggled via 'C' shortcut), renders 4 edge
 * crop handles instead of resize handles. Dragging crop handles adjusts the
 * percentage-based crop inset for that edge.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React, { useRef, useState } from 'react';

import type { CanvasEntity, BoundingBox2D, CropRect, Point2D, Size2D } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import type { SceneGraph } from '../../../canvas/core';
import { bus } from '../../../kernel/bus';
import { CropEvents } from '../handlers';
import { useCropMode } from '../hooks';
import type { HandlePosition } from '../utils/resize';
import { computeResize, getResizeHandles } from '../utils/resize';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HANDLE_SIZE = 8;
const HALF_HANDLE = HANDLE_SIZE / 2;
const MIN_ENTITY_SIZE = 20;
const SELECTION_BORDER_WIDTH = 1;

/** Width of the crop edge handle bar. */
const CROP_HANDLE_THICKNESS = 6;

/** Minimum gap between opposite crop edges (prevents inverting). */
const MIN_CROP_GAP = 0.05;

type CropEdge = 'top' | 'right' | 'bottom' | 'left';

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

interface CropDragState {
  edge: CropEdge;
  entityId: string;
  startPointer: Point2D;
  originalCrop: CropRect;
  entitySize: Size2D;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute a new CropRect from a crop edge drag.
 * Clamps values to [0, 1-oppositeEdge-MIN_CROP_GAP].
 */
function computeCropFromDrag(
  state: CropDragState,
  clientX: number,
  clientY: number,
): CropRect {
  const dx = clientX - state.startPointer.x;
  const dy = clientY - state.startPointer.y;
  const { edge, originalCrop, entitySize } = state;

  const crop = { ...originalCrop };

  switch (edge) {
    case 'top': {
      const delta = dy / entitySize.height;
      crop.top = clampCropValue(originalCrop.top + delta, crop.bottom);
      break;
    }
    case 'bottom': {
      const delta = -dy / entitySize.height;
      crop.bottom = clampCropValue(originalCrop.bottom + delta, crop.top);
      break;
    }
    case 'left': {
      const delta = dx / entitySize.width;
      crop.left = clampCropValue(originalCrop.left + delta, crop.right);
      break;
    }
    case 'right': {
      const delta = -dx / entitySize.width;
      crop.right = clampCropValue(originalCrop.right + delta, crop.left);
      break;
    }
  }

  return crop;
}

/** Clamp a crop edge value to [0, 1 - oppositeEdge - MIN_CROP_GAP]. */
function clampCropValue(value: number, oppositeEdge: number): number {
  const max = 1 - oppositeEdge - MIN_CROP_GAP;
  return Math.max(0, Math.min(max, value));
}

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

  // Crop mode state
  const cropModeIds = useCropMode();
  const [_cropDragState, setCropDragState] = useState<CropDragState | null>(null);
  const [liveCrop, setLiveCrop] = useState<CropRect | null>(null);
  const cropDragRef = useRef<CropDragState | null>(null);

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

  // Determine if the single selected entity is in crop mode
  const isCropMode =
    selectedEntities.length === 1 && cropModeIds.has(selectedEntities[0].id);

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

    // Emit resize event with full transform wrapped in updates
    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: state.entityId,
      updates: {
        transform: {
          ...state.originalTransform,
          position: result.position,
          size: clampedSize,
        },
      },
    });

    // Clean up drag state
    dragRef.current = null;
    setDragState(null);
    setLivePreview(null);
  };

  // --- Pointer handlers for crop ---

  const handleCropPointerDown = (
    e: React.PointerEvent,
    edge: CropEdge,
  ) => {
    if (!isCropMode) return;
    e.preventDefault();
    e.stopPropagation();

    const entity = selectedEntities[0];
    const currentCrop: CropRect = entity.cropRect ?? {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };

    const state: CropDragState = {
      edge,
      entityId: entity.id,
      startPointer: { x: e.clientX, y: e.clientY },
      originalCrop: { ...currentCrop },
      entitySize: { ...entity.transform.size },
    };

    cropDragRef.current = state;
    setCropDragState(state);

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCropPointerMove = (e: React.PointerEvent) => {
    const state = cropDragRef.current;
    if (!state) return;

    e.preventDefault();
    e.stopPropagation();

    const newCrop = computeCropFromDrag(state, e.clientX, e.clientY);
    setLiveCrop(newCrop);
  };

  const handleCropPointerUp = (e: React.PointerEvent) => {
    const state = cropDragRef.current;
    if (!state) return;

    e.preventDefault();
    e.stopPropagation();

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const finalCrop = computeCropFromDrag(state, e.clientX, e.clientY);

    // Emit crop apply
    bus.emit(CropEvents.APPLY, {
      entityId: state.entityId,
      cropRect: finalCrop,
    });

    cropDragRef.current = null;
    setCropDragState(null);
    setLiveCrop(null);
  };

  // Current crop values for crop mode overlay
  const activeCrop: CropRect = isCropMode
    ? liveCrop ??
      selectedEntities[0].cropRect ?? { top: 0, right: 0, bottom: 0, left: 0 }
    : { top: 0, right: 0, bottom: 0, left: 0 };

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
          border: `${SELECTION_BORDER_WIDTH}px solid ${isCropMode ? '#e17055' : '#4a90d9'}`,
          pointerEvents: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Crop mode: dimmed overlay + edge crop handles */}
      {isCropMode && (
        <>
          {/* Dimmed areas outside the crop region */}
          {/* Top dim */}
          {activeCrop.top > 0 && (
            <div
              data-testid="crop-dim-top"
              style={{
                position: 'absolute',
                left: displayPosition.x,
                top: displayPosition.y,
                width: displaySize.width,
                height: displaySize.height * activeCrop.top,
                background: 'rgba(0, 0, 0, 0.4)',
                pointerEvents: 'none',
              }}
            />
          )}
          {/* Bottom dim */}
          {activeCrop.bottom > 0 && (
            <div
              data-testid="crop-dim-bottom"
              style={{
                position: 'absolute',
                left: displayPosition.x,
                top:
                  displayPosition.y +
                  displaySize.height * (1 - activeCrop.bottom),
                width: displaySize.width,
                height: displaySize.height * activeCrop.bottom,
                background: 'rgba(0, 0, 0, 0.4)',
                pointerEvents: 'none',
              }}
            />
          )}
          {/* Left dim */}
          {activeCrop.left > 0 && (
            <div
              data-testid="crop-dim-left"
              style={{
                position: 'absolute',
                left: displayPosition.x,
                top:
                  displayPosition.y + displaySize.height * activeCrop.top,
                width: displaySize.width * activeCrop.left,
                height:
                  displaySize.height *
                  (1 - activeCrop.top - activeCrop.bottom),
                background: 'rgba(0, 0, 0, 0.4)',
                pointerEvents: 'none',
              }}
            />
          )}
          {/* Right dim */}
          {activeCrop.right > 0 && (
            <div
              data-testid="crop-dim-right"
              style={{
                position: 'absolute',
                left:
                  displayPosition.x +
                  displaySize.width * (1 - activeCrop.right),
                top:
                  displayPosition.y + displaySize.height * activeCrop.top,
                width: displaySize.width * activeCrop.right,
                height:
                  displaySize.height *
                  (1 - activeCrop.top - activeCrop.bottom),
                background: 'rgba(0, 0, 0, 0.4)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Crop edge handles */}
          {/* Top handle */}
          <div
            data-testid="crop-handle-top"
            onPointerDown={(e) => handleCropPointerDown(e, 'top')}
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerUp}
            style={{
              position: 'absolute',
              left: displayPosition.x + displaySize.width * activeCrop.left,
              top:
                displayPosition.y +
                displaySize.height * activeCrop.top -
                CROP_HANDLE_THICKNESS / 2,
              width:
                displaySize.width *
                (1 - activeCrop.left - activeCrop.right),
              height: CROP_HANDLE_THICKNESS,
              background: '#e17055',
              cursor: 'ns-resize',
              pointerEvents: 'auto',
              borderRadius: 2,
              opacity: 0.9,
              zIndex: 2,
            }}
          />
          {/* Bottom handle */}
          <div
            data-testid="crop-handle-bottom"
            onPointerDown={(e) => handleCropPointerDown(e, 'bottom')}
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerUp}
            style={{
              position: 'absolute',
              left: displayPosition.x + displaySize.width * activeCrop.left,
              top:
                displayPosition.y +
                displaySize.height * (1 - activeCrop.bottom) -
                CROP_HANDLE_THICKNESS / 2,
              width:
                displaySize.width *
                (1 - activeCrop.left - activeCrop.right),
              height: CROP_HANDLE_THICKNESS,
              background: '#e17055',
              cursor: 'ns-resize',
              pointerEvents: 'auto',
              borderRadius: 2,
              opacity: 0.9,
              zIndex: 2,
            }}
          />
          {/* Left handle */}
          <div
            data-testid="crop-handle-left"
            onPointerDown={(e) => handleCropPointerDown(e, 'left')}
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerUp}
            style={{
              position: 'absolute',
              left:
                displayPosition.x +
                displaySize.width * activeCrop.left -
                CROP_HANDLE_THICKNESS / 2,
              top: displayPosition.y + displaySize.height * activeCrop.top,
              width: CROP_HANDLE_THICKNESS,
              height:
                displaySize.height *
                (1 - activeCrop.top - activeCrop.bottom),
              background: '#e17055',
              cursor: 'ew-resize',
              pointerEvents: 'auto',
              borderRadius: 2,
              opacity: 0.9,
              zIndex: 2,
            }}
          />
          {/* Right handle */}
          <div
            data-testid="crop-handle-right"
            onPointerDown={(e) => handleCropPointerDown(e, 'right')}
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerUp}
            style={{
              position: 'absolute',
              left:
                displayPosition.x +
                displaySize.width * (1 - activeCrop.right) -
                CROP_HANDLE_THICKNESS / 2,
              top: displayPosition.y + displaySize.height * activeCrop.top,
              width: CROP_HANDLE_THICKNESS,
              height:
                displaySize.height *
                (1 - activeCrop.top - activeCrop.bottom),
              background: '#e17055',
              cursor: 'ew-resize',
              pointerEvents: 'auto',
              borderRadius: 2,
              opacity: 0.9,
              zIndex: 2,
            }}
          />
        </>
      )}

      {/* Resize handles — only for single selection on non-locked entity, NOT in crop mode */}
      {canResize &&
        !isCropMode &&
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
