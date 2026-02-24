/**
 * Animation System — Tweens and State Machines for Game-Mode Worlds
 *
 * @module kernel/systems/animation-system
 *
 * @remarks
 * Provides animation capabilities including:
 * - Tweens (interpolate values over time)
 * - Easing functions
 * - Animation sequences (chain multiple tweens)
 * - Basic state machine for entity animations
 */

import type { TickSystem, TickContext } from '../world/tick-loop';

// =============================================================================
// Easing Functions
// =============================================================================

export type EasingFunction = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInElastic: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)),
  easeOutElastic: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  easeInBounce: (t: number) => 1 - Easing.easeOutBounce(1 - t),
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
} as const;

// =============================================================================
// Tween Types
// =============================================================================

export type TweenStatus = 'pending' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface TweenConfig<T> {
  /** Starting value */
  from: T;
  /** Ending value */
  to: T;
  /** Duration in seconds */
  duration: number;
  /** Easing function (default: linear) */
  easing?: EasingFunction;
  /** Delay before starting in seconds (default: 0) */
  delay?: number;
  /** Number of times to repeat (-1 for infinite, default: 0) */
  repeat?: number;
  /** Whether to reverse on repeat (yoyo effect, default: false) */
  yoyo?: boolean;
  /** Called each tick with current value */
  onUpdate?: (value: T) => void;
  /** Called when tween completes */
  onComplete?: () => void;
  /** Called when tween is cancelled */
  onCancel?: () => void;
}

export interface Tween<T> {
  /** Unique tween ID */
  readonly id: string;
  /** Current status */
  readonly status: TweenStatus;
  /** Current interpolated value */
  readonly value: T;
  /** Progress (0-1) */
  readonly progress: number;
  /** Pause the tween */
  pause(): void;
  /** Resume the tween */
  resume(): void;
  /** Cancel the tween */
  cancel(): void;
  /** Reset and restart the tween */
  restart(): void;
}

// =============================================================================
// Animation Sequence
// =============================================================================

export interface SequenceStep {
  /** Tween configuration */
  tween: TweenConfig<number>;
  /** Parallel tweens to run alongside this step */
  parallel?: TweenConfig<number>[];
}

export interface Sequence {
  readonly id: string;
  readonly status: TweenStatus;
  readonly currentStep: number;
  readonly totalSteps: number;
  pause(): void;
  resume(): void;
  cancel(): void;
  restart(): void;
}

// =============================================================================
// Animation System Interface
// =============================================================================

export interface IAnimationSystem extends TickSystem {
  /** Create a number tween */
  tween(config: TweenConfig<number>): Tween<number>;
  /** Create a tween for a target object's property */
  tweenProperty<T extends object, K extends keyof T>(
    target: T,
    property: K,
    to: T[K] extends number ? number : never,
    duration: number,
    options?: Partial<Omit<TweenConfig<number>, 'from' | 'to' | 'duration'>>,
  ): Tween<number>;
  /** Create an animation sequence */
  sequence(steps: SequenceStep[]): Sequence;
  /** Get a tween by ID */
  getTween(id: string): Tween<number> | undefined;
  /** Get all active tweens */
  getActiveTweens(): Tween<number>[];
  /** Cancel all tweens */
  cancelAll(): void;
  /** Pause all tweens */
  pauseAll(): void;
  /** Resume all tweens */
  resumeAll(): void;
}

// =============================================================================
// Internal Tween Implementation
// =============================================================================

interface InternalTween {
  id: string;
  status: TweenStatus;
  from: number;
  to: number;
  value: number;
  duration: number;
  easing: EasingFunction;
  delay: number;
  repeat: number;
  yoyo: boolean;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
  onCancel?: () => void;
  // Runtime state
  elapsed: number;
  delayElapsed: number;
  repeatCount: number;
  reversed: boolean;
}

// =============================================================================
// Animation System Implementation
// =============================================================================

/**
 * Creates an animation system for game-mode worlds
 */
export function createAnimationSystem(): IAnimationSystem {
  const tweens = new Map<string, InternalTween>();
  let nextId = 1;

  // Helper: Interpolate value
  function lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t;
  }

  // Helper: Create tween wrapper
  function createTweenWrapper(internal: InternalTween): Tween<number> {
    return {
      get id() {
        return internal.id;
      },
      get status() {
        return internal.status;
      },
      get value() {
        return internal.value;
      },
      get progress() {
        return Math.min(internal.elapsed / internal.duration, 1);
      },
      pause() {
        if (internal.status === 'running') {
          internal.status = 'paused';
        }
      },
      resume() {
        if (internal.status === 'paused') {
          internal.status = 'running';
        }
      },
      cancel() {
        if (internal.status !== 'completed' && internal.status !== 'cancelled') {
          internal.status = 'cancelled';
          if (internal.onCancel) {
            try {
              internal.onCancel();
            } catch (err) {
              console.error('[AnimationSystem] onCancel error:', err);
            }
          }
        }
      },
      restart() {
        internal.elapsed = 0;
        internal.delayElapsed = 0;
        internal.repeatCount = 0;
        internal.reversed = false;
        internal.value = internal.from;
        internal.status = 'running';
      },
    };
  }

  // ---------------------------------------------------------------------------
  // System Implementation
  // ---------------------------------------------------------------------------

  const system: IAnimationSystem = {
    name: 'animation',
    priority: 50, // Medium priority - runs after physics

    tick(ctx: TickContext): void {
      const dt = ctx.deltaTime;
      const toRemove: string[] = [];

      for (const tween of tweens.values()) {
        // Skip non-running tweens
        if (tween.status !== 'running') {
          if (tween.status === 'completed' || tween.status === 'cancelled') {
            toRemove.push(tween.id);
          }
          continue;
        }

        // Handle delay
        if (tween.delayElapsed < tween.delay) {
          tween.delayElapsed += dt;
          continue;
        }

        // Update elapsed time
        tween.elapsed += dt;

        // Calculate progress
        const progress = Math.min(tween.elapsed / tween.duration, 1);
        const easedProgress = tween.easing(progress);

        // Calculate value based on direction
        if (tween.reversed) {
          tween.value = lerp(tween.to, tween.from, easedProgress);
        } else {
          tween.value = lerp(tween.from, tween.to, easedProgress);
        }

        // Notify update
        if (tween.onUpdate) {
          try {
            tween.onUpdate(tween.value);
          } catch (err) {
            console.error('[AnimationSystem] onUpdate error:', err);
          }
        }

        // Check completion
        if (progress >= 1) {
          // Check for repeat
          if (tween.repeat !== 0) {
            tween.repeatCount++;
            if (tween.repeat > 0 && tween.repeatCount >= tween.repeat) {
              // Done repeating
              tween.status = 'completed';
              if (tween.onComplete) {
                try {
                  tween.onComplete();
                } catch (err) {
                  console.error('[AnimationSystem] onComplete error:', err);
                }
              }
            } else {
              // Repeat
              tween.elapsed = 0;
              if (tween.yoyo) {
                tween.reversed = !tween.reversed;
              }
            }
          } else {
            // No repeat, complete
            tween.status = 'completed';
            if (tween.onComplete) {
              try {
                tween.onComplete();
              } catch (err) {
                console.error('[AnimationSystem] onComplete error:', err);
              }
            }
          }
        }
      }

      // Remove completed/cancelled tweens
      for (const id of toRemove) {
        tweens.delete(id);
      }
    },

    onRegister() {
      // Called when system is registered
    },

    onUnregister() {
      // Cancel all tweens on unregister
      system.cancelAll();
      tweens.clear();
    },

    tween(config: TweenConfig<number>): Tween<number> {
      const id = `tween_${nextId++}`;
      const internal: InternalTween = {
        id,
        status: 'running',
        from: config.from,
        to: config.to,
        value: config.from,
        duration: config.duration,
        easing: config.easing ?? Easing.linear,
        delay: config.delay ?? 0,
        repeat: config.repeat ?? 0,
        yoyo: config.yoyo ?? false,
        onUpdate: config.onUpdate,
        onComplete: config.onComplete,
        onCancel: config.onCancel,
        elapsed: 0,
        delayElapsed: 0,
        repeatCount: 0,
        reversed: false,
      };

      tweens.set(id, internal);
      return createTweenWrapper(internal);
    },

    tweenProperty<T extends object, K extends keyof T>(
      target: T,
      property: K,
      to: T[K] extends number ? number : never,
      duration: number,
      options?: Partial<Omit<TweenConfig<number>, 'from' | 'to' | 'duration'>>,
    ): Tween<number> {
      const from = target[property] as unknown as number;
      return system.tween({
        from,
        to,
        duration,
        ...options,
        onUpdate: (value) => {
          (target as Record<string, unknown>)[property as string] = value;
          if (options?.onUpdate) {
            options.onUpdate(value);
          }
        },
      });
    },

    sequence(steps: SequenceStep[]): Sequence {
      const id = `sequence_${nextId++}`;
      let currentStep = 0;
      let status: TweenStatus = 'running';
      let activeTweens: Tween<number>[] = [];

      function startStep(index: number): void {
        if (index >= steps.length) {
          status = 'completed';
          return;
        }

        currentStep = index;
        const step = steps[index];

        // Create main tween
        const mainTween = system.tween({
          ...step.tween,
          onComplete: () => {
            step.tween.onComplete?.();
            // Start next step when main tween completes
            startStep(index + 1);
          },
        });
        activeTweens = [mainTween];

        // Create parallel tweens
        if (step.parallel) {
          for (const parallelConfig of step.parallel) {
            activeTweens.push(system.tween(parallelConfig));
          }
        }
      }

      // Start first step
      startStep(0);

      return {
        get id() {
          return id;
        },
        get status() {
          return status;
        },
        get currentStep() {
          return currentStep;
        },
        get totalSteps() {
          return steps.length;
        },
        pause() {
          if (status === 'running') {
            status = 'paused';
            for (const tween of activeTweens) {
              tween.pause();
            }
          }
        },
        resume() {
          if (status === 'paused') {
            status = 'running';
            for (const tween of activeTweens) {
              tween.resume();
            }
          }
        },
        cancel() {
          if (status !== 'completed' && status !== 'cancelled') {
            status = 'cancelled';
            for (const tween of activeTweens) {
              tween.cancel();
            }
          }
        },
        restart() {
          for (const tween of activeTweens) {
            tween.cancel();
          }
          activeTweens = [];
          status = 'running';
          startStep(0);
        },
      };
    },

    getTween(id: string): Tween<number> | undefined {
      const internal = tweens.get(id);
      if (!internal) return undefined;
      return createTweenWrapper(internal);
    },

    getActiveTweens(): Tween<number>[] {
      return Array.from(tweens.values())
        .filter((t) => t.status === 'running' || t.status === 'paused')
        .map((t) => createTweenWrapper(t));
    },

    cancelAll(): void {
      for (const tween of tweens.values()) {
        if (tween.status !== 'completed' && tween.status !== 'cancelled') {
          tween.status = 'cancelled';
          if (tween.onCancel) {
            try {
              tween.onCancel();
            } catch (err) {
              console.error('[AnimationSystem] onCancel error:', err);
            }
          }
        }
      }
    },

    pauseAll(): void {
      for (const tween of tweens.values()) {
        if (tween.status === 'running') {
          tween.status = 'paused';
        }
      }
    },

    resumeAll(): void {
      for (const tween of tweens.values()) {
        if (tween.status === 'paused') {
          tween.status = 'running';
        }
      }
    },
  };

  return system;
}
