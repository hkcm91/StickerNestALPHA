/**
 * Shared entity positioning/styling utilities for renderers.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import type { CanvasEntityBase } from '@sn/types';

/**
 * Build a CSS `clip-path: inset(...)` value from a CropRect.
 * Returns `undefined` when there is no crop to apply.
 */
function cropToClipPath(
  crop: CanvasEntityBase['cropRect'],
): string | undefined {
  if (!crop) return undefined;
  const { top, right, bottom, left } = crop;
  // Skip if all edges are zero (no visible crop)
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return undefined;
  return `inset(${(top * 100).toFixed(2)}% ${(right * 100).toFixed(2)}% ${(bottom * 100).toFixed(2)}% ${(left * 100).toFixed(2)}%)`;
}

/**
 * Convert entity transform into CSS styles for positioned rendering.
 */
export function entityTransformStyle(entity: CanvasEntityBase): React.CSSProperties {
  const { position, size, rotation, scale } = entity.transform;

  return {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    transform: `rotate(${rotation}deg) scale(${scale})`,
    transformOrigin: 'center center',
    opacity: entity.opacity,
    borderRadius: entity.borderRadius > 0 ? entity.borderRadius : undefined,
    clipPath: cropToClipPath(entity.cropRect),
    overflow: 'hidden',
    zIndex: entity.zIndex,
    pointerEvents: entity.locked ? 'none' : 'auto',
    visibility: entity.visible ? 'visible' : 'hidden',
    boxSizing: 'border-box',
  };
}
