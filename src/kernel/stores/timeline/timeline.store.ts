/**
 * Timeline Store — playhead state, transport controls, and timeline data
 *
 * @module kernel/stores/timeline
 *
 * @remarks
 * Owns all timeline/video production state for the active canvas:
 * - Playhead position and transport (play/pause/stop/seek)
 * - Timeline data (tracks, clips, property tracks, markers)
 * - UI state (zoom, scroll, selection, snap)
 *
 * All mutations emit corresponding TimelineEvents on the bus.
 */

import { create } from 'zustand';

import type {
  CompositionSettings,
  TimelineTrack,
  TimelineClip,
  PropertyTrack,
  TimelineMarker,
  LoopRegion,
  TimelineData,
} from '@sn/types';
import { TimelineEvents } from '@sn/types';

import { bus } from '../../bus';

// =============================================================================
// State & Actions
// =============================================================================

export interface TimelineState {
  /** Whether timeline mode is active for current canvas */
  isTimelineMode: boolean;
  /** Current playhead position in seconds */
  playheadTime: number;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Playback rate multiplier (0.25, 0.5, 1, 2, etc.) */
  playbackRate: number;
  /** Playback direction (1 = forward, -1 = reverse) */
  playbackDirection: 1 | -1;
  /** Timeline zoom level (pixels per second) */
  pixelsPerSecond: number;
  /** Horizontal scroll offset in seconds */
  scrollOffset: number;
  /** Selected clip IDs */
  selectedClipIds: string[];
  /** Selected keyframe IDs */
  selectedKeyframeIds: string[];
  /** Snap-to-grid enabled */
  snapEnabled: boolean;
  /** Snap grid size in seconds */
  snapGrid: number;

  // --- Timeline Data ---
  /** Composition settings */
  composition: CompositionSettings;
  /** All tracks */
  tracks: TimelineTrack[];
  /** All clips */
  clips: TimelineClip[];
  /** All property tracks */
  propertyTracks: PropertyTrack[];
  /** Markers */
  markers: TimelineMarker[];
  /** Loop region */
  loopRegion: LoopRegion;
}

export interface TimelineActions {
  // Transport
  play(): void;
  pause(): void;
  stop(): void;
  togglePlay(): void;
  seek(time: number): void;
  setPlayheadTime(time: number): void;
  setPlaybackRate(rate: number): void;
  setPlaybackDirection(dir: 1 | -1): void;
  skipForward(seconds: number): void;
  skipBackward(seconds: number): void;
  goToStart(): void;
  goToEnd(): void;

  // Mode
  enterTimelineMode(): void;
  exitTimelineMode(): void;

  // Timeline data
  loadTimelineData(data: TimelineData): void;
  setComposition(settings: Partial<CompositionSettings>): void;

  // Track CRUD
  addTrack(track: TimelineTrack): void;
  removeTrack(trackId: string): void;
  updateTrack(trackId: string, updates: Partial<TimelineTrack>): void;

  // Clip CRUD
  addClip(clip: TimelineClip): void;
  removeClip(clipId: string): void;
  updateClip(clipId: string, updates: Partial<TimelineClip>): void;

  // PropertyTrack CRUD
  addPropertyTrack(track: PropertyTrack): void;
  removePropertyTrack(trackId: string): void;

  // Marker CRUD
  addMarker(marker: TimelineMarker): void;
  removeMarker(markerId: string): void;

  // Loop region
  setLoopRegion(region: Partial<LoopRegion>): void;

  // Selection
  selectClips(ids: string[]): void;
  selectKeyframes(ids: string[]): void;

  // UI
  setZoom(pixelsPerSecond: number): void;
  setScrollOffset(offset: number): void;
  toggleSnap(): void;
  setSnapGrid(seconds: number): void;

  // Reset
  reset(): void;
}

export type TimelineStore = TimelineState & TimelineActions;

// =============================================================================
// Default State
// =============================================================================

const DEFAULT_COMPOSITION: CompositionSettings = {
  duration: 30,
  fps: 30,
  width: 1920,
  height: 1080,
  backgroundColor: '#000000',
  sampleRate: 48000,
};

const DEFAULT_LOOP_REGION: LoopRegion = {
  enabled: false,
  inPoint: 0,
  outPoint: 10,
};

// =============================================================================
// Store Implementation
// =============================================================================

export const useTimelineStore = create<TimelineStore>()((set, get) => ({
  // Initial state
  isTimelineMode: false,
  playheadTime: 0,
  isPlaying: false,
  playbackRate: 1,
  playbackDirection: 1,
  pixelsPerSecond: 100,
  scrollOffset: 0,
  selectedClipIds: [],
  selectedKeyframeIds: [],
  snapEnabled: true,
  snapGrid: 0.1,
  composition: DEFAULT_COMPOSITION,
  tracks: [],
  clips: [],
  propertyTracks: [],
  markers: [],
  loopRegion: DEFAULT_LOOP_REGION,

  // Transport
  play() {
    set({ isPlaying: true });
    bus.emit(TimelineEvents.PLAY, { time: get().playheadTime });
  },

  pause() {
    set({ isPlaying: false });
    bus.emit(TimelineEvents.PAUSE, { time: get().playheadTime });
  },

  stop() {
    set({ isPlaying: false, playheadTime: 0 });
    bus.emit(TimelineEvents.STOP, {});
  },

  togglePlay() {
    if (get().isPlaying) {
      get().pause();
    } else {
      get().play();
    }
  },

  seek(time: number) {
    const clamped = Math.max(0, Math.min(time, get().composition.duration));
    set({ playheadTime: clamped });
    bus.emit(TimelineEvents.SEEK, { time: clamped });
  },

  setPlayheadTime(time: number) {
    set({ playheadTime: Math.max(0, Math.min(time, get().composition.duration)) });
  },

  setPlaybackRate(rate: number) {
    set({ playbackRate: rate });
    bus.emit(TimelineEvents.PLAYBACK_RATE_CHANGED, { rate });
  },

  setPlaybackDirection(dir: 1 | -1) {
    set({ playbackDirection: dir });
  },

  skipForward(seconds: number) {
    const t = get().playheadTime + seconds;
    get().seek(t);
  },

  skipBackward(seconds: number) {
    const t = get().playheadTime - seconds;
    get().seek(t);
  },

  goToStart() {
    get().seek(0);
  },

  goToEnd() {
    get().seek(get().composition.duration);
  },

  // Mode
  enterTimelineMode() {
    set({ isTimelineMode: true });
    bus.emit(TimelineEvents.TIMELINE_MODE_ENTERED, {});
  },

  exitTimelineMode() {
    set({ isTimelineMode: false, isPlaying: false });
    bus.emit(TimelineEvents.TIMELINE_MODE_EXITED, {});
  },

  // Timeline data
  loadTimelineData(data: TimelineData) {
    set({
      composition: data.composition,
      tracks: data.tracks,
      clips: data.clips,
      propertyTracks: data.propertyTracks,
      markers: data.markers,
      loopRegion: data.loopRegion,
    });
  },

  setComposition(settings: Partial<CompositionSettings>) {
    set((state) => ({
      composition: { ...state.composition, ...settings },
    }));
    bus.emit(TimelineEvents.COMPOSITION_CHANGED, { settings: get().composition });
  },

  // Track CRUD
  addTrack(track: TimelineTrack) {
    set((state) => ({ tracks: [...state.tracks, track] }));
    bus.emit(TimelineEvents.TRACK_ADDED, { track });
  },

  removeTrack(trackId: string) {
    set((state) => ({
      tracks: state.tracks.filter((t: TimelineTrack) => t.id !== trackId),
      clips: state.clips.filter((c: TimelineClip) => c.trackId !== trackId),
    }));
    bus.emit(TimelineEvents.TRACK_REMOVED, { trackId });
  },

  updateTrack(trackId: string, updates: Partial<TimelineTrack>) {
    set((state) => ({
      tracks: state.tracks.map((t: TimelineTrack) =>
        t.id === trackId ? { ...t, ...updates } : t,
      ),
    }));
    bus.emit(TimelineEvents.TRACK_UPDATED, { trackId, updates });
  },

  // Clip CRUD
  addClip(clip: TimelineClip) {
    set((state) => ({ clips: [...state.clips, clip] }));
    bus.emit(TimelineEvents.CLIP_ADDED, { clip });
  },

  removeClip(clipId: string) {
    set((state) => ({
      clips: state.clips.filter((c: TimelineClip) => c.id !== clipId),
      propertyTracks: state.propertyTracks.filter((pt: PropertyTrack) => pt.clipId !== clipId),
    }));
    bus.emit(TimelineEvents.CLIP_REMOVED, { clipId });
  },

  updateClip(clipId: string, updates: Partial<TimelineClip>) {
    set((state) => ({
      clips: state.clips.map((c: TimelineClip) =>
        c.id === clipId ? { ...c, ...updates } : c,
      ),
    }));
    bus.emit(TimelineEvents.CLIP_PROPERTY_CHANGED, { clipId, updates });
  },

  // PropertyTrack CRUD
  addPropertyTrack(track: PropertyTrack) {
    set((state) => ({ propertyTracks: [...state.propertyTracks, track] }));
    bus.emit(TimelineEvents.KEYFRAME_ADDED, { trackId: track.id });
  },

  removePropertyTrack(trackId: string) {
    set((state) => ({
      propertyTracks: state.propertyTracks.filter((pt: PropertyTrack) => pt.id !== trackId),
    }));
    bus.emit(TimelineEvents.KEYFRAME_REMOVED, { trackId });
  },

  // Marker CRUD
  addMarker(marker: TimelineMarker) {
    set((state) => ({ markers: [...state.markers, marker] }));
    bus.emit(TimelineEvents.MARKER_ADDED, { marker });
  },

  removeMarker(markerId: string) {
    set((state) => ({
      markers: state.markers.filter((m: TimelineMarker) => m.id !== markerId),
    }));
    bus.emit(TimelineEvents.MARKER_REMOVED, { markerId });
  },

  // Loop region
  setLoopRegion(region: Partial<LoopRegion>) {
    set((state) => ({
      loopRegion: { ...state.loopRegion, ...region },
    }));
    bus.emit(TimelineEvents.LOOP_REGION_CHANGED, { loopRegion: get().loopRegion });
  },

  // Selection
  selectClips(ids: string[]) {
    set({ selectedClipIds: ids });
  },

  selectKeyframes(ids: string[]) {
    set({ selectedKeyframeIds: ids });
  },

  // UI
  setZoom(pixelsPerSecond: number) {
    set({ pixelsPerSecond: Math.max(10, Math.min(1000, pixelsPerSecond)) });
  },

  setScrollOffset(offset: number) {
    set({ scrollOffset: Math.max(0, offset) });
  },

  toggleSnap() {
    set((state) => ({ snapEnabled: !state.snapEnabled }));
  },

  setSnapGrid(seconds: number) {
    set({ snapGrid: Math.max(0.01, seconds) });
  },

  // Reset
  reset() {
    set({
      isTimelineMode: false,
      playheadTime: 0,
      isPlaying: false,
      playbackRate: 1,
      playbackDirection: 1,
      pixelsPerSecond: 100,
      scrollOffset: 0,
      selectedClipIds: [],
      selectedKeyframeIds: [],
      snapEnabled: true,
      snapGrid: 0.1,
      composition: DEFAULT_COMPOSITION,
      tracks: [],
      clips: [],
      propertyTracks: [],
      markers: [],
      loopRegion: DEFAULT_LOOP_REGION,
    });
  },
}));

// =============================================================================
// Bus Subscriptions
// =============================================================================

export function setupTimelineBusSubscriptions(): void {
  // Timeline store listens for playhead updates from the TimelineSystem
  bus.subscribe(TimelineEvents.PLAYHEAD_MOVED, (event) => {
    const p = event.payload as { time?: number };
    if (p.time !== undefined) {
      useTimelineStore.setState({ playheadTime: p.time });
    }
  });
}
