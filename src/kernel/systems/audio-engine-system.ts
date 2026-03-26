/**
 * Audio Engine System — Web Audio API graph management for timeline mixing
 *
 * @module kernel/systems/audio-engine-system
 *
 * @remarks
 * A TickSystem (priority 40) that manages the Web Audio API graph:
 * - Creates AudioContext lazily on first user gesture
 * - Creates MediaElementSourceNode per audio/video entity
 * - Routes through per-track GainNode and effect chains
 * - Syncs media element currentTime to playhead
 * - Generates waveform data via AnalyserNode
 *
 * Runs AFTER TimelineSystem (55) and EntityAnimationOrchestrator (45).
 */

import { useAudioEngineStore } from '../stores/timeline/audio-engine.store';
import { useTimelineStore } from '../stores/timeline/timeline.store';
import type { TickContext, TickSystem } from '../world/tick-loop';

// =============================================================================
// Interface
// =============================================================================

export interface IAudioEngineSystem extends TickSystem {
  /** Get the AudioContext (null until first user gesture) */
  getContext(): AudioContext | null;
  /** Initialize AudioContext (must be called from user gesture handler) */
  initContext(): AudioContext;
  /** Register an audio/video element for routing */
  registerSource(clipId: string, element: HTMLMediaElement): void;
  /** Unregister an audio source */
  unregisterSource(clipId: string): void;
  /** Get waveform frequency data for a source */
  getWaveformData(clipId: string): Float32Array | null;
  /** Get master analyser waveform data */
  getMasterWaveform(): Float32Array | null;
  /** Set master volume (0-1) */
  setMasterVolume(volume: number): void;
  /** Seek all media elements to a specific time */
  seekAllTo(time: number): void;
  /** Dispose all resources */
  dispose(): void;
}

// =============================================================================
// Source Entry
// =============================================================================

interface AudioSourceEntry {
  clipId: string;
  element: HTMLMediaElement;
  sourceNode: MediaElementAudioSourceNode;
  gainNode: GainNode;
  analyserNode: AnalyserNode;
}

// =============================================================================
// Implementation
// =============================================================================

export function createAudioEngineSystem(): IAudioEngineSystem {
  let audioContext: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let masterAnalyser: AnalyserNode | null = null;
  const sources = new Map<string, AudioSourceEntry>();
  let lastSyncTime = -1;

  const system: IAudioEngineSystem = {
    name: 'audio-engine',
    priority: 40,

    tick(_ctx: TickContext): void {
      const timelineStore = useTimelineStore.getState();
      if (!timelineStore.isTimelineMode || !audioContext) return;

      const audioStore = useAudioEngineStore.getState();

      // Update master volume
      if (masterGain) {
        const effectiveVolume = audioStore.masterMuted ? 0 : audioStore.masterVolume;
        masterGain.gain.setValueAtTime(effectiveVolume, audioContext.currentTime);
      }

      // Sync media elements to playhead
      const playheadTime = timelineStore.playheadTime;
      if (Math.abs(playheadTime - lastSyncTime) > 0.05) {
        system.seekAllTo(playheadTime);
        lastSyncTime = playheadTime;
      }

      // Update per-source gain from track audio state
      for (const [clipId, entry] of sources) {
        const clip = timelineStore.clips.find((c: { id: string }) => c.id === clipId);
        if (!clip) continue;

        const trackState = audioStore.trackAudioState.get(clip.trackId);
        const trackVolume = trackState?.volume ?? 1;
        const trackMuted = trackState?.muted ?? false;
        const trackSolo = trackState?.solo ?? false;

        // Check if any track has solo active
        const anySolo = Array.from(audioStore.trackAudioState.values()).some((s) => s.solo);
        const shouldPlay = anySolo ? trackSolo : !trackMuted;

        const effectiveGain = shouldPlay ? trackVolume : 0;
        entry.gainNode.gain.setValueAtTime(effectiveGain, audioContext.currentTime);

        // Play/pause media elements based on timeline state
        if (timelineStore.isPlaying && shouldPlay &&
            playheadTime >= clip.timelineIn && playheadTime <= clip.timelineOut) {
          if (entry.element.paused) {
            entry.element.play().catch(() => { /* ignore autoplay rejection */ });
          }
        } else {
          if (!entry.element.paused) {
            entry.element.pause();
          }
        }
      }
    },

    getContext(): AudioContext | null {
      return audioContext;
    },

    initContext(): AudioContext {
      if (audioContext) return audioContext;

      audioContext = new AudioContext({
        sampleRate: useAudioEngineStore.getState().sampleRate,
      });

      masterGain = audioContext.createGain();
      masterAnalyser = audioContext.createAnalyser();
      masterAnalyser.fftSize = 2048;

      masterGain.connect(masterAnalyser);
      masterAnalyser.connect(audioContext.destination);

      useAudioEngineStore.getState().setInitialized(true);
      return audioContext;
    },

    registerSource(clipId: string, element: HTMLMediaElement): void {
      if (sources.has(clipId)) return;

      const ctx = audioContext ?? system.initContext();
      const sourceNode = ctx.createMediaElementSource(element);
      const gainNode = ctx.createGain();
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 1024;

      sourceNode.connect(gainNode);
      gainNode.connect(analyserNode);
      analyserNode.connect(masterGain!);

      sources.set(clipId, {
        clipId,
        element,
        sourceNode,
        gainNode,
        analyserNode,
      });
    },

    unregisterSource(clipId: string): void {
      const entry = sources.get(clipId);
      if (!entry) return;

      entry.sourceNode.disconnect();
      entry.gainNode.disconnect();
      entry.analyserNode.disconnect();
      sources.delete(clipId);
    },

    getWaveformData(clipId: string): Float32Array | null {
      const entry = sources.get(clipId);
      if (!entry) return null;

      const data = new Float32Array(entry.analyserNode.frequencyBinCount);
      entry.analyserNode.getFloatTimeDomainData(data);
      return data;
    },

    getMasterWaveform(): Float32Array | null {
      if (!masterAnalyser) return null;

      const data = new Float32Array(masterAnalyser.frequencyBinCount);
      masterAnalyser.getFloatTimeDomainData(data);
      return data;
    },

    setMasterVolume(volume: number): void {
      useAudioEngineStore.getState().setMasterVolume(volume);
      if (masterGain && audioContext) {
        masterGain.gain.setValueAtTime(volume, audioContext.currentTime);
      }
    },

    seekAllTo(time: number): void {
      const timelineStore = useTimelineStore.getState();
      for (const [clipId, entry] of sources) {
        const clip = timelineStore.clips.find((c: { id: string }) => c.id === clipId);
        if (!clip) continue;

        // Calculate source media time from timeline time
        const localTime = (time - clip.timelineIn) * clip.speed + clip.sourceIn;
        if (isFinite(localTime) && localTime >= 0) {
          entry.element.currentTime = localTime;
        }
      }
    },

    dispose(): void {
      for (const entry of sources.values()) {
        entry.sourceNode.disconnect();
        entry.gainNode.disconnect();
        entry.analyserNode.disconnect();
      }
      sources.clear();

      if (masterGain) masterGain.disconnect();
      if (masterAnalyser) masterAnalyser.disconnect();
      if (audioContext) {
        audioContext.close().catch(() => {});
      }

      audioContext = null;
      masterGain = null;
      masterAnalyser = null;
      lastSyncTime = -1;

      useAudioEngineStore.getState().reset();
    },

    onUnregister(): void {
      system.dispose();
    },
  };

  return system;
}
