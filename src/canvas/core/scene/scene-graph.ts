/**
 * Entity Scene Graph — manages entities, z-order, and spatial queries
 *
 * @module canvas/core/scene
 * @layer L4A-1
 */

import type { CanvasEntity, Point2D, BoundingBox2D } from '@sn/types';

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
  queryRegion(bounds: BoundingBox2D): CanvasEntity[];
  queryPoint(point: Point2D): CanvasEntity[];
  readonly entityCount: number;
  readonly spatialIndex: SpatialIndex;
}

function entityBoundsFromTransform(entity: CanvasEntity): BoundingBox2D {
  const { position, size } = entity.transform;
  return {
    min: { x: position.x, y: position.y },
    max: { x: position.x + size.width, y: position.y + size.height },
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

    get entityCount() {
      return entities.size;
    },

    get spatialIndex() {
      return index;
    },
  };

  return scene;
}
