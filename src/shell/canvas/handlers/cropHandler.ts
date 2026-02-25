/**
 * Crop Handler — bus-driven crop and uncrop for canvas entities.
 *
 * Manages crop mode state and applies/resets percentage-based crop rects.
 * Subscribes to crop bus events and emits ENTITY_UPDATED to commit changes.
 *
 * @module shell/canvas/handlers
 * @layer L6
 */

import type { CanvasEntity, CropRect } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import type { SceneGraph } from '../../../canvas/core';
import { bus } from '../../../kernel/bus';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CropEvents = {
  /** Toggle crop mode on/off for selected entities */
  TOGGLE: 'canvas.crop.toggle',
  /** Apply a crop rect to an entity */
  APPLY: 'canvas.crop.apply',
  /** Reset (remove) crop from an entity */
  RESET: 'canvas.crop.reset',
} as const;

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

interface CropTogglePayload {
  entityIds: string[];
}

interface CropApplyPayload {
  entityId: string;
  cropRect: CropRect;
}

interface CropResetPayload {
  entityId: string;
}

// ---------------------------------------------------------------------------
// Crop mode state — module-scoped singleton
// ---------------------------------------------------------------------------

/** Set of entity IDs currently in crop mode. */
let cropModeIds = new Set<string>();

/** Listeners for crop mode state changes. */
const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const fn of listeners) fn();
}

/** Subscribe to crop mode state changes. Returns an unsubscribe function. */
export function subscribeCropMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Get the current set of entity IDs in crop mode. */
export function getCropModeIds(): Set<string> {
  return cropModeIds;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function handleToggle(payload: CropTogglePayload): void {
  const { entityIds } = payload;

  // If any of the selected entities are already in crop mode, exit crop mode for all
  const anyInCropMode = entityIds.some((id) => cropModeIds.has(id));

  if (anyInCropMode) {
    // Exit crop mode
    for (const id of entityIds) {
      cropModeIds.delete(id);
    }
  } else {
    // Enter crop mode — only for single entity selection
    if (entityIds.length === 1) {
      cropModeIds = new Set([entityIds[0]]);
    }
  }

  notifyListeners();
}

function handleApply(
  payload: CropApplyPayload,
  sceneGraph: SceneGraph,
): void {
  const { entityId, cropRect } = payload;
  const entity = sceneGraph.getEntity(entityId);
  if (!entity) return;

  // Emit entity update with the new cropRect, preserving full transform
  bus.emit(CanvasEvents.ENTITY_UPDATED, {
    id: entityId,
    updates: {
      transform: { ...entity.transform },
      cropRect,
    },
  });

  // Exit crop mode for this entity
  cropModeIds.delete(entityId);
  notifyListeners();
}

function handleReset(
  payload: CropResetPayload,
  sceneGraph: SceneGraph,
): void {
  const { entityId } = payload;
  const entity = sceneGraph.getEntity(entityId);
  if (!entity) return;

  // Remove crop by setting cropRect to undefined
  bus.emit(CanvasEvents.ENTITY_UPDATED, {
    id: entityId,
    updates: {
      transform: { ...entity.transform },
      cropRect: undefined,
    },
  });

  // Exit crop mode
  cropModeIds.delete(entityId);
  notifyListeners();
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

/**
 * Initialize the crop handler — subscribe to crop bus events.
 * Returns a teardown function.
 */
export function initCropHandler(
  getSceneGraph: () => SceneGraph | null,
): () => void {
  const unsubToggle = bus.subscribe(
    CropEvents.TOGGLE,
    (event: { payload: CropTogglePayload }) => {
      handleToggle(event.payload);
    },
  );

  const unsubApply = bus.subscribe(
    CropEvents.APPLY,
    (event: { payload: CropApplyPayload }) => {
      const sceneGraph = getSceneGraph();
      if (!sceneGraph) return;
      handleApply(event.payload, sceneGraph);
    },
  );

  const unsubReset = bus.subscribe(
    CropEvents.RESET,
    (event: { payload: CropResetPayload }) => {
      const sceneGraph = getSceneGraph();
      if (!sceneGraph) return;
      handleReset(event.payload, sceneGraph);
    },
  );

  return () => {
    unsubToggle();
    unsubApply();
    unsubReset();
    // Clear crop mode state on teardown
    cropModeIds = new Set();
    notifyListeners();
  };
}
