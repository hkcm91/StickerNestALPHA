/**
 * PreviewChrome — Top bar inside the preview showing widget status and controls.
 *
 * Displays:
 * - Widget name + "running" indicator (green PulseIndicator)
 * - Reload button (restart widget lifecycle)
 * - Console toggle (shows/hides console output)
 * - Expand/collapse with spring animation (300ms, stiffness: 200, damping: 25)
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useState } from 'react';

import { labPalette, SPRING } from './shared/palette';
import { PulseIndicator } from './shared/PulseIndicator';

// ═══════════════════════════════════════════════════════════════════
// Spring Animation
// ═══════════════════════════════════════════════════════════════════

/**
 * CSS spring approximation for expand/collapse.
 * Target: 300ms duration, stiffness: 200, damping: 25.
 * Approximated as a cubic-bezier for CSS transition.
 */
const EXPAND_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EXPAND_DURATION = '300ms';

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
        padding: '5px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(0,0,0,0.18)',
        fontFamily: 'var(--sn-font-family)',
        fontSize: 11,
        minHeight: 32,
        transition: `all ${EXPAND_DURATION} ${EXPAND_SPRING}`,
      }}
    >
      {/* Left: widget name + running indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <PulseIndicator
          state={isRunning ? 'success' : 'idle'}
          size={7}
          label={isRunning ? 'Widget running' : 'Widget stopped'}
        />
        <span
          data-testid="preview-chrome-name"
          style={{
            color: labPalette.text,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {widgetName}
        </span>
        {isRunning && (
          <span
            data-testid="preview-chrome-running-label"
            style={{
              color: labPalette.moss,
              fontSize: 9,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            running
          </span>
        )}
      </div>

      {/* Right: action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Reload */}
        <button
          onClick={handleReload}
          aria-label="Reload widget"
          title="Reload widget"
          style={{
            background: 'none',
            border: 'none',
            color: labPalette.textMuted,
            cursor: 'pointer',
            fontSize: 13,
            padding: '2px 6px',
            lineHeight: 1,
            borderRadius: 4,
            transition: `all 400ms ${SPRING}`,
            transform: reloadBounce ? 'rotate(180deg) scale(1.15)' : 'none',
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
            background: consoleOpen ? 'rgba(255,255,255,0.06)' : 'none',
            border: 'none',
            color: consoleOpen ? labPalette.text : labPalette.textMuted,
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 500,
            fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
            padding: '2px 8px',
            lineHeight: 1.4,
            borderRadius: 4,
            transition: `all 300ms ${SPRING}`,
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
            background: 'none',
            border: 'none',
            color: labPalette.textMuted,
            cursor: 'pointer',
            fontSize: 12,
            padding: '2px 6px',
            lineHeight: 1,
            borderRadius: 4,
            transition: `all ${EXPAND_DURATION} ${EXPAND_SPRING}`,
            transform: expanded ? 'rotate(180deg)' : 'none',
          }}
        >
          {expanded ? '\u2198' : '\u2197'}
        </button>
      </div>
    </div>
  );
};
