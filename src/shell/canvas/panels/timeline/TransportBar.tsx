/**
 * TransportBar — play/pause/stop, timecode display, rate, volume
 *
 * @module shell/canvas/panels/timeline
 * @layer L6
 */

import React, { useCallback } from 'react';

import { useAudioEngineStore } from '../../../../kernel/stores/timeline/audio-engine.store';
import { useTimelineStore } from '../../../../kernel/stores/timeline/timeline.store';

import { formatTimecode } from './timeline-utils';

const RATES = [0.25, 0.5, 1, 2, 4];

export const TransportBar: React.FC = () => {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const playheadTime = useTimelineStore((s) => s.playheadTime);
  const playbackRate = useTimelineStore((s) => s.playbackRate);
  const loopEnabled = useTimelineStore((s) => s.loopRegion.enabled);
  const fps = useTimelineStore((s) => s.composition.fps);
  const duration = useTimelineStore((s) => s.composition.duration);
  const masterVolume = useAudioEngineStore((s) => s.masterVolume);
  const masterMuted = useAudioEngineStore((s) => s.masterMuted);

  const togglePlay = useCallback(() => useTimelineStore.getState().togglePlay(), []);
  const stop = useCallback(() => useTimelineStore.getState().stop(), []);
  const goToStart = useCallback(() => useTimelineStore.getState().goToStart(), []);
  const goToEnd = useCallback(() => useTimelineStore.getState().goToEnd(), []);
  const toggleLoop = useCallback(() => {
    const lr = useTimelineStore.getState().loopRegion;
    useTimelineStore.getState().setLoopRegion({ enabled: !lr.enabled });
  }, []);
  const setRate = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    useTimelineStore.getState().setPlaybackRate(Number(e.target.value));
  }, []);
  const setVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    useAudioEngineStore.getState().setMasterVolume(Number(e.target.value));
  }, []);
  const toggleMute = useCallback(() => {
    useAudioEngineStore.getState().toggleMasterMute();
  }, []);

  const btnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--sn-text, #e2e8f0)',
    cursor: 'pointer',
    fontSize: 14,
    padding: '4px 8px',
    borderRadius: 4,
  };

  const activeBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: 'var(--sn-accent, #3b82f6)',
    color: '#fff',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderBottom: '1px solid var(--sn-border, #334155)',
        background: 'var(--sn-surface, #1e293b)',
        minHeight: 36,
        flexShrink: 0,
      }}
    >
      {/* Navigation */}
      <button style={btnStyle} onClick={goToStart} title="Go to start (Home)">⏮</button>
      <button style={btnStyle} onClick={() => useTimelineStore.getState().skipBackward(1)} title="Skip back 1s">⏪</button>

      {/* Play/Pause */}
      <button style={isPlaying ? activeBtnStyle : btnStyle} onClick={togglePlay} title="Play/Pause (Space)">
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Stop */}
      <button style={btnStyle} onClick={stop} title="Stop">⏹</button>

      <button style={btnStyle} onClick={() => useTimelineStore.getState().skipForward(1)} title="Skip forward 1s">⏩</button>
      <button style={btnStyle} onClick={goToEnd} title="Go to end (End)">⏭</button>

      {/* Separator */}
      <div style={{ width: 1, height: 20, background: 'var(--sn-border, #334155)', margin: '0 4px' }} />

      {/* Timecode */}
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: 13,
          color: 'var(--sn-text, #e2e8f0)',
          minWidth: 80,
          textAlign: 'center',
        }}
      >
        {formatTimecode(playheadTime, fps)}
      </div>

      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--sn-text-muted, #64748b)' }}>
        / {formatTimecode(duration, fps)}
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 20, background: 'var(--sn-border, #334155)', margin: '0 4px' }} />

      {/* Rate */}
      <select
        value={playbackRate}
        onChange={setRate}
        style={{
          background: 'var(--sn-bg, #0f172a)',
          color: 'var(--sn-text, #e2e8f0)',
          border: '1px solid var(--sn-border, #334155)',
          borderRadius: 4,
          fontSize: 12,
          padding: '2px 4px',
        }}
      >
        {RATES.map((r) => (
          <option key={r} value={r}>{r}x</option>
        ))}
      </select>

      {/* Loop toggle */}
      <button
        style={loopEnabled ? activeBtnStyle : btnStyle}
        onClick={toggleLoop}
        title="Toggle loop"
      >
        🔁
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Volume */}
      <button style={btnStyle} onClick={toggleMute} title="Toggle mute">
        {masterMuted ? '🔇' : '🔊'}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={masterMuted ? 0 : masterVolume}
        onChange={setVolume}
        style={{ width: 60, accentColor: 'var(--sn-accent, #3b82f6)' }}
        title={`Volume: ${Math.round(masterVolume * 100)}%`}
      />
    </div>
  );
};
