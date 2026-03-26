/**
 * ExportDialog — format selection, quality settings, render progress
 *
 * @module shell/canvas/panels/export-dialog
 * @layer L6
 */

import React, { useCallback, useState } from 'react';

import type { ExportFormat, ExportProgress } from '../../../../kernel/schemas/export-config';
import { FORMAT_SPECS } from '../../../../kernel/schemas/export-config';
import { useTimelineStore } from '../../../../kernel/stores/timeline/timeline.store';

interface ExportDialogProps {
  onStartExport: (format: ExportFormat) => void;
  onCancel: () => void;
  progress: ExportProgress | null;
  isWebCodecsAvailable: boolean;
}

const FORMAT_OPTIONS: Array<{ id: ExportFormat; label: string; desc: string }> = [
  { id: 'mp4-1080p', label: 'MP4 1080p', desc: '1920×1080, H.264' },
  { id: 'mp4-720p', label: 'MP4 720p', desc: '1280×720, H.264' },
  { id: 'mp4-4k', label: 'MP4 4K', desc: '3840×2160, H.264' },
  { id: 'youtube-standard', label: 'YouTube', desc: '1920×1080, H.264' },
  { id: 'youtube-short', label: 'YouTube Short', desc: '1080×1920, max 60s' },
  { id: 'tiktok', label: 'TikTok', desc: '1080×1920, max 60s' },
  { id: 'instagram-reel', label: 'Instagram Reel', desc: '1080×1920, max 90s' },
  { id: 'twitter-video', label: 'Twitter Video', desc: '1280×720, max 140s' },
  { id: 'twitter-square', label: 'Twitter Square', desc: '1080×1080, max 140s' },
  { id: 'webm-1080p', label: 'WebM 1080p', desc: '1920×1080, VP9' },
];

export const ExportDialog: React.FC<ExportDialogProps> = ({
  onStartExport,
  onCancel,
  progress,
  isWebCodecsAvailable,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('mp4-1080p');
  const duration = useTimelineStore((s) => s.composition.duration);
  const fps = useTimelineStore((s) => s.composition.fps);

  const isExporting = progress && progress.phase !== 'complete' && progress.phase !== 'failed' && progress.phase !== 'cancelled';
  const spec = FORMAT_SPECS[selectedFormat];
  const totalFrames = Math.ceil(duration * fps);
  const maxDuration = spec?.maxDurationSec;
  const durationExceeded = maxDuration !== null && duration > maxDuration;

  const handleExport = useCallback(() => {
    onStartExport(selectedFormat);
  }, [selectedFormat, onStartExport]);

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--sn-text-muted, #64748b)',
    marginBottom: 4,
  };

  return (
    <div
      style={{
        padding: 20,
        background: 'var(--sn-surface, #1e293b)',
        borderRadius: 8,
        border: '1px solid var(--sn-border, #334155)',
        width: 380,
        fontFamily: 'var(--sn-font-family, system-ui)',
        color: 'var(--sn-text, #e2e8f0)',
      }}
    >
      <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Export Video</h3>

      {!isWebCodecsAvailable && (
        <div style={{ background: '#7f1d1d', padding: 8, borderRadius: 4, fontSize: 12, marginBottom: 12 }}>
          WebCodecs is not supported in this browser. Try Chrome 94+ or Safari 16.4+.
        </div>
      )}

      {/* Format selector */}
      <div style={{ marginBottom: 12 }}>
        <div style={labelStyle}>Format</div>
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
          disabled={!!isExporting}
          style={{
            width: '100%',
            background: 'var(--sn-bg, #0f172a)',
            color: 'var(--sn-text, #e2e8f0)',
            border: '1px solid var(--sn-border, #334155)',
            borderRadius: 4,
            padding: '6px 8px',
            fontSize: 13,
          }}
        >
          {FORMAT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label} — {opt.desc}
            </option>
          ))}
        </select>
      </div>

      {/* Info */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12 }}>
        <div>
          <span style={labelStyle}>Resolution</span>
          <div>{spec?.width}×{spec?.height}</div>
        </div>
        <div>
          <span style={labelStyle}>Duration</span>
          <div>{duration.toFixed(1)}s ({totalFrames} frames)</div>
        </div>
        <div>
          <span style={labelStyle}>FPS</span>
          <div>{fps}</div>
        </div>
      </div>

      {durationExceeded && (
        <div style={{ background: '#78350f', padding: 8, borderRadius: 4, fontSize: 11, marginBottom: 12 }}>
          Duration exceeds {maxDuration}s limit for {selectedFormat}. Video will be trimmed.
        </div>
      )}

      {/* Progress */}
      {progress && progress.phase !== 'complete' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span>{progress.phase}</span>
            <span>{progress.percent}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--sn-bg, #0f172a)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progress.percent}%`,
                background: progress.phase === 'failed' ? '#ef4444' : 'var(--sn-accent, #3b82f6)',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          {progress.estimatedTimeRemaining !== null && progress.estimatedTimeRemaining > 0 && (
            <div style={{ fontSize: 10, color: 'var(--sn-text-muted, #64748b)', marginTop: 4 }}>
              ~{Math.ceil(progress.estimatedTimeRemaining)}s remaining
            </div>
          )}
          {progress.error && (
            <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>
              {progress.error}
            </div>
          )}
        </div>
      )}

      {progress?.phase === 'complete' && (
        <div style={{ background: '#14532d', padding: 8, borderRadius: 4, fontSize: 12, marginBottom: 12 }}>
          Export complete! File has been downloaded.
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: '1px solid var(--sn-border, #334155)',
            color: 'var(--sn-text, #e2e8f0)',
            padding: '6px 16px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {isExporting ? 'Cancel' : 'Close'}
        </button>
        {!isExporting && progress?.phase !== 'complete' && (
          <button
            onClick={handleExport}
            disabled={!isWebCodecsAvailable || durationExceeded}
            style={{
              background: isWebCodecsAvailable && !durationExceeded ? 'var(--sn-accent, #3b82f6)' : '#374151',
              color: '#fff',
              border: 'none',
              padding: '6px 20px',
              borderRadius: 4,
              cursor: isWebCodecsAvailable && !durationExceeded ? 'pointer' : 'default',
              fontSize: 13,
              opacity: isWebCodecsAvailable && !durationExceeded ? 1 : 0.5,
            }}
          >
            Export
          </button>
        )}
      </div>
    </div>
  );
};
