/**
 * TimelineClipArea — scrollable area with clip bars and playhead
 *
 * @module shell/canvas/panels/timeline
 * @layer L6
 */

import React, { useCallback, useRef, useState } from 'react';

import type { TimelineTrack } from '@sn/types';

import { useTimelineStore } from '../../../../kernel/stores/timeline/timeline.store';

import { getTrackY } from './timeline-utils';
import { TimelineClipBar } from './TimelineClipBar';
import { TimelinePlayhead } from './TimelinePlayhead';

export const TimelineClipArea: React.FC<{ width: number }> = ({ width: _width }) => {
  const tracks = useTimelineStore((s) => s.tracks);
  const clips = useTimelineStore((s) => s.clips);
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond);
  const scrollOffset = useTimelineStore((s) => s.scrollOffset);
  const selectedClipIds = useTimelineStore((s) => s.selectedClipIds);
  const containerRef = useRef<HTMLDivElement>(null);
  const [_hoverTime, setHoverTime] = useState<number | null>(null);

  const sortedTracks = [...tracks].sort((a: TimelineTrack, b: TimelineTrack) => a.order - b.order);
  const trackHeights = sortedTracks.map((t: TimelineTrack) => t.height);
  const totalHeight = trackHeights.reduce((sum: number, h: number) => sum + h, 0);

  const handleSelectClip = useCallback((clipId: string, addToSelection: boolean) => {
    const store = useTimelineStore.getState();
    if (addToSelection) {
      const current = store.selectedClipIds;
      if (current.includes(clipId)) {
        store.selectClips(current.filter((id: string) => id !== clipId));
      } else {
        store.selectClips([...current, clipId]);
      }
    } else {
      store.selectClips([clipId]);
    }
  }, []);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    // Click on empty area = seek + deselect
    if (e.target === e.currentTarget) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const time = x / pixelsPerSecond + scrollOffset;
      useTimelineStore.getState().seek(Math.max(0, time));
      useTimelineStore.getState().selectClips([]);
    }
  }, [pixelsPerSecond, scrollOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    setHoverTime(x / pixelsPerSecond + scrollOffset);
  }, [pixelsPerSecond, scrollOffset]);

  const handleScroll = useCallback((e: React.WheelEvent) => {
    if (e.shiftKey) {
      // Horizontal scroll = change scroll offset
      const dt = e.deltaY / pixelsPerSecond;
      useTimelineStore.getState().setScrollOffset(
        Math.max(0, useTimelineStore.getState().scrollOffset + dt),
      );
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl+scroll = zoom
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? -10 : 10;
      useTimelineStore.getState().setZoom(pixelsPerSecond + zoomDelta);
    }
  }, [pixelsPerSecond]);

  return (
    <div
      ref={containerRef}
      onClick={handleBackgroundClick}
      onMouseMove={handleMouseMove}
      onWheel={handleScroll}
      style={{
        position: 'relative',
        flex: 1,
        minHeight: Math.max(totalHeight, 80),
        background: 'var(--sn-bg, #0f172a)',
        overflow: 'hidden',
      }}
    >
      {/* Track row backgrounds */}
      {sortedTracks.map((track: TimelineTrack, i: number) => (
        <div
          key={track.id}
          style={{
            position: 'absolute',
            left: 0,
            top: getTrackY(i, trackHeights),
            width: '100%',
            height: track.height,
            borderBottom: '1px solid var(--sn-border, #1e293b)',
            background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
          }}
        />
      ))}

      {/* Clip bars */}
      {clips.map((clip) => {
        const trackIndex = sortedTracks.findIndex((t: TimelineTrack) => t.id === clip.trackId);
        if (trackIndex === -1) return null;
        const y = getTrackY(trackIndex, trackHeights);
        const track = sortedTracks[trackIndex];

        return (
          <div
            key={clip.id}
            style={{
              position: 'absolute',
              top: y,
              left: 0,
              width: '100%',
              height: track.height,
            }}
          >
            <TimelineClipBar
              clip={clip}
              entityType="default" // TODO: resolve from scene graph
              entityName={clip.entityId.slice(0, 8)}
              pixelsPerSecond={pixelsPerSecond}
              scrollOffset={scrollOffset}
              trackHeight={track.height}
              isSelected={selectedClipIds.includes(clip.id)}
              onSelect={handleSelectClip}
            />
          </div>
        );
      })}

      {/* Playhead */}
      <TimelinePlayhead height={Math.max(totalHeight, 80)} />
    </div>
  );
};
