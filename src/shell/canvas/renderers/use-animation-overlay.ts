/**
 * useAnimationOverlay — React hook for reading animation overlay values
 *
 * @module shell/canvas/renderers/use-animation-overlay
 * @layer L6
 *
 * @remarks
 * Renderers use this hook to read per-entity animation overlays.
 * The overlay contains property deltas that are applied on top of
 * the entity's base properties during rendering.
 *
 * Usage in a renderer:
 * ```tsx
 * const overlay = useAnimationOverlay(entity.id);
 * const effectiveOpacity = overlay?.opacity ?? entity.opacity;
 * const translateX = overlay?.positionX ?? 0;
 * ```
 */

import type { AnimationOverlay } from '@sn/types';

import { useAnimationOverlayStore } from '../../../kernel/stores/canvas/animation-overlay.store';

/**
 * Subscribe to animation overlay for a specific entity.
 * Returns the overlay if one exists, or undefined if no animation is active.
 */
export function useAnimationOverlay(entityId: string): AnimationOverlay | undefined {
  return useAnimationOverlayStore((state) => state.overlays.get(entityId));
}

/**
 * Build a CSS transform + style object from an animation overlay.
 * Merges overlay values with entity base values.
 *
 * @param overlay - The animation overlay (may be undefined)
 * @param baseOpacity - The entity's base opacity
 * @returns CSS properties to spread onto the element style
 */
export function getOverlayStyles(
  overlay: AnimationOverlay | undefined,
): Record<string, string | number | undefined> {
  if (!overlay) return {};

  const styles: Record<string, string | number | undefined> = {};
  const transforms: string[] = [];

  // Position offsets
  if (overlay.positionX !== undefined || overlay.positionY !== undefined) {
    const tx = overlay.positionX ?? 0;
    const ty = overlay.positionY ?? 0;
    transforms.push(`translate(${tx}px, ${ty}px)`);
  }

  // Scale
  if (overlay.scaleX !== undefined || overlay.scaleY !== undefined) {
    const sx = overlay.scaleX ?? 1;
    const sy = overlay.scaleY ?? 1;
    transforms.push(`scale(${sx}, ${sy})`);
  }

  // Rotation
  if (overlay.rotation !== undefined) {
    transforms.push(`rotate(${overlay.rotation}deg)`);
  }

  if (transforms.length > 0) {
    styles.transform = transforms.join(' ');
  }

  // Opacity
  if (overlay.opacity !== undefined) {
    styles.opacity = overlay.opacity;
  }

  // Border radius
  if (overlay.borderRadius !== undefined) {
    styles.borderRadius = `${overlay.borderRadius}px`;
  }

  // Size
  if (overlay.width !== undefined) {
    styles.width = `${overlay.width}px`;
  }
  if (overlay.height !== undefined) {
    styles.height = `${overlay.height}px`;
  }

  // Color properties
  if (overlay.color !== undefined) {
    styles.color = overlay.color;
  }
  if (overlay.fill !== undefined) {
    styles.backgroundColor = overlay.fill;
  }

  return styles;
}

/**
 * Build a CSS filter string from animation overlay filter properties.
 * Used by the compositing system and renderers for filter effects.
 */
export function getFilterStyles(
  overlay: AnimationOverlay | undefined,
): string | undefined {
  if (!overlay) return undefined;

  const filters: string[] = [];

  const filterBlur = (overlay as Record<string, unknown>)['filterBlur'];
  if (typeof filterBlur === 'number' && filterBlur > 0) {
    filters.push(`blur(${filterBlur}px)`);
  }

  const filterBrightness = (overlay as Record<string, unknown>)['filterBrightness'];
  if (typeof filterBrightness === 'number') {
    filters.push(`brightness(${filterBrightness})`);
  }

  const filterContrast = (overlay as Record<string, unknown>)['filterContrast'];
  if (typeof filterContrast === 'number') {
    filters.push(`contrast(${filterContrast})`);
  }

  const filterSaturate = (overlay as Record<string, unknown>)['filterSaturate'];
  if (typeof filterSaturate === 'number') {
    filters.push(`saturate(${filterSaturate})`);
  }

  const filterHueRotate = (overlay as Record<string, unknown>)['filterHueRotate'];
  if (typeof filterHueRotate === 'number') {
    filters.push(`hue-rotate(${filterHueRotate}deg)`);
  }

  return filters.length > 0 ? filters.join(' ') : undefined;
}
