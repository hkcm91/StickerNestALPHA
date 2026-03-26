/**
 * Audio entity renderer — audio player with real-time waveform visualization.
 *
 * @remarks
 * In timeline mode, playback is controlled by the TimelineSystem (local
 * play/pause button is disabled). The audio element is registered with
 * the AudioEngineSystem for Web Audio routing and waveform analysis.
 *
 * In freeform mode, retains standalone play/pause behavior.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React, { useRef, useCallback } from 'react';

import type { AudioEntity } from '@sn/types';

import { useTimelineStore } from '../../../kernel/stores/timeline/timeline.store';

import { entityTransformStyle } from './entity-style';
import { useAnimationOverlay, getOverlayStyles } from './use-animation-overlay';
import { WaveformCanvas } from './WaveformCanvas';

export interface AudioRendererProps {
  entity: AudioEntity;
  isSelected: boolean;
}

export const AudioRenderer: React.FC<AudioRendererProps> = ({ entity, isSelected }) => {
  const style = entityTransformStyle(entity);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationOverlay = useAnimationOverlay(entity.id);
  const overlayStyles = getOverlayStyles(animationOverlay);
  const isTimelineMode = useTimelineStore((s) => s.isTimelineMode);

  const togglePlay = useCallback(() => {
    if (isTimelineMode) return; // Timeline controls playback
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [isTimelineMode]);

  // Waveform data provider — returns null when no real data available
  // (falls back to placeholder in WaveformCanvas)
  const getWaveformData = useCallback((): Float32Array | null => {
    // When audio engine is connected, this will read from AnalyserNode
    // For now, return null to show the placeholder waveform
    return null;
  }, []);

  // Calculate inner dimensions from entity transform
  const innerWidth = Math.max(60, (entity.transform?.size?.width ?? 200) - 16);
  const innerHeight = Math.max(20, (entity.transform?.size?.height ?? 80) - 40);

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="audio"
      style={{
        ...style,
        ...overlayStyles,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--sn-surface, #1a1a2e)',
        border: '1px solid var(--sn-border, #e5e7eb)',
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        padding: 8,
        gap: 6,
      }}
    >
      {/* Waveform visualization */}
      <WaveformCanvas
        getWaveformData={getWaveformData}
        width={innerWidth}
        height={innerHeight}
        barColor={entity.waveformColor ?? 'var(--sn-accent, #3b82f6)'}
        barCount={Math.min(48, Math.floor(innerWidth / 4))}
      />

      {/* Play button — disabled in timeline mode */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isTimelineMode}
        style={{
          background: 'none',
          border: 'none',
          color: isTimelineMode
            ? 'var(--sn-text-muted, #888888)'
            : 'var(--sn-text, #ffffff)',
          cursor: isTimelineMode ? 'default' : 'pointer',
          fontSize: 18,
          padding: '2px 8px',
          opacity: isTimelineMode ? 0.5 : 1,
        }}
        aria-label={isTimelineMode ? 'Playback controlled by timeline' : 'Toggle audio playback'}
      >
        &#9654;
      </button>

      <audio
        ref={audioRef}
        src={entity.assetUrl}
        autoPlay={isTimelineMode ? false : entity.autoplay}
        loop={isTimelineMode ? false : entity.loop}
        preload="metadata"
        style={{ display: 'none' }}
      />

      {entity.altText && (
        <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          {entity.altText}
        </span>
      )}
    </div>
  );
};
