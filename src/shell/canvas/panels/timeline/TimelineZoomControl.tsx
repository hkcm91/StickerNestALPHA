/**
 * TimelineZoomControl — zoom slider and zoom-to-fit
 *
 * @module shell/canvas/panels/timeline
 * @layer L6
 */

import React, { useCallback } from 'react';

import { useTimelineStore } from '../../../../kernel/stores/timeline/timeline.store';

interface TimelineZoomControlProps {
  containerWidth: number;
}

export const TimelineZoomControl: React.FC<TimelineZoomControlProps> = ({ containerWidth }) => {
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond);
  const duration = useTimelineStore((s) => s.composition.duration);

  const setZoom = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    useTimelineStore.getState().setZoom(Number(e.target.value));
  }, []);

  const zoomToFit = useCallback(() => {
    if (duration <= 0 || containerWidth <= 0) return;
    const fitZoom = Math.max(10, Math.min(1000, (containerWidth - 40) / duration));
    useTimelineStore.getState().setZoom(fitZoom);
    useTimelineStore.getState().setScrollOffset(0);
  }, [duration, containerWidth]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        borderTop: '1px solid var(--sn-border, #334155)',
        background: 'var(--sn-surface, #1e293b)',
        minHeight: 28,
        flexShrink: 0,
      }}
    >
      <button
        onClick={zoomToFit}
        style={{
          background: 'none',
          border: '1px solid var(--sn-border, #334155)',
          color: 'var(--sn-text-muted, #64748b)',
          fontSize: 10,
          padding: '2px 6px',
          borderRadius: 4,
          cursor: 'pointer',
        }}
        title="Zoom to fit"
      >
        Fit
      </button>
      <input
        type="range"
        min={10}
        max={1000}
        step={1}
        value={pixelsPerSecond}
        onChange={setZoom}
        style={{ flex: 1, maxWidth: 200, accentColor: 'var(--sn-accent, #3b82f6)' }}
        title={`Zoom: ${Math.round(pixelsPerSecond)} px/sec`}
      />
      <span style={{ fontSize: 10, color: 'var(--sn-text-muted, #64748b)', fontFamily: 'monospace', minWidth: 50 }}>
        {Math.round(pixelsPerSecond)} px/s
      </span>
    </div>
  );
};
