/**
 * Spatial -- barrel export
 *
 * Re-exports the public API for the L4B spatial layer.
 * The primary entry point is `<SpatialRoot>`, which composes all
 * spatial sub-modules into a single React component tree.
 *
 * @module spatial
 * @layer L4B
 */

// ---------------------------------------------------------------------------
// Components (top-level)
// ---------------------------------------------------------------------------

export { SpatialRoot } from './components';
export type { SpatialRootProps } from './components';

export { SpatialScene } from './components';
export type { SpatialSceneProps } from './components';

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export { xrStore, enterXR, exitXR, SessionBridge } from './session';
export type { ImmersiveXRMode } from './session';

// ---------------------------------------------------------------------------
// Input bridges
// ---------------------------------------------------------------------------

export { ControllerBridge, HandBridge, Pointer } from './input';
export type { ControllerEventPayload, HandEventPayload, PointerProps } from './input';

// ---------------------------------------------------------------------------
// Entity rendering
// ---------------------------------------------------------------------------

export { SpatialEntity, WidgetInSpace, EntityManager } from './entities';
export type { SpatialEntityProps, WidgetInSpaceProps, ManagedEntity } from './entities';

// ---------------------------------------------------------------------------
// MR (Mixed Reality)
// ---------------------------------------------------------------------------

export {
  RATKProvider,
  useRATK,
  PlaneDetection,
  MeshDetection,
  Anchors,
  HitTest,
} from './mr';
export type {
  RATKProviderProps,
  PlaneDetectionProps,
  MeshDetectionProps,
  AnchorsProps,
  HitTestProps,
} from './mr';

// ---------------------------------------------------------------------------
// Locomotion
// ---------------------------------------------------------------------------

export { TeleportProvider } from './locomotion';
export type { TeleportProviderProps, TeleportRequestPayload } from './locomotion';

// ---------------------------------------------------------------------------
// Scene graph
// ---------------------------------------------------------------------------

export { createSpatialScene } from './scene';
export type { SpatialScene as SpatialSceneAPI } from './scene';

// ---------------------------------------------------------------------------
// Init helpers
// ---------------------------------------------------------------------------

export {
  isXRSupported,
  initSpatial,
  teardownSpatial,
  isSpatialInitialized,
} from './init';

// ---------------------------------------------------------------------------
// Legacy adapter (deprecated)
// ---------------------------------------------------------------------------

export {
  legacySession,
  placeEntityInSpace,
  transformEntityInSpace,
  removeEntityFromSpace,
  simulateControllerSelect,
  requestTeleport,
} from './legacy';
