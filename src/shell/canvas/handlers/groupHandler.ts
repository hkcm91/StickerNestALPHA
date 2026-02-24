/**
 * Group / Ungroup bus event handler — listens for group and ungroup events
 * and manages GroupEntity creation/destruction via the bus.
 *
 * Approach:
 * - Group: compute bounding box of selected entities, create a GroupEntity
 *   that encompasses them. Children remain at their absolute positions —
 *   the group is a logical container (no relative positioning).
 * - Ungroup: delete the GroupEntity, leaving children unchanged.
 *
 * @module shell/canvas/handlers
 * @layer L6
 */

import type { CanvasEntity, GroupEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import type { SceneGraph } from '../../../canvas/core';
import { bus } from '../../../kernel/bus';

// ---------------------------------------------------------------------------
// Bus event types for group operations
// ---------------------------------------------------------------------------

export const GroupEvents = {
  /** Request to group the given entity IDs into a new GroupEntity */
  GROUP: 'canvas.entity.group',
  /** Request to ungroup the given group entity IDs */
  UNGROUP: 'canvas.entity.ungroup',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupPayload {
  entityIds: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PADDING = 8;

/**
 * Compute the bounding box encompassing all given entities,
 * with optional padding.
 */
function computeBoundingBox(entities: CanvasEntity[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const entity of entities) {
    const { position, size } = entity.transform;
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x + size.width);
    maxY = Math.max(maxY, position.y + size.height);
  }

  return {
    x: minX - PADDING,
    y: minY - PADDING,
    width: maxX - minX + PADDING * 2,
    height: maxY - minY + PADDING * 2,
  };
}

/**
 * Compute the maximum z-index among the given entities,
 * so the group sits on top.
 */
function maxZIndex(entities: CanvasEntity[]): number {
  let max = 0;
  for (const entity of entities) {
    if (entity.zIndex > max) max = entity.zIndex;
  }
  return max;
}

// ---------------------------------------------------------------------------
// Group handler
// ---------------------------------------------------------------------------

function handleGroup(
  payload: GroupPayload,
  sceneGraph: SceneGraph,
): void {
  const { entityIds } = payload;
  if (entityIds.length < 2) return;

  // Gather entities, skip any that don't exist or are already groups
  const entities: CanvasEntity[] = [];
  for (const id of entityIds) {
    const entity = sceneGraph.getEntity(id);
    if (entity) entities.push(entity);
  }

  if (entities.length < 2) return;

  // Compute group bounding box
  const bounds = computeBoundingBox(entities);
  const groupId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Create the GroupEntity
  const groupEntity: GroupEntity = {
    id: groupId,
    type: 'group',
    canvasId: entities[0].canvasId,
    transform: {
      position: { x: bounds.x, y: bounds.y },
      size: { width: bounds.width, height: bounds.height },
      rotation: 0,
      scale: 1,
    },
    zIndex: maxZIndex(entities) + 1,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 0,
    name: `Group (${entities.length})`,
    createdAt: now,
    updatedAt: now,
    createdBy: entities[0].createdBy,
    children: entities.map((e) => e.id),
  };

  // Emit group creation
  bus.emit(CanvasEvents.ENTITY_CREATED, groupEntity);

  // Emit the grouped event so other systems can react
  bus.emit(CanvasEvents.ENTITY_GROUPED, {
    groupId,
    childIds: entities.map((e) => e.id),
  });
}

// ---------------------------------------------------------------------------
// Ungroup handler
// ---------------------------------------------------------------------------

function handleUngroup(
  payload: GroupPayload,
  sceneGraph: SceneGraph,
): void {
  const { entityIds } = payload;

  for (const id of entityIds) {
    const entity = sceneGraph.getEntity(id);
    if (!entity || entity.type !== 'group') continue;

    const groupEntity = entity as GroupEntity;
    const childIds = groupEntity.children;

    // Delete the group entity
    bus.emit(CanvasEvents.ENTITY_DELETED, { id: groupEntity.id });

    // Emit the ungrouped event so other systems can react
    bus.emit(CanvasEvents.ENTITY_UNGROUPED, {
      groupId: groupEntity.id,
      childIds,
    });
  }
}

// ---------------------------------------------------------------------------
// Handler initialization
// ---------------------------------------------------------------------------

/**
 * Initialize group/ungroup bus event subscriptions.
 *
 * @param getSceneGraph - Getter for the current scene graph reference
 * @returns Teardown function to unsubscribe all listeners
 */
export function initGroupHandler(
  getSceneGraph: () => SceneGraph | null,
): () => void {
  const unsubGroup = bus.subscribe(
    GroupEvents.GROUP,
    (event: { payload: GroupPayload }) => {
      const sceneGraph = getSceneGraph();
      if (!sceneGraph) return;
      handleGroup(event.payload, sceneGraph);
    },
  );

  const unsubUngroup = bus.subscribe(
    GroupEvents.UNGROUP,
    (event: { payload: GroupPayload }) => {
      const sceneGraph = getSceneGraph();
      if (!sceneGraph) return;
      handleUngroup(event.payload, sceneGraph);
    },
  );

  return () => {
    unsubGroup();
    unsubUngroup();
  };
}
