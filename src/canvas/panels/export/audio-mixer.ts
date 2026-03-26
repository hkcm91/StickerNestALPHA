/**
 * Audio Mixer — offline audio rendering for video export
 *
 * @module canvas/panels/export/audio-mixer
 * @layer L4A-4
 *
 * @remarks
 * Uses OfflineAudioContext to mix all audio/video clip audio tracks
 * into a single AudioBuffer for muxing with the video stream.
 * Applies volume automation from PropertyTrack keyframes.
 */

import type { TimelineClip, TimelineKeyframe } from '@sn/types';

// =============================================================================
// Types
// =============================================================================

export interface AudioMixerConfig {
  duration: number;
  sampleRate: number;
  channels: number;
}

export interface AudioClipSource {
  clip: TimelineClip;
  audioBuffer: AudioBuffer;
  volumeKeyframes: TimelineKeyframe[];
}

// =============================================================================
// Audio Mixer
// =============================================================================

export interface IAudioMixer {
  /** Add an audio source to the mix */
  addSource(source: AudioClipSource): void;
  /** Render the final mixed audio */
  render(): Promise<AudioBuffer>;
  /** Get estimated mix duration */
  getDuration(): number;
}

export function createAudioMixer(config: AudioMixerConfig): IAudioMixer {
  const sources: AudioClipSource[] = [];

  return {
    addSource(source: AudioClipSource): void {
      sources.push(source);
    },

    async render(): Promise<AudioBuffer> {
      const offlineCtx = new OfflineAudioContext(
        config.channels,
        Math.ceil(config.duration * config.sampleRate),
        config.sampleRate,
      );

      for (const source of sources) {
        const { clip, audioBuffer, volumeKeyframes } = source;

        // Create buffer source
        const bufferSource = offlineCtx.createBufferSource();
        bufferSource.buffer = audioBuffer;

        // Create gain node for volume automation
        const gainNode = offlineCtx.createGain();

        // Apply volume keyframes
        if (volumeKeyframes.length > 0) {
          gainNode.gain.setValueAtTime(volumeKeyframes[0].value, 0);
          for (const kf of volumeKeyframes) {
            gainNode.gain.linearRampToValueAtTime(kf.value, kf.time);
          }
        } else {
          gainNode.gain.setValueAtTime(clip.muted ? 0 : 1, 0);
        }

        // Connect: source -> gain -> destination
        bufferSource.connect(gainNode);
        gainNode.connect(offlineCtx.destination);

        // Calculate timing
        const clipDuration = clip.timelineOut - clip.timelineIn;
        const sourceOffset = clip.sourceIn;

        // Schedule playback at the clip's timeline position
        bufferSource.start(clip.timelineIn, sourceOffset, clipDuration);
      }

      // Render the final mix
      return offlineCtx.startRendering();
    },

    getDuration(): number {
      return config.duration;
    },
  };
}

/**
 * Convert an AudioBuffer to a WAV Blob for download or muxing.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2; // 16-bit PCM
  const dataLength = length * numChannels * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Interleave channels and write PCM data
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = headerLength;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
