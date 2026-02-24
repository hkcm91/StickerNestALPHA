/**
 * Imperative Adapter -- bridges old imperative API calls to bus events
 *
 * During migration from the imperative spatial layer to the R3F-based
 * declarative layer, this adapter intercepts calls to the old factory APIs
 * and translates them into bus events that the new components consume.
 *
 * This module is temporary and should be removed once all imperative
 * callers have been migrated to use bus events or React components directly.
 *
 * @module spatial/legacy/imperative-adapter
 * @layer L4B
 * @deprecated Remove after migration is complete
 */

import { SpatialEvents } from '@sn/types';
import type { SpatialContext, Transform3D } from '@sn/types';

import { bus } from '../../kernel/bus';
import { enterXR, exitXR } from '../session/xr-store';
import type { ImmersiveXRMode } from '../session/xr-store';

// ---------------------------------------------------------------------------
// Session adapter
// ---------------------------------------------------------------------------

/**
 * Legacy session management API.
 *
 * @deprecated Use `enterXR()` / `exitXR()` from `../session/xr-store` or
 * let `<SpatialRoot>` handle session lifecycle.
 */
export const legacySession = {
  /**
   * Enter a VR/AR session.
   * @deprecated Use `enterXR(mode)` directly.
   */
  enterVR(mode: ImmersiveXRMode = 'immersive-vr'): void {
    enterXR(mode);
  },

  /**
   * Exit the current VR/AR session.
   * @deprecated Use `exitXR()` directly.
   */
  exitVR(): void {
    exitXR();
  },
};

// ---------------------------------------------------------------------------
// Entity placement adapter
// ---------------------------------------------------------------------------

/**
 * Place an entity in 3D space via bus event.
 *
 * Translates the old imperative `entityMapper.placeEntity()` call into
 * a `spatial.entity.placed` bus event.
 *
 * @deprecated Use `bus.emit(SpatialEvents.ENTITY_PLACED, payload)` directly.
 */
export function placeEntityInSpace(
  entityId: string,
  spatialTransform: Transform3D,
  spatial?: SpatialContext,
): void {
  bus.emit(
    SpatialEvents.ENTITY_PLACED,
    {
      entity: {
        id: entityId,
        type: 'generic',
        visible: true,
        locked: false,
        opacity: 1,
        transform: {
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
          rotation: 0,
        },
        spatialTransform,
      },
    },
    spatial,
  );
}

/**
 * Transform an entity in 3D space via bus event.
 *
 * @deprecated Use `bus.emit(SpatialEvents.ENTITY_TRANSFORMED, payload)` directly.
 */
export function transformEntityInSpace(
  entityId: string,
  spatialTransform: Transform3D,
  spatial?: SpatialContext,
): void {
  bus.emit(
    SpatialEvents.ENTITY_TRANSFORMED,
    { entityId, spatialTransform },
    spatial,
  );
}

/**
 * Remove an entity from 3D space via bus event.
 *
 * @deprecated Use `bus.emit(SpatialEvents.ENTITY_REMOVED, payload)` directly.
 */
export function removeEntityFromSpace(
  entityId: string,
  spatial?: SpatialContext,
): void {
  bus.emit(SpatialEvents.ENTITY_REMOVED, { entityId }, spatial);
}

// ---------------------------------------------------------------------------
// Controller adapter
// ---------------------------------------------------------------------------

/**
 * Simulate a controller select event via bus.
 *
 * @deprecated Controller events are now emitted by `<ControllerBridge>`.
 */
export function simulateControllerSelect(
  hand: 'left' | 'right',
  entityId: string | null = null,
  spatial?: SpatialContext,
): void {
  bus.emit(SpatialEvents.CONTROLLER_SELECT, { hand, entityId }, spatial);
}

// ---------------------------------------------------------------------------
// Teleport adapter
// ---------------------------------------------------------------------------

/**
 * Request a teleport via bus event.
 *
 * @deprecated Use `bus.emit(SpatialEvents.TELEPORT_REQUESTED, payload)` directly.
 */
export function requestTeleport(
  position: { x: number; y: number; z: number },
  rotationY?: number,
): void {
  bus.emit(SpatialEvents.TELEPORT_REQUESTED, { position, rotationY });
}
