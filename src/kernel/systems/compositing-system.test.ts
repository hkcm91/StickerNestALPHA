/**
 * Compositing System Tests
 *
 * @module kernel/systems/compositing-system.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { useAnimationOverlayStore } from '../stores/canvas/animation-overlay.store';
import { useCompositingStore } from '../stores/canvas/compositing.store';
import { useTimelineStore } from '../stores/timeline/timeline.store';
import type { TickContext } from '../world/tick-loop';

import { createCompositingSystem } from './compositing-system';

function createTickContext(): TickContext {
  return {
    deltaTime: 1 / 30,
    elapsedTime: 1 / 30,
    tickNumber: 1,
    tickRate: 30,
    fixedDeltaTime: 1 / 30,
  };
}

describe('CompositingSystem', () => {
  let system: ReturnType<typeof createCompositingSystem>;

  beforeEach(() => {
    system = createCompositingSystem();
    useTimelineStore.getState().reset();
    useAnimationOverlayStore.getState().clearAll();
    useCompositingStore.getState().clearAll();
  });

  afterEach(() => {
    useTimelineStore.getState().reset();
    useAnimationOverlayStore.getState().clearAll();
    useCompositingStore.getState().clearAll();
  });

  it('does nothing when timeline mode is off', () => {
    useTimelineStore.getState().addClip({
      id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
      timelineIn: 0, timelineOut: 5, sourceIn: 0,
      speed: 1, muted: false, disabled: false, blendMode: 'multiply',
    });

    system.tick(createTickContext());

    expect(useCompositingStore.getState().blendModes.size).toBe(0);
  });

  describe('blend modes', () => {
    it('writes blend mode from active clip', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      store.addClip({
        id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
        timelineIn: 0, timelineOut: 5, sourceIn: 0,
        speed: 1, muted: false, disabled: false, blendMode: 'multiply',
      });
      store.seek(2.5);

      system.tick(createTickContext());

      expect(useCompositingStore.getState().blendModes.get('entity-1')).toBe('multiply');
    });

    it('skips normal blend mode', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      store.addClip({
        id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
        timelineIn: 0, timelineOut: 5, sourceIn: 0,
        speed: 1, muted: false, disabled: false, blendMode: 'normal',
      });
      store.seek(2.5);

      system.tick(createTickContext());

      expect(useCompositingStore.getState().blendModes.has('entity-1')).toBe(false);
    });
  });

  describe('filters', () => {
    it('writes static filter from clip config', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      store.addClip({
        id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
        timelineIn: 0, timelineOut: 5, sourceIn: 0,
        speed: 1, muted: false, disabled: false, blendMode: 'normal',
        filters: 'blur(5px)',
      });
      store.seek(2.5);

      system.tick(createTickContext());

      expect(useCompositingStore.getState().filters.get('entity-1')).toContain('blur(5px)');
    });

    it('builds filter string from overlay properties', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      store.addClip({
        id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
        timelineIn: 0, timelineOut: 5, sourceIn: 0,
        speed: 1, muted: false, disabled: false, blendMode: 'normal',
      });
      store.seek(2.5);

      // Set filter values in the overlay (as if TimelineSystem wrote them)
      useAnimationOverlayStore.getState().setOverlay('entity-1', {
        filterBlur: 3,
        filterBrightness: 1.5,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      system.tick(createTickContext());

      const filter = useCompositingStore.getState().filters.get('entity-1');
      expect(filter).toContain('blur(3px)');
      expect(filter).toContain('brightness(1.5)');
    });
  });

  describe('masks', () => {
    it('writes mask config from clip', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      store.addClip({
        id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
        timelineIn: 0, timelineOut: 5, sourceIn: 0,
        speed: 1, muted: false, disabled: false, blendMode: 'normal',
        maskEntityId: 'mask-entity',
        maskMode: 'alpha',
      });
      store.seek(2.5);

      system.tick(createTickContext());

      const mask = useCompositingStore.getState().masks.get('entity-1');
      expect(mask).toBeDefined();
      expect(mask!.maskEntityId).toBe('mask-entity');
      expect(mask!.mode).toBe('alpha');
    });
  });

  describe('transform parenting', () => {
    it('computes child world position from parent', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();

      // Parent clip
      store.addClip({
        id: 'parent-clip', trackId: 'track-1', entityId: 'parent-entity',
        timelineIn: 0, timelineOut: 10, sourceIn: 0,
        speed: 1, muted: false, disabled: false, blendMode: 'normal',
      });

      // Child clip with parentEntityId
      store.addClip({
        id: 'child-clip', trackId: 'track-2', entityId: 'child-entity',
        timelineIn: 0, timelineOut: 10, sourceIn: 0,
        speed: 1, muted: false, disabled: false, blendMode: 'normal',
        parentEntityId: 'parent-entity',
      });

      store.seek(5);

      // Set parent at position (100, 50)
      useAnimationOverlayStore.getState().setOverlay('parent-entity', {
        positionX: 100,
        positionY: 50,
      });
      // Set child at local offset (10, 20)
      useAnimationOverlayStore.getState().setOverlay('child-entity', {
        positionX: 10,
        positionY: 20,
      });

      system.tick(createTickContext());

      const childOverlay = useAnimationOverlayStore.getState().getOverlay('child-entity');
      expect(childOverlay).toBeDefined();
      // World position = parent(100,50) + child(10,20) = (110, 70) — no rotation
      expect(childOverlay!.positionX).toBeCloseTo(110, 1);
      expect(childOverlay!.positionY).toBeCloseTo(70, 1);
    });
  });

  describe('clip visibility', () => {
    it('skips disabled clips', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      store.addClip({
        id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
        timelineIn: 0, timelineOut: 5, sourceIn: 0,
        speed: 1, muted: false, disabled: true, blendMode: 'screen',
      });
      store.seek(2.5);

      system.tick(createTickContext());

      expect(useCompositingStore.getState().blendModes.has('entity-1')).toBe(false);
    });

    it('skips clips outside playhead range', () => {
      const store = useTimelineStore.getState();
      store.enterTimelineMode();
      store.addClip({
        id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
        timelineIn: 5, timelineOut: 10, sourceIn: 0,
        speed: 1, muted: false, disabled: false, blendMode: 'overlay',
      });
      store.seek(2); // Before clip starts

      system.tick(createTickContext());

      expect(useCompositingStore.getState().blendModes.has('entity-1')).toBe(false);
    });
  });
});
