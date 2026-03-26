/**
 * TimelineRuler — time ruler with tick marks, click-to-seek, markers
 *
 * @module shell/canvas/panels/timeline
 * @layer L6
 */

import React, { useCallback, useRef } from 'react';

import { useTimelineStore } from '../../../../kernel/stores/timeline/timeline.store';

import { timeToPixels, pixelsToTime, formatTime, getTickIntervals } from './timeline-utils';

const RULER_HEIGHT = 28;

export const TimelineRuler: React.FC<{ width: number }> = ({ width }) => {
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond);
  const scrollOffset = useTimelineStore((s) => s.scrollOffset);
  const duration = useTimelineStore((s) => s.composition.duration);
  const markers = useTimelineStore((s) => s.markers);
  const loopRegion = useTimelineStore((s) => s.loopRegion);
  const rulerRef = useRef<HTMLDivElement>(null);

  const { major, minor } = getTickIntervals(pixelsPerSecond);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = rulerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const time = pixelsToTime(x, pixelsPerSecond, scrollOffset);
      useTimelineStore.getState().seek(Math.max(0, Math.min(time, duration)));
    },
    [pixelsPerSecond, scrollOffset, duration],
  );

  // Generate tick marks
  const ticks: React.ReactNode[] = [];
  const startTime = Math.max(0, Math.floor(scrollOffset / minor) * minor);
  const endTime = Math.min(duration, scrollOffset + width / pixelsPerSecond);

  for (let t = startTime; t <= endTime; t += minor) {
    const x = timeToPixels(t, pixelsPerSecond, scrollOffset);
    if (x < -5 || x > width + 5) continue;

    const isMajor = Math.abs(t % major) < 0.001 || Math.abs(t % major - major) < 0.001;
    ticks.push(
      <div key={`tick-${t.toFixed(3)}`} style={{ position: 'absolute', left: x }}>
        <div
          style={{
            width: 1,
            height: isMajor ? 14 : 8,
            background: isMajor ? 'var(--sn-text, #94a3b8)' : 'var(--sn-text-muted, #475569)',
            position: 'absolute',
            bottom: 0,
          }}
        />
        {isMajor && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: 4,
              fontSize: 9,
              color: 'var(--sn-text-muted, #64748b)',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {formatTime(t)}
          </span>
        )}
      </div>,
    );
  }

  // Loop region highlight
  const loopEl = loopRegion.enabled ? (
    <div
      style={{
        position: 'absolute',
        left: timeToPixels(loopRegion.inPoint, pixelsPerSecond, scrollOffset),
        width: (loopRegion.outPoint - loopRegion.inPoint) * pixelsPerSecond,
        top: 0,
        height: '100%',
        background: 'rgba(59, 130, 246, 0.15)',
        borderLeft: '2px solid var(--sn-accent, #3b82f6)',
        borderRight: '2px solid var(--sn-accent, #3b82f6)',
        pointerEvents: 'none',
      }}
    />
  ) : null;

  // Markers
  const markerEls = markers.map((marker) => {
    const x = timeToPixels(marker.time, pixelsPerSecond, scrollOffset);
    if (x < -10 || x > width + 10) return null;
    return (
      <div
        key={marker.id}
        title={marker.label || `Marker at ${formatTime(marker.time)}`}
        style={{
          position: 'absolute',
          left: x - 5,
          bottom: 0,
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom: `8px solid ${marker.color}`,
          cursor: 'pointer',
        }}
      />
    );
  });

  return (
    <div
      ref={rulerRef}
      onClick={handleClick}
      style={{
        position: 'relative',
        height: RULER_HEIGHT,
        background: 'var(--sn-bg, #0f172a)',
        borderBottom: '1px solid var(--sn-border, #334155)',
        cursor: 'pointer',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {loopEl}
      {ticks}
      {markerEls}
    </div>
  );
};
