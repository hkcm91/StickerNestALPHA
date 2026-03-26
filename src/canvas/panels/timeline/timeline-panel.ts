/**
 * Timeline Panel Controller — CRUD for tracks, clips, keyframes + transport
 *
 * @module canvas/panels/timeline
 * @layer L4A-4
 *
 * @remarks
 * Reads timeline state from TimelineStore and dispatches mutations via
 * bus events. Follows the same controller pattern as PropertiesController
 * and AnimationPanelController.
 */

import type {
  CompositionSettings,
  TimelineTrack,
  TimelineClip,
  PropertyTrack,
  TimelineMarker,
  TimelineData,
  TrackType,
  LoopRegion,
  BlendMode,
  TimelineKeyframe,
} from '@sn/types';
import { TimelineEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useTimelineStore } from '../../../kernel/stores/timeline/timeline.store';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

// =============================================================================
// Interface
// =============================================================================

export interface TimelinePanelController {
  // Mode
  enterTimelineMode(): void;
  exitTimelineMode(): void;
  isTimelineMode(): boolean;
  isActiveInMode(): boolean;

  // Transport
  play(): void;
  pause(): void;
  stop(): void;
  togglePlay(): void;
  seek(time: number): void;
  setPlaybackRate(rate: number): void;
  skipForward(seconds: number): void;
  skipBackward(seconds: number): void;
  goToStart(): void;
  goToEnd(): void;
  goToNextMarker(): void;
  goToPrevMarker(): void;

  // Composition
  getComposition(): CompositionSettings;
  setComposition(settings: Partial<CompositionSettings>): void;

  // Track CRUD
  addTrack(name: string, type: TrackType): TimelineTrack;
  removeTrack(trackId: string): void;
  reorderTrack(trackId: string, newOrder: number): void;
  toggleTrackVisibility(trackId: string): void;
  toggleTrackLock(trackId: string): void;
  toggleTrackMute(trackId: string): void;
  toggleTrackSolo(trackId: string): void;

  // Clip CRUD
  addClipForEntity(entityId: string, trackId: string, timelineIn: number, timelineOut: number): TimelineClip;
  removeClip(clipId: string): void;
  moveClip(clipId: string, newTrackId: string, newTimelineIn: number): void;
  trimClipStart(clipId: string, newIn: number): void;
  trimClipEnd(clipId: string, newOut: number): void;
  splitClipAtTime(clipId: string, time: number): [string, string];
  setClipBlendMode(clipId: string, mode: BlendMode): void;
  setClipFilters(clipId: string, filters: string): void;

  // Keyframe CRUD
  addKeyframe(clipId: string, property: string, time: number, value: number): PropertyTrack;
  removeKeyframe(propertyTrackId: string, keyframeIndex: number): void;

  // Markers
  addMarker(time: number, label: string): TimelineMarker;
  removeMarker(markerId: string): void;

  // Loop region
  setLoopRegion(region: Partial<LoopRegion>): void;

  // Data
  loadTimelineData(data: TimelineData): void;
  getTimelineData(): TimelineData;

  // Utilities
  snapTimeToGrid(time: number): number;
  frameToTime(frame: number): number;
  timeToFrame(time: number): number;
}

// =============================================================================
// Implementation
// =============================================================================

let nextId = 1;
function generateId(): string {
  return `tl-${Date.now()}-${nextId++}`;
}

export function createTimelinePanelController(): TimelinePanelController {
  return {
    // Mode
    enterTimelineMode() {
      useTimelineStore.getState().enterTimelineMode();
    },

    exitTimelineMode() {
      useTimelineStore.getState().exitTimelineMode();
    },

    isTimelineMode(): boolean {
      return useTimelineStore.getState().isTimelineMode;
    },

    isActiveInMode(): boolean {
      const mode = useUIStore.getState().canvasInteractionMode;
      return mode === 'edit';
    },

    // Transport
    play() { useTimelineStore.getState().play(); },
    pause() { useTimelineStore.getState().pause(); },
    stop() { useTimelineStore.getState().stop(); },
    togglePlay() { useTimelineStore.getState().togglePlay(); },

    seek(time: number) {
      useTimelineStore.getState().seek(time);
    },

    setPlaybackRate(rate: number) {
      useTimelineStore.getState().setPlaybackRate(rate);
    },

    skipForward(seconds: number) {
      useTimelineStore.getState().skipForward(seconds);
    },

    skipBackward(seconds: number) {
      useTimelineStore.getState().skipBackward(seconds);
    },

    goToStart() { useTimelineStore.getState().goToStart(); },
    goToEnd() { useTimelineStore.getState().goToEnd(); },

    goToNextMarker() {
      const store = useTimelineStore.getState();
      const sorted = [...store.markers].sort((a, b) => a.time - b.time);
      const next = sorted.find((m) => m.time > store.playheadTime + 0.01);
      if (next) store.seek(next.time);
    },

    goToPrevMarker() {
      const store = useTimelineStore.getState();
      const sorted = [...store.markers].sort((a, b) => b.time - a.time);
      const prev = sorted.find((m) => m.time < store.playheadTime - 0.01);
      if (prev) store.seek(prev.time);
    },

    // Composition
    getComposition(): CompositionSettings {
      return useTimelineStore.getState().composition;
    },

    setComposition(settings: Partial<CompositionSettings>) {
      useTimelineStore.getState().setComposition(settings);
    },

    // Track CRUD
    addTrack(name: string, type: TrackType): TimelineTrack {
      const store = useTimelineStore.getState();
      const track: TimelineTrack = {
        id: generateId(),
        name,
        type,
        order: store.tracks.length,
        locked: false,
        visible: true,
        volume: 1,
        solo: false,
        height: 40,
      };
      store.addTrack(track);
      return track;
    },

    removeTrack(trackId: string) {
      useTimelineStore.getState().removeTrack(trackId);
    },

    reorderTrack(trackId: string, newOrder: number) {
      useTimelineStore.getState().updateTrack(trackId, { order: newOrder });
    },

    toggleTrackVisibility(trackId: string) {
      const store = useTimelineStore.getState();
      const track = store.tracks.find((t: TimelineTrack) => t.id === trackId);
      if (track) {
        store.updateTrack(trackId, { visible: !track.visible });
      }
    },

    toggleTrackLock(trackId: string) {
      const store = useTimelineStore.getState();
      const track = store.tracks.find((t: TimelineTrack) => t.id === trackId);
      if (track) {
        store.updateTrack(trackId, { locked: !track.locked });
      }
    },

    toggleTrackMute(trackId: string) {
      const store = useTimelineStore.getState();
      const track = store.tracks.find((t: TimelineTrack) => t.id === trackId);
      if (track) {
        // For audio tracks, toggle audio mute
        // For entity tracks, toggle visibility
        if (track.type === 'audio') {
          store.updateTrack(trackId, { volume: track.volume > 0 ? 0 : 1 });
        } else {
          store.updateTrack(trackId, { visible: !track.visible });
        }
      }
    },

    toggleTrackSolo(trackId: string) {
      const store = useTimelineStore.getState();
      const track = store.tracks.find((t: TimelineTrack) => t.id === trackId);
      if (track) {
        store.updateTrack(trackId, { solo: !track.solo });
      }
    },

    // Clip CRUD
    addClipForEntity(entityId: string, trackId: string, timelineIn: number, timelineOut: number): TimelineClip {
      const clip: TimelineClip = {
        id: generateId(),
        trackId,
        entityId,
        timelineIn,
        timelineOut,
        sourceIn: 0,
        speed: 1,
        muted: false,
        disabled: false,
        blendMode: 'normal',
      };
      useTimelineStore.getState().addClip(clip);
      return clip;
    },

    removeClip(clipId: string) {
      useTimelineStore.getState().removeClip(clipId);
    },

    moveClip(clipId: string, newTrackId: string, newTimelineIn: number) {
      const store = useTimelineStore.getState();
      const clip = store.clips.find((c: TimelineClip) => c.id === clipId);
      if (!clip) return;

      const duration = clip.timelineOut - clip.timelineIn;
      store.updateClip(clipId, {
        trackId: newTrackId,
        timelineIn: newTimelineIn,
        timelineOut: newTimelineIn + duration,
      });
      bus.emit(TimelineEvents.CLIP_MOVED, { clipId, newTrackId, newTimelineIn });
    },

    trimClipStart(clipId: string, newIn: number) {
      const store = useTimelineStore.getState();
      const clip = store.clips.find((c: TimelineClip) => c.id === clipId);
      if (!clip || newIn >= clip.timelineOut) return;

      const delta = newIn - clip.timelineIn;
      store.updateClip(clipId, {
        timelineIn: newIn,
        sourceIn: clip.sourceIn + delta * clip.speed,
      });
      bus.emit(TimelineEvents.CLIP_TRIMMED, { clipId, edge: 'start', newIn });
    },

    trimClipEnd(clipId: string, newOut: number) {
      const store = useTimelineStore.getState();
      const clip = store.clips.find((c: TimelineClip) => c.id === clipId);
      if (!clip || newOut <= clip.timelineIn) return;

      store.updateClip(clipId, { timelineOut: newOut });
      bus.emit(TimelineEvents.CLIP_TRIMMED, { clipId, edge: 'end', newOut });
    },

    splitClipAtTime(clipId: string, time: number): [string, string] {
      const store = useTimelineStore.getState();
      const clip = store.clips.find((c: TimelineClip) => c.id === clipId);
      if (!clip || time <= clip.timelineIn || time >= clip.timelineOut) {
        return [clipId, clipId];
      }

      const newId = generateId();

      // Update original clip (trim end to split point)
      store.updateClip(clipId, { timelineOut: time });

      // Create new clip (from split point to original end)
      const sourceOffset = (time - clip.timelineIn) * clip.speed + clip.sourceIn;
      const newClip: TimelineClip = {
        ...clip,
        id: newId,
        timelineIn: time,
        timelineOut: clip.timelineOut,
        sourceIn: sourceOffset,
      };
      store.addClip(newClip);

      bus.emit(TimelineEvents.CLIP_SPLIT, { originalClipId: clipId, newClipId: newId, splitTime: time });
      return [clipId, newId];
    },

    setClipBlendMode(clipId: string, mode: BlendMode) {
      useTimelineStore.getState().updateClip(clipId, { blendMode: mode });
    },

    setClipFilters(clipId: string, filters: string) {
      useTimelineStore.getState().updateClip(clipId, { filters });
    },

    // Keyframe CRUD
    addKeyframe(clipId: string, property: string, time: number, value: number): PropertyTrack {
      const store = useTimelineStore.getState();
      const existing = store.propertyTracks.find(
        (pt: PropertyTrack) => pt.clipId === clipId && pt.property === property,
      );

      if (existing) {
        // Add keyframe to existing property track
        const newKeyframes = [...existing.keyframes, { time, value, easing: 'linear' as const }]
          .sort((a: TimelineKeyframe, b: TimelineKeyframe) => a.time - b.time);
        const updated: PropertyTrack = { ...existing, keyframes: newKeyframes };
        store.removePropertyTrack(existing.id);
        store.addPropertyTrack(updated);
        return updated;
      }

      // Create new property track
      const track: PropertyTrack = {
        id: generateId(),
        clipId,
        property: property as PropertyTrack['property'],
        keyframes: [{ time, value, easing: 'linear' as const }],
      };
      store.addPropertyTrack(track);
      return track;
    },

    removeKeyframe(propertyTrackId: string, keyframeIndex: number) {
      const store = useTimelineStore.getState();
      const pt = store.propertyTracks.find((t: PropertyTrack) => t.id === propertyTrackId);
      if (!pt) return;

      const newKeyframes = pt.keyframes.filter((_: TimelineKeyframe, i: number) => i !== keyframeIndex);
      if (newKeyframes.length === 0) {
        store.removePropertyTrack(propertyTrackId);
      } else {
        store.removePropertyTrack(propertyTrackId);
        store.addPropertyTrack({ ...pt, keyframes: newKeyframes });
      }
    },

    // Markers
    addMarker(time: number, label: string): TimelineMarker {
      const marker: TimelineMarker = {
        id: generateId(),
        time,
        label,
        color: '#ff0000',
      };
      useTimelineStore.getState().addMarker(marker);
      return marker;
    },

    removeMarker(markerId: string) {
      useTimelineStore.getState().removeMarker(markerId);
    },

    // Loop region
    setLoopRegion(region: Partial<LoopRegion>) {
      useTimelineStore.getState().setLoopRegion(region);
    },

    // Data
    loadTimelineData(data: TimelineData) {
      useTimelineStore.getState().loadTimelineData(data);
    },

    getTimelineData(): TimelineData {
      const store = useTimelineStore.getState();
      return {
        composition: store.composition,
        tracks: store.tracks,
        clips: store.clips,
        propertyTracks: store.propertyTracks,
        markers: store.markers,
        loopRegion: store.loopRegion,
      };
    },

    // Utilities
    snapTimeToGrid(time: number): number {
      const store = useTimelineStore.getState();
      if (!store.snapEnabled) return time;
      return Math.round(time / store.snapGrid) * store.snapGrid;
    },

    frameToTime(frame: number): number {
      return frame / useTimelineStore.getState().composition.fps;
    },

    timeToFrame(time: number): number {
      return Math.floor(time * useTimelineStore.getState().composition.fps);
    },
  };
}
