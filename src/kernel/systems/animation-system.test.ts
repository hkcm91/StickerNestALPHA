/**
 * Animation System Tests
 *
 * @module kernel/systems/animation-system.test
 */

import { describe, it, expect, vi } from 'vitest';

import type { TickContext } from '../world/tick-loop';

import { createAnimationSystem, Easing } from './animation-system';

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

describe('Easing', () => {
  describe('linear', () => {
    it('returns input unchanged', () => {
      expect(Easing.linear(0)).toBe(0);
      expect(Easing.linear(0.5)).toBe(0.5);
      expect(Easing.linear(1)).toBe(1);
    });
  });

  describe('easeInQuad', () => {
    it('starts slow and accelerates', () => {
      expect(Easing.easeInQuad(0)).toBe(0);
      expect(Easing.easeInQuad(0.5)).toBe(0.25);
      expect(Easing.easeInQuad(1)).toBe(1);
    });
  });

  describe('easeOutQuad', () => {
    it('starts fast and decelerates', () => {
      expect(Easing.easeOutQuad(0)).toBe(0);
      expect(Easing.easeOutQuad(0.5)).toBe(0.75);
      expect(Easing.easeOutQuad(1)).toBe(1);
    });
  });

  describe('easeOutBounce', () => {
    it('bounces at the end', () => {
      expect(Easing.easeOutBounce(0)).toBeCloseTo(0, 5);
      expect(Easing.easeOutBounce(1)).toBeCloseTo(1, 5);
      // Mid values should show bounce behavior
      expect(Easing.easeOutBounce(0.5)).toBeGreaterThan(0);
      expect(Easing.easeOutBounce(0.5)).toBeLessThan(1);
    });
  });

  describe('easeOutElastic', () => {
    it('has elastic overshoots', () => {
      expect(Easing.easeOutElastic(0)).toBe(0);
      expect(Easing.easeOutElastic(1)).toBe(1);
      // Elastic can overshoot
      const midValue = Easing.easeOutElastic(0.5);
      expect(midValue).toBeDefined();
    });
  });
});

describe('createAnimationSystem', () => {
  describe('system properties', () => {
    it('has correct name', () => {
      const system = createAnimationSystem();
      expect(system.name).toBe('animation');
    });

    it('has medium priority', () => {
      const system = createAnimationSystem();
      expect(system.priority).toBe(50);
    });
  });

  describe('tween creation', () => {
    it('creates a tween with initial value', () => {
      const system = createAnimationSystem();
      const tween = system.tween({
        from: 0,
        to: 100,
        duration: 1,
      });

      expect(tween.value).toBe(0);
      expect(tween.progress).toBe(0);
      expect(tween.status).toBe('running');
    });

    it('generates unique tween IDs', () => {
      const system = createAnimationSystem();
      const tween1 = system.tween({ from: 0, to: 1, duration: 1 });
      const tween2 = system.tween({ from: 0, to: 1, duration: 1 });

      expect(tween1.id).not.toBe(tween2.id);
    });

    it('retrieves tween by ID', () => {
      const system = createAnimationSystem();
      const tween = system.tween({ from: 0, to: 100, duration: 1 });
      const retrieved = system.getTween(tween.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(tween.id);
    });

    it('returns undefined for unknown tween ID', () => {
      const system = createAnimationSystem();
      expect(system.getTween('unknown')).toBeUndefined();
    });
  });

  describe('tween interpolation', () => {
    it('interpolates value over time', () => {
      const system = createAnimationSystem();
      const tween = system.tween({
        from: 0,
        to: 100,
        duration: 1,
      });

      // Tick half duration
      system.tick(createTickContext(0.5));

      expect(tween.value).toBeCloseTo(50, 5);
      expect(tween.progress).toBeCloseTo(0.5, 5);
    });

    it('reaches final value at completion', () => {
      const system = createAnimationSystem();
      const tween = system.tween({
        from: 0,
        to: 100,
        duration: 1,
      });

      system.tick(createTickContext(1));

      expect(tween.value).toBe(100);
      expect(tween.progress).toBe(1);
      expect(tween.status).toBe('completed');
    });

    it('applies easing function', () => {
      const system = createAnimationSystem();
      const tween = system.tween({
        from: 0,
        to: 100,
        duration: 1,
        easing: Easing.easeInQuad,
      });

      system.tick(createTickContext(0.5));

      // easeInQuad at t=0.5 is 0.25, so value should be 25
      expect(tween.value).toBeCloseTo(25, 5);
    });
  });

  describe('tween callbacks', () => {
    it('calls onUpdate on each tick', () => {
      const system = createAnimationSystem();
      const onUpdate = vi.fn();
      system.tween({
        from: 0,
        to: 100,
        duration: 1,
        onUpdate,
      });

      system.tick(createTickContext(0.25));
      system.tick(createTickContext(0.25));

      expect(onUpdate).toHaveBeenCalledTimes(2);
      expect(onUpdate).toHaveBeenCalledWith(expect.any(Number));
    });

    it('calls onComplete when finished', () => {
      const system = createAnimationSystem();
      const onComplete = vi.fn();
      system.tween({
        from: 0,
        to: 100,
        duration: 1,
        onComplete,
      });

      system.tick(createTickContext(1));

      expect(onComplete).toHaveBeenCalledOnce();
    });

    it('calls onCancel when cancelled', () => {
      const system = createAnimationSystem();
      const onCancel = vi.fn();
      const tween = system.tween({
        from: 0,
        to: 100,
        duration: 1,
        onCancel,
      });

      tween.cancel();

      expect(onCancel).toHaveBeenCalledOnce();
      expect(tween.status).toBe('cancelled');
    });

    it('handles callback errors gracefully', () => {
      const system = createAnimationSystem();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      system.tween({
        from: 0,
        to: 100,
        duration: 1,
        onUpdate: () => {
          throw new Error('Update error');
        },
      });

      expect(() => system.tick(createTickContext(0.5))).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('tween delay', () => {
    it('waits for delay before starting', () => {
      const system = createAnimationSystem();
      const onUpdate = vi.fn();
      system.tween({
        from: 0,
        to: 100,
        duration: 1,
        delay: 0.5,
        onUpdate,
      });

      // During delay, onUpdate should not be called
      system.tick(createTickContext(0.3));
      expect(onUpdate).not.toHaveBeenCalled();

      // Still in delay (0.3 + 0.1 = 0.4 < 0.5)
      system.tick(createTickContext(0.1));
      expect(onUpdate).not.toHaveBeenCalled();

      // Delay elapsed (0.4 + 0.2 = 0.6 > 0.5), but delay check happens before processing
      // so this tick completes the delay
      system.tick(createTickContext(0.2));
      // This tick processes the animation since delay is now complete
      expect(onUpdate).not.toHaveBeenCalled();

      // Now we're past delay, onUpdate should be called
      system.tick(createTickContext(0.1));
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  describe('tween repeat', () => {
    it('repeats specified number of times', () => {
      const system = createAnimationSystem();
      const onComplete = vi.fn();
      system.tween({
        from: 0,
        to: 100,
        duration: 0.5,
        repeat: 2,
        onComplete,
      });

      // First iteration
      system.tick(createTickContext(0.5));
      expect(onComplete).not.toHaveBeenCalled();

      // Second iteration
      system.tick(createTickContext(0.5));
      expect(onComplete).toHaveBeenCalledOnce();
    });

    it('reverses direction when yoyo is enabled', () => {
      const system = createAnimationSystem();
      const tween = system.tween({
        from: 0,
        to: 100,
        duration: 0.5,
        repeat: 2,
        yoyo: true,
      });

      // Complete first iteration (forward)
      system.tick(createTickContext(0.5));
      expect(tween.value).toBe(100);

      // Second iteration should be reversed
      system.tick(createTickContext(0.25));
      expect(tween.value).toBeCloseTo(50, 5);

      system.tick(createTickContext(0.25));
      expect(tween.value).toBe(0);
    });
  });

  describe('tween control', () => {
    it('pauses tween', () => {
      const system = createAnimationSystem();
      const tween = system.tween({
        from: 0,
        to: 100,
        duration: 1,
      });

      system.tick(createTickContext(0.5));
      const valueAtPause = tween.value;

      tween.pause();
      system.tick(createTickContext(0.5));

      expect(tween.value).toBe(valueAtPause);
      expect(tween.status).toBe('paused');
    });

    it('resumes paused tween', () => {
      const system = createAnimationSystem();
      const tween = system.tween({
        from: 0,
        to: 100,
        duration: 1,
      });

      system.tick(createTickContext(0.25));
      tween.pause();
      tween.resume();
      system.tick(createTickContext(0.25));

      expect(tween.value).toBeCloseTo(50, 5);
      expect(tween.status).toBe('running');
    });

    it('restarts tween', () => {
      const system = createAnimationSystem();
      const tween = system.tween({
        from: 0,
        to: 100,
        duration: 1,
      });

      system.tick(createTickContext(0.75));
      tween.restart();

      expect(tween.value).toBe(0);
      expect(tween.progress).toBe(0);
      expect(tween.status).toBe('running');
    });

    it('ignores pause on non-running tween', () => {
      const system = createAnimationSystem();
      const tween = system.tween({
        from: 0,
        to: 100,
        duration: 1,
      });

      system.tick(createTickContext(1)); // Complete
      tween.pause();

      expect(tween.status).toBe('completed');
    });

    it('ignores resume on non-paused tween', () => {
      const system = createAnimationSystem();
      const tween = system.tween({
        from: 0,
        to: 100,
        duration: 1,
      });

      tween.resume();
      expect(tween.status).toBe('running');
    });
  });

  describe('tweenProperty', () => {
    it('animates an object property', () => {
      const system = createAnimationSystem();
      const target = { x: 0, y: 50 };

      system.tweenProperty(target, 'x', 100, 1);
      system.tick(createTickContext(0.5));

      expect(target.x).toBeCloseTo(50, 5);
      expect(target.y).toBe(50); // Unchanged
    });

    it('calls custom onUpdate alongside property update', () => {
      const system = createAnimationSystem();
      const target = { x: 0 };
      const onUpdate = vi.fn();

      system.tweenProperty(target, 'x', 100, 1, { onUpdate });
      system.tick(createTickContext(0.5));

      expect(target.x).toBeCloseTo(50, 5);
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  describe('sequence', () => {
    it('creates a sequence', () => {
      const system = createAnimationSystem();
      const sequence = system.sequence([
        { tween: { from: 0, to: 100, duration: 0.5 } },
        { tween: { from: 0, to: 50, duration: 0.5 } },
      ]);

      expect(sequence.id).toBeDefined();
      expect(sequence.status).toBe('running');
      expect(sequence.currentStep).toBe(0);
      expect(sequence.totalSteps).toBe(2);
    });

    it('progresses through steps', () => {
      const system = createAnimationSystem();
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();

      const sequence = system.sequence([
        { tween: { from: 0, to: 100, duration: 0.5, onComplete: onComplete1 } },
        { tween: { from: 0, to: 50, duration: 0.5, onComplete: onComplete2 } },
      ]);

      // First step
      system.tick(createTickContext(0.5));
      expect(onComplete1).toHaveBeenCalled();
      expect(sequence.currentStep).toBe(1);

      // Second step
      system.tick(createTickContext(0.5));
      expect(onComplete2).toHaveBeenCalled();
      expect(sequence.status).toBe('completed');
    });

    it('runs parallel tweens', () => {
      const system = createAnimationSystem();
      const mainUpdate = vi.fn();
      const parallelUpdate = vi.fn();

      system.sequence([
        {
          tween: { from: 0, to: 100, duration: 0.5, onUpdate: mainUpdate },
          parallel: [{ from: 0, to: 50, duration: 0.5, onUpdate: parallelUpdate }],
        },
      ]);

      system.tick(createTickContext(0.25));

      expect(mainUpdate).toHaveBeenCalled();
      expect(parallelUpdate).toHaveBeenCalled();
    });

    it('pauses and resumes sequence', () => {
      const system = createAnimationSystem();
      const sequence = system.sequence([
        { tween: { from: 0, to: 100, duration: 1 } },
      ]);

      system.tick(createTickContext(0.25));
      sequence.pause();
      expect(sequence.status).toBe('paused');

      sequence.resume();
      expect(sequence.status).toBe('running');
    });

    it('cancels sequence', () => {
      const system = createAnimationSystem();
      const sequence = system.sequence([
        { tween: { from: 0, to: 100, duration: 1 } },
      ]);

      sequence.cancel();
      expect(sequence.status).toBe('cancelled');
    });

    it('restarts sequence', () => {
      const system = createAnimationSystem();
      const sequence = system.sequence([
        { tween: { from: 0, to: 100, duration: 0.5 } },
        { tween: { from: 0, to: 50, duration: 0.5 } },
      ]);

      system.tick(createTickContext(0.75));
      sequence.restart();

      expect(sequence.currentStep).toBe(0);
      expect(sequence.status).toBe('running');
    });
  });

  describe('bulk operations', () => {
    it('returns active tweens', () => {
      const system = createAnimationSystem();
      system.tween({ from: 0, to: 100, duration: 1 });
      system.tween({ from: 0, to: 50, duration: 0.5 });

      const active = system.getActiveTweens();
      expect(active.length).toBe(2);
    });

    it('cancels all tweens', () => {
      const system = createAnimationSystem();
      const onCancel1 = vi.fn();
      const onCancel2 = vi.fn();

      system.tween({ from: 0, to: 100, duration: 1, onCancel: onCancel1 });
      system.tween({ from: 0, to: 50, duration: 1, onCancel: onCancel2 });

      system.cancelAll();

      expect(onCancel1).toHaveBeenCalled();
      expect(onCancel2).toHaveBeenCalled();
    });

    it('pauses all tweens', () => {
      const system = createAnimationSystem();
      const tween1 = system.tween({ from: 0, to: 100, duration: 1 });
      const tween2 = system.tween({ from: 0, to: 50, duration: 1 });

      system.pauseAll();

      expect(tween1.status).toBe('paused');
      expect(tween2.status).toBe('paused');
    });

    it('resumes all tweens', () => {
      const system = createAnimationSystem();
      const tween1 = system.tween({ from: 0, to: 100, duration: 1 });
      const tween2 = system.tween({ from: 0, to: 50, duration: 1 });

      system.pauseAll();
      system.resumeAll();

      expect(tween1.status).toBe('running');
      expect(tween2.status).toBe('running');
    });
  });

  describe('lifecycle', () => {
    it('clears all tweens on unregister', () => {
      const system = createAnimationSystem();
      system.tween({ from: 0, to: 100, duration: 1 });
      system.tween({ from: 0, to: 50, duration: 1 });

      system.onUnregister?.();

      expect(system.getActiveTweens().length).toBe(0);
    });

    it('removes completed tweens after tick', () => {
      const system = createAnimationSystem();
      system.tween({ from: 0, to: 100, duration: 0.5 });

      system.tick(createTickContext(0.5));
      // First tick completes, next tick removes
      system.tick(createTickContext(0.1));

      expect(system.getActiveTweens().length).toBe(0);
    });
  });
});
