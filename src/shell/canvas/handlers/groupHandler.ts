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

import type { CanvasEntity, GroupEntity, DockerEntity } from '@sn/types';
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

const PADDING = 0;

/**
 * Compute the bounding box encompassing all given entities.
 */
function computeBoundingBox(entities: CanvasEntity[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (entities.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const entity of entities) {
    const { position, size, rotation } = entity.transform;
    const { width, height } = size;

    let eMinX, eMinY, eMaxX, eMaxY;

    if (!rotation) {
      eMinX = position.x;
      eMinY = position.y;
      eMaxX = position.x + width;
      eMaxY = position.y + height;
    } else {
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      
      const newWidth = width * cos + height * sin;
      const newHeight = width * sin + height * cos;
      
      const cx = position.x + width / 2;
      const cy = position.y + height / 2;
      
      eMinX = cx - newWidth / 2;
      eMinY = cy - newHeight / 2;
      eMaxX = cx + newWidth / 2;
      eMaxY = cy + newHeight / 2;
    }

    minX = Math.min(minX, eMinX);
    minY = Math.min(minY, eMinY);
    maxX = Math.max(maxX, eMaxX);
    maxY = Math.max(maxY, eMaxY);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Compute the maximum z-index among the given entities,
 * so the group sits on top.
 */
function maxZIndex(entities: CanvasEntity[]): number {
  let max = -Infinity;
  for (const entity of entities) {
    if (entity.zIndex > max) max = entity.zIndex;
  }
  return max === -Infinity ? 0 : max;
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

  // Gather entities, skip any that don't exist
  const entities: CanvasEntity[] = [];
  for (const id of entityIds) {
    const entity = sceneGraph.getEntity(id);
    if (entity) entities.push(entity);
  }

  if (entities.length < 2) return;

  // Find a common parent if all selected entities share one.
  // Otherwise, if they have different parents, Adobe/Canva usually places the 
  // new group at the root or current active context level. 
  // For simplicity, we use the parent of the first selected entity if it's common.
  const commonParentId = entities.every(e => e.parentId === entities[0].parentId)
    ? entities[0].parentId
    : undefined;

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
    canvasVisibility: 'both',
    locked: false,
    flipH: false,
    flipV: false,
    opacity: 1,
    borderRadius: 0,
    name: `Group (${entities.length})`,
    createdAt: now,
    updatedAt: now,
    createdBy: entities[0].createdBy,
    parentId: commonParentId,
    children: entities.map((e) => e.id),
  };

  // Emit group creation
  bus.emit(CanvasEvents.ENTITY_CREATED, groupEntity);

  // Set parentId on each child entity
  for (const child of entities) {
    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: child.id,
      updates: { parentId: groupId },
    });
  }

  // If there was a common parent, add the new group as its child
  if (commonParentId) {
    const parent = sceneGraph.getEntity(commonParentId);
    if (parent && 'children' in parent) {
      const container = parent as GroupEntity | DockerEntity;
      bus.emit(CanvasEvents.ENTITY_UPDATED, {
        id: commonParentId,
        updates: {
          children: [...container.children.filter(cid => !entityIds.includes(cid)), groupId]
        }
      });
    }
  }

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
    const parentId = groupEntity.parentId;

    // Move children to the group's parent (instead of setting to undefined)
    for (const childId of childIds) {
      bus.emit(CanvasEvents.ENTITY_UPDATED, {
        id: childId,
        updates: { parentId: parentId },
      });
    }

    // If there was a parent, we need to update its children list to include the newly orphaned children
    if (parentId) {
      const parent = sceneGraph.getEntity(parentId);
      if (parent && 'children' in parent) {
        const container = parent as GroupEntity | DockerEntity;
        bus.emit(CanvasEvents.ENTITY_UPDATED, {
          id: parentId,
          updates: {
            children: [...container.children.filter(cid => cid !== groupEntity.id), ...childIds]
          }
        });
      }
    }

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
