/**
 * Audio entity renderer — audio player with waveform placeholder.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React, { useRef, useCallback } from 'react';

import type { AudioEntity } from '@sn/types';

import { entityTransformStyle } from './entity-style';

export interface AudioRendererProps {
  entity: AudioEntity;
  isSelected: boolean;
}

export const AudioRenderer: React.FC<AudioRendererProps> = ({ entity, isSelected }) => {
  const style = entityTransformStyle(entity);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, []);

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="audio"
      style={{
        ...style,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--sn-surface, #1a1a2e)',
        border: `1px solid var(--sn-border, #e5e7eb)`,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        padding: 8,
        gap: 6,
      }}
    >
      {/* Waveform placeholder */}
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          minHeight: 0,
        }}
      >
        {Array.from({ length: 24 }, (_, i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: `${20 + Math.sin(i * 0.7) * 60}%`,
              background: entity.waveformColor ?? 'var(--sn-accent, #3b82f6)',
              borderRadius: 2,
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      {/* Play button */}
      <button
        type="button"
        onClick={togglePlay}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--sn-text, #ffffff)',
          cursor: 'pointer',
          fontSize: 18,
          padding: '2px 8px',
        }}
        aria-label="Toggle audio playback"
      >
        &#9654;
      </button>

      <audio
        ref={audioRef}
        src={entity.assetUrl}
        autoPlay={entity.autoplay}
        loop={entity.loop}
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
