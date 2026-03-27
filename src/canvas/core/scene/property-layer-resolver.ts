/**
 * Property Layer Resolver
 *
 * Pure function that computes the final resolved properties of a canvas entity
 * by applying its property layers on top of the base properties. Layers are
 * applied bottom-to-top with last-write-wins semantics per property key.
 *
 * @module canvas/core/scene
 * @layer L4A-1
 */

import type { CanvasEntity, CanvasEntityType, PropertyLayer } from '@sn/types';
import {
  CanvasEntityBaseSchema,
  StickerEntitySchema,
  LottieEntitySchema,
  TextEntitySchema,
  WidgetContainerEntitySchema,
  ShapeEntitySchema,
  DrawingEntitySchema,
  GroupEntitySchema,
  DockerEntitySchema,
  AudioEntitySchema,
  SvgEntitySchema,
  PathEntitySchema,
  Object3DEntitySchema,
  ArtboardEntitySchema,
  FolderEntitySchema,
  VideoEntitySchema,
  ConnectorEntitySchema,
} from '@sn/types';

/**
 * Resolve an entity's effective properties by merging its property layers
 * on top of its base properties.
 *
 * Disabled layers are skipped. Layers are applied in ascending `order`
 * (0 = bottom, highest = top). For each property key, the topmost enabled
 * layer's value wins.
 *
 * @param entity - The canvas entity with optional `propertyLayers`
 * @returns A record of the entity's resolved property values
 */
export function resolveEntityProperties(entity: CanvasEntity): Record<string, unknown> {
  // Spread all entity properties as the base
  const { propertyLayers: _propertyLayers, ...base } = entity as CanvasEntity & { propertyLayers?: unknown };
  const resolved: Record<string, unknown> = { ...base };

  const layers = (entity as CanvasEntity).propertyLayers;
  if (!layers || layers.length === 0) {
    return resolved;
  }

  // Sort by order ascending (lowest first, applied first, overwritten by higher)
  const sorted = [...layers]
    .filter((l) => l.enabled)
    .sort((a, b) => a.order - b.order);

  for (const layer of sorted) {
    for (const [key, value] of Object.entries(layer.properties)) {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Check whether an entity has any enabled property layers.
 */
export function hasActivePropertyLayers(entity: CanvasEntity): boolean {
  const layers = (entity as CanvasEntity).propertyLayers;
  return !!layers && layers.some((l: PropertyLayer) => l.enabled);
}

// ── Property Key Validation ────────────────────────────────────────────────

const entityTypeSchemaMap: Record<CanvasEntityType, { shape: Record<string, unknown> }> = {
  sticker: StickerEntitySchema,
  lottie: LottieEntitySchema,
  text: TextEntitySchema,
  widget: WidgetContainerEntitySchema,
  shape: ShapeEntitySchema,
  drawing: DrawingEntitySchema,
  group: GroupEntitySchema,
  docker: DockerEntitySchema,
  audio: AudioEntitySchema,
  svg: SvgEntitySchema,
  path: PathEntitySchema,
  object3d: Object3DEntitySchema,
  artboard: ArtboardEntitySchema,
  folder: FolderEntitySchema,
  video: VideoEntitySchema,
  connector: ConnectorEntitySchema,
};

/** Cached valid key sets per entity type */
const validKeysCache = new Map<CanvasEntityType, Set<string>>();

function getValidKeysForType(entityType: CanvasEntityType): Set<string> {
  let keys = validKeysCache.get(entityType);
  if (keys) return keys;

  const baseKeys = Object.keys(CanvasEntityBaseSchema.shape);
  const typeSchema = entityTypeSchemaMap[entityType];
  const typeKeys = typeSchema ? Object.keys(typeSchema.shape) : [];
  keys = new Set([...baseKeys, ...typeKeys]);
  validKeysCache.set(entityType, keys);
  return keys;
}

/**
 * Return property keys from a layer that are not valid for the given entity type.
 * This is a soft validation — invalid keys are harmless (the resolver ignores them)
 * but they indicate a potential misconfiguration.
 *
 * @param entityType - The entity type to validate against
 * @param propertyKeys - Keys to validate
 * @returns Array of invalid property key names
 */
export function getInvalidPropertyKeys(
  entityType: CanvasEntityType,
  propertyKeys: string[],
):