/**
 * ManifestReview — review and confirm a parsed widget manifest before installing.
 *
 * Shows editable name/description, read-only id/version, permissions checklist,
 * event contract badges, optional README viewer, and AI confidence indicator.
 *
 * @module shell/pages/marketplace/shared
 * @layer L6
 */

import React, { useCallback, useState } from 'react';

import type { EventPort, WidgetManifest } from '@sn/types';

import { themeVar } from '../../../theme/theme-vars';
import { btnPrimary, btnSecondary, inputStyle, mutedText, tagStyle } from '../styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ManifestReviewProps {
  manifest: WidgetManifest;
  /** AI confidence score 0–1; show indicator when < 1.0 */
  confidence?: number;
  /** Raw README text from the package */
  readme?: string;
  onConfirm: (manifest: WidgetManifest) => void;
  onCancel: () => void;
  isInstalling: boolean;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: themeVar('--sn-text-muted'),
      marginBottom: '6px',
    }}
  >
    {children}
  </div>
);

const ReadOnlyField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ marginBottom: '16px' }}>
    <SectionLabel>{label}</SectionLabel>
    <div
      style={{
        padding: '6px 10px',
        borderRadius: themeVar('--sn-radius'),
        background: themeVar('--sn-bg'),
        border: `1px solid ${themeVar('--sn-border')}`,
        fontSize: '13px',
        fontFamily: `var(--sn-font-mono, monospace)`,
        color: themeVar('--sn-text-muted'),
        wordBreak: 'break-all',
      }}
    >
      {value}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ManifestReview: React.FC<ManifestReviewProps> = ({
  manifest,
  confidence,
  readme,
  onConfirm,
  onCancel,
  isInstalling,
}) => {
  const [name, setName] = useState(manifest.name);
  const [description, setDescription] = useState(manifest.description ?? '');
  const [readmeOpen, setReadmeOpen] = useState(false);

  const showConfidenceWarning = typeof confidence === 'number' && confidence < 1.0;

  const handleConfirm = useCallback(() => {
    onConfirm({ ...manifest, name, description: description || undefined });
  }, [manifest, name, description, onConfirm]);

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const wrapperStyle: React.CSSProperties = {
    fontFamily: themeVar('--sn-font-family'),
    color: themeVar('--sn-text'),
    fontSize: '14px',
  };

  const permissionBadgeStyle: React.CSSProperties = {
    ...tagStyle,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    padding: '3px 9px',
  };

  const eventBadgeStyle = (direction: 'emits' | 'subscribes'): React.CSSProperties => ({
    ...tagStyle,
    fontSize: '12px',
    padding: '3px 9px',
    background:
      direction === 'emits'
        ? 'rgba(37, 99, 235, 0.10)'
        : 'rgba(5, 150, 105, 0.10)',
    borderColor:
      direction === 'emits'
        ? 'rgba(37, 99, 235, 0.3)'
        : 'rgba(5, 150, 105, 0.3)',
    color:
      direction === 'emits'
        ? '#2563eb'
        : '#059669',
  });

  const confidenceBannerStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: themeVar('--sn-radius'),
    background: 'rgba(234, 179, 8, 0.10)',
    border: '1px solid rgba(234, 179, 8, 0.35)',
    color: '#92400e',
    fontSize: '13px',
    marginBottom: '16px',
    lineHeight: 1.5,
  };

  const readmeToggleStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '0',
    cursor: 'pointer',
    color: themeVar('--sn-accent'),
    fontSize: '13px',
    fontFamily: 'inherit',
    textDecoration: 'underline',
    marginBottom: '8px',
  };

  const readmeBoxStyle: React.CSSProperties = {
    padding: '12px',
    borderRadius: themeVar('--sn-radius'),
    background: themeVar('--sn-bg'),
    border: `1px solid ${themeVar('--sn-border')}`,
    fontSize: '13px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '200px',
    overflowY: 'auto',
    color: themeVar('--sn-text'),
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: `1px solid ${themeVar('--sn-border')}`,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const emits: EventPort[] = manifest.events?.emits ?? [];
  const subscribes: EventPort[] = manifest.events?.subscribes ?? [];
  const permissions = manifest.permissions ?? [];

  return (
    <div style={wrapperStyle} data-testid="manifest-review">
      {/* AI confidence warning */}
      {showConfidenceWarning && (
        <div style={confidenceBannerStyle} data-testid="confidence-banner">
          <strong>AI-generated manifest</strong> — confidence:{' '}
          {Math.round((confidence ?? 0) * 100)}%. Review all fields carefully before
          installing.
        </div>
      )}

      {/* Editable name */}
      <div style={{ marginBottom: '16px' }}>
        <SectionLabel>Widget Name</SectionLabel>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
          data-testid="manifest-name-input"
        />
      </div>

      {/* Editable description */}
      <div style={{ marginBottom: '16px' }}>
        <SectionLabel>Description</SectionLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{
            ...inputStyle,
            width: '100%',
            boxSizing: 'border-box',
            resize: 'vertical',
            lineHeight: 1.5,
          }}
          data-testid="manifest-description-input"
        />
      </div>

      {/* Read-only: id, version */}
      <ReadOnlyField label="Widget ID" value={manifest.id} />
      <ReadOnlyField label="Version" value={manifest.version} />

      {/* Permissions */}
      {permissions.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <SectionLabel>Permissions Required</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {permissions.map((perm) => (
              <span key={perm} style={permissionBadgeStyle} data-testid="permission-badge">
                🔒 {perm}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Event contract */}
      {(emits.length > 0 || subscribes.length > 0) && (
        <div style={{ marginBottom: '16px' }}>
          <SectionLabel>Event Contract</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {emits.map((port) => (
              <span
                key={`emit-${port.name}`}
                style={eventBadgeStyle('emits')}
                title={port.description ?? `Emits: ${port.name}`}
                data-testid="event-badge-emit"
              >
                ↑ {port.name}
              </span>
            ))}
            {subscribes.map((port) => (
              <span
                key={`sub-${port.name}`}
                style={eventBadgeStyle('subscribes')}
                title={port.description ?? `Subscribes: ${port.name}`}
                data-testid="event-badge-subscribe"
              >
                ↓ {port.name}
              </span>
            ))}
          </div>
          {emits.length === 0 && subscribes.length === 0 && (
            <span style={mutedText}>No events declared.</span>
          )}
        </div>
      )}

      {/* README viewer */}
      {readme && (
        <div style={{ marginBottom: '16px' }}>
          <SectionLabel>README</SectionLabel>
          <button
            type="button"
            onClick={() => setReadmeOpen((v) => !v)}
            style={readmeToggleStyle}
            data-testid="readme-toggle"
          >
            {readmeOpen ? 'Hide README' : 'Show README'}
          </button>
          {readmeOpen && (
            <div style={readmeBoxStyle} data-testid="readme-content">
              {readme}
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div style={footerStyle}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isInstalling}
          style={{ ...btnSecondary, opacity: isInstalling ? 0.5 : 1 }}
          data-testid="manifest-cancel"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isInstalling || !name.trim()}
          style={{
            ...btnPrimary,
            opacity: isInstalling || !name.trim() ? 0.6 : 1,
          }}
          data-testid="manifest-confirm"
        >
          {isInstalling ? 'Installing…' : 'Install Widget'}
        </button>
      </div>
    </div>
  );
};
