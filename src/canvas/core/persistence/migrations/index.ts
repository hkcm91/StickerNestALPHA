/**
 * Canvas Document Migration Registry
 *
 * Migrations transform canvas documents from older versions to newer versions.
 * Each migration is a pure function that transforms a document from version N to N+1.
 *
 * @module canvas/core/persistence/migrations
 * @layer L4A-1
 */

import type { CanvasDocument } from '@sn/types';

/**
 * Migration function type
 * Takes a document at version N and returns a document at version N+1
 */
export type MigrationFn = (doc: CanvasDocument) => CanvasDocument;

/**
 * Migration registry
 * Key is the source version (e.g., 1 for migration from v1 to v2)
 */
const migrations: Map<number, MigrationFn> = new Map();

/**
 * Register a migration function
 *
 * @param fromVersion - The version to migrate FROM
 * @param fn - The migration function
 */
export function registerMigration(fromVersion: number, fn: MigrationFn): void {
  if (migrations.has(fromVersion)) {
    throw new Error(`Migration from version ${fromVersion} already registered`);
  }
  migrations.set(fromVersion, fn);
}

/**
 * Get a migration function for a specific version
 */
export function getMigration(fromVersion: number): MigrationFn | undefined {
  return migrations.get(fromVersion);
}

/**
 * Check if a migration exists for a version
 */
export function hasMigration(fromVersion: number): boolean {
  return migrations.has(fromVersion);
}

/**
 * Apply a single migration
 */
export function applyMigration(doc: CanvasDocument, fromVersion: number): CanvasDocument {
  const migration = getMigration(fromVersion);
  if (!migration) {
    throw new Error(`No migration found for version ${fromVersion}`);
  }
  return migration(doc);
}

/**
 * Migrate a document through multiple versions
 *
 * @param doc - The document to migrate
 * @param fromVersion - Starting version
 * @param toVersion - Target version
 * @returns Migrated document at target version
 */
export function migrate(doc: CanvasDocument, fromVersion: number, toVersion: number): CanvasDocument {
  if (fromVersion >= toVersion) {
    return doc;
  }

  let current = doc;
  for (let version = fromVersion; version < toVersion; version++) {
    if (!hasMigration(version)) {
      throw new Error(`Missing migration from version ${version} to ${version + 1}`);
    }
    current = applyMigration(current, version);
    current = { ...current, version: version + 1 };
  }

  return current;
}

/**
 * Get all registered migration versions
 */
export function getRegisteredMigrations(): number[] {
  return Array.from(migrations.keys()).sort((a, b) => a - b);
}

/**
 * Clear all migrations (for testing)
 */
export function clearMigrations(): void {
  migrations.clear();
}

// =============================================================================
// Future migrations will be registered here
// Example:
// registerMigration(1, (doc) => {
//   // Migrate from v1 to v2
//   return { ...doc, newField: defaultValue };
// });
// =============================================================================
