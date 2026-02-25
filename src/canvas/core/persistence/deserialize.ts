/**
 * Canvas Deserialization
 *
 * Converts a CanvasDocument from persistence into runtime state.
 *
 * @module canvas/core/persistence
 * @layer L4A-1
 */

import type { CanvasDocument } from '@sn/types';
import { CanvasDocumentSchema } from '@sn/types';

import type { SceneGraph } from '../scene';

import { migrate } from './migrations';
import { CURRENT_VERSION, isVersionSupported, needsMigration } from './version';

/**
 * Result of deserialization
 */
export interface DeserializeResult {
  /** Whether deserialization succeeded */
  success: boolean;
  /** The deserialized document (if successful) */
  document?: CanvasDocument;
  /** Error message (if failed) */
  error?: string;
  /** Whether the document was migrated */
  wasMigrated: boolean;
  /** Original version (before migration) */
  originalVersion?: number;
  /** Warnings encountered during deserialization */
  warnings: string[];
}

/**
 * Options for deserialization
 */
export interface DeserializeOptions {
  /** Whether to automatically migrate old documents (default: true) */
  autoMigrate?: boolean;
  /** Whether to validate entities against their schemas (default: true) */
  validateEntities?: boolean;
  /** Whether to skip invalid entities instead of failing (default: false) */
  skipInvalidEntities?: boolean;
}

const defaultOptions: Required<DeserializeOptions> = {
  autoMigrate: true,
  validateEntities: true,
  skipInvalidEntities: false,
};

/**
 * Validate the raw input as a canvas document
 */
function validateDocument(input: unknown): { valid: boolean; document?: CanvasDocument; error?: string } {
  const result = CanvasDocumentSchema.safeParse(input);

  if (result.success) {
    return { valid: true, document: result.data };
  }

  const errorMessages = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
  return {
    valid: false,
    error: `Document validation failed: ${errorMessages.join('; ')}`,
  };
}

/**
 * Check document version compatibility
 */
function checkVersion(doc: { version?: number }): { supported: boolean; version: number; error?: string } {
  const version = doc.version ?? 1;

  if (!isVersionSupported(version)) {
    return {
      supported: false,
      version,
      error: `Document version ${version} is not supported. Current version is ${CURRENT_VERSION}.`,
    };
  }

  return { supported: true, version };
}

/**
 * Deserialize input into a CanvasDocument
 *
 * @param input - Raw input (JSON string or object)
 * @param options - Deserialization options
 * @returns Deserialization result with document or error
 *
 * @example
 * ```typescript
 * const result = deserialize(jsonString);
 * if (result.success) {
 *   console.log('Loaded:', result.document.meta.name);
 *   if (result.wasMigrated) {
 *     console.log(`Migrated from v${result.originalVersion}`);
 *   }
 * } else {
 *   console.error('Failed:', result.error);
 * }
 * ```
 */
export function deserialize(
  input: unknown,
  options: DeserializeOptions = {}
): DeserializeResult {
  const mergedOptions = { ...defaultOptions, ...options };
  const warnings: string[] = [];

  // Parse JSON string if needed
  let parsed: unknown;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      return {
        success: false,
        error: `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`,
        wasMigrated: false,
        warnings,
      };
    }
  } else {
    parsed = input;
  }

  // Check version
  const versionCheck = checkVersion(parsed as { version?: number });
  if (!versionCheck.supported) {
    return {
      success: false,
      error: versionCheck.error,
      wasMigrated: false,
      warnings,
    };
  }

  const originalVersion = versionCheck.version;
  let workingDoc = parsed;

  // Migrate if needed
  const requiresMigration = needsMigration(originalVersion);
  if (requiresMigration) {
    if (!mergedOptions.autoMigrate) {
      return {
        success: false,
        error: `Document requires migration from v${originalVersion} to v${CURRENT_VERSION}. Auto-migration is disabled.`,
        wasMigrated: false,
        originalVersion,
        warnings,
      };
    }

    try {
      // First validate the old version loosely
      const validation = validateDocument(workingDoc);
      if (!validation.valid) {
        // Try to migrate anyway if basic structure exists
        if ((workingDoc as { version: number }).version) {
          workingDoc = migrate(workingDoc as CanvasDocument, originalVersion, CURRENT_VERSION);
        } else {
          return {
            success: false,
            error: validation.error,
            wasMigrated: false,
            originalVersion,
            warnings,
          };
        }
      } else {
        workingDoc = migrate(validation.document!, originalVersion, CURRENT_VERSION);
      }
      warnings.push(`Document migrated from v${originalVersion} to v${CURRENT_VERSION}`);
    } catch (e) {
      return {
        success: false,
        error: `Migration failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        wasMigrated: false,
        originalVersion,
        warnings,
      };
    }
  }

  // Validate final document
  const validation = validateDocument(workingDoc);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      wasMigrated: requiresMigration,
      originalVersion,
      warnings,
    };
  }

  return {
    success: true,
    document: validation.document,
    wasMigrated: requiresMigration,
    originalVersion,
    warnings,
  };
}

/**
 * Deserialize and populate a scene graph
 *
 * @param input - Raw input (JSON string or object)
 * @param sceneGraph - Scene graph to populate
 * @param options - Deserialization options
 * @returns Deserialization result
 */
export function deserializeToSceneGraph(
  input: unknown,
  sceneGraph: SceneGraph,
  options: DeserializeOptions = {}
): DeserializeResult {
  const result = deserialize(input, options);

  if (!result.success || !result.document) {
    return result;
  }

  // Clear existing entities and add new ones
  sceneGraph.clear();

  const skippedEntities: string[] = [];

  for (const entity of result.document.entities) {
    try {
      sceneGraph.addEntity(entity);
    } catch (e) {
      if (options.skipInvalidEntities) {
        skippedEntities.push(entity.id);
        result.warnings.push(`Skipped invalid entity ${entity.id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      } else {
        return {
          ...result,
          success: false,
          error: `Failed to add entity ${entity.id}: ${e instanceof Error ? e.message : 'Unknown error'}`,
        };
      }
    }
  }

  if (skippedEntities.length > 0) {
    result.warnings.push(`Skipped ${skippedEntities.length} invalid entities`);
  }

  return result;
}

/**
 * Quick check if input looks like a valid canvas document
 * Does not perform full validation - use deserialize() for that.
 */
export function looksLikeCanvasDocument(input: unknown): boolean {
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch {
      return false;
    }
  }

  if (!input || typeof input !== 'object') {
    return false;
  }

  const doc = input as Record<string, unknown>;

  return (
    typeof doc.version === 'number' &&
    typeof doc.meta === 'object' &&
    doc.meta !== null &&
    Array.isArray(doc.entities)
  );
}

/**
 * Extract entity count without full deserialization
 */
export function peekEntityCount(input: unknown): number | null {
  if (!looksLikeCanvasDocument(input)) {
    return null;
  }

  const doc = typeof input === 'string' ? JSON.parse(input) : input;
  return (doc as { entities: unknown[] }).entities?.length ?? null;
}

/**
 * Extract document version without full deserialization
 */
export function peekVersion(input: unknown): number | null {
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch {
      return null;
    }
  }

  if (!input || typeof input !== 'object') {
    return null;
  }

  const version = (input as { version?: unknown }).version;
  return typeof version === 'number' ? version : null;
}
