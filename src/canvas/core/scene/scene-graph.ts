/**
 * Entity Scene Graph — manages entities, z-order, and spatial queries
 *
 * @module canvas/core/scene
 * @layer L4A-1
 */

import type { CanvasEntity, GroupEntity, DockerEntity, Point2D, BoundingBox2D } from '@sn/types';

import { createSpatialIndex } from './spatial-index';
import type { SpatialIndex } from './spatial-index';

export interface SceneGraph {
  addEntity(entity: CanvasEntity): void;
  removeEntity(id: string): void;
  updateEntity(id: string, updates: Partial<CanvasEntity>): void;
  getEntity(id: string): CanvasEntity | undefined;
  getAllEntities(): CanvasEntity[];
  getEntitiesByZOrder(): CanvasEntity[];
  bringToFront(id: string): void;
  sendToBack(id: string): void;
  bringForward(id: string): void;
  sendBackward(id: string): void;
  getChildren(parentId: string): CanvasEntity[];
  getParent(childId: string): CanvasEntity | undefined;
  getDescendants(rootId: string): CanvasEntity[];
  queryRegion(bounds: BoundingBox2D): CanvasEntity[];
  queryPoint(point: Point2D): CanvasEntity[];
  clear(): void;
  readonly entityCount: number;
  readonly spatialIndex: SpatialIndex;
}

function entityBoundsFromTransform(entity: CanvasEntity): BoundingBox2D {
  const { position, size, rotation } = entity.transform;
  const { width, height } = size;

  if (!rotation) {
    return {
      min: { x: position.x, y: position.y },
      max: { x: position.x + width, y: position.y + height },
    };
  }

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  
  const newWidth = width * cos + height * sin;
  const newHeight = width * sin + height * cos;
  
  const cx = position.x + width / 2;
  const cy = position.y + height / 2;
  
  return {
    min: { x: cx - newWidth / 2, y: cy - newHeight / 2 },
    max: { x: cx + newWidth / 2, y: cy + newHeight / 2 },
  };
}

export function createSceneGraph(): SceneGraph {
  const entities = new Map<string, CanvasEntity>();
  let zOrderedIds: string[] = [];
  const index = createSpatialIndex();

  function rebuildZOrder(): void {
    zOrderedIds = Array.from(entities.keys());
    zOrderedIds.sort((a, b) => {
      const ea = entities.get(a)!;
      const eb = entities.get(b)!;
      return ea.zIndex - eb.zIndex;
    });
  }

  const scene: SceneGraph = {
    addEntity(entity: CanvasEntity) {
      entities.set(entity.id, entity);
      index.insert(entity.id, entityBoundsFromTransform(entity));
      rebuildZOrder();
    },

    removeEntity(id: string) {
      const entity = entities.get(id);
      if (!entity) return;

      // Referential integrity: if entity has a parent, remove it from parent's children array
      if (entity.parentId) {
        const parent = entities.get(entity.parentId);
        if (parent && 'children' in parent) {
          const parentWithChildren = parent as GroupEntity | DockerEntity;
          const updated = {
            ...parent,
            children: parentWithChildren.children.filter((cid) => cid !== id),
          } as CanvasEntity;
          entities.set(parent.id, updated);
        }
      }

      // Referential integrity: if entity is a group/docker, clear parentId on children
      if ('children' in entity) {
        const container = entity as GroupEntity | DockerEntity;
        for (const childId of container.children) {
          const child = entities.get(childId);
          if (child && child.parentId === id) {
            const updated = { ...child, parentId: undefined } as CanvasEntity;
            entities.set(childId, updated);
          }
        }
      }

      entities.delete(id);
      index.remove(id);
      zOrderedIds = zOrderedIds.filter((eid) => eid !== id);
    },

    updateEntity(id: string, updates: Partial<CanvasEntity>) {
      const existing = entities.get(id);
      if (!existing) return;
      const updated = { ...existing, ...updates } as CanvasEntity;
      entities.set(id, updated);
      index.update(id, entityBoundsFromTransform(updated));
      if ('zIndex' in updates) rebuildZOrder();
    },

    getEntity(id: string) {
      return entities.get(id);
    },

    getAllEntities() {
      return Array.from(entities.values());
    },

    getEntitiesByZOrder() {
      return zOrderedIds.map((id) => entities.get(id)!).filter(Boolean);
    },

    bringToFront(id: string) {
      const entity = entities.get(id);
      if (!entity) return;
      let maxZ = 0;
      for (const e of entities.values()) {
        if (e.zIndex > maxZ) maxZ = e.zIndex;
      }
      scene.updateEntity(id, { zIndex: maxZ + 1 } as Partial<CanvasEntity>);
    },

    sendToBack(id: string) {
      const entity = entities.get(id);
      if (!entity) return;
      let minZ = Infinity;
      for (const e of entities.values()) {
        if (e.zIndex < minZ) minZ = e.zIndex;
      }
      scene.updateEntity(id, { zIndex: minZ - 1 } as Partial<CanvasEntity>);
    },

    bringForward(id: string) {
      const idx = zOrderedIds.indexOf(id);
      if (idx < 0 || idx >= zOrderedIds.length - 1) return;
      const aboveId = zOrderedIds[idx + 1];
      const above = entities.get(aboveId);
      const current = entities.get(id);
      if (!above || !current) return;
      scene.updateEntity(id, { zIndex: above.zIndex + 1 } as Partial<CanvasEntity>);
    },

    sendBackward(id: string) {
      const idx = zOrderedIds.indexOf(id);
      if (idx <= 0) return;
      const belowId = zOrderedIds[idx - 1];
      const below = entities.get(belowId);
      const current = entities.get(id);
      if (!below || !current) return;
      scene.updateEntity(id, { zIndex: below.zIndex - 1 } as Partial<CanvasEntity>);
    },

    getChildren(parentId: string) {
      const result: CanvasEntity[] = [];
      for (const entity of entities.values()) {
        if (entity.parentId === parentId) {
          result.push(entity);
        }
      }
      return result;
    },

    getParent(childId: string) {
      const child = entities.get(childId);
      if (!child || !child.parentId) return undefined;
      return entities.get(child.parentId);
    },

    getDescendants(rootId: string) {
      const result: CanvasEntity[] = [];
      const queue = [rootId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        for (const entity of entities.values()) {
          if (entity.parentId === currentId) {
            result.push(entity);
            queue.push(entity.id);
          }
        }
      }
      return result;
    },

    queryRegion(bounds: BoundingBox2D) {
      const ids = index.queryRegion(bounds);
      return ids.map((id) => entities.get(id)!).filter(Boolean);
    },

    queryPoint(point: Point2D) {
      const ids = index.queryPoint(point);
      const result = ids.map((id) => entities.get(id)!).filter(Boolean);
      result.sort((a, b) => b.zIndex - a.zIndex);
      return result;
    },

    clear() {
      for (const id of Array.from(entities.keys())) {
        index.remove(id);
      }
      entities.clear();
      zOrderedIds = [];
    },

    get entityCount() {
      return entities.size;
    },

    get spatialIndex() {
      return index;
    },
  };

  return scene;
}
