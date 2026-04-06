/**
 * SamplesPage — lists all curated sample widgets loaded from /samples/index.json.
 *
 * Users can download sample widgets or try uploading them through the upload
 * pipeline to learn the widget publishing flow.
 *
 * @module shell/pages/marketplace/samples
 * @layer L6
 */

import React, { useCallback, useEffect, useState } from 'react';

import type { SampleWidgetEntry } from '@sn/types';

import { themeVar } from '../../../theme/theme-vars';
import { UploadFlow } from '../shared/UploadFlow';
import { mutedText, pageStyle, sectionHeading } from '../styles';

import { SampleCard } from './SampleCard';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SamplesPage: React.FC = () => {
  const [samples, setSamples] = useState<SampleWidgetEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  // Upload flow modal state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Fetch sample index on mount
  useEffect(() => {
    let cancelled = false;

    async function loadIndex() {
      setIsLoading(true);
      setFetchError(null);

      try {
        const resp = await fetch('/samples/index.json');
        if (!resp.ok) {
          throw new Error(`Failed to load sample index (HTTP ${resp.status})`);
        }
        const data = (await resp.json()) as SampleWidgetEntry[];
        if (!cancelled) {
          setSamples(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(
            err instanceof Error ? err.message : 'Failed to load sample widgets.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadIndex();
    return () => { cancelled = true; };
  }, []);

  const handleTryUpload = useCallback((file: File) => {
    setUploadFile(file);
    setShowUpload(true);
  }, []);

  const handleError = useCallback((msg: string) => {
    setCardError(msg);
  }, []);

  const handleCloseUpload = useCallback(() => {
    setShowUpload(false);
    setUploadFile(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  };

  const errorBoxStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: themeVar('--sn-radius'),
    background: 'rgba(220, 38, 38, 0.08)',
    border: '1px solid rgba(220, 38, 38, 0.3)',
    color: '#dc2626',
    fontSize: '13px',
    fontFamily: themeVar('--sn-font-family'),
    marginBottom: '16px',
  };

  const skeletonStyle: React.CSSProperties = {
    height: '160px',
    borderRadius: themeVar('--sn-radius'),
    background: themeVar('--sn-surface'),
    border: `1px solid ${themeVar('--sn-border')}`,
    opacity: 0.5,
    animation: 'sn-pulse 1.4s ease-in-out infinite',
  };

  const modalOverlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9000,
  };

  const modalContent: React.CSSProperties = {
    background: themeVar('--sn-surface'),
    border: `1px solid ${themeVar('--sn-border')}`,
    borderRadius: themeVar('--sn-radius'),
    width: '480px',
    maxHeight: '80vh',
    overflow: 'auto',
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={pageStyle} data-testid="samples-page">
      <style>
        {`@keyframes sn-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }`}
      </style>

      <h2 style={sectionHeading}>Sample Widgets</h2>
      <p style={{ ...mutedText, marginBottom: '20px' }}>
        Download sample widgets to learn the SDK, or click "Try Upload" to test the upload pipeline with a known-good widget.
      </p>

      {/* Card error (non-fatal, dismissible) */}
      {cardError && (
        <div style={errorBoxStyle} data-testid="samples-install-error">
          {cardError}{' '}
          <button
            type="button"
            onClick={() => setCardError(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '13px',
              padding: 0,
              marginLeft: '8px',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div style={gridStyle} data-testid="samples-loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={skeletonStyle} />
          ))}
        </div>
      )}

      {/* Fetch error */}
      {!isLoading && fetchError && (
        <div style={errorBoxStyle} data-testid="samples-fetch-error">
          {fetchError}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !fetchError && samples.length === 0 && (
        <div style={{ ...mutedText, padding: '40px 0', textAlign: 'center' }} data-testid="samples-empty">
          No sample widgets available yet.
        </div>
      )}

      {/* Grid */}
      {!isLoading && !fetchError && samples.length > 0 && (
        <div style={gridStyle} data-testid="samples-grid">
          {samples.map((sample) => (
            <SampleCard
              key={sample.id}
              sample={sample}
              onTryUpload={handleTryUpload}
              onError={handleError}
            />
          ))}
        </div>
      )}

      {/* Upload Flow Modal */}
      {showUpload && (
        <div style={modalOverlay} onClick={handleCloseUpload} data-testid="samples-upload-modal">
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <UploadFlow
              initialFile={uploadFile ?? undefined}
              onClose={handleCloseUpload}
            />
          </div>
        </div>
      )}
    </div>
  );
};
