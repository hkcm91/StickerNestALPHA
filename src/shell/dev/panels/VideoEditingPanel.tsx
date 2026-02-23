/**
 * VideoEditingPanel — Video Editing widget suite testing panel
 *
 * Orchestrates 5 video editing widgets sharing a channel:
 * Video Player, Timeline, Speed Control, Keyframe Editor, Cut/Split Tool.
 *
 * @module shell/dev
 * @layer L6
 */

import React, { useState, useEffect, useRef } from 'react';

import { bus } from '../../../kernel/bus';
import { WidgetFrame } from '../../../runtime';
import { DEFAULT_WIDGET_THEME, getWidgetHtml } from '../widget-templates';

type VideoWidgetType = 'video-player' | 'timeline' | 'speed-control' | 'keyframe-editor' | 'cut-tool';

interface VideoWidget {
  id: string;
  type: VideoWidgetType;
}

const WIDGET_SIZES: Record<VideoWidgetType, { width: number; height: number }> = {
  'video-player': { width: 420, height: 280 },
  'timeline': { width: 420, height: 90 },
  'speed-control': { width: 220, height: 180 },
  'keyframe-editor': { width: 220, height: 180 },
  'cut-tool': { width: 220, height: 200 },
};

export const VideoEditingPanel: React.FC = () => {
  const [channel, setChannel] = useState('video-1');
  const [widgets, setWidgets] = useState<VideoWidget[]>([]);
  const [transportState, setTransportState] = useState<{
    state: string; currentTime: number; duration: number; playbackRate: number;
  } | null>(null);
  const [markers, setMarkers] = useState<{ id: string; time: number; label: string }[]>([]);
  const [cuts, setCuts] = useState<{ id: string; time: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addWidget = (type: VideoWidgetType) => {
    const id = `${type}-${Date.now()}`;
    setWidgets((prev) => [...prev, { id, type }]);
  };

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  };

  const addAllWidgets = () => {
    const types: VideoWidgetType[] = ['video-player', 'timeline', 'speed-control', 'keyframe-editor', 'cut-tool'];
    const newWidgets = types.map((type) => ({ id: `${type}-${Date.now()}`, type }));
    setWidgets(newWidgets);
  };

  // Subscribe to transport events on the bus for display
  useEffect(() => {
    const prefix = channel ? `widget.${channel}.` : 'widget.';
    const unsubs = [
      bus.subscribe(`${prefix}video.transport.state`, (payload: unknown) => {
        setTransportState(payload as typeof transportState);
      }),
      bus.subscribe(`${prefix}video.markers.changed`, (payload: unknown) => {
        const d = payload as { markers?: typeof markers };
        if (d?.markers) setMarkers(d.markers);
      }),
      bus.subscribe(`${prefix}video.cuts.changed`, (payload: unknown) => {
        const d = payload as { cuts?: typeof cuts };
        if (d?.cuts) setCuts(d.cuts);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [channel]);

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const prefix = channel ? `widget.${channel}.` : 'widget.';
      bus.emit(`${prefix}video.command.loadSource`, { dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const emitCommand = (type: string, payload: Record<string, unknown> = {}) => {
    const prefix = channel ? `widget.${channel}.` : 'widget.';
    bus.emit(`${prefix}${type}`, payload);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <section style={{ flex: '1 1 500px', border: '1px solid var(--sn-border, #374151)', padding: 10 }}>
      <h2>Video Editing Suite</h2>

      {/* Channel & File Controls */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 10 }}>Channel:</label>
        <input
          type="text"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          style={{
            width: 80, fontSize: 10, padding: '2px 4px',
            background: '#444', color: '#fff', border: '1px solid #555',
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileLoad}
          style={{ fontSize: 10 }}
        />
      </div>

      {/* Widget Add Buttons */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <button onClick={() => addWidget('video-player')} style={{ fontSize: 10 }}>+ Player</button>
        <button onClick={() => addWidget('timeline')} style={{ fontSize: 10 }}>+ Timeline</button>
        <button onClick={() => addWidget('speed-control')} style={{ fontSize: 10 }}>+ Speed</button>
        <button onClick={() => addWidget('keyframe-editor')} style={{ fontSize: 10 }}>+ Keyframes</button>
        <button onClick={() => addWidget('cut-tool')} style={{ fontSize: 10 }}>+ Cut Tool</button>
        <button onClick={addAllWidgets} style={{ fontSize: 10, background: '#2563eb', color: '#fff', border: '1px solid #3b82f6' }}>
          Add All
        </button>
        <button onClick={() => setWidgets([])} style={{ fontSize: 10 }}>Clear All</button>
      </div>

      {/* Transport Controls */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => emitCommand('video.command.play')} style={{ fontSize: 10 }}>Play</button>
        <button onClick={() => emitCommand('video.command.pause')} style={{ fontSize: 10 }}>Pause</button>
        <button onClick={() => emitCommand('video.command.seek', { time: 0 })} style={{ fontSize: 10 }}>Start</button>
        <button onClick={() => {
          if (transportState?.duration) emitCommand('video.command.seek', { time: transportState.duration / 2 });
        }} style={{ fontSize: 10 }}>50%</button>
        <button onClick={() => {
          if (transportState?.duration) emitCommand('video.command.seek', { time: transportState.duration });
        }} style={{ fontSize: 10 }}>End</button>
        <button onClick={() => {
          if (transportState?.currentTime != null) emitCommand('video.command.addMarker', {
            time: transportState.currentTime, label: 'M' + (markers.length + 1),
          });
        }} style={{ fontSize: 10 }}>+ Marker</button>
        <button onClick={() => {
          if (transportState?.currentTime != null) emitCommand('video.cut.add', { time: transportState.currentTime });
        }} style={{ fontSize: 10, background: '#7f1d1d', border: '1px solid #991b1b' }}>Cut Here</button>
      </div>

      {/* Transport State Display */}
      {transportState && (
        <div style={{
          marginBottom: 8, padding: 4, background: '#1a1a2e',
          border: '1px solid #333', fontSize: 10, fontFamily: 'monospace',
        }}>
          {transportState.state?.toUpperCase()} | {fmt(transportState.currentTime || 0)} / {fmt(transportState.duration || 0)} | {transportState.playbackRate}x
          {markers.length > 0 && <span> | {markers.length} markers</span>}
          {cuts.length > 0 && <span> | {cuts.length} cuts</span>}
        </div>
      )}

      {/* Widget Frames */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {widgets.map((w) => {
          const size = WIDGET_SIZES[w.type];
          return (
            <div key={w.id} style={{ border: '1px solid #555', position: 'relative' }}>
              <div style={{
                background: '#333', color: '#fff', padding: '2px 6px', fontSize: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>{w.type}</span>
                <button onClick={() => removeWidget(w.id)} style={{ fontSize: 10, padding: '0 4px', background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}>x</button>
              </div>
              <div style={{ width: size.width, height: size.height }}>
                <WidgetFrame
                  widgetId={w.type}
                  instanceId={w.id}
                  widgetHtml={getWidgetHtml(w.type)}
                  config={{}}
                  theme={DEFAULT_WIDGET_THEME}
                  visible={true}
                  width={size.width}
                  height={size.height}
                  channel={channel || undefined}
                />
              </div>
            </div>
          );
        })}
      </div>

      {widgets.length === 0 && (
        <p style={{ color: '#666', fontSize: 10 }}>
          Add video editing widgets above. All widgets share the same channel for synchronized communication.
          Load a video file, then use Player + Timeline for playback/scrubbing, Speed for rate control,
          Keyframes for property animation, and Cut Tool for splitting.
        </p>
      )}
    </section>
  );
};
