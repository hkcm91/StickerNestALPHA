/**
 * Controller Input — VR controller events and raycasting
 *
 * @module spatial/controller
 * @layer L4B
 */

import { Raycaster, Vector3 as ThreeVector3 } from 'three';
import type { Mesh } from 'three';

import type { SpatialContext, Vector3 } from '@sn/types';
import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

export interface ControllerInput {
  processSelectEvent(hand: 'left' | 'right', entityId: string | null, spatialContext: SpatialContext): void;
  processGrabEvent(hand: 'left' | 'right', entityId: string | null, spatialContext: SpatialContext): void;
  processReleaseEvent(hand: 'left' | 'right', entityId: string | null, spatialContext: SpatialContext): void;
  raycast(origin: Vector3, direction: Vector3, meshes: Mesh[]): { entityId: string; point: Vector3 } | null;
}

export function createControllerInput(): ControllerInput {
  const raycaster = new Raycaster();

  return {
    processSelectEvent(hand, entityId, spatialContext) {
      bus.emit(SpatialEvents.CONTROLLER_SELECT, { hand, entityId }, spatialContext);
    },

    processGrabEvent(hand, entityId, spatialContext) {
      bus.emit(SpatialEvents.CONTROLLER_GRAB, { hand, entityId }, spatialContext);
    },

    processReleaseEvent(hand, entityId, spatialContext) {
      bus.emit(SpatialEvents.CONTROLLER_RELEASE, { hand, entityId }, spatialContext);
    },

    raycast(origin, direction, meshes) {
      raycaster.set(
        new ThreeVector3(origin.x, origin.y, origin.z),
        new ThreeVector3(direction.x, direction.y, direction.z).normalize(),
      );
      const intersections = raycaster.intersectObjects(meshes, false);
      if (intersections.length === 0) return null;

      const closest = intersections[0];
      const entityId = closest.object.userData.entityId as string;
      if (!entityId) return null;

      return {
        entityId,
        point: {
          x: closest.point.x,
          y: closest.point.y,
          z: closest.point.z,
        },
      };
    },
  };
}
