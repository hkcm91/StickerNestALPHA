/**
 * Animation Panel Controller — CRUD for animation clips, bindings, and states
 *
 * @module canvas/panels/animation
 * @layer L4A-4
 *
 * @remarks
 * Reads entity animation config from the scene graph and writes updates
 * via bus events. Provides preview playback that bypasses mode gating.
 * Following the same pattern as PropertiesController.
 */

import type {
  AnimationClip,
  AnimationBinding,
  AnimationState,
  EntityAnimationConfig,
} from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { getPresetById } from '../../../kernel/schemas/animation-presets';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

// =============================================================================
// Interface
// =============================================================================

export interface AnimationPanelController {
  // Clip CRUD
  getClips(config: EntityAnimationConfig | undefined): AnimationClip[];
  addClip(entityId: string, config: EntityAnimationConfig, clip: AnimationClip): void;
  updateClip(entityId: string, config: EntityAnimationConfig, clipId: string, updates: Partial<AnimationClip>): void;
  removeClip(entityId: string, config: EntityAnimationConfig, clipId: string): void;

  // Preset application
  applyPreset(entityId: string, config: EntityAnimationConfig | undefined, presetId: string, newClipId: string): AnimationClip | null;

  // Binding CRUD
  getBindings(config: EntityAnimationConfig | undefined): AnimationBinding[];
  addBinding(entityId: string, config: EntityAnimationConfig, binding: AnimationBinding): void;
  updateBinding(entityId: string, config: EntityAnimationConfig, bindingId: string, updates: Partial<AnimationBinding>): void;
  removeBinding(entityId: string, config: EntityAnimationConfig, bindingId: string): void;

  // State CRUD
  getStates(config: EntityAnimationConfig | undefined): AnimationState[];
  addState(entityId: string, config: EntityAnimationConfig, state: AnimationState): void;
  removeState(entityId: string, config: EntityAnimationConfig, stateId: string): void;

  // Preview (bypasses mode gating)
  previewClip(entityId: string, clipId: string): void;
  stopPreview(entityId: string): void;

  // Mode check
  isActiveInMode(): boolean;
}

// =============================================================================
// Implementation
// =============================================================================

export function createAnimationPanelController(): AnimationPanelController {
  function emitConfigUpdate(entityId: string, config: EntityAnimationConfig): void {
    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      entityId,
      entity: { animations: config },
    });
  }

  return {
    getClips(config) {
      return config?.clips ?? [];
    },

    addClip(entityId, config, clip) {
      const updated: EntityAnimationConfig = {
        ...config,
        clips: [...config.clips, clip],
      };
      emitConfigUpdate(entityId, updated);
    },

    updateClip(entityId, config, clipId, updates) {
      const updated: EntityAnimationConfig = {
        ...config,
        clips: config.clips.map((c: AnimationClip) =>
          c.id === clipId ? { ...c, ...updates, id: clipId } : c,
        ),
      };
      emitConfigUpdate(entityId, updated);
    },

    removeClip(entityId, config, clipId) {
      const updated: EntityAnimationConfig = {
        ...config,
        clips: config.clips.filter((c: AnimationClip) => c.id !== clipId),
        // Also remove bindings referencing this clip
        bindings: config.bindings.filter((b: AnimationBinding) => b.clipId !== clipId),
      };
      emitConfigUpdate(entityId, updated);
    },

    applyPreset(entityId, config, presetId, newClipId) {
      const preset = getPresetById(presetId);
      if (!preset) return null;

      const clip: AnimationClip = {
        ...preset.clip,
        id: newClipId,
      };

      const base: EntityAnimationConfig = config ?? {
        clips: [],
        bindings: [],
        states: [],
        enabled: true,
      };

      const updated: EntityAnimationConfig = {
        ...base,
        clips: [...base.clips, clip],
      };
      emitConfigUpdate(entityId, updated);

      return clip;
    },

    getBindings(config) {
      return config?.bindings ?? [];
    },

    addBinding(entityId, config, binding) {
      const updated: EntityAnimationConfig = {
        ...config,
        bindings: [...config.bindings, binding],
      };
      emitConfigUpdate(entityId, updated);
    },

    updateBinding(entityId, config, bindingId, updates) {
      const updated: EntityAnimationConfig = {
        ...config,
        bindings: config.bindings.map((b: AnimationBinding) =>
          b.id === bindingId ? { ...b, ...updates, id: bindingId } : b,
        ),
      };
      emitConfigUpdate(entityId, updated);
    },

    removeBinding(entityId, config, bindingId) {
      const updated: EntityAnimationConfig = {
        ...config,
        bindings: config.bindings.filter((b: AnimationBinding) => b.id !== bindingId),
      };
      emitConfigUpdate(entityId, updated);
    },

    getStates(config) {
      return config?.states ?? [];
    },

    addState(entityId, config, state) {
      const updated: EntityAnimationConfig = {
        ...config,
        states: [...config.states, state],
      };
      emitConfigUpdate(entityId, updated);
    },

    removeState(entityId, config, stateId) {
      const updated: EntityAnimationConfig = {
        ...config,
        states: config.states.filter((s: AnimationState) => s.id !== stateId),
      };
      emitConfigUpdate(entityId, updated);
    },

    previewClip(entityId, clipId) {
      // Emit a direct trigger event that the orchestrator picks up
      // This bypasses mode gating (works in edit mode)
      bus.emit(CanvasEvents.ENTITY_ANIMATION_TRIGGERED, {
        entityId,
        clipId,
        source: 'preview',
      });
    },

    stopPreview(entityId) {
      bus.emit(CanvasEvents.ENTITY_ANIMATION_CANCELLED, {
        entityId,
        source: 'preview',
      });
    },

    isActiveInMode() {
      const mode = useUIStore.getState().canvasInteractionMode;
      return mode === 'edit';
    },
  };
}
