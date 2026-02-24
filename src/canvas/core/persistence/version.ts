/**
 * Canvas Document version management
 *
 * @module canvas/core/persistence
 * @layer L4A-1
 */

/**
 * Current canvas document schema version
 *
 * @remarks
 * Increment this when making breaking changes to the CanvasDocument schema.
 * Add a corresponding migration in the migrations directory.
 */
export const CURRENT_VERSION = 1;

/**
 * Minimum supported version for migration
 * Documents older than this cannot be migrated and will fail to load.
 */
export const MIN_SUPPORTED_VERSION = 1;

/**
 * Check if a document version is supported
 */
export function isVersionSupported(version: number): boolean {
  return version >= MIN_SUPPORTED_VERSION && version <= CURRENT_VERSION;
}

/**
 * Check if a document needs migration
 */
export function needsMigration(version: number): boolean {
  return version < CURRENT_VERSION;
}

/**
 * Get the list of versions to migrate through
 */
export function getMigrationPath(fromVersion: number, toVersion: number = CURRENT_VERSION): number[] {
  if (fromVersion >= toVersion) return [];

  const versions: number[] = [];
  for (let v = fromVersion; v < toVersion; v++) {
    versions.push(v);
  }
  return versions;
}
