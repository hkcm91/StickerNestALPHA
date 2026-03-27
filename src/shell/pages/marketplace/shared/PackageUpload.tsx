/**
 * PackageUpload — drag-and-drop upload zone for .zip / .snwidget.zip files.
 *
 * @module shell/pages/marketplace/shared
 * @layer L6
 */

import React, { useCallback, useRef, useState } from 'react';

import { themeVar } from '../../../theme/theme-vars';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PackageUploadProps {
  onPackageLoaded: (data: ArrayBuffer) => void;
  isLoading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACCEPTED_EXTENSIONS = ['.zip', '.snwidget.zip'];

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PackageUpload: React.FC<PackageUploadProps> = ({
  onPackageLoaded,
  isLoading,
  error,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (result instanceof ArrayBuffer) {
          onPackageLoaded(result);
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [onPackageLoaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (isLoading) return;

      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (!isAcceptedFile(file)) return;
      readFile(file);
    },
    [isLoading, readFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!isAcceptedFile(file)) return;
      readFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [readFile],
  );

  const handleBrowse = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const dropZoneStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px 24px',
    border: `2px dashed ${isDragOver ? themeVar('--sn-accent') : themeVar('--sn-border')}`,
    borderRadius: themeVar('--sn-radius'),
    background: isDragOver
      ? `color-mix(in srgb, ${themeVar('--sn-accent')} 6%, ${themeVar('--sn-surface')})`
      : themeVar('--sn-surface'),
    color: themeVar('--sn-text-muted'),
    fontSize: '14px',
    fontFamily: themeVar('--sn-font-family'),
    cursor: isLoading ? 'not-allowed' : 'default',
    transition: 'border-color 0.15s, background 0.15s',
    textAlign: 'center',
    userSelect: 'none',
  };

  const iconStyle: React.CSSProperties = {
    fontSize: '32px',
    lineHeight: 1,
    opacity: 0.5,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 500,
    color: themeVar('--sn-text'),
  };

  const hintStyle: React.CSSProperties = {
    fontSize: '12px',
    color: themeVar('--sn-text-muted'),
    marginTop: '-4px',
  };

  const browseButtonStyle: React.CSSProperties = {
    padding: '6px 16px',
    border: `1px solid ${themeVar('--sn-border')}`,
    borderRadius: themeVar('--sn-radius'),
    background: 'transparent',
    color: themeVar('--sn-text'),
    fontSize: '13px',
    fontFamily: 'inherit',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    opacity: isLoading ? 0.5 : 1,
    transition: 'border-color 0.15s',
  };

  const spinnerStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    border: `2px solid ${themeVar('--sn-border')}`,
    borderTopColor: themeVar('--sn-accent'),
    borderRadius: '50%',
    animation: 'sn-spin 0.7s linear infinite',
  };

  const errorStyle: React.CSSProperties = {
    marginTop: '8px',
    padding: '8px 12px',
    borderRadius: themeVar('--sn-radius'),
    background: 'rgba(220, 38, 38, 0.08)',
    border: '1px solid rgba(220, 38, 38, 0.3)',
    color: '#dc2626',
    fontSize: '13px',
    fontFamily: themeVar('--sn-font-family'),
    wordBreak: 'break-word',
  };

  return (
    <div>
      {/* Keyframe injection — isolated to this component */}
      <style>{`@keyframes sn-spin { to { transform: rotate(360deg); } }`}</style>

      <div
        data-testid="package-upload-dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={dropZoneStyle}
        aria-label="Drop .zip widget package here"
      >
        {isLoading ? (
          <>
            <div style={spinnerStyle} />
            <span style={{ color: themeVar('--sn-text-muted'), fontSize: '14px' }}>
              Loading package…
            </span>
          </>
        ) : (
          <>
            <div style={iconStyle} aria-hidden="true">📦</div>
            <div style={labelStyle}>Drop your widget package here</div>
            <div style={hintStyle}>Accepts .zip and .snwidget.zip</div>
            <button
              type="button"
              onClick={handleBrowse}
              disabled={isLoading}
              style={browseButtonStyle}
              data-testid="package-upload-browse"
            >
              Browse files
            </button>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.snwidget.zip"
        style={{ display: 'none' }}
        onChange={handleInputChange}
        data-testid="package-upload-input"
      />

      {/* Inline error */}
      {error && (
        <div data-testid="package-upload-error" style={errorStyle}>
          {error}
        </div>
      )}
    </div>
  );
};
