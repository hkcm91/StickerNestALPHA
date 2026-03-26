/**
 * Entity Animation Orchestrator Tests
 *
 * @module kernel/systems/entity-animation-orchestrator.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { EntityAnimationConfig, AnimationClip, AnimationBinding, AnimationState } from '../schemas/entity-animation';
import { useAnimationOverlayStore } from '../stores/canvas/animation-overlay.store';
import type { TickContext } from '../world/tick-loop';

import { createAnimationSystem } from './animation-system';
import { createEntityAnimationOrchestrator } from './entity-animation-orchestrator';


// Helper to create a tick context
function createTickContext(deltaTime = 1 / 60, elapsedTime = deltaTime): TickContext {
  return {
    deltaTime,
    elapsedTime,
    tickNumber: 1,
    tickRate: 60,
    fixedDeltaTime: 1 / 60,
  };
}

// Helper to create a simple fade clip
function createFadeClip(id: string): AnimationClip {
  return {
    id,
    name: 'Fade In',
    keyframes: [
      { offset: 0, properties: { opacity: 0 }, easing: 'linear' },
      { offset: 1, properties: { opacity: 1 }, easing: 'linear' },
    ],
    duration: 1,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'none',
  };
}

function createBinding(id: string, clipId: string, triggerType = 'click' as const): AnimationBinding {
  return {
    id,
    trigger: { type: triggerType },
    clipId,
    enabled: true,
    priority: 0,
  };
}

function createConfig(
  clips: AnimationClip[] = [],
  bindings: AnimationBinding[] = [],
  states: AnimationState[] = [],
  initialState?: string,
): EntityAnimationConfig {
  return {
    clips,
    bindings,
    states,
    initialState,
    enabled: true,
  };
}

// Advance animation by ticking both systems
function advanceTime(
  orchestrator: ReturnType<typeof createEntityAnimationOrchestrator>,
  animationSystem: ReturnType<typeof createAnimationSystem>,
  seconds: number,
  stepsPerSecond = 60,
) {
  const dt = 1 / stepsPerSecond;
  const steps = Math.ceil(seconds * stepsPerSecond);
  for (let i = 0; i < steps; i++) {
    const elapsed = (i + 1) * dt;
    const ctx = createTickContext(dt, elapsed);
    animationSystem.tick(ctx);
    orchestrator.tick(ctx);
  }
}

describe('EntityAnimationOrchestrator', () => {
  let animationSystem: ReturnType<typeof createAnimationSystem>;
  let orchestrator: ReturnType<typeof createEntityAnimationOrchestrator>;

  beforeEach(() => {
    animationSystem = createAnimationSystem();
    orchestrator = createEntityAnimationOrchestrator(animationSystem);
    useAnimationOverlayStore.getState().clearAll();
  });

  afterEach(() => {
    useAnimationOverlayStore.getState().clearAll();
  });

  describe('registerEntity', () => {
    it('registers an entity with animation config', () => {
      const clip = createFadeClip('clip-1');
      const config = createConfig([clip]);
      orchestrator.registerEntity('entity-1', config);
      expect(orchestrator.getEntityState('entity-1')).toBeNull();
    });

    it('applies initial state on registration', () => {
      const state: AnimationState = {
        id: 'state-1',
        name: 'on',
        propertyOverrides: { opacity: 1 },
      };
      const config = createConfig([], [], [state], 'on');
      orchestrator.registerEntity('entity-1', config);
      expect(orchestrator.getEntityState('entity-1')).toBe('on');

      const overlay = useAnimationOverlayStore.getState().getOverlay('entity-1');
      expect(overlay).toBeDefined();
      expect(overlay?.opacity).toBe(1);
    });
  });

  describe('unregisterEntity', () => {
    it('removes entity and clears overlay', () => {
      const clip = createFadeClip('clip-1');
      const binding = createBinding('bind-1', 'clip-1');
      const config = createConfig([clip], [binding]);

      orchestrator.registerEntity('entity-1', config);
      orchestrator.triggerAnimation('entity-1', 'bind-1');
      orchestrator.unregisterEntity('entity-1');

      expect(orchestrator.getEntityState('entity-1')).toBeNull();
      expect(useAnimationOverlayStore.getState().getOverlay('entity-1')).toBeUndefined();
    });
  });

  describe('triggerAnimation', () => {
    it('starts animation and writes to overlay store', () => {
      const clip = createFadeClip('clip-1');
      const binding = createBinding('bind-1', 'clip-1');
      const config = createConfig([clip], [binding]);

      orchestrator.registerEntity('entity-1', config);
      orchestrator.triggerAnimation('entity-1', 'bind-1');

      expect(orchestrator.hasActiveAnimations('entity-1')).toBe(true);

      // Advance halfway through the animation
      advanceTime(orchestrator, animationSystem, 0.5);

      const overlay = useAnimationOverlayStore.getState().getOverlay('entity-1');
      expect(overlay).toBeDefined();
      expect(overlay?.opacity).toBeDefined();
      // Opacity should be somewhere between 0 and 1
      expect(overlay!.opacity!).toBeGreaterThan(0);
      expect(overlay!.opacity!).toBeLessThan(1);
    });

    it('ignores disabled bindings', () => {
      const clip = createFadeClip('clip-1');
      const binding: AnimationBinding = {
        ...createBinding('bind-1', 'clip-1'),
        enabled: false,
      };
      const config = createConfig([clip], [binding]);

      orchestrator.registerEntity('entity-1', config);
      orchestrator.triggerAnimation('entity-1', 'bind-1');

      expect(orchestrator.hasActiveAnimations('entity-1')).toBe(false);
    });

    it('ignores animations when config is disabled', () => {
      const clip = createFadeClip('clip-1');
      const binding = createBinding('bind-1', 'clip-1');
      const config: EntityAnimationConfig = {
        ...createConfig([clip], [binding]),
        enabled: false,
      };

      orchestrator.registerEntity('entity-1', config);
      orchestrator.triggerAnimation('entity-1', 'bind-1');

      expect(orchestrator.hasActiveAnimations('entity-1')).toBe(false);
    });
  });

  describe('triggerClip', () => {
    it('starts animation by clip ID directly', () => {
      const clip = createFadeClip('clip-1');
      const config = createConfig([clip]);

      orchestrator.registerEntity('entity-1', config);
      orchestrator.triggerClip('entity-1', 'clip-1');

      expect(orchestrator.hasActiveAnimations('entity-1')).toBe(true);
    });
  });

  describe('animation completion', () => {
    it('removes overlay on completion with fillMode none', () => {
      const clip = createFadeClip('clip-1');
      const binding = createBinding('bind-1', 'clip-1');
      const config = createConfig([clip], [binding]);

      orchestrator.registerEntity('entity-1', config);
      orchestrator.triggerAnimation('entity-1', 'bind-1');

      // Advance past the animation duration
      advanceTime(orchestrator, animationSystem, 1.5);

      expect(orchestrator.hasActiveAnimations('entity-1')).toBe(false);
      expect(useAnimationOverlayStore.getState().getOverlay('entity-1')).toBeUndefined();
    });

    it('retains overlay on completion with fillMode forwards', () => {
      const clip: AnimationClip = {
        ...createFadeClip('clip-1'),
        fillMode: 'forwards',
      };
      const binding = createBinding('bind-1', 'clip-1');
      const config = createConfig([clip], [binding]);

      orchestrator.registerEntity('entity-1', config);
      orchestrator.triggerAnimation('entity-1', 'bind-1');

      // Advance past the animation duration
      advanceTime(orchestrator, animationSystem, 1.5);

      expect(orchestrator.hasActiveAnimations('entity-1')).toBe(false);
      // Overlay should still exist with fillMode forwards
      const overlay = useAnimationOverlayStore.getState().getOverlay('entity-1');
      expect(overlay).toBeDefined();
    });
  });

  describe('cancelEntityAnimations', () => {
    it('cancels all running animations and clears overlay', () => {
      const clip = createFadeClip('clip-1');
      const binding = createBinding('bind-1', 'clip-1');
      const config = createConfig([clip], [binding]);

      orchestrator.registerEntity('entity-1', config);
      orchestrator.triggerAnimation('entity-1', 'bind-1');
      expect(orchestrator.hasActiveAnimations('entity-1')).toBe(true);

      orchestrator.cancelEntityAnimations('entity-1');

      // Tick once to process the cancellation
      advanceTime(orchestrator, animationSystem, 1 / 60);

      expect(orchestrator.hasActiveAnimations('entity-1')).toBe(false);
      expect(useAnimationOverlayStore.getState().getOverlay('entity-1')).toBeUndefined();
    });
  });

  describe('state machine', () => {
    it('transitions between states', () => {
      const onState: AnimationState = {
        id: 'state-on',
        name: 'on',
        propertyOverrides: { opacity: 1 },
      };
      const offState: AnimationState = {
        id: 'state-off',
        name: 'off',
        propertyOverrides: { opacity: 0.3 },
      };
      const config = createConfig([], [], [onState, offState], 'off');

      orchestrator.registerEntity('entity-1', config);
      expect(orchestrator.getEntityState('entity-1')).toBe('off');

      let overlay = useAnimationOverlayStore.getState().getOverlay('entity-1');
      expect(overlay?.opacity).toBe(0.3);

      orchestrator.setEntityState('entity-1', 'on');
      expect(orchestrator.getEntityState('entity-1')).toBe('on');

      overlay = useAnimationOverlayStore.getState().getOverlay('entity-1');
      expect(overlay?.opacity).toBe(1);
    });

    it('plays enter clip when transitioning to a state', () => {
      const enterClip: AnimationClip = {
        ...createFadeClip('enter-clip'),
        name: 'Enter On',
      };
      const onState: AnimationState = {
        id: 'state-on',
        name: 'on',
        enterClipId: 'enter-clip',
      };
      const config = createConfig([enterClip], [], [onState]);

      orchestrator.registerEntity('entity-1', config);
      orchestrator.setEntityState('entity-1', 'on');

      expect(orchestrator.hasActiveAnimations('entity-1')).toBe(true);
    });

    it('transitions via binding targetState', () => {
      const clip = createFadeClip('clip-1');
      const binding: AnimationBinding = {
        ...createBinding('bind-1', 'clip-1'),
        targetState: 'active',
      };
      const activeState: AnimationState = {
        id: 'state-active',
        name: 'active',
        propertyOverrides: { scaleX: 1.2, scaleY: 1.2 },
      };
      const config = createConfig([clip], [binding], [activeState]);

      orchestrator.registerEntity('entity-1', config);
      orchestrator.triggerAnimation('entity-1', 'bind-1');

      // Advance past the clip duration to trigger state transition
      advanceTime(orchestrator, animationSystem, 1.5);

      expect(orchestrator.getEntityState('entity-1')).toBe('active');
    });
  });

  describe('multi-property keyframes', () => {
    it('interpolates multiple properties simultaneously', () => {
      const clip: AnimationClip = {
        id: 'multi-clip',
        name: 'Multi Property',
        keyframes: [
          { offset: 0, properties: { opacity: 0, scaleX: 0.5, positionX: -100 }, easing: 'linear' },
          { offset: 1, properties: { opacity: 1, scaleX: 1, positionX: 0 }, easing: 'linear' },
        ],
        duration: 1,
        delay: 0,
        repeat: 0,
        yoyo: false,
        fillMode: 'forwards',
      };
      const config = createConfig([clip]);

      orchestrator.registerEntity('entity-1', config);
      orchestrator.triggerClip('entity-1', 'multi-clip');

      // Advance halfway
      advanceTime(orchestrator, animationSystem, 0.5);

      const overlay = useAnimationOverlayStore.getState().getOverlay('entity-1');
      expect(overlay).toBeDefined();
      // All three properties should be partially animated
      expect(overlay?.opacity).toBeDefined();
      expect(overlay?.scaleX).toBeDefined();
      expect(overlay?.positionX).toBeDefined();
    });
  });

  describe('updateConfig', () => {
    it('updates the config without affecting current state', () => {
      const state: AnimationState = {
        id: 'state-1',
        name: 'on',
        propertyOverrides: { opacity: 1 },
      };
      const config = createConfig([], [], [state], 'on');

      orchestrator.registerEntity('entity-1', config);
      expect(orchestrator.getEntityState('entity-1')).toBe('on');

      // Update config - state should be preserved
      const newClip = createFadeClip('new-clip');
      const newConfig = createConfig([newClip], [], [state]);
      orchestrator.updateConfig('entity-1', newConfig);

      expect(orchestrator.getEntityState('entity-1')).toBe('on');
    });
  });
});
