/**
 * Animation Triggers Tests
 *
 * @module canvas/wiring/animation-triggers.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { EntityAnimationConfig, AnimationClip, AnimationBinding } from '@sn/types';
import { InputEvents, InteractionModeEvents, CanvasEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import type { IEntityAnimationOrchestrator } from '../../kernel/systems/entity-animation-orchestrator';

import { createAnimationTriggers } from './animation-triggers';

// Mock orchestrator
function createMockOrchestrator(): IEntityAnimationOrchestrator {
  return {
    name: 'entity-animation-orchestrator',
    priority: 45,
    tick: vi.fn(),
    registerEntity: vi.fn(),
    unregisterEntity: vi.fn(),
    updateConfig: vi.fn(),
    triggerAnimation: vi.fn(),
    triggerClip: vi.fn(),
    cancelEntityAnimations: vi.fn(),
    getEntityState: vi.fn(() => null),
    setEntityState: vi.fn(),
    hasActiveAnimations: vi.fn(() => false),
  };
}

function createSimpleConfig(): EntityAnimationConfig {
  const clip: AnimationClip = {
    id: 'clip-1',
    name: 'Test Clip',
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

  const binding: AnimationBinding = {
    id: 'bind-1',
    trigger: { type: 'click' },
    clipId: 'clip-1',
    enabled: true,
    priority: 0,
  };

  return {
    clips: [clip],
    bindings: [binding],
    states: [],
    enabled: true,
  };
}

describe('AnimationTriggers', () => {
  let orchestrator: IEntityAnimationOrchestrator;
  let context: ReturnType<typeof createAnimationTriggers>;

  beforeEach(() => {
    orchestrator = createMockOrchestrator();
    context = createAnimationTriggers(orchestrator);
  });

  afterEach(() => {
    context.destroy();
  });

  it('does not fire triggers in edit mode', () => {
    const config = createSimpleConfig();
    bus.emit(CanvasEvents.ENTITY_CREATED, {
      entity: { id: 'e1', animations: config },
    });

    // Default is edit mode (isPlayMode = false)
    bus.emit(InputEvents.POINTER_UP, { entityId: 'e1' });

    expect(orchestrator.triggerAnimation).not.toHaveBeenCalled();
  });

  it('fires click trigger in play mode', () => {
    const config = createSimpleConfig();
    bus.emit(CanvasEvents.ENTITY_CREATED, {
      entity: { id: 'e1', animations: config },
    });

    // Switch to play mode
    bus.emit(InteractionModeEvents.MODE_CHANGED, { mode: 'play' });

    bus.emit(InputEvents.POINTER_UP, { entityId: 'e1' });

    expect(orchestrator.triggerAnimation).toHaveBeenCalledWith('e1', 'bind-1');
  });

  it('fires hover-enter and hover-leave triggers', () => {
    const hoverEnterBinding: AnimationBinding = {
      id: 'bind-hover',
      trigger: { type: 'hover-enter' },
      clipId: 'clip-1',
      enabled: true,
      priority: 0,
    };
    const hoverLeaveBinding: AnimationBinding = {
      id: 'bind-hover-leave',
      trigger: { type: 'hover-leave' },
      clipId: 'clip-1',
      enabled: true,
      priority: 0,
    };

    const config: EntityAnimationConfig = {
      ...createSimpleConfig(),
      bindings: [hoverEnterBinding, hoverLeaveBinding],
    };

    bus.emit(CanvasEvents.ENTITY_CREATED, {
      entity: { id: 'e1', animations: config },
    });
    bus.emit(InteractionModeEvents.MODE_CHANGED, { mode: 'play' });

    // Hover enter
    bus.emit(InputEvents.POINTER_MOVE, { entityId: 'e1' });
    expect(orchestrator.triggerAnimation).toHaveBeenCalledWith('e1', 'bind-hover');

    // Hover leave
    bus.emit(InputEvents.POINTER_MOVE, { entityId: null });
    expect(orchestrator.triggerAnimation).toHaveBeenCalledWith('e1', 'bind-hover-leave');
  });

  it('cleans up on entity deletion', () => {
    const config = createSimpleConfig();
    bus.emit(CanvasEvents.ENTITY_CREATED, {
      entity: { id: 'e1', animations: config },
    });

    bus.emit(CanvasEvents.ENTITY_DELETED, { entityId: 'e1' });

    expect(orchestrator.unregisterEntity).toHaveBeenCalledWith('e1');
  });

  it('cleans up on destroy', () => {
    const config = createSimpleConfig();
    bus.emit(CanvasEvents.ENTITY_CREATED, {
      entity: { id: 'e1', animations: config },
    });

    context.destroy();

    // After destroy, triggers should not fire
    bus.emit(InteractionModeEvents.MODE_CHANGED, { mode: 'play' });
    bus.emit(InputEvents.POINTER_UP, { entityId: 'e1' });

    // triggerAnimation should only have been called during registration, not after destroy
    expect(orchestrator.triggerAnimation).not.toHaveBeenCalled();
  });
});
