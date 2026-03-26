/**
 * TimelineClipBar — draggable/resizable clip bar in the timeline
 *
 * @module shell/canvas/panels/timeline
 * @layer L6
 */

import React, { useCallback, useRef, useState } from 'react';

import type { TimelineClip } from '@sn/types';

import { useTimelineStore } from '../../../../kernel/stores/timeline/timeline.store';

import { timeToPixels, getClipColor } from './timeline-utils';

interface TimelineClipBarProps {
  clip: TimelineClip;
  entityType: string;
  entityName: string;
  pixelsPerSecond: number;
  scrollOffset: number;
  trackHeight: number;
  isSelected: boolean;
  onSelect: (clipId: string, addToSelection: boolean) => void;
}

export const TimelineClipBar: React.FC<TimelineClipBarProps> = ({
  clip,
  entityType,
  entityName,
  pixelsPerSecond,
  scrollOffset,
  trackHeight,
  isSelected,
  onSelect,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [trimEdge, setTrimEdge] = useState<'start' | 'end' | null>(null);
  const dragStartRef = useRef({ x: 0, clipIn: 0, clipOut: 0 });

  const left = timeToPixels(clip.timelineIn, pixelsPerSecond, scrollOffset);
  const width = (clip.timelineOut - clip.timelineIn) * pixelsPerSecond;
  const color = getClipColor(entityType);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(clip.id, e.shiftKey);

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relX = e.clientX - rect.left;

      // Determine if clicking on trim handles (8px from edges)
      if (relX < 8) {
        setTrimEdge('start');
      } else if (relX > rect.width - 8) {
        setTrimEdge('end');
      } else {
        setTrimEdge(null);
      }

      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        clipIn: clip.timelineIn,
        clipOut: clip.timelineOut,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - dragStartRef.current.x;
        const dt = dx / pixelsPerSecond;

        if (trimEdge === 'start' || (relX < 8 && !trimEdge)) {
          const newIn = Math.max(0, dragStartRef.current.clipIn + dt);
          if (newIn < clip.timelineOut - 0.1) {
            useTimelineStore.getState().updateClip(clip.id, { timelineIn: newIn });
          }
        } else if (trimEdge === 'end' || (relX > rect.width - 8 && !trimEdge)) {
          const newOut = Math.max(clip.timelineIn + 0.1, dragStartRef.current.clipOut + dt);
          useTimelineStore.getState().updateClip(clip.id, { timelineOut: newOut });
        } else {
          // Move entire clip
          const newIn = Math.max(0, dragStartRef.current.clipIn + dt);
          const duration = dragStartRef.current.clipOut - dragStartRef.current.clipIn;
          useTimelineStore.getState().updateClip(clip.id, {
            timelineIn: newIn,
            timelineOut: newIn + duration,
          });
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        setTrimEdge(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [clip.id, clip.timelineIn, clip.timelineOut, pixelsPerSecond, onSelect, trimEdge],
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left,
        top: 2,
        width: Math.max(4, width),
        height: trackHeight - 4,
        background: clip.disabled ? '#374151' : color,
        opacity: clip.disabled ? 0.4 : clip.muted ? 0.6 : 1,
        borderRadius: 4,
        border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
        cursor: isDragging ? 'grabbing' : 'grab',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        padding: '0 6px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {/* Trim handle - start */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 6,
          height: '100%',
          cursor: 'ew-resize',
          background: isSelected ? 'rgba(255,255,255,0.3)' : 'transparent',
          borderRadius: '4px 0 0 4px',
        }}
      />

      {/* Clip label */}
      <span
        style={{
          fontSize: 10,
          color: '#fff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          flex: 1,
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        {entityName || entityType}
      </span>

      {/* Trim handle - end */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 6,
          height: '100%',
          cursor: 'ew-resize',
          background: isSelected ? 'rgba(255,255,255,0.3)' : 'transparent',
          borderRadius: '0 4px 4px 0',
        }}
      />
    </div>
  );
};
