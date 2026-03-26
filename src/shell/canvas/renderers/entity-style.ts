/**
 * Shared entity positioning/styling utilities for renderers.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import type { CanvasEntityBase, Transform2D } from "@sn/types";

import { useCompositingStore } from '../../../kernel/stores/canvas/compositing.store';

/** 
 * Multiplier for rendering assets at higher resolution than their canvas size.
 * Ensures sharpness when zooming or scaling up entities.
 */
export const RENDER_SIZE_MULTIPLIER = 2;

/**
 * Build a CSS `clip-path: inset(...)` value from a CropRect.
 * Returns `undefined` when there is no crop to apply.
 */
function cropToClipPath(
  crop: CanvasEntityBase["cropRect"],
): string | undefined {
  if (!crop) return undefined;
  const { top, right, bottom, left } = crop;
  // Skip if all edges are zero (no visible crop)
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return undefined;
  return `inset(${(top * 100).toFixed(2)}% ${(right * 100).toFixed(2)}% ${(bottom * 100).toFixed(2)}% ${(left * 100).toFixed(2)}%)`;
}

/**
 * Convert entity transform into CSS styles for positioned rendering.
 *
 * @remarks
 * Entities are positioned with their center at the transform position.
 * This makes alignment tools more intuitive — aligning entity centers
 * means simply matching their position coordinates.
 */
export function entityTransformStyle(
  entity: CanvasEntityBase,
  transformOverride?: Transform2D,
): React.CSSProperties {
  const { position, size, rotation, scale } = transformOverride ?? entity.transform;

  // Center-based positioning: offset by half the size so the entity's
  // center aligns with the position coordinate
  const left = position.x - size.width / 2;
  const top = position.y - size.height / 2;

  const flipX = (entity as any).flipH ? -1 : 1;
  const flipY = (entity as any).flipV ? -1 : 1;

  return {
    position: "absolute",
    left,
    top,
    width: size.width,
    height: size.height,
    transform: `rotate(${rotation}deg) scale(${scale * flipX}, ${scale * flipY})`,
    transformOrigin: "center center",
    opacity: entity.opacity,
    borderRadius: entity.borderRadius > 0 ? entity.borderRadius : undefined,
    clipPath: cropToClipPath(entity.cropRect),
    overflow: "hidden",
    zIndex: entity.zIndex,
    pointerEvents: entity.locked ? "none" : "auto",
    visibility: entity.visible ? "visible" : "hidden",
    boxSizing: "border-box",
    // Center content within the entity container
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

/**
 * Get the top-left corner position from a center-based entity transform.
 * Useful for bounding box calculations.
 */
export function getEntityTopLeft(entity: CanvasEntityBase, transformOverride?: Transform2D): {
  x: number;
  y: number;
} {
  const { position, size } = transformOverride ?? entity.transform;
  return {
    x: position.x - size.width / 2,
    y: position.y - size.height / 2,
  };
}

/**
 * Get the bounding box for an entity (min/max corners).
 */
export function getEntityBoundingBox(entity: CanvasEntityBase, transformOverride?: Transform2D): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const { position, size } = transformOverride ?? entity.transform;
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  return {
    minX: position.x - halfW,
    minY: position.y - halfH,
    maxX: position.x + halfW,
    maxY: position.y + halfH,
  };
}

/**
 * Get CSS compositing styles for an entity from the compositing store.
 * Returns blend mode and filter properties to spread into element style.
 */
export function getCompositingStyles(entityId: string): Record<string, string | undefined> {
  const store = useCompositingStore.getState();
  const styles: Record<string, string | undefined> = {};

  const blendMode = store.blendModes.get(entityId);
  if (blendMode) {
    styles.mixBlendMode = blendMode;
  }

  const filter = store.filters.get(entityId);
  if (filter) {
    styles.filter = filter;
  }

  return styles;
}
