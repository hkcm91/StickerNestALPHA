/**
 * SampleCard — card component for a single sample widget entry.
 *
 * Shows name, difficulty badge, description, feature tags,
 * and Download / Install action buttons.
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
  onInstall: (data: ArrayBuffer) => void;
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
// Component
// ---------------------------------------------------------------------------

export const SampleCard: React.FC<SampleCardProps> = ({ sample, onInstall, onError }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const fetchZip = useCallback(async (): Promise<ArrayBuffer | null> => {
    try {
      const resp = await fetch(sample.zipUrl);
      if (!resp.ok) {
        throw new Error(`Failed to fetch package (HTTP ${resp.status})`);
      }
      return await resp.arrayBuffer();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to fetch package.');
      return null;
    }
  }, [sample.zipUrl, onError]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const buffer = await fetchZip();
      if (!buffer) return;

      // Trigger browser download
      const blob = new Blob([buffer], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sample.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }, [fetchZip, sample.id]);

  const handleInstall = useCallback(async () => {
    setIsInstalling(true);
    try {
      const buffer = await fetchZip();
      if (buffer) {
        onInstall(buffer);
      }
    } finally {
      setIsInstalling(false);
    }
  }, [fetchZip, onInstall]);

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
          disabled={isDownloading || isInstalling}
          style={{
            ...btnSecondary,
            fontSize: '12px',
            padding: '5px 12px',
            opacity: isDownloading || isInstalling ? 0.6 : 1,
          }}
          data-testid="sample-download-btn"
        >
          {isDownloading ? 'Downloading…' : 'Download .zip'}
        </button>
        <button
          type="button"
          onClick={handleInstall}
          disabled={isInstalling || isDownloading}
          style={{
            ...btnPrimary,
            fontSize: '12px',
            padding: '5px 12px',
            opacity: isInstalling || isDownloading ? 0.6 : 1,
          }}
          data-testid="sample-install-btn"
        >
          {isInstalling ? 'Installing…' : 'Install'}
        </button>
      </div>
    </div>
  );
};
