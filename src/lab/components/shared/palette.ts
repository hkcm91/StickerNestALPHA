/**
 * L2-safe palette — CSS variable references with fallback hex values.
 *
 * Lab (L2) cannot import from src/shell/ (L6), so this file provides
 * the same semantic palette shape as shell/theme/theme-vars.ts using
 * raw CSS var strings. No L6 imports.
 *
 * @module lab/components/shared
 * @layer L2
 */

// ═══════════════════════════════════════════════════════════════════
// Named Colors
// ═══════════════════════════════════════════════════════════════════

export const labPalette = {
  // Named colors
  storm: 'var(--sn-storm, #4E7B8E)',
  stormLight: 'var(--sn-storm-light, #6A95A6)',
  ember: 'var(--sn-ember, #E8806C)',
  emberLight: 'var(--sn-ember-light, #F09A88)',
  opal: 'var(--sn-opal, #B0D0D8)',
  moss: 'var(--sn-moss, #5AA878)',
  violet: 'var(--sn-violet, #B8A0D8)',

  // Semantic states
  success: 'var(--sn-success, #5AA878)',
  warning: 'var(--sn-warning, #D4A04C)',
  error: 'var(--sn-error, #C85858)',

  // Surfaces
  bg: 'var(--sn-bg, #0A0A0E)',
  bgGround: 'var(--sn-bg-ground, #110E14)',
  surface: 'var(--sn-surface, #131317)',
  surfaceRaised: 'var(--sn-surface-raised, #1A1A1F)',
  surfaceGlass: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
  surfaceGlassLight: 'var(--sn-surface-glass-light, rgba(20,17,24,0.65))',

  // Text
  text: 'var(--sn-text, #E8E6ED)',
  textSoft: 'var(--sn-text-soft, #B8B5C0)',
  textMuted: 'var(--sn-text-muted, #7A7784)',
  textFaint: 'var(--sn-text-faint, #4A4754)',

  // Borders
  border: 'var(--sn-border, rgba(255,255,255,0.06))',
  borderHover: 'var(--sn-border-hover, rgba(255,255,255,0.12))',

  // Accent
  accent: 'var(--sn-accent, #3E7D94)',
  accentLight: 'var(--sn-accent-light, #5A9DB0)',
} as const;

// ═══════════════════════════════════════════════════════════════════
// Animation Constants
// ═══════════════════════════════════════════════════════════════════

export const SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const STAGGER_MS = 70;

// ═══════════════════════════════════════════════════════════════════
// Color Utilities (ported from swatches/hooks.ts)
// ═══════════════════════════════════════════════════════════════════

/** Convert a hex color to [r, g, b] tuple. */
export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// ═══════════════════════════════════════════════════════════════════
// Named Color Hex Values (for RGB decomposition in glow calculations)
// ═══════════════════════════════════════════════════════════════════

export const HEX = {
  storm: '#4E7B8E',
  stormLight: '#6A95A6',
  ember: '#E8806C',
  emberLight: '#F09A88',
  opal: '#B0D0D8',
  moss: '#5AA878',
  violet: '#B8A0D8',
  warning: '#D4A04C',
  error: '#C85858',
} as const;
