/**
 * Timeline System — time-driven entity evaluation for video production
 *
 * @module kernel/systems/timeline-system
 *
 * @remarks
 * A TickSystem (priority 55) that advances the playhead and evaluates
 * entity states based on timeline clip data. Runs BEFORE the
 * EntityAnimationOrchestrator (priority 45) to ensure timeline-driven
 * values take precedence.
 *
 * On each tick:
 * 1. If playing, advance playheadTime by deltaTime * rate * direction
 * 2. For each clip active at current playhead: interpolate property tracks
 * 3. Write computed values to AnimationOverlay store
 * 4. Emit PLAYHEAD_MOVED event for UI sync
 */

import { bus } from '../bus';
import { TimelineEvents } from '../schemas/bus-event';
import type {
  AnimationOverlay,
  EasingName,
} from '../schemas/entity-animation';
import type {
  TimelineClip,
  PropertyTrack,
  TimelineKeyframe,
} from '../schemas/timeline';
import { useAnimationOverlayStore } from '../stores/canvas/animation-overlay.store';
import { useTimelineStore } from '../stores/timeline/timeline.store';
import type { TickContext, TickSystem } from '../world/tick-loop';

import { Easing } from './animation-system';

// =============================================================================
// Easing lookup
// =============================================================================

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

// =============================================================================
// Interface
// =============================================================================

export interface ITimelineSystem extends TickSystem {
  /** Check if timeline is actively driving entities */
  isActive(): boolean;
  /** Get entity IDs that have active clips at a given time */
  getActiveEntityIds(time: number): string[];
  /** Evaluate a single property at a specific time */
  evaluateProperty(propertyTrack: PropertyTrack, time: number): number;
  /** Step to an exact frame number (for export rendering) */
  stepToFrame(frameNumber: number): void;
  /** Get current frame number */
  getCurrentFrame(): number;
  /** Set of entity IDs currently controlled by the timeline */
  getTimelineControlledEntities(): Set<string>;
}

// =============================================================================
// Keyframe Interpolation
// =============================================================================

function interpolateKeyframes(
  keyframes: TimelineKeyframe[],
  time: number,
): number {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;

  // Before first keyframe — use first value
  if (time <= keyframes[0].time) return keyframes[0].value;

  // After last keyframe — use last value
  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) return last.value;

  // Find the two keyframes surrounding the current time
  for (let i = 0; i < keyframes.length - 1; i++) {
    const kf0 = keyframes[i];
    const kf1 = keyframes[i + 1];

    if (time >= kf0.time && time <= kf1.time) {
      const duration = kf1.time - kf0.time;
      if (duration <= 0) return kf1.value;

      const t = (time - kf0.time) / duration;
      const easingFn = EASING_MAP[kf1.easing] ?? Easing.linear;
      const easedT = easingFn(t);

      return kf0.value + (kf1.value - kf0.value) * easedT;
    }
  }

  return last.value;
}

// =============================================================================
// Implementation
// =============================================================================

export function createTimelineSystem(): ITimelineSystem {
  let lastEmitTime = 0;
  const EMIT_THROTTLE_MS = 1000 / 15; // 15Hz UI updates
  const timelineControlledEntities = new Set<string>();

  const system: ITimelineSystem = {
    name: 'timeline',
    priority: 55,

    tick(ctx: TickContext): void {
      const store = useTimelineStore.getState();
      if (!store.isTimelineMode) return;

      // Advance playhead if playing
      if (store.isPlaying) {
        let newTime = store.playheadTime +
          ctx.deltaTime * store.playbackRate * store.playbackDirection;

        // Handle loop region
        if (store.loopRegion.enabled) {
          if (newTime >= store.loopRegion.outPoint) {
            newTime = store.loopRegion.inPoint;
          } else if (newTime < store.loopRegion.inPoint) {
            newTime = store.loopRegion.outPoint;
          }
        }

        // Clamp to composition bounds
        if (newTime >= store.composition.duration) {
          if (store.loopRegion.enabled) {
            newTime = store.loopRegion.inPoint;
          } else {
            newTime = store.composition.duration;
            store.pause();
          }
        }
        if (newTime < 0) newTime = 0;

        store.setPlayheadTime(newTime);
      }

      // Evaluate entity states at current playhead
      const playheadTime = store.playheadTime;
      const overlayStore = useAnimationOverlayStore.getState();
      timelineControlledEntities.clear();

      for (const clip of store.clips) {
        if (clip.disabled || clip.muted) continue;

        // Check if playhead is within clip range
        if (playheadTime < clip.timelineIn || playheadTime > clip.timelineOut) {
          continue;
        }

        timelineControlledEntities.add(clip.entityId);

        // Calculate local time within the clip
        const localTime = (playheadTime - clip.timelineIn) * clip.speed + clip.sourceIn;

        // Find all property tracks for this clip
        const clipPropertyTracks = store.propertyTracks.filter(
          (pt: PropertyTrack) => pt.clipId === clip.id,
        );

        // Build overlay from interpolated property values
        const overlay: AnimationOverlay = {};
        for (const pt of clipPropertyTracks) {
          const value = interpolateKeyframes(pt.keyframes, localTime);
          (overlay as Record<string, number>)[pt.property] = value;
        }

        // Only write overlay if there are property tracks
        if (clipPropertyTracks.length > 0) {
          overlayStore.setOverlay(clip.entityId, overlay);
        }
      }

      // Throttled bus emit for UI sync
      const now = Date.now();
      if (now - lastEmitTime >= EMIT_THROTTLE_MS) {
        bus.emit(TimelineEvents.PLAYHEAD_MOVED, {
          time: playheadTime,
          frame: Math.floor(playheadTime * store.composition.fps),
        });
        lastEmitTime = now;
      }
    },

    isActive(): boolean {
      return useTimelineStore.getState().isTimelineMode;
    },

    getActiveEntityIds(time: number): string[] {
      const store = useTimelineStore.getState();
      return store.clips
        .filter((c: TimelineClip) =>
          !c.disabled && !c.muted &&
          time >= c.timelineIn && time <= c.timelineOut,
        )
        .map((c: TimelineClip) => c.entityId);
    },

    evaluateProperty(propertyTrack: PropertyTrack, time: number): number {
      return interpolateKeyframes(propertyTrack.keyframes, time);
    },

    stepToFrame(frameNumber: number): void {
      const fps = useTimelineStore.getState().composition.fps;
      const time = frameNumber / fps;
      useTimelineStore.getState().setPlayheadTime(time);
      // Manually evaluate at this time (same as tick body)
      system.tick({
        deltaTime: 0,
        elapsedTime: time,
        tickNumber: frameNumber,
        tickRate: fps,
        fixedDeltaTime: 1 / fps,
      });
    },

    getCurrentFrame(): number {
      const store = useTimelineStore.getState();
      return Math.floor(store.playheadTime * store.composition.fps);
    },

    getTimelineControlledEntities(): Set<string> {
      return new Set(timelineControlledEntities);
    },
  };

  return system;
}
