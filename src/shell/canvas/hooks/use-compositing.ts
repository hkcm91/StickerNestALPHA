/**
 * Compositing hooks — read blend mode, filter, and mask state for renderers
 *
 * @module shell/canvas/hooks/use-compositing
 * @layer L6
 */

import type { BlendMode } from '@sn/types';

import { useCompositingStore } from '../../../kernel/stores/canvas/compositing.store';
import type { MaskConfig } from '../../../kernel/stores/canvas/compositing.store';

/** Get the blend mode for an entity (undefined means 'normal') */
export function useBlendMode(entityId: string): BlendMode | undefined {
  return useCompositingStore((state) => state.blendModes.get(entityId));
}

/** Get the CSS filter string for an entity */
export function useEntityFilter(entityId: string): string | undefined {
  return useCompositingStore((state) => state.filters.get(entityId));
}

/** Get the mask configuration for an entity */
export function useEntityMask(entityId: string): MaskConfig | undefined {
  return useCompositingStore((state) => state.masks.get(entityId));
}

/**
 * Build CSS properties for compositing effects on an entity.
 * Returns an object that can be spread into a style prop.
 */
export function getCompositingStylesForEntity(entityId: string): Record<string, string | undefined> {
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
