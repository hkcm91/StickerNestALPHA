/**
 * TimelinePanel — the main timeline editor panel
 *
 * @remarks
 * Composes TransportBar, TimelineRuler, TimelineTrackList, TimelineClipArea,
 * and TimelineZoomControl into the Premiere Pro-style timeline at the bottom
 * of the canvas view.
 *
 * When timeline mode is off, shows an "Enter Timeline Mode" button.
 *
 * @module shell/canvas/panels/timeline
 * @layer L6
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';

import { useTimelineStore } from '../../../../kernel/stores/timeline/timeline.store';

import { TimelineClipArea } from './TimelineClipArea';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrackList } from './TimelineTrackList';
import { TimelineZoomControl } from './TimelineZoomControl';
import { TransportBar } from './TransportBar';

const DEFAULT_TRACK_LIST_WIDTH = 180;

export const TimelinePanel: React.FC = () => {
  const isTimelineMode = useTimelineStore((s) => s.isTimelineMode);
  const containerRef = useRef<HTMLDivElement>(null);
  const [clipAreaWidth, setClipAreaWidth] = useState(800);

  // Track container width for ruler and zoom-to-fit
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width - DEFAULT_TRACK_LIST_WIDTH;
        setClipAreaWidth(Math.max(100, w));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const enterTimeline = useCallback(() => {
    useTimelineStore.getState().enterTimelineMode();
  }, []);

  if (!isTimelineMode) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 60,
          background: 'var(--sn-surface, #1e293b)',
          borderTop: '1px solid var(--sn-border, #334155)',
        }}
      >
        <button
          onClick={enterTimeline}
          style={{
            background: 'var(--sn-accent, #3b82f6)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'var(--sn-font-family, system-ui)',
          }}
        >
          Enter Timeline Mode
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 200,
        background: 'var(--sn-bg, #0f172a)',
        borderTop: '2px solid var(--sn-border, #334155)',
      }}
    >
      {/* Transport bar */}
      <TransportBar />

      {/* Timeline body: track list + (ruler + clip area) */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Track list (left) */}
        <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Spacer for ruler alignment */}
          <div
            style={{
              height: 28,
              borderBottom: '1px solid var(--sn-border, #334155)',
              background: 'var(--sn-surface, #1e293b)',
              minWidth: DEFAULT_TRACK_LIST_WIDTH,
            }}
          />
          <div style={{ flex: 1, overflow: 'auto' }}>
            <TimelineTrackList />
          </div>
        </div>

        {/* Ruler + clip area (right) */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <TimelineRuler width={clipAreaWidth} />
          <div style={{ flex: 1, overflow: 'auto' }}>
            <TimelineClipArea width={clipAreaWidth} />
          </div>
        </div>
      </div>

      {/* Zoom control bar */}
      <TimelineZoomControl containerWidth={clipAreaWidth} />
    </div>
  );
};
