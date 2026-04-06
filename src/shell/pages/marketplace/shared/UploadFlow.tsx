/**
 * UploadFlow — multi-step widget upload orchestration.
 *
 * Steps: File select → Processing → Manifest review → Security results → Publishing
 * Communicates with marketplace via bus events (no direct L5 imports).
 *
 * @module shell/pages/marketplace/shared
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { BusEvent, ReviewStatus, SecurityScanResultType, WidgetManifest } from '@sn/types';
import { MarketplaceEvents } from '@sn/types';

import { bus } from '../../../../kernel/bus';
import { scanWidgetHtml } from '../../../../kernel/security/widget-scanner';
import { useAuthStore } from '../../../../kernel/stores/auth/auth.store';
import { themeVar } from '../../../theme/theme-vars';

import { SecurityBadge } from './SecurityBadge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FlowStep = 'select' | 'processing' | 'review' | 'security' | 'publishing' | 'done' | 'error';

interface UploadState {
  step: FlowStep;
  file: File | null;
  statusMessage: string;
  manifest: WidgetManifest | null;
  scanResult: SecurityScanResultType | null;
  reviewStatus: ReviewStatus | null;
  widgetId: string | null;
  error: string | null;
}

export interface UploadFlowProps {
  /** Author ID override. Falls back to current auth user. */
  authorId?: string;
  /** If provided, skip the file-select step and start processing immediately. */
  initialFile?: File;
  onClose?: () => void;
  onComplete?: (widgetId: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCEPTED_EXTENSIONS = '.html,.htm,.zip,.snwidget.zip,.js,.jsx,.tsx,.vue';
const UPLOAD_TIMEOUT_MS = 60_000;

function getFileTypeLabel(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'HTML';
  if (name.endsWith('.zip')) return 'ZIP bundle';
  if (name.endsWith('.jsx') || name.endsWith('.tsx')) return 'React source';
  if (name.endsWith('.vue')) return 'Vue source';
  if (name.endsWith('.js')) return 'JavaScript';
  return 'Source file';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const UploadFlow: React.FC<UploadFlowProps> = ({ authorId, initialFile, onClose, onComplete }) => {
  const authUserId = useAuthStore((s) => s.user?.id ?? '');
  const userId = authorId || authUserId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({
    step: 'select',
    file: null,
    statusMessage: '',
    manifest: null,
    scanResult: null,
    reviewStatus: null,
    widgetId: null,
    error: null,
  });

  // -------------------------------------------------------------------------
  // File selection
  // -------------------------------------------------------------------------
  const handleFileSelected = useCallback(
    (file: File) => {
      setState((s) => ({
        ...s,
        step: 'processing',
        file,
        statusMessage: `Processing ${getFileTypeLabel(file)}...`,
        error: null,
      }));

      // Emit upload request via bus
      let settled = false;

      const unsub = bus.subscribe(
        MarketplaceEvents.UPLOAD_RESPONSE,
        (event: BusEvent) => {
          if (settled) return;
          settled = true;
          unsub();

          const payload = event.payload as {
            success: boolean;
            widgetId?: string;
            reviewStatus?: ReviewStatus;
            scanResult?: SecurityScanResultType;
            error?: string;
          };

          if (payload.success) {
            setState((s) => ({
              ...s,
              step: 'done',
              widgetId: payload.widgetId ?? null,
              reviewStatus: payload.reviewStatus ?? 'approved',
              scanResult: payload.scanResult ?? null,
              statusMessage: 'Widget published successfully!',
            }));
            if (payload.widgetId && onComplete) {
              onComplete(payload.widgetId);
            }
          } else {
            setState((s) => ({
              ...s,
              step: 'error',
              error: payload.error ?? 'Upload failed',
              scanResult: payload.scanResult ?? null,
              reviewStatus: payload.reviewStatus ?? null,
            }));
          }
        },
      );

      // Timeout
      setTimeout(() => {
        if (settled) return;
        settled = true;
        unsub();
        setState((s) => ({
          ...s,
          step: 'error',
          error: 'Upload timed out. Please try again.',
        }));
      }, UPLOAD_TIMEOUT_MS);

      bus.emit(MarketplaceEvents.UPLOAD_REQUEST, {
        file,
        authorId: userId,
      });
    },
    [userId, onComplete],
  );

  // Auto-start upload when an initialFile is provided (e.g., from Samples page)
  useEffect(() => {
    if (initialFile && state.step === 'select') {
      handleFileSelected(initialFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelected(file);
      e.target.value = '';
    },
    [handleFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelected(file);
    },
    [handleFileSelected],
  );

  const handleReset = useCallback(() => {
    setState({
      step: 'select',
      file: null,
      statusMessage: '',
      manifest: null,
      scanResult: null,
      reviewStatus: null,
      widgetId: null,
      error: null,
    });
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      data-testid="upload-flow"
      style={{
        padding: '24px',
        fontFamily: themeVar('--sn-font-family'),
        color: themeVar('--sn-text'),
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Upload Widget</h2>
        <button
          type="button"
          onClick={() => onClose?.()}
          style={{
            background: 'none',
            border: 'none',
            color: themeVar('--sn-text-muted'),
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px',
          }}
        >
          x
        </button>
      </div>

      {/* Step: File Selection */}
      {state.step === 'select' && (
        <div
          data-testid="upload-flow-dropzone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '40px 24px',
            border: `2px dashed ${themeVar('--sn-border')}`,
            borderRadius: themeVar('--sn-radius'),
            background: themeVar('--sn-surface'),
            textAlign: 'center',
            cursor: 'pointer',
          }}
          onClick={() => inputRef.current?.click()}
        >
          <div style={{ fontSize: '32px', opacity: 0.5 }}>+</div>
          <div style={{ fontWeight: 500, fontSize: '15px' }}>Drop your widget here</div>
          <div style={{ fontSize: '12px', color: themeVar('--sn-text-muted') }}>
            Accepts .html, .zip, .jsx, .tsx, .vue, .js
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            style={{ display: 'none' }}
            onChange={handleInputChange}
            data-testid="upload-flow-input"
          />
        </div>
      )}

      {/* Step: Processing */}
      {state.step === 'processing' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              margin: '0 auto 16px',
              border: `2px solid ${themeVar('--sn-border')}`,
              borderTopColor: themeVar('--sn-accent'),
              borderRadius: '50%',
              animation: 'sn-spin 0.7s linear infinite',
            }}
          />
          <div style={{ fontSize: '14px', color: themeVar('--sn-text-muted') }}>
            {state.statusMessage}
          </div>
          <style>{`@keyframes sn-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Step: Done */}
      {state.step === 'done' && (
        <div data-testid="upload-flow-success" style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>Published!</div>
          <div style={{ fontSize: '14px', color: themeVar('--sn-text-muted'), marginBottom: '12px' }}>
            Your widget is now live in the marketplace.
          </div>
          {state.reviewStatus && state.reviewStatus !== 'approved' && (
            <div style={{ marginBottom: '12px' }}>
              <SecurityBadge reviewStatus={state.reviewStatus} />
            </div>
          )}
          {state.scanResult && state.scanResult.flags.length > 0 && (
            <div
              style={{
                textAlign: 'left',
                padding: '12px',
                borderRadius: themeVar('--sn-radius'),
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.2)',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                Security scan flagged {state.scanResult.flags.length} issue(s):
              </div>
              {state.scanResult.flags.map((flag, i) => (
                <div key={i} style={{ marginBottom: '4px', color: flag.severity === 'critical' ? '#dc2626' : '#eab308' }}>
                  {flag.severity === 'critical' ? '!' : '?'} {flag.message}
                  {flag.line != null && ` (line ${flag.line})`}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '8px 20px',
                border: `1px solid ${themeVar('--sn-border')}`,
                borderRadius: themeVar('--sn-radius'),
                background: 'transparent',
                color: themeVar('--sn-text'),
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Upload Another
            </button>
            <button
              type="button"
              onClick={() => onClose?.()}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: themeVar('--sn-radius'),
                background: themeVar('--sn-accent'),
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Step: Error */}
      {state.step === 'error' && (
        <div data-testid="upload-flow-error" style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: '18px', marginBottom: '12px', color: '#dc2626' }}>Upload Failed</div>
          <div
            style={{
              padding: '12px',
              borderRadius: themeVar('--sn-radius'),
              background: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              color: '#dc2626',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {state.error}
          </div>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '8px 20px',
              border: `1px solid ${themeVar('--sn-border')}`,
              borderRadius: themeVar('--sn-radius'),
              background: 'transparent',
              color: themeVar('--sn-text'),
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
