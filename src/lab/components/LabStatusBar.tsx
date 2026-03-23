/**
 * LabStatusBar — Bottom status bar shared across all Lab views.
 *
 * Shows: Connected | Streaming | Branch: Main | Latency: 12ms
 * Matches the mockup format with pipe-separated status items.
 *
 * @module lab/components
 * @layer L2
 */

import React from 'react';

import { labPalette, HEX, hexToRgb } from './shared/palette';
import { PulseIndicator } from './shared/PulseIndicator';

const [mr, mg, mb] = hexToRgb(HEX.moss);

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface LabStatusBarProps {
  projectName: string;
  hasUnsavedChanges?: boolean;
  connected?: boolean;
  streaming?: boolean;
  branch?: string;
  latencyMs?: number;
}

const Separator: React.FC = () => (
  <span style={{
    color: labPalette.textFaint,
    margin: '0 10px',
    fontSize: 10,
    userSelect: 'none',
  }}>
    |
  </span>
);

export const LabStatusBar: React.FC<LabStatusBarProps> = ({
  projectName,
  hasUnsavedChanges = false,
  connected = true,
  streaming = true,
  branch = 'main',
  latencyMs = 12,
}) => {
  return (
    <div
      aria-label="Lab status bar"
      style={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        fontSize: 11,
        fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
        color: labPalette.textMuted,
        flexShrink: 0,
        gap: 0,
      }}
    >
      {/* Left: connection + streaming + branch + latency */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <PulseIndicator
          state={connected ? 'success' : 'error'}
          size={5}
          label={connected ? 'Connected' : 'Disconnected'}
        />
        <span style={{
          marginLeft: 6,
          color: connected ? `rgba(${mr},${mg},${mb},0.9)` : labPalette.error,
          fontSize: 11,
        }}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>

        <Separator />

        <span style={{ color: streaming ? labPalette.textSoft : labPalette.textFaint }}>
          {streaming ? 'Streaming' : 'Paused'}
        </span>

        <Separator />

        <span style={{ color: labPalette.textMuted }}>
          Branch:{' '}
          <span style={{ color: labPalette.textSoft, fontWeight: 500 }}>
            {branch}
          </span>
        </span>

        <Separator />

        <span style={{ color: labPalette.textMuted }}>
          Latency:{' '}
          <span style={{
            color: latencyMs > 100 ? labPalette.warning : labPalette.textSoft,
            fontWeight: 500,
          }}>
            {latencyMs}ms
          </span>
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right: project name + unsaved indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 11,
          color: labPalette.textFaint,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 200,
        }}>
          {projectName}
        </span>
        {hasUnsavedChanges && (
          <span style={{ color: labPalette.warning, fontSize: 11 }} aria-label="Unsaved changes">
            *
          </span>
        )}
      </div>
    </div>
  );
};
