/**
 * TimelineTrackList — track headers with name, type icon, toggles
 *
 * @module shell/canvas/panels/timeline
 * @layer L6
 */

import React, { useCallback } from 'react';

import type { TimelineTrack, TrackType } from '@sn/types';

import { useTimelineStore } from '../../../../kernel/stores/timeline/timeline.store';

const TRACK_ICONS: Record<string, string> = {
  entity: '🎬',
  audio: '🔊',
  adjustment: '✨',
};

interface TrackHeaderProps {
  track: TimelineTrack;
}

const TrackHeader: React.FC<TrackHeaderProps> = ({ track }) => {
  const toggleVisibility = useCallback(() => {
    const store = useTimelineStore.getState();
    store.updateTrack(track.id, { visible: !track.visible });
  }, [track.id, track.visible]);

  const toggleLock = useCallback(() => {
    const store = useTimelineStore.getState();
    store.updateTrack(track.id, { locked: !track.locked });
  }, [track.id, track.locked]);

  const toggleSolo = useCallback(() => {
    const store = useTimelineStore.getState();
    store.updateTrack(track.id, { solo: !track.solo });
  }, [track.id, track.solo]);

  const iconBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    padding: '1px 3px',
    borderRadius: 2,
    opacity: 0.7,
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        height: track.height,
        padding: '0 8px',
        borderBottom: '1px solid var(--sn-border, #1e293b)',
        background: 'var(--sn-surface, #1e293b)',
        fontSize: 12,
        color: 'var(--sn-text, #e2e8f0)',
        userSelect: 'none',
      }}
    >
      {/* Type icon */}
      <span style={{ fontSize: 14 }}>{TRACK_ICONS[track.type] ?? '📦'}</span>

      {/* Track name */}
      <span
        style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {track.name}
      </span>

      {/* Toggles */}
      <button
        style={{ ...iconBtnStyle, opacity: track.visible ? 1 : 0.3 }}
        onClick={toggleVisibility}
        title={track.visible ? 'Hide' : 'Show'}
      >
        👁
      </button>
      <button
        style={{ ...iconBtnStyle, opacity: track.locked ? 1 : 0.3 }}
        onClick={toggleLock}
        title={track.locked ? 'Unlock' : 'Lock'}
      >
        🔒
      </button>
      {track.type === 'audio' && (
        <button
          style={{ ...iconBtnStyle, color: track.solo ? '#fbbf24' : undefined }}
          onClick={toggleSolo}
          title="Solo"
        >
          S
        </button>
      )}
    </div>
  );
};

export const TimelineTrackList: React.FC = () => {
  const tracks = useTimelineStore((s) => s.tracks);

  const addTrack = useCallback((type: TrackType) => {
    const store = useTimelineStore.getState();
    const name = type === 'audio' ? `Audio ${store.tracks.length + 1}` : `Track ${store.tracks.length + 1}`;
    store.addTrack({
      id: `track-${Date.now()}`,
      name,
      type,
      order: store.tracks.length,
      locked: false,
      visible: true,
      volume: 1,
      solo: false,
      height: 40,
    });
  }, []);

  const sorted = [...tracks].sort((a, b) => a.order - b.order);

  return (
    <div style={{ minWidth: 160, borderRight: '1px solid var(--sn-border, #334155)' }}>
      {sorted.map((track) => (
        <TrackHeader key={track.id} track={track} />
      ))}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '4px 8px',
          borderBottom: '1px solid var(--sn-border, #1e293b)',
        }}
      >
        <button
          onClick={() => addTrack('entity')}
          style={{
            flex: 1,
            background: 'none',
            border: '1px dashed var(--sn-border, #334155)',
            color: 'var(--sn-text-muted, #64748b)',
            fontSize: 11,
            padding: '4px',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          + Entity
        </button>
        <button
          onClick={() => addTrack('audio')}
          style={{
            flex: 1,
            background: 'none',
            border: '1px dashed var(--sn-border, #334155)',
            color: 'var(--sn-text-muted, #64748b)',
            fontSize: 11,
            padding: '4px',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          + Audio
        </button>
      </div>
    </div>
  );
};
