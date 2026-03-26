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

import type { CanvasEntity, PropertyLayer } from '@sn/types';

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
