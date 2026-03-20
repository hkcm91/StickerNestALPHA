/**
 * LabPreview — Live preview pane for Widget Lab.
 *
 * Renders the widget inside a frosted glass frame with:
 * - Mode selector (2D Isolated / 2D Canvas / 3D Spatial)
 * - Reload button with spring bounce
 * - Error boundary for widget crashes (ember glow border)
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useEffect, useState } from 'react';

import type { PreviewManager, PreviewMode } from '../preview/preview-manager';

import { labPalette, SPRING } from './shared/palette';

// ═══════════════════════════════════════════════════════════════════
// Mode Selector
// ═══════════════════════════════════════════════════════════════════

const MODES: { id: PreviewMode; label: string }[] = [
  { id: '2d-isolated', label: '2D Isolated' },
  { id: '2d-canvas', label: '2D Canvas' },
  { id: '3d-spatial', label: '3D Spatial' },
];

// ═══════════════════════════════════════════════════════════════════
// Error Boundary
// ═══════════════════════════════════════════════════════════════════

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PreviewErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset: () => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: 12, padding: 24,
          border: '1px solid rgba(232,128,108,0.3)',
          borderRadius: 10, background: 'rgba(232,128,108,0.04)',
        }}>
          <div style={{
            fontSize: 13, color: labPalette.ember,
            fontFamily: 'var(--sn-font-family)', fontWeight: 600,
          }}>
            Widget crashed
          </div>
          <div style={{
            fontSize: 11, color: labPalette.textMuted,
            fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
            maxWidth: '100%', overflow: 'auto', textAlign: 'center',
          }}>
            {this.state.error?.message ?? 'Unknown error'}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset();
            }}
            style={{
              padding: '6px 16px', fontSize: 11, fontWeight: 500,
              fontFamily: 'var(--sn-font-family)', color: labPalette.ember,
              background: 'rgba(232,128,108,0.08)',
              border: '1px solid rgba(232,128,108,0.15)',
              borderRadius: 8, cursor: 'pointer',
              transition: `all 300ms ${SPRING}`,
            }}
          >
            Reload Preview
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface LabPreviewProps {
  preview: PreviewManager;
}

export const LabPreviewComponent: React.FC<LabPreviewProps> = ({ preview }) => {
  const [mode, setMode] = useState<PreviewMode>(preview.getMode());
  const [reloadKey, setReloadKey] = useState(0);
  const [reloadBounce, setReloadBounce] = useState(false);
  const frameProps = preview.getWidgetFrameProps();

  const handleModeChange = useCallback((newMode: PreviewMode) => {
    setMode(newMode);
    preview.setMode(newMode);
  }, [preview]);

  const handleReload = useCallback(() => {
    setReloadKey((k) => k + 1);
    setReloadBounce(true);
    setTimeout(() => setReloadBounce(false), 400);
  }, []);

  // Poll for readiness (preview rebuilds are debounced)
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(0,0,0,0.15)',
      }}>
        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: 2 }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              aria-pressed={mode === m.id}
              style={{
                padding: '4px 10px', fontSize: 10, fontWeight: mode === m.id ? 600 : 400,
                fontFamily: 'var(--sn-font-family)',
                color: mode === m.id ? labPalette.text : labPalette.textMuted,
                background: mode === m.id ? 'var(--sn-surface-glass, rgba(20,17,24,0.75))' : 'transparent',
                border: 'none', borderRadius: 4, cursor: 'pointer',
                transition: `all 300ms ${SPRING}`, outline: 'none',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Reload */}
        <button
          onClick={handleReload}
          aria-label="Reload preview"
          style={{
            background: 'none', border: 'none', color: labPalette.textMuted,
            cursor: 'pointer', fontSize: 14, padding: 4, lineHeight: 1,
            transition: `transform 400ms ${SPRING}`,
            transform: reloadBounce ? 'rotate(180deg) scale(1.2)' : 'none',
          }}
        >
          ↻
        </button>
      </div>

      {/* Preview frame */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <PreviewErrorBoundary onReset={handleReload} key={reloadKey}>
          {frameProps ? (
            <iframe
              title="Widget Preview"
              srcDoc={frameProps.widgetHtml}
              sandbox="allow-scripts"
              style={{
                width: '100%', height: '100%', border: 'none',
                borderRadius: '0 0 10px 10px',
                background: '#fff',
              }}
            />
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: labPalette.textFaint, fontSize: 12,
              fontFamily: 'var(--sn-font-family)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 32, opacity: 0.3, marginBottom: 12,
                  fontFamily: 'var(--sn-font-serif, Newsreader, Georgia, serif)',
                }}>
                  ◇
                </div>
                Start typing to see a live preview
              </div>
            </div>
          )}
        </PreviewErrorBoundary>
      </div>
    </div>
  );
};
