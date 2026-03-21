/**
 * CanvasView — Full-bleed pipeline canvas with floating UI elements.
 *
 * The graph editor fills the entire area. UI floats on top:
 * - Small Preview/Debug toggle pill (top-left)
 * - Floating AI prompt bar (bottom-center)
 *
 * Preview lives in the Inspector sidebar panel (LabContextSidebar).
 *
 * @module lab/components/views
 * @layer L2
 */

import React, { useState } from 'react';

import { labPalette, SPRING, HEX, hexToRgb } from '../shared/palette';

const [sr, sg, sb] = hexToRgb(HEX.storm);

// ═══════════════════════════════════════════════════════════════════
// Floating Preview/Debug Toggle
// ═══════════════════════════════════════════════════════════════════

const ViewToggle: React.FC<{
  debugMode: boolean;
  onToggle: () => void;
}> = ({ debugMode, onToggle }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const options = [
    { key: 'preview', label: 'Preview', isActive: !debugMode },
    { key: 'debug', label: 'Debug', isActive: debugMode },
  ] as const;

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: 12,
      zIndex: 10,
      display: 'flex',
      borderRadius: 8,
      overflow: 'hidden',
      background: 'rgba(20,17,24,0.8)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {options.map(({ key, label, isActive }) => {
        const isHov = key === hovered;
        return (
          <button
            key={key}
            onClick={onToggle}
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding: '6px 14px',
              border: 'none',
              background: isActive
                ? `rgba(${sr},${sg},${sb},0.15)`
                : isHov
                  ? 'rgba(255,255,255,0.04)'
                  : 'transparent',
              color: isActive ? labPalette.text : labPalette.textMuted,
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--sn-font-family)',
              cursor: 'pointer',
              transition: `all 200ms ${SPRING}`,
              outline: 'none',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Floating Prompt Bar
// ═══════════════════════════════════════════════════════════════════

const FloatingPromptBar: React.FC<{
  promptBar?: React.ReactNode;
}> = ({ promptBar }) => {
  if (!promptBar) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10,
      width: '100%',
      maxWidth: 560,
      padding: '0 16px',
    }}>
      <div style={{
        background: 'rgba(20,17,24,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        {promptBar}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════

export interface CanvasViewProps {
  debugMode: boolean;
  onToggleDebug: () => void;

  /** The graph editor content — always displayed */
  graphSlot?: React.ReactNode;
  /** The prompt bar (AI input) */
  promptBar?: React.ReactNode;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  debugMode,
  onToggleDebug,
  graphSlot,
  promptBar,
}) => {
  return (
    <div style={{
      height: '100%',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div data-debug-mode={debugMode} style={{ position: 'absolute', inset: 0 }}>
        {graphSlot}
      </div>

      <ViewToggle debugMode={debugMode} onToggle={onToggleDebug} />
      <FloatingPromptBar promptBar={promptBar} />
    </div>
  );
};
