/**
 * Spatial — barrel export
 *
 * @module spatial
 * @layer L4B
 */

export { createSpatialScene } from './scene';
export type { SpatialScene } from './scene';

export { createXRSessionManager } from './xr-session';
export type { XRSessionManager } from './xr-session';

export { createControllerInput } from './controller';
export type { ControllerInput } from './controller';

export { createEntityMapper } from './entity-mapping';
export type { EntityMapper } from './entity-mapping';

export { initSpatial, teardownSpatial, isSpatialInitialized } from './init';
export type { SpatialContext as SpatialLayerContext } from './init';
