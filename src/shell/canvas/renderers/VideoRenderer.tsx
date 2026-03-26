/**
 * Video entity renderer — frame-accurate video playback on canvas
 *
 * @remarks
 * In timeline mode, the video is always paused and currentTime is set
 * by the TimelineSystem. In freeform canvas mode, the video plays
 * normally based on entity config (autoplay, loop, etc.).
 *
 * Uses useAnimationOverlay for timeline-driven property changes.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React, { useRef, useEffect } from 'react';

import type { VideoEntity } from '@sn/types';

import { entityTransformStyle, RENDER_SIZE_MULTIPLIER } from './entity-style';
import { useAnimationOverlay, getOverlayStyles } from './use-animation-overlay';

interface VideoRendererProps {
  entity: VideoEntity;
  isSelected: boolean;
  interactionMode?: 'edit' | 'preview';
}

export const VideoRenderer: React.FC<VideoRendererProps> = ({
  entity,
  isSelected,
  interactionMode: _interactionMode = 'edit',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationOverlay = useAnimationOverlay(entity.id);
  const overlayStyles = getOverlayStyles(animationOverlay);
  const style = entityTransformStyle(entity);

  // Register video element with AudioEngineSystem when available
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set initial volume
    video.volume = entity.audioMuted ? 0 : entity.volume;

    return () => {
      // Cleanup will be handled by AudioEngineSystem unregister
    };
  }, [entity.volume, entity.audioMuted]);

  const mediaStyle: React.CSSProperties = {
    width: `${100 * RENDER_SIZE_MULTIPLIER}%`,
    height: `${100 * RENDER_SIZE_MULTIPLIER}%`,
    transform: `scale(${1 / RENDER_SIZE_MULTIPLIER})`,
    transformOrigin: 'center center',
    objectFit: 'contain',
    display: 'block',
    flexShrink: 0,
  };

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="video"
      style={{
        ...style,
        ...overlayStyles,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        cursor: entity.locked ? 'default' : 'grab',
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        src={entity.assetUrl}
        poster={entity.showPoster ? entity.thumbnailUrl : undefined}
        preload="metadata"
        playsInline
        muted={entity.audioMuted}
        style={mediaStyle}
      />
      {/* Video duration badge when selected */}
      {isSelected && entity.nativeDuration && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            fontFamily: 'var(--sn-font-family, system-ui)',
            pointerEvents: 'none',
          }}
        >
          {formatDuration(entity.nativeDuration)}
        </div>
      )}
    </div>
  );
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
