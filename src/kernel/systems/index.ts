/**
 * Kernel Systems — Barrel Export
 *
 * @module kernel/systems
 *
 * @remarks
 * Provides tick-based systems for game-mode worlds:
 * - PhysicsSystem: velocity, gravity, friction, AABB collisions
 * - AnimationSystem: tweens, easing, sequences
 *
 * These systems implement the TickSystem interface and are registered
 * with a world's tick loop to receive per-frame updates.
 */

export {
  createPhysicsSystem,
  type IPhysicsSystem,
  type PhysicsSystemOptions,
  type PhysicsEntity,
  type PositionComponent,
  type VelocityComponent,
  type PhysicsBodyComponent,
  type AABBComponent,
  type Collision,
} from './physics-system';

export {
  createAnimationSystem,
  Easing,
  type IAnimationSystem,
  type EasingFunction,
  type TweenConfig,
  type Tween,
  type TweenStatus,
  type SequenceStep,
  type Sequence,
} from './animation-system';

export {
  createEntityAnimationOrchestrator,
  type IEntityAnimationOrchestrator,
} from './entity-animation-orchestrator';

export {
  createTimelineSystem,
  type ITimelineSystem,
} from './timeline-system';

export {
  createAudioEngineSystem,
  type IAudioEngineSystem,
} from './audio-engine-system';
