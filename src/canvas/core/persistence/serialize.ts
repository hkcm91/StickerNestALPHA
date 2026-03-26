/**
 * Canvas Serialization
 *
 * Converts runtime canvas state to a CanvasDocument for persistence.
 *
 * @module canvas/core/persistence
 * @layer L4A-1
 */

import type {
  CanvasDocument,
  CanvasDocumentMeta,
  CanvasEntity,
  CanvasPositionConfig,
  ViewportConfig,
  LayoutMode,
  CanvasPlatform,
  SpatialMode,
  ThemeName,
} from '@sn/types';
import { DEFAULT_BACKGROUND } from '@sn/types';

import type { SceneGraph } from '../scene';

import { CURRENT_VERSION } from './version';

/**
 * Context required for serialization
 */
export interface SerializeContext {
  /** Scene graph containing all entities */
  sceneGraph: SceneGraph;
  /** Document metadata */
  meta: CanvasDocumentMeta;
  /** Optional viewport configuration (uses defaults if not provided) */
  viewportConfig?: Partial<ViewportConfig>;
  /** Optional layout mode (defaults to 'freeform') */
  layoutMode?: LayoutMode;
  /** Optional platform (defaults to 'web') */
  platform?: CanvasPlatform;
  /** Optional spatial mode (defaults to '2d') */
  spatialMode?: SpatialMode;
  /** Optional platform-specific configs */
  platformConfigs?: Record<string, ViewportConfig>;
  /** Optional border radius */
  borderRadius?: number;
  /** Optional canvas position/alignment */
  canvasPosition?: CanvasPositionConfig;
  /** Optional per-canvas theme override */
  theme?: ThemeName;
}

/**
 * Options for serialization
 */
export interface SerializeOptions {
  /** Include invisible entities (default: true) */
  includeInvisible?: boolean;
  /** Include locked entities (default: true) */
  includeLocked?: boolean;
  /** Filter entities by predicate */
  filter?: (entity: CanvasEntity) => boolean;
}

const defaultOptions: Required<SerializeOptions> = {
  includeInvisible: true,
  includeLocked: true,
  filter: () => true,
};

/**
 * Extract entities from scene graph with optional filtering
 */
function extractEntities(
  sceneGraph: SceneGraph,
  options: Required<SerializeOptions>
): CanvasEntity[] {
  const allEntities = sceneGraph.getAllEntities();

  return allEntities.filter((entity) => {
    if (!options.includeInvisible && !entity.visible) {
      return false;
    }
    if (!options.includeLocked && entity.locked) {
      return false;
    }
    return options.filter(entity);
  });
}

/**
 * Build viewport configuration with defaults
 */
function buildViewportConfig(config?: Partial<ViewportConfig>): ViewportConfig {
  return {
    width: config?.width,
    height: config?.height,
    background: config?.background ?? DEFAULT_BACKGROUND,
    sizeMode: config?.sizeMode ?? 'infinite',
    isPreviewMode: config?.isPreviewMode ?? false,
  };
}

/**
 * Serialize runtime canvas state to a CanvasDocument
 *
 * @param context - Serialization context with scene graph and metadata
 * @param options - Optional serialization options
 * @returns Complete CanvasDocument ready for persistence
 *
 * @example
 * ```typescript
 * const doc = serialize({
 *   sceneGraph,
 *   meta: {
 *     id: canvasId,
 *     name: 'My Canvas',
 *     createdAt: new Date().toISOString(),
 *     updatedAt: new Date().toISOString(),
 *   },
 *   viewportConfig: { background: { type: 'solid', color: '#f0f0f0', opacity: 1 } },
 *   layoutMode: 'freeform',
 * });
 * ```
 */
export function serialize(
  context: SerializeContext,
  options: SerializeOptions = {}
): CanvasDocument {
  const mergedOptions = { ...defaultOptions, ...options };

  const entities = extractEntities(context.sceneGraph, mergedOptions);
  const viewport = buildViewportConfig(context.viewportConfig);

  return {
    version: CURRENT_VERSION,
    meta: context.meta,
    viewport,
    entities,
    layoutMode: context.layoutMode ?? 'freeform',
    platform: context.platform ?? 'web',
    spatialMode: context.spatialMode ?? '2d',
    platformConfigs: context.platformConfigs,
    borderRadius: context.borderRadius ?? 0,
    canvasPosition: context.canvasPosition,
    theme: context.theme,
  };
}

/**
 * Serialize to JSON string
 */
export function serializeToJSON(
  context: SerializeContext,
  options: SerializeOptions = {}
): string {
  const doc = serialize(context, options);
  return JSON.stringify(doc, null, 2);
}

/**
 * Create a minimal document for a new canvas
 */
export function createEmptyDocument(
  id: string,
  name: string,
  options?: {
    viewport?: Partial<ViewportConfig>;
    layoutMode?: LayoutMode;
    platform?: CanvasPlatform;
    spatialMode?: SpatialMode;
    platformConfigs?: Record<string, Partial<ViewportConfig>>;
    description?: string;
  }
): CanvasDocument {
  const now = new Date().toISOString();

  const platformConfigs: Record<string, ViewportConfig> = {};
  if (options?.platformConfigs) {
    for (const [p, config] of Object.entries(options.platformConfigs)) {
      platformConfigs[p] = buildViewportConfig(config);
    }
  }

  return {
    version: CURRENT_VERSION,
    meta: {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      description: options?.description,
    },
    viewport: buildViewportConfig(options?.viewport),
    entities: [],
    layoutMode: options?.layoutMode ?? 'freeform',
    platform: options?.platform ?? 'web',
    spatialMode: options?.spatialMode ?? '2d',
    platformConfigs: Object.keys(platformConfigs).length > 0 ? platformConfigs : undefined,
  };
}

/**
 * Extract just the metadata from a document
 */
export function extractMetadata(doc: CanvasDocument): CanvasDocumentMeta {
  return doc.meta;
}

/**
 * Extract entity IDs from a document
 */
export function extractEntityIds(doc: CanvasDocument): string[] {
  return doc.entities.map((e) => e.id);
}

/**
 * Count entities by type in a document
 */
export function countEntitiesByType(doc: CanvasDocument): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const entity of doc.entities) {
    counts[entity.type] = (counts[entity.type] || 0) + 1;
  }

  return counts;
}
