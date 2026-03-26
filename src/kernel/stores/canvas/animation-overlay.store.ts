/**
 * Animation Overlay Store — transient animation values applied at render time
 *
 * @module kernel/stores/canvas/animation-overlay
 *
 * @remarks
 * This store holds per-entity animation overlays that are applied on top of
 * the entity's base properties during rendering. The overlay prevents
 * animations from corrupting persisted entity state.
 *
 * Renderers read: effectiveValue = baseValue + overlay[entityId]
 *
 * The EntityAnimationOrchestrator writes to this store during animation
 * playback. Overlays are cleared when animations complete with fillMode='none'.
 */

import { create } from 'zustand';

import type { AnimationOverlay } from '@sn/types';

// =============================================================================
// Store State & Actions
// =============================================================================

export interface AnimationOverlayState {
  /** Per-entity animation overlays (entityId -> overlay) */
  overlays: Map<string, AnimationOverlay>;
}

export interface AnimationOverlayActions {
  /** Set or update the overlay for an entity */
  setOverlay(entityId: string, overlay: AnimationOverlay): void;
  /** Remove the overlay for an entity (animation ended) */
  removeOverlay(entityId: string): void;
  /** Get the overlay for an entity (returns undefined if none) */
  getOverlay(entityId: string): AnimationOverlay | undefined;
  /** Clear all overlays (e.g., on canvas unload) */
  clearAll(): void;
}

export type AnimationOverlayStore = AnimationOverlayState & AnimationOverlayActions;

// =============================================================================
// Store Implementation
// =============================================================================

export const useAnimationOverlayStore = create<AnimationOverlayStore>()((set, get) => ({
  overlays: new Map(),

  setOverlay(entityId: string, overlay: AnimationOverlay): void {
    set((state) => {
      const next = new Map(state.overlays);
      next.set(entityId, overlay);
      return { overlays: next };
    });
  },

  removeOverlay(entityId: string): void {
    set((state) => {
      if (!state.overlays.has(entityId)) return state;
      const next = new Map(state.overlays);
      next.delete(entityId);
      return { overlays: next };
    });
  },

  getOverlay(entityId: string): AnimationOverlay | undefined {
    return get().overlays.get(entityId);
  },

  clearAll(): void {
    set({ overlays: new Map() });
  },
}));
