/**
 * Audio Engine Store — manages Web Audio API state for timeline mixing
 *
 * @module kernel/stores/timeline/audio-engine
 *
 * @remarks
 * Holds the state for the audio mixing engine. The AudioContext itself
 * is NOT stored here (not serializable) — it lives in the AudioEngineSystem.
 * This store tracks per-track volume/mute/solo state and master volume.
 */

import { create } from 'zustand';

// =============================================================================
// State & Actions
// =============================================================================

export interface TrackAudioState {
  volume: number;
  muted: boolean;
  solo: boolean;
}

export interface AudioEngineState {
  /** Whether the audio engine is initialized */
  initialized: boolean;
  /** Master volume (0-1) */
  masterVolume: number;
  /** Whether master is muted */
  masterMuted: boolean;
  /** Per-track audio state */
  trackAudioState: Map<string, TrackAudioState>;
  /** Audio context sample rate */
  sampleRate: number;
}

export interface AudioEngineActions {
  /** Initialize the engine */
  setInitialized(initialized: boolean): void;
  /** Set master volume */
  setMasterVolume(volume: number): void;
  /** Toggle master mute */
  toggleMasterMute(): void;
  /** Set per-track audio state */
  setTrackAudio(trackId: string, state: Partial<TrackAudioState>): void;
  /** Toggle track solo */
  toggleTrackSolo(trackId: string): void;
  /** Toggle track mute */
  toggleTrackMute(trackId: string): void;
  /** Remove track audio state */
  removeTrackAudio(trackId: string): void;
  /** Reset all state */
  reset(): void;
}

export type AudioEngineStore = AudioEngineState & AudioEngineActions;

// =============================================================================
// Store Implementation
// =============================================================================

export const useAudioEngineStore = create<AudioEngineStore>()((set, get) => ({
  initialized: false,
  masterVolume: 1,
  masterMuted: false,
  trackAudioState: new Map(),
  sampleRate: 48000,

  setInitialized(initialized: boolean) {
    set({ initialized });
  },

  setMasterVolume(volume: number) {
    set({ masterVolume: Math.max(0, Math.min(1, volume)) });
  },

  toggleMasterMute() {
    set((state) => ({ masterMuted: !state.masterMuted }));
  },

  setTrackAudio(trackId: string, updates: Partial<TrackAudioState>) {
    set((state) => {
      const next = new Map(state.trackAudioState);
      const current = next.get(trackId) ?? { volume: 1, muted: false, solo: false };
      next.set(trackId, { ...current, ...updates });
      return { trackAudioState: next };
    });
  },

  toggleTrackSolo(trackId: string) {
    const current = get().trackAudioState.get(trackId);
    get().setTrackAudio(trackId, { solo: !(current?.solo ?? false) });
  },

  toggleTrackMute(trackId: string) {
    const current = get().trackAudioState.get(trackId);
    get().setTrackAudio(trackId, { muted: !(current?.muted ?? false) });
  },

  removeTrackAudio(trackId: string) {
    set((state) => {
      const next = new Map(state.trackAudioState);
      next.delete(trackId);
      return { trackAudioState: next };
    });
  },

  reset() {
    set({
      initialized: false,
      masterVolume: 1,
      masterMuted: false,
      trackAudioState: new Map(),
      sampleRate: 48000,
    });
  },
}));
