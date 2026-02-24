/**
 * Canvas Persistence Module
 *
 * Provides serialization and deserialization for canvas documents.
 *
 * @module canvas/core/persistence
 * @layer L4A-1
 */

// Version management
export {
  CURRENT_VERSION,
  MIN_SUPPORTED_VERSION,
  isVersionSupported,
  needsMigration,
  getMigrationPath,
} from './version';

// Serialization
export {
  serialize,
  serializeToJSON,
  createEmptyDocument,
  extractMetadata,
  extractEntityIds,
  countEntitiesByType,
} from './serialize';
export type { SerializeContext, SerializeOptions } from './serialize';

// Deserialization
export {
  deserialize,
  deserializeToSceneGraph,
  looksLikeCanvasDocument,
  peekEntityCount,
  peekVersion,
} from './deserialize';
export type { DeserializeResult, DeserializeOptions } from './deserialize';

// Migrations
export {
  registerMigration,
  getMigration,
  hasMigration,
  migrate,
  getRegisteredMigrations,
  clearMigrations,
} from './migrations';
export type { MigrationFn } from './migrations';
