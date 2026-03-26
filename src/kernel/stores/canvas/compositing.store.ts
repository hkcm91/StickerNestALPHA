/**
 * Compositing Store — per-entity blend mode, filter, and mask state
 *
 * @module kernel/stores/canvas/compositing
 *
 * @remarks
 * Populated by the CompositingSystem each tick from active timeline clip data.
 * Renderers read from this store to apply CSS blend modes, filters, and masks.
 * This is separate from the AnimationOverlay store because compositing values
 * are strings/enums (not numeric interpolation targets).
 */

import { create } from 'zustand';

import type { BlendMode } from '@sn/types';

// =============================================================================
// Types
// =============================================================================

export interface MaskConfig {
  maskEntityId: string;
  mode: 'alpha' | 'luminance' | 'inverted';
}

export interface CompositingState {
  /** Per-entity blend mode (from active timeline clip) */
  blendModes: Map<string, BlendMode>;
  /** Per-entity CSS filter string (composed from keyframed filter values) */
  filters: Map<string, string>;
  /** Per-entity mask configuration */
  masks: Map<string, MaskConfig>;
}

export interface CompositingActions {
  setBlendMode(entityId: string, mode: BlendMode): void;
  setFilter(entityId: string, filter: string): void;
  setMask(entityId: string, config: MaskConfig): void;
  removeEntity(entityId: string): void;
  clearAll(): void;
}

export type CompositingStore = CompositingState & CompositingActions;

// =============================================================================
// Store Implementation
// =============================================================================

export const useCompositingStore = create<CompositingStore>()((set) => ({
  blendModes: new Map(),
  filters: new Map(),
  masks: new Map(),

  setBlendMode(entityId: string, mode: BlendMode): void {
    set((state) => {
      const next = new Map(state.blendModes);
      if (mode === 'normal') {
        next.delete(entityId);
      } else {
        next.set(entityId, mode);
      }
      return { blendModes: next };
    });
  },

  setFilter(entityId: string, filter: string): void {
    set((state) => {
      const next = new Map(state.filters);
      if (!filter) {
        next.delete(entityId);
      } else {
        next.set(entityId, filter);
      }
      return { filters: next };
    });
  },

  setMask(entityId: string, config: MaskConfig): void {
    set((state) => {
      const next = new Map(state.masks);
      next.set(entityId, config);
      return { masks: next };
    });
  },

  removeEntity(entityId: string): void {
    set((state) => {
      const bm = new Map(state.blendModes);
      const f = new Map(state.filters);
      const m = new Map(state.masks);
      bm.delete(entityId);
      f.delete(entityId);
      m.delete(entityId);
      return { blendModes: bm, filters: f, masks: m };
    });
  },

  clearAll(): void {
    set({ blendModes: new Map(), filters: new Map(), masks: new Map() });
  },
}));
