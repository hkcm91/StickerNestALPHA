/**
 * Compositing System — evaluates blend modes, filters, masks, and transform parenting
 *
 * @module kernel/systems/compositing-system
 *
 * @remarks
 * A TickSystem (priority 50) that runs between TimelineSystem (55) and
 * EntityAnimationOrchestrator (45). Reads active timeline clips and:
 *
 * 1. Writes blend modes from clips to CompositingStore
 * 2. Builds CSS filter strings from overlay filter properties
 * 3. Evaluates mask relationships
 * 4. Computes transform parenting chains (child follows parent)
 *
 * The compositing store is read by renderers via use-compositing hooks
 * to apply CSS mix-blend-mode, filter, and clip-path properties.
 */

import type { AnimationOverlay } from '../schemas/entity-animation';
import { useAnimationOverlayStore } from '../stores/canvas/animation-overlay.store';
import { useCompositingStore } from '../stores/canvas/compositing.store';
import { useTimelineStore } from '../stores/timeline/timeline.store';
import type { TickContext, TickSystem } from '../world/tick-loop';

// =============================================================================
// Interface
// =============================================================================

export interface ICompositingSystem extends TickSystem {
  /** Check if compositing is active */
  isActive(): boolean;
}

// =============================================================================
// Filter String Builder
// =============================================================================

function buildFilterString(overlay: AnimationOverlay): string {
  const filters: string[] = [];
  const o = overlay as Record<string, unknown>;

  if (typeof o['filterBlur'] === 'number' && (o['filterBlur'] as number) > 0) {
    filters.push(`blur(${o['filterBlur']}px)`);
  }
  if (typeof o['filterBrightness'] === 'number') {
    filters.push(`brightness(${o['filterBrightness']})`);
  }
  if (typeof o['filterContrast'] === 'number') {
    filters.push(`contrast(${o['filterContrast']})`);
  }
  if (typeof o['filterSaturate'] === 'number') {
    filters.push(`saturate(${o['filterSaturate']})`);
  }
  if (typeof o['filterHueRotate'] === 'number') {
    filters.push(`hue-rotate(${o['filterHueRotate']}deg)`);
  }

  return filters.join(' ');
}

// =============================================================================
// Transform Parenting
// =============================================================================

function applyTransformParenting(
  childEntityId: string,
  parentEntityId: string,
  overlayStore: ReturnType<typeof useAnimationOverlayStore.getState>,
): void {
  const parentOverlay = overlayStore.getOverlay(parentEntityId);
  const childOverlay = overlayStore.getOverlay(childEntityId) ?? {};

  if (!parentOverlay) return;

  // Compose child position relative to parent
  const parentX = parentOverlay.positionX ?? 0;
  const parentY = parentOverlay.positionY ?? 0;
  const parentRotation = parentOverlay.rotation ?? 0;
  const parentScaleX = parentOverlay.scaleX ?? 1;
  const parentScaleY = parentOverlay.scaleY ?? 1;

  const childLocalX = childOverlay.positionX ?? 0;
  const childLocalY = childOverlay.positionY ?? 0;

  // Rotate child position around parent
  const radians = (parentRotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const worldX = parentX + (childLocalX * cos - childLocalY * sin) * parentScaleX;
  const worldY = parentY + (childLocalX * sin + childLocalY * cos) * parentScaleY;

  // Compose rotation and scale
  const worldRotation = (childOverlay.rotation ?? 0) + parentRotation;
  const worldScaleX = (childOverlay.scaleX ?? 1) * parentScaleX;
  const worldScaleY = (childOverlay.scaleY ?? 1) * parentScaleY;

  overlayStore.setOverlay(childEntityId, {
    ...childOverlay,
    positionX: worldX,
    positionY: worldY,
    rotation: worldRotation,
    scaleX: worldScaleX,
    scaleY: worldScaleY,
  });
}

// =============================================================================
// Implementation
// =============================================================================

export function createCompositingSystem(): ICompositingSystem {
  return {
    name: 'compositing',
    priority: 50,

    tick(_ctx: TickContext): void {
      const timelineStore = useTimelineStore.getState();
      if (!timelineStore.isTimelineMode) return;

      const overlayStore = useAnimationOverlayStore.getState();
      const compositingStore = useCompositingStore.getState();
      const playheadTime = timelineStore.playheadTime;

      // Process active clips
      for (const clip of timelineStore.clips) {
        if (clip.disabled) continue;
        if (playheadTime < clip.timelineIn || playheadTime > clip.timelineOut) continue;

        // Blend mode
        if (clip.blendMode && clip.blendMode !== 'normal') {
          compositingStore.setBlendMode(clip.entityId, clip.blendMode);
        }

        // Clip-level CSS filters (static string from clip config)
        if (clip.filters) {
          compositingStore.setFilter(clip.entityId, clip.filters);
        }

        // Keyframed filter values → build CSS filter string from overlay
        const overlay = overlayStore.getOverlay(clip.entityId);
        if (overlay) {
          const filterStr = buildFilterString(overlay);
          if (filterStr) {
            // Merge with any static clip filters
            const existing = clip.filters ?? '';
            const combined = existing ? `${existing} ${filterStr}` : filterStr;
            compositingStore.setFilter(clip.entityId, combined);
          }
        }

        // Masks
        if (clip.maskEntityId && clip.maskMode) {
          compositingStore.setMask(clip.entityId, {
            maskEntityId: clip.maskEntityId,
            mode: clip.maskMode,
          });
        }

        // Transform parenting
        if (clip.parentEntityId) {
          applyTransformParenting(clip.entityId, clip.parentEntityId, overlayStore);
        }
      }
    },

    isActive(): boolean {
      return useTimelineStore.getState().isTimelineMode;
    },

    onUnregister(): void {
      useCompositingStore.getState().clearAll();
    },
  };
}
