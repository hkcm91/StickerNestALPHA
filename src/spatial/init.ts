/**
 * Spatial — initialization
 *
 * @module spatial
 * @layer L4B
 */

import { createControllerInput } from './controller';
import type { ControllerInput } from './controller';
import { createEntityMapper } from './entity-mapping';
import type { EntityMapper } from './entity-mapping';
import { createSpatialScene } from './scene';
import type { SpatialScene } from './scene';
import { createXRSessionManager } from './xr-session';
import type { XRSessionManager } from './xr-session';

export interface SpatialContext {
  scene: SpatialScene;
  xrSession: XRSessionManager;
  controller: ControllerInput;
  entityMapper: EntityMapper;
}

let context: SpatialContext | null = null;

export function initSpatial(): SpatialContext {
  if (context) return context;

  const scene = createSpatialScene();
  const xrSession = createXRSessionManager();
  const controller = createControllerInput();
  const entityMapper = createEntityMapper(scene);

  context = { scene, xrSession, controller, entityMapper };
  return context;
}

export function teardownSpatial(): void {
  if (context) {
    context.scene.dispose();
  }
  context = null;
}

export function isSpatialInitialized(): boolean {
  return context !== null;
}
