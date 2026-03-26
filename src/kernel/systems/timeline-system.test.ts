/**
 * Timeline System Tests
 *
 * @module kernel/systems/timeline-system.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { TimelineClip, PropertyTrack, TimelineKeyframe } from '../schemas/timeline';
import { useAnimationOverlayStore } from '../stores/canvas/animation-overlay.store';
import { useTimelineStore } from '../stores/timeline/timeline.store';
import type { TickContext } from '../world/tick-loop';

import { createTimelineSystem } from './timeline-system';

function createTickContext(deltaTime = 1 / 30): TickContext {
  return {
    deltaTime,
    elapsedTime: deltaTime,
    tickNumber: 1,
    tickRate: 30,
    fixedDeltaTime: 1 / 30,
  };
}

function makeClip(overrides: Partial<TimelineClip> = {}): TimelineClip {
  return {
    id: 'clip-1',
    trackId: 'track-1',
    entityId: 'entity-1',
    timelineIn: 0,
    timelineOut: 5,
    sourceIn: 0,
    speed: 1,
    muted: false,
    disabled: false,
    blendMode: 'normal',
    ...overrides,
  };
}

function makePropertyTrack(
  clipId: string,
  property: string,
  keyframes: TimelineKeyframe[],
): PropertyTrack {
  return {
    id: `pt-${clipId}-${property}`,
    clipId,
    property: property as PropertyTrack['property'],
    keyframes,
  };
}

describe('TimelineSystem', () => {
  let system: ReturnType<typeof createTimelineSystem>;

  beforeEach(() => {
    system = createTimelineSystem();
    useTimelineStore.getState().reset();
    useAnimationOverlayStore.getState().clearAll();
  });

  afterEach(() => {
    useTimelineStore.getState().reset();
    useAnimationOverlayStore.getState().clearAll();
  });

  describe('isActive', () => {
    it('returns false when timeline mode is off', () => {
      expect(system.isActive()).toBe(false);
    });

    it('returns true when timeline mode is on', () => {
      useTimelineStore.getState().enterTimelineMode();
      expect(system.isActive()).toBe(true);
    });
  });

  describe('playhead advancement', () => {
    it('advances playhead when playing', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      store.play();

      system.tick(createTickContext(0.5));

      expect(useTimelineStore.getState().playheadTime).toBeCloseTo(0.5, 2);
    });

    it('does not advance when paused', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      // Don't call play — should stay at 0

      system.tick(createTickContext(0.5));

      expect(useTimelineStore.getState().playheadTime).toBe(0);
    });

    it('stops at composition end', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      store.setComposition({ duration: 2 });
      store.seek(1.9);
      store.play();

      system.tick(createTickContext(0.5));

      expect(useTimelineStore.getState().playheadTime).toBe(2);
      expect(useTimelineStore.getState().isPlaying).toBe(false);
    });

    it('loops when loop region is enabled', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      store.setLoopRegion({ enabled: true, inPoint: 1, outPoint: 3 });
      store.seek(2.9);
      store.play();

      system.tick(createTickContext(0.5));

      // Should have looped back to inPoint
      expect(useTimelineStore.getState().playheadTime).toBeCloseTo(1, 1);
    });
  });

  describe('clip evaluation', () => {
    it('writes overlay for active clips with property tracks', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();

      const clip = makeClip();
      const pt = makePropertyTrack('clip-1', 'opacity', [
        { time: 0, value: 0, easing: 'linear' },
        { time: 5, value: 1, easing: 'linear' },
      ]);

      store.addClip(clip);
      store.addPropertyTrack(pt);
      store.seek(2.5);

      system.tick(createTickContext(0));

      const overlay = useAnimationOverlayStore.getState().getOverlay('entity-1');
      expect(overlay).toBeDefined();
      expect(overlay!.opacity).toBeCloseTo(0.5, 1);
    });

    it('does not write overlay for clips outside playhead range', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();

      const clip = makeClip({ timelineIn: 5, timelineOut: 10 });
      const pt = makePropertyTrack('clip-1', 'opacity', [
        { time: 0, value: 0, easing: 'linear' },
        { time: 5, value: 1, easing: 'linear' },
      ]);

      store.addClip(clip);
      store.addPropertyTrack(pt);
      store.seek(2); // Before clip starts

      system.tick(createTickContext(0));

      const overlay = useAnimationOverlayStore.getState().getOverlay('entity-1');
      expect(overlay).toBeUndefined();
    });

    it('skips disabled clips', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();

      const clip = makeClip({ disabled: true });
      const pt = makePropertyTrack('clip-1', 'opacity', [
        { time: 0, value: 0, easing: 'linear' },
        { time: 5, value: 1, easing: 'linear' },
      ]);

      store.addClip(clip);
      store.addPropertyTrack(pt);
      store.seek(2.5);

      system.tick(createTickContext(0));

      const overlay = useAnimationOverlayStore.getState().getOverlay('entity-1');
      expect(overlay).toBeUndefined();
    });
  });

  describe('keyframe interpolation', () => {
    it('interpolates linearly between keyframes', () => {
      const pt = makePropertyTrack('clip-1', 'opacity', [
        { time: 0, value: 0, easing: 'linear' },
        { time: 10, value: 100, easing: 'linear' },
      ]);

      expect(system.evaluateProperty(pt, 0)).toBe(0);
      expect(system.evaluateProperty(pt, 5)).toBe(50);
      expect(system.evaluateProperty(pt, 10)).toBe(100);
    });

    it('holds value before first keyframe', () => {
      const pt = makePropertyTrack('clip-1', 'opacity', [
        { time: 2, value: 50, easing: 'linear' },
        { time: 5, value: 100, easing: 'linear' },
      ]);

      expect(system.evaluateProperty(pt, 0)).toBe(50);
    });

    it('holds value after last keyframe', () => {
      const pt = makePropertyTrack('clip-1', 'opacity', [
        { time: 0, value: 0, easing: 'linear' },
        { time: 5, value: 100, easing: 'linear' },
      ]);

      expect(system.evaluateProperty(pt, 10)).toBe(100);
    });

    it('handles single keyframe', () => {
      const pt = makePropertyTrack('clip-1', 'opacity', [
        { time: 3, value: 42, easing: 'linear' },
      ]);

      expect(system.evaluateProperty(pt, 0)).toBe(42);
      expect(system.evaluateProperty(pt, 5)).toBe(42);
    });

    it('applies easing functions', () => {
      const pt = makePropertyTrack('clip-1', 'opacity', [
        { time: 0, value: 0, easing: 'linear' },
        { time: 1, value: 1, easing: 'easeInQuad' },
      ]);

      // easeInQuad at t=0.5 should be 0.25 (t^2)
      expect(system.evaluateProperty(pt, 0.5)).toBeCloseTo(0.25, 3);
    });
  });

  describe('stepToFrame', () => {
    it('sets playhead to correct time for frame number', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      store.setComposition({ fps: 30 });

      system.stepToFrame(15);

      expect(useTimelineStore.getState().playheadTime).toBeCloseTo(0.5, 3);
    });
  });

  describe('getCurrentFrame', () => {
    it('returns correct frame for current playhead', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      store.setComposition({ fps: 30 });
      store.seek(1.0);

      expect(system.getCurrentFrame()).toBe(30);
    });
  });

  describe('getActiveEntityIds', () => {
    it('returns entities with active clips at given time', () => {
      const store = useTimelineStore.getState();
      store.addClip(makeClip({ id: 'c1', entityId: 'e1', timelineIn: 0, timelineOut: 5 }));
      store.addClip(makeClip({ id: 'c2', entityId: 'e2', timelineIn: 3, timelineOut: 8 }));

      expect(system.getActiveEntityIds(2)).toEqual(['e1']);
      expect(system.getActiveEntityIds(4)).toEqual(['e1', 'e2']);
      expect(system.getActiveEntityIds(6)).toEqual(['e2']);
    });
  });

  describe('clip speed', () => {
    it('respects speed multiplier for property evaluation', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();

      // Clip at 2x speed
      const clip = makeClip({ speed: 2 });
      const pt = makePropertyTrack('clip-1', 'opacity', [
        { time: 0, value: 0, easing: 'linear' },
        { time: 10, value: 100, easing: 'linear' },
      ]);

      store.addClip(clip);
      store.addPropertyTrack(pt);
      store.seek(2.5); // At 2x speed, local time = 5

      system.tick(createTickContext(0));

      const overlay = useAnimationOverlayStore.getState().getOverlay('entity-1');
      expect(overlay).toBeDefined();
      expect(overlay!.opacity).toBeCloseTo(50, 1); // 5/10 * 100 = 50
    });
  });
});
