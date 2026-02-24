/**
 * Legacy module -- barrel export
 *
 * Bridges old imperative spatial API to the new event-driven architecture.
 *
 * @module spatial/legacy
 * @layer L4B
 * @deprecated Remove after all imperative callers are migrated
 */

export {
  legacySession,
  placeEntityInSpace,
  transformEntityInSpace,
  removeEntityFromSpace,
  simulateControllerSelect,
  requestTeleport,
} from './imperative-adapter';
