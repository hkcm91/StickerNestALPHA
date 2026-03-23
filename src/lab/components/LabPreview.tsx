/**
 * LabPreview — Live preview pane for Widget Lab.
 *
 * Renders the widget inside a frosted glass frame with:
 * - Error boundary for widget crashes (ember glow border)
 * - Atmospheric empty state with faint dot grid, breathing text, ghost buttons
 *
 * @module lab/components
 * @layer L2
 */

import React, { Component, useCallback, useEffect, useState } from 'react';

import type { PreviewManager } from '../preview/preview-manager';

import { labPalette, SPRING, HEX, hexToRgb } from './shared/palette';

// ═══════════════════════════════════════════════════════════════════
// Error Boundary
// ═══════════════════════════════════════════════════════════════════

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PreviewErrorBoundary extends Component<
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
          justifyContent: 'center', height: '100%', gap: 16, padding: 32,
          border: '1px solid rgba(232,128,108,0.3)',
          borderRadius: 10, background: 'rgba(232,128,108,0.04)',
        }}>
          <div style={{
            fontSize: 14, color: labPalette.ember,
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
              padding: '8px 20px', fontSize: 12, fontWeight: 500,
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
// Atmospheric Empty State
// ═══════════════════════════════════════════════════════════════════

const [_er, _eg, _eb] = hexToRgb(HEX.ember);
const [sr, sg, sb] = hexToRgb(HEX.storm);

const EmptyPreviewState: React.FC = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', position: 'relative', overflow: 'hidden',
  }}>
    {/* Faint dot grid background */}
    <div aria-hidden style={{
      position: 'absolute', inset: 0,
      backgroundImage: `radial-gradient(circle, rgba(${sr},${sg},${sb},0.08) 1px, transparent 1px)`,
      backgroundSize: '32px 32px',
      opacity: 0.6,
    }} />

    {/* Ambient center glow */}
    <div aria-hidden style={{
      position: 'absolute',
      width: '50%', height: '50%',
      top: '25%', left: '25%',
      background: `radial-gradient(ellipse, rgba(${sr},${sg},${sb},0.04) 0%, transparent 70%)`,
      animation: 'sn-breathe 6s ease-in-out infinite',
    }} />

    {/* Content */}
    <div style={{
      textAlign: 'center', position: 'relative', zIndex: 1,
      animation: `sn-drift-up 600ms ${SPRING} both`,
    }}>
      <p style={{
        margin: 0, fontSize: 16, lineHeight: 1.6,
        fontFamily: 'var(--sn-font-serif, Newsreader, Georgia, serif)',
        fontStyle: 'italic',
        color: labPalette.textMuted,
        letterSpacing: '-0.01em',
      }}>
        Your widget will appear here
      </p>
      <p style={{
        margin: '12px 0 0', fontSize: 12,
        color: labPalette.textFaint,
        fontFamily: 'var(--sn-font-family)',
      }}>
        Describe one above, or start building in the graph
      </p>

      {/* Ghost action hints */}
      <div style={{
        display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24,
        animation: `sn-drift-up 600ms ${SPRING} 100ms both`,
      }}>
        <span style={{
          padding: '7px 16px', fontSize: 11, fontWeight: 500,
          fontFamily: 'var(--sn-font-family)',
          color: labPalette.textFaint,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 8,
          letterSpacing: '0.01em',
        }}>
          Browse templates
        </span>
        <span style={{
          padding: '7px 16px', fontSize: 11, fontWeight: 500,
          fontFamily: 'var(--sn-font-family)',
          color: labPalette.textFaint,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 8,
          letterSpacing: '0.01em',
        }}>
          See examples
        </span>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface LabPreviewProps {
  preview: PreviewManager;
}

export const LabPreviewComponent: React.FC<LabPreviewProps> = ({ preview }) => {
  const [reloadKey, setReloadKey] = useState(0);
  const frameProps = preview.getWidgetFrameProps();

  const handleReload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  // Poll for readiness (preview rebuilds are debounced)
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Preview canvas — clean, no chrome */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <PreviewErrorBoundary onReset={handleReload} key={reloadKey}>
          {frameProps ? (
            <iframe
              title="Widget Preview"
              srcDoc={frameProps.widgetHtml}
              sandbox="allow-scripts"
              style={{
                width: '100%', height: '100%', border: 'none',
                background: 'var(--sn-bg, #0A0A0E)',
              }}
            />
          ) : (
            <EmptyPreviewState />
          )}
        </PreviewErrorBoundary>
      </div>
    </div>
  );
};
