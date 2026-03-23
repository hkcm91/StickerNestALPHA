/**
 * PreviewChrome — Elevated overlay bar for the preview pane.
 *
 * Glass-backed floating bar over the top of the preview. Shows:
 * - Widget name (serif italic) + running indicator (PulseIndicator)
 * - Reload (spring bounce), console toggle, expand/collapse
 *
 * Buttons use ghost variant glow on hover — matching InnerGlowButton style.
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useState } from 'react';

import { labPalette, SPRING, HEX, hexToRgb } from './shared/palette';
import { PulseIndicator } from './shared/PulseIndicator';

// ═══════════════════════════════════════════════════════════════════
// Chrome button styles
// ═══════════════════════════════════════════════════════════════════

const [sr, sg, sb] = hexToRgb(HEX.storm);

const chromeButton: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.04)',
  color: labPalette.textMuted,
  cursor: 'pointer',
  fontSize: 13,
  padding: '6px 10px',
  lineHeight: 1,
  borderRadius: 8,
  transition: `all 300ms ${SPRING}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface PreviewChromeProps {
  /** Widget name to display */
  widgetName: string;
  /** Whether the widget is currently running */
  isRunning: boolean;
  /** Callback when the reload button is pressed */
  onReload: () => void;
  /** Whether the console panel is visible */
  consoleOpen: boolean;
  /** Callback to toggle console visibility */
  onConsoleToggle: () => void;
  /** Whether the preview is expanded (fills available space) */
  expanded: boolean;
  /** Callback to toggle expanded state */
  onExpandToggle: () => void;
}

export const PreviewChrome: React.FC<PreviewChromeProps> = ({
  widgetName,
  isRunning,
  onReload,
  consoleOpen,
  onConsoleToggle,
  expanded,
  onExpandToggle,
}) => {
  const [reloadBounce, setReloadBounce] = useState(false);

  const handleReload = useCallback(() => {
    setReloadBounce(true);
    onReload();
    setTimeout(() => setReloadBounce(false), 400);
  }, [onReload]);

  return (
    <div
      data-testid="preview-chrome"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'linear-gradient(180deg, rgba(20,17,24,0.4) 0%, transparent 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        fontFamily: 'var(--sn-font-family)',
        fontSize: 12,
        minHeight: 40,
      }}
    >
      {/* Left: widget name + running indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <PulseIndicator
          state={isRunning ? 'success' : 'idle'}
          size={7}
          label={isRunning ? 'Widget running' : 'Widget stopped'}
        />
        <span
          data-testid="preview-chrome-name"
          style={{
            color: labPalette.textSoft,
            fontWeight: 400,
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--sn-font-serif, Newsreader, Georgia, serif)',
            fontStyle: 'italic',
            letterSpacing: '-0.01em',
          }}
        >
          {widgetName}
        </span>
      </div>

      {/* Right: action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Reload */}
        <button
          onClick={handleReload}
          aria-label="Reload widget"
          title="Reload widget"
          style={{
            ...chromeButton,
            transform: reloadBounce ? 'rotate(180deg) scale(1.1)' : 'none',
          }}
        >
          ↻
        </button>

        {/* Console toggle */}
        <button
          onClick={onConsoleToggle}
          aria-label={consoleOpen ? 'Hide console' : 'Show console'}
          aria-pressed={consoleOpen}
          title={consoleOpen ? 'Hide console' : 'Show console'}
          style={{
            ...chromeButton,
            background: consoleOpen ? `rgba(${sr},${sg},${sb},0.08)` : chromeButton.background,
            borderColor: consoleOpen ? `rgba(${sr},${sg},${sb},0.15)` : 'rgba(255,255,255,0.04)',
            color: consoleOpen ? labPalette.text : labPalette.textMuted,
            fontSize: 10,
            fontWeight: 500,
            fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
            boxShadow: consoleOpen
              ? `0 0 6px rgba(${sr},${sg},${sb},0.1)`
              : 'none',
          }}
        >
          {'>_'}
        </button>

        {/* Expand/Collapse toggle */}
        <button
          onClick={onExpandToggle}
          aria-label={expanded ? 'Collapse preview' : 'Expand preview'}
          aria-pressed={expanded}
          title={expanded ? 'Collapse preview' : 'Expand preview'}
          style={{
            ...chromeButton,
            transform: expanded ? 'rotate(180deg)' : 'none',
            fontSize: 12,
          }}
        >
          {expanded ? '\u2198' : '\u2197'}
        </button>
      </div>
    </div>
  );
};
