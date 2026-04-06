/**
 * SampleCard — card component for a single sample widget entry.
 *
 * Shows name, difficulty badge, description, feature tags,
 * and Download / Try Upload action buttons.
 *
 * @module shell/pages/marketplace/samples
 * @layer L6
 */

import React, { useCallback, useState } from 'react';

import type { SampleWidgetEntry } from '@sn/types';

import { themeVar } from '../../../theme/theme-vars';
import { btnPrimary, btnSecondary, cardStyle, mutedText, tagStyle } from '../styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SampleCardProps {
  sample: SampleWidgetEntry;
  onTryUpload: (file: File) => void;
  onError: (msg: string) => void;
}

// ---------------------------------------------------------------------------
// Difficulty badge
// ---------------------------------------------------------------------------

type Difficulty = SampleWidgetEntry['difficulty'];

const DIFFICULTY_COLORS: Record<Difficulty, { bg: string; color: string; label: string }> = {
  beginner: { bg: 'rgba(5, 150, 105, 0.12)', color: '#065f46', label: 'Beginner' },
  intermediate: { bg: 'rgba(217, 119, 6, 0.12)', color: '#92400e', label: 'Intermediate' },
  advanced: { bg: 'rgba(220, 38, 38, 0.12)', color: '#991b1b', label: 'Advanced' },
};

const DifficultyBadge: React.FC<{ difficulty: Difficulty }> = ({ difficulty }) => {
  const { bg, color, label } = DIFFICULTY_COLORS[difficulty];
  return (
    <span
      data-testid="difficulty-badge"
      style={{
        padding: '2px 9px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 600,
        background: bg,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve the download URL — prefer htmlUrl, fall back to zipUrl. */
function getDownloadUrl(sample: SampleWidgetEntry): string | null {
  return sample.htmlUrl ?? sample.zipUrl ?? null;
}

function getFilename(sample: SampleWidgetEntry): string {
  if (sample.htmlUrl) return `${sample.id}.html`;
  return `${sample.id}.zip`;
}

function getMimeType(sample: SampleWidgetEntry): string {
  if (sample.htmlUrl) return 'text/html';
  return 'application/zip';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SampleCard: React.FC<SampleCardProps> = ({ sample, onTryUpload, onError }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrepping, setIsPrepping] = useState(false);

  const fetchFile = useCallback(async (): Promise<ArrayBuffer | null> => {
    const url = getDownloadUrl(sample);
    if (!url) {
      onError('No download URL available for this sample.');
      return null;
    }
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Failed to fetch sample (HTTP ${resp.status})`);
      }
      return await resp.arrayBuffer();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to fetch sample.');
      return null;
    }
  }, [sample, onError]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const buffer = await fetchFile();
      if (!buffer) return;

      const blob = new Blob([buffer], { type: getMimeType(sample) });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFilename(sample);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }, [fetchFile, sample]);

  const handleTryUpload = useCallback(async () => {
    setIsPrepping(true);
    try {
      const buffer = await fetchFile();
      if (!buffer) return;

      const filename = getFilename(sample);
      const mimeType = getMimeType(sample);
      const file = new File([buffer], filename, { type: mimeType });
      onTryUpload(file);
    } finally {
      setIsPrepping(false);
    }
  }, [fetchFile, sample, onTryUpload]);

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '16px 16px 0',
  };

  const nameStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: '15px',
    color: themeVar('--sn-text'),
    flex: 1,
    minWidth: 0,
    wordBreak: 'break-word',
  };

  const descStyle: React.CSSProperties = {
    ...mutedText,
    padding: '8px 16px 0',
    lineHeight: 1.5,
  };

  const tagsStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
    padding: '10px 16px 0',
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px 16px',
    borderTop: `1px solid ${themeVar('--sn-border')}`,
    marginTop: '12px',
  };

  const busy = isDownloading || isPrepping;

  return (
    <div style={{ ...cardStyle, cursor: 'default' }} data-testid="sample-card">
      {/* Header: name + difficulty badge */}
      <div style={headerStyle}>
        <div style={nameStyle}>{sample.name}</div>
        <DifficultyBadge difficulty={sample.difficulty} />
      </div>

      {/* Description */}
      <div style={descStyle}>{sample.description}</div>

      {/* Feature tags */}
      {sample.features.length > 0 && (
        <div style={tagsStyle}>
          {sample.features.map((feat) => (
            <span key={feat} style={tagStyle} data-testid="feature-tag">
              {feat}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={actionsStyle}>
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy}
          style={{
            ...btnSecondary,
            fontSize: '12px',
            padding: '5px 12px',
            opacity: busy ? 0.6 : 1,
          }}
          data-testid="sample-download-btn"
        >
          {isDownloading ? 'Downloading\u2026' : 'Download'}
        </button>
        <button
          type="button"
          onClick={handleTryUpload}
          disabled={busy}
          style={{
            ...btnPrimary,
            fontSize: '12px',
            padding: '5px 12px',
            opacity: busy ? 0.6 : 1,
          }}
          data-testid="sample-try-upload-btn"
        >
          {isPrepping ? 'Preparing\u2026' : 'Try Upload'}
        </button>
      </div>
    </div>
  );
};
