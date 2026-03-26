/**
 * Entity Animation Orchestrator — bridges declarative animation configs to the tween engine
 *
 * @module kernel/systems/entity-animation-orchestrator
 *
 * @remarks
 * A TickSystem (priority 45) that:
 * 1. Maintains a registry of entity animation configs
 * 2. On trigger, compiles AnimationClip keyframes into tween Sequences
 * 3. Delegates execution to the existing IAnimationSystem
 * 4. Writes interpolated values to the AnimationOverlay store
 * 5. Manages animation state machine transitions
 *
 * The orchestrator does NOT mutate entity data directly. All visual changes
 * flow through the overlay store, keeping persisted entity state clean.
 */

import { bus } from '../bus';
import { CanvasEvents } from '../schemas/bus-event';
import type {
  AnimationClip,
  AnimationOverlay,
  AnimationState,
  EntityAnimationConfig,
  EasingName,
} from '../schemas/entity-animation';
import { useAnimationOverlayStore } from '../stores/canvas/animation-overlay.store';
import type { TickSystem, TickContext } from '../world/tick-loop';


import type { IAnimationSystem, Sequence } from './animation-system';
import { Easing } from './animation-system';


// =============================================================================
// Types
// =============================================================================

interface ActiveAnimation {
  entityId: string;
  clipId: string;
  bindingId?: string;
  sequence: Sequence;
  targetState?: string;
}

interface EntityRegistration {
  config: EntityAnimationConfig;
  currentState: string | null;
}

// Easing name to function lookup
const EASING_MAP: Record<EasingName, (t: number) => number> = {
  linear: Easing.linear,
  easeInQuad: Easing.easeInQuad,
  easeOutQuad: Easing.easeOutQuad,
  easeInOutQuad: Easing.easeInOutQuad,
  easeInCubic: Easing.easeInCubic,
  easeOutCubic: Easing.easeOutCubic,
  easeInOutCubic: Easing.easeInOutCubic,
  easeInElastic: Easing.easeInElastic,
  easeOutElastic: Easing.easeOutElastic,
  easeInBounce: Easing.easeInBounce,
  easeOutBounce: Easing.easeOutBounce,
};

// Numeric properties that can be interpolated directly
const NUMERIC_PROPERTIES = [
  'opacity', 'scaleX', 'scaleY', 'rotation',
  'positionX', 'positionY', 'borderRadius',
  'width', 'height', 'strokeWidth', 'fontSize',
] as const;

type NumericProperty = typeof NUMERIC_PROPERTIES[number];

// =============================================================================
// Interface
// =============================================================================

export interface IEntityAnimationOrchestrator extends TickSystem {
  /** Register an entity for animation tracking */
  registerEntity(entityId: string, config: EntityAnimationConfig): void;
  /** Unregister entity (removed from canvas) */
  unregisterEntity(entityId: string): void;
  /** Update animation config (user edited animations) */
  updateConfig(entityId: string, config: EntityAnimationConfig): void;
  /** Trigger an animation by binding ID */
  triggerAnimation(entityId: string, bindingId: string): void;
  /** Trigger an animation by clip ID directly (for preview/pipeline) */
  triggerClip(entityId: string, clipId: string): void;
  /** Cancel all running animations for an entity */
  cancelEntityAnimations(entityId: string): void;
  /** Get current animation state name for an entity */
  getEntityState(entityId: string): string | null;
  /** Transition entity to a named state */
  setEntityState(entityId: string, stateName: string): void;
  /** Check if entity has running animations */
  hasActiveAnimations(entityId: string): boolean;
}

// =============================================================================
// Implementation
// =============================================================================

export function createEntityAnimationOrchestrator(
  animationSystem: IAnimationSystem,
): IEntityAnimationOrchestrator {
  const entities = new Map<string, EntityRegistration>();
  const activeAnimations: ActiveAnimation[] = [];

  // -------------------------------------------------------------------------
  // Keyframe-to-Tween compilation
  // -------------------------------------------------------------------------

  function compileClipToSequence(
    entityId: string,
    clip: AnimationClip,
  ): Sequence {
    const keyframes = [...clip.keyframes].sort((a, b) => a.offset - b.offset);

    // Build sequence steps: one step per keyframe pair
    const steps = [];
    for (let i = 0; i < keyframes.length - 1; i++) {
      const fromKf = keyframes[i];
      const toKf = keyframes[i + 1];
      const segmentDuration = (toKf.offset - fromKf.offset) * clip.duration;

      if (segmentDuration <= 0) continue;

      // Find all numeric properties that are defined in either keyframe
      const propertiesInSegment = new Set<NumericProperty>();
      for (const prop of NUMERIC_PROPERTIES) {
        if (fromKf.properties[prop] !== undefined || toKf.properties[prop] !== undefined) {
          propertiesInSegment.add(prop);
        }
      }

      if (propertiesInSegment.size === 0) continue;

      const propArray = Array.from(propertiesInSegment);
      const easingFn = EASING_MAP[toKf.easing] ?? Easing.linear;

      // First property becomes the main tween, rest are parallel
      const mainProp = propArray[0];
      const fromVal = fromKf.properties[mainProp] ?? 0;
      const toVal = toKf.properties[mainProp] ?? fromVal;

      const mainTween = {
        from: fromVal,
        to: toVal,
        duration: segmentDuration,
        easing: easingFn,
        delay: i === 0 ? clip.delay : 0,
        onUpdate: createPropertyUpdater(entityId, mainProp),
      };

      const parallelTweens = propArray.slice(1).map((prop) => {
        const from = fromKf.properties[prop] ?? 0;
        const to = toKf.properties[prop] ?? from;
        return {
          from,
          to,
          duration: segmentDuration,
          easing: easingFn,
          onUpdate: createPropertyUpdater(entityId, prop),
        };
      });

      steps.push({
        tween: mainTween,
        parallel: parallelTweens.length > 0 ? parallelTweens : undefined,
      });
    }

    // If no steps were generated, create a minimal no-op step
    if (steps.length === 0) {
      steps.push({
        tween: {
          from: 0,
          to: 0,
          duration: clip.duration,
          delay: clip.delay,
        },
      });
    }

    return animationSystem.sequence(steps);
  }

  function createPropertyUpdater(entityId: string, property: NumericProperty) {
    return (value: number) => {
      const store = useAnimationOverlayStore.getState();
      const current = store.getOverlay(entityId) ?? {};
      store.setOverlay(entityId, { ...current, [property]: value });
    };
  }

  // -------------------------------------------------------------------------
  // Animation lifecycle
  // -------------------------------------------------------------------------

  function startAnimation(
    entityId: string,
    clip: AnimationClip,
    bindingId?: string,
    targetState?: string,
  ): void {
    bus.emit(CanvasEvents.ENTITY_ANIMATION_TRIGGERED, {
      entityId,
      clipId: clip.id,
      bindingId,
    });

    const sequence = compileClipToSequence(entityId, clip);

    const active: ActiveAnimation = {
      entityId,
      clipId: clip.id,
      bindingId,
      sequence,
      targetState,
    };

    activeAnimations.push(active);

    bus.emit(CanvasEvents.ENTITY_ANIMATION_STARTED, {
      entityId,
      clipId: clip.id,
      bindingId,
    });
  }

  // -------------------------------------------------------------------------
  // State machine
  // -------------------------------------------------------------------------

  function findState(config: EntityAnimationConfig, name: string): AnimationState | undefined {
    return config.states.find((s: AnimationState) => s.name === name);
  }

  function findClip(config: EntityAnimationConfig, id: string): AnimationClip | undefined {
    return config.clips.find((c: AnimationClip) => c.id === id);
  }

  function applyStateOverrides(entityId: string, state: AnimationState): void {
    if (state.propertyOverrides) {
      const overlay: AnimationOverlay = {};
      const entries = Object.entries(state.propertyOverrides);
      for (const [key, value] of entries) {
        if (NUMERIC_PROPERTIES.includes(key as NumericProperty)) {
          (overlay as Record<string, unknown>)[key] = value;
        }
      }
      useAnimationOverlayStore.getState().setOverlay(entityId, overlay);
    }
  }

  // -------------------------------------------------------------------------
  // System implementation
  // -------------------------------------------------------------------------

  const orchestrator: IEntityAnimationOrchestrator = {
    name: 'entity-animation-orchestrator',
    priority: 45,

    tick(_ctx: TickContext): void {
      // Check for completed animations and handle lifecycle
      for (let i = activeAnimations.length - 1; i >= 0; i--) {
        const active = activeAnimations[i];
        if (active.sequence.status === 'completed') {
          activeAnimations.splice(i, 1);

          const reg = entities.get(active.entityId);
          const clip = reg ? findClip(reg.config, active.clipId) : undefined;

          // Handle fill mode
          if (clip && clip.fillMode === 'none') {
            // Revert overlay if no other animations are active for this entity
            const hasOther = activeAnimations.some((a) => a.entityId === active.entityId);
            if (!hasOther) {
              useAnimationOverlayStore.getState().removeOverlay(active.entityId);
            }
          }
          // fillMode 'forwards' keeps the overlay values (already in the store)

          // State transition on completion
          if (active.targetState && reg) {
            const toState = findState(reg.config, active.targetState);
            if (toState) {
              const fromStateName = reg.currentState;
              reg.currentState = active.targetState;
              applyStateOverrides(active.entityId, toState);

              bus.emit(CanvasEvents.ENTITY_STATE_CHANGED, {
                entityId: active.entityId,
                fromState: fromStateName,
                toState: active.targetState,
              });

              // Play enter clip for new state
              if (toState.enterClipId) {
                const enterClip = findClip(reg.config, toState.enterClipId);
                if (enterClip) {
                  startAnimation(active.entityId, enterClip);
                }
              }

              // Start loop clip for new state
              if (toState.loopClipId) {
                const loopClip = findClip(reg.config, toState.loopClipId);
                if (loopClip) {
                  // Override repeat to infinite for loop clips
                  const loopingClip = { ...loopClip, repeat: -1 };
                  startAnimation(active.entityId, loopingClip);
                }
              }
            }
          }

          bus.emit(CanvasEvents.ENTITY_ANIMATION_COMPLETED, {
            entityId: active.entityId,
            clipId: active.clipId,
            bindingId: active.bindingId,
          });
        } else if (active.sequence.status === 'cancelled') {
          activeAnimations.splice(i, 1);

          bus.emit(CanvasEvents.ENTITY_ANIMATION_CANCELLED, {
            entityId: active.entityId,
            clipId: active.clipId,
            bindingId: active.bindingId,
          });
        }
      }
    },

    onRegister() {
      // Initialize any entities with initialState
      for (const [entityId, reg] of entities) {
        if (reg.config.initialState && !reg.currentState) {
          orchestrator.setEntityState(entityId, reg.config.initialState);
        }
      }
    },

    onUnregister() {
      // Cancel all animations
      for (const active of activeAnimations) {
        active.sequence.cancel();
      }
      activeAnimations.length = 0;
      useAnimationOverlayStore.getState().clearAll();
    },

    registerEntity(entityId: string, config: EntityAnimationConfig): void {
      entities.set(entityId, { config, currentState: null });

      // Apply initial state if specified
      if (config.initialState) {
        const state = findState(config, config.initialState);
        if (state) {
          const reg = entities.get(entityId)!;
          reg.currentState = config.initialState;
          applyStateOverrides(entityId, state);
        }
      }
    },

    unregisterEntity(entityId: string): void {
      entities.delete(entityId);

      // Cancel any running animations for this entity
      for (let i = activeAnimations.length - 1; i >= 0; i--) {
        if (activeAnimations[i].entityId === entityId) {
          activeAnimations[i].sequence.cancel();
          activeAnimations.splice(i, 1);
        }
      }

      useAnimationOverlayStore.getState().removeOverlay(entityId);
    },

    updateConfig(entityId: string, config: EntityAnimationConfig): void {
      const existing = entities.get(entityId);
      entities.set(entityId, {
        config,
        currentState: existing?.currentState ?? null,
      });
    },

    triggerAnimation(entityId: string, bindingId: string): void {
      const reg = entities.get(entityId);
      if (!reg || !reg.config.enabled) return;

      const binding = reg.config.bindings.find((b: { id: string }) => b.id === bindingId);
      if (!binding || !binding.enabled) return;

      const clip = findClip(reg.config, binding.clipId);
      if (!clip) return;

      startAnimation(entityId, clip, bindingId, binding.targetState);
    },

    triggerClip(entityId: string, clipId: string): void {
      const reg = entities.get(entityId);
      if (!reg) return;

      const clip = findClip(reg.config, clipId);
      if (!clip) return;

      startAnimation(entityId, clip);
    },

    cancelEntityAnimations(entityId: string): void {
      for (let i = activeAnimations.length - 1; i >= 0; i--) {
        if (activeAnimations[i].entityId === entityId) {
          activeAnimations[i].sequence.cancel();
          activeAnimations.splice(i, 1);
        }
      }
      useAnimationOverlayStore.getState().removeOverlay(entityId);
    },

    getEntityState(entityId: string): string | null {
      return entities.get(entityId)?.currentState ?? null;
    },

    setEntityState(entityId: string, stateName: string): void {
      const reg = entities.get(entityId);
      if (!reg) return;

      const toState = findState(reg.config, stateName);
      if (!toState) return;

      const fromStateName = reg.currentState;

      // Play exit clip from current state
      if (fromStateName) {
        const fromState = findState(reg.config, fromStateName);
        if (fromState?.exitClipId) {
          const exitClip = findClip(reg.config, fromState.exitClipId);
          if (exitClip) {
            startAnimation(entityId, exitClip);
          }
        }
        // Cancel any loop clips from the old state
        for (let i = activeAnimations.length - 1; i >= 0; i--) {
          const active = activeAnimations[i];
          if (active.entityId === entityId && fromState?.loopClipId === active.clipId) {
            active.sequence.cancel();
            activeAnimations.splice(i, 1);
          }
        }
      }

      reg.currentState = stateName;
      applyStateOverrides(entityId, toState);

      bus.emit(CanvasEvents.ENTITY_STATE_CHANGED, {
        entityId,
        fromState: fromStateName,
        toState: stateName,
      });

      // Play enter clip for new state
      if (toState.enterClipId) {
        const enterClip = findClip(reg.config, toState.enterClipId);
        if (enterClip) {
          startAnimation(entityId, enterClip);
        }
      }

      // Start loop clip
      if (toState.loopClipId) {
        const loopClip = findClip(reg.config, toState.loopClipId);
        if (loopClip) {
          const loopingClip = { ...loopClip, repeat: -1 };
          startAnimation(entityId, loopingClip);
        }
      }
    },

    hasActiveAnimations(entityId: string): boolean {
      return activeAnimations.some((a) => a.entityId === entityId);
    },
  };

  return orchestrator;
}
