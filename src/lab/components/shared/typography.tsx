/**
 * Lab typography primitives — adapted from UI Swatches gallery for L2.
 *
 * SectionTitle: serif 28px heading with optional italic subtitle.
 * GroupLabel: 9px uppercase tracking label for control groups.
 *
 * @module lab/components/shared
 * @layer L2
 */

import React from 'react';

import { labPalette } from './palette';

// ═══════════════════════════════════════════════════════════════════
// Section Title
// ═══════════════════════════════════════════════════════════════════

export const SectionTitle: React.FC<{
  children: string;
  sub?: string;
}> = ({ children, sub }) => (
  <div style={{ marginBottom: 28, paddingTop: 12 }}>
    <h2 style={{
      fontSize: 28, fontWeight: 700,
      fontFamily: 'var(--sn-font-serif, Georgia, serif)',
      color: labPalette.text, margin: 0, letterSpacing: '-0.03em',
      lineHeight: 1.2,
    }}>
      {children}
    </h2>
    {sub && (
      <p style={{
        fontSize: 13, color: labPalette.textMuted,
        fontFamily: 'var(--sn-font-serif, Georgia, serif)',
        fontStyle: 'italic', margin: '8px 0 0', lineHeight: 1.6,
        maxWidth: 520,
      }}>{sub}</p>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// Group Label
// ═══════════════════════════════════════════════════════════════════

export const GroupLabel: React.FC<{
  children: string;
  style?: React.CSSProperties;
}> = ({ children, style: s }) => (
  <div style={{
    fontSize: 9, fontWeight: 700, color: labPalette.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.14em',
    marginBottom: 12, marginTop: 8, ...s,
  }}>{children}</div>
);
