/**
 * Entity Mapper — maps 2D canvas entities into 3D space
 *
 * @module spatial/entity-mapping
 * @layer L4B
 */

import type { SpatialContext } from '@sn/types';
import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import type { SpatialScene } from '../scene';

export interface EntityMapper {
  placeIn3D(entityId: string, spatialContext: SpatialContext): void;
  removeFrom3D(entityId: string): void;
  getPlacedEntities(): string[];
}

export function createEntityMapper(scene: SpatialScene): EntityMapper {
  const placed = new Set<string>();

  return {
    placeIn3D(entityId: string, spatialContext: SpatialContext) {
      scene.addEntity(entityId, spatialContext.position);
      placed.add(entityId);
      bus.emit(SpatialEvents.ENTITY_PLACED, { entityId }, spatialContext);
    },

    removeFrom3D(entityId: string) {
      scene.removeEntity(entityId);
      placed.delete(entityId);
    },

    getPlacedEntities() {
      return Array.from(placed);
    },
  };
}
