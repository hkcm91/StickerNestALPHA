/**
 * Theme token definitions for the StickerNest V5 design system.
 *
 * Her/Rothko-inspired palette: warm, dark, bioluminescent.
 * Named colors: Storm, Ember, Opal, Moss, Violet.
 * 60-30-10 color discipline: background 60%, structure 30%, accent 10%.
 *
 * @module shell/theme
 * @layer L6
 */

import type { CoreThemeTokens, FullThemeTokens, ThemeName } from '@sn/types';
import { CORE_TOKEN_KEYS } from '@sn/types';

// Re-export types for backward compatibility with existing consumers
export type { ThemeName };
export type ThemeTokenMap = FullThemeTokens;

/**
 * Re-export CORE_TOKEN_KEYS for use by the theme provider to extract
 * the widget-facing subset from the full token map.
 */
export { CORE_TOKEN_KEYS };

/**
 * Extract core (widget-facing) tokens from a full token map.
 */
export function extractCoreTokens(tokens: FullThemeTokens): CoreThemeTokens {
  const core = {} as Record<string, string>;
  for (const key of CORE_TOKEN_KEYS) {
    core[key] = tokens[key];
  }
  return core as CoreThemeTokens;
}

// =============================================================================
// Dark Theme — Canonical Her/Rothko Palette
// =============================================================================

const dark: FullThemeTokens = {
  // Core tokens (widget bridge contract)
  '--sn-bg': '#0A0A0E',
  '--sn-surface': '#131317',
  '--sn-accent': '#4E7B8E',
  '--sn-text': '#EDEBE6',
  '--sn-text-muted': '#6B6878',
  '--sn-border': 'rgba(255,255,255,0.04)',
  '--sn-radius': '12px',
  '--sn-font-family': "'Outfit', system-ui, -apple-system, sans-serif",

  // Extended tokens (app-internal)
  '--sn-bg-ground': '#110E14',
  '--sn-surface-raised': '#1A1A1F',
  '--sn-surface-glass': 'rgba(20,17,24,0.75)',
  '--sn-surface-glass-light': 'rgba(20,17,24,0.65)',
  '--sn-accent-light': '#6A95A6',
  '--sn-text-soft': '#A8A4AE',
  '--sn-text-faint': '#3A3842',
  '--sn-border-hover': 'rgba(255,255,255,0.08)',
  '--sn-font-serif': "'Newsreader', Georgia, 'Times New Roman', serif",
  '--sn-font-mono': "'DM Mono', 'Fira Code', 'Cascadia Code', monospace",
  '--sn-storm': '#4E7B8E',
  '--sn-storm-light': '#6A95A6',
  '--sn-ember': '#E8806C',
  '--sn-ember-light': '#F09A88',
  '--sn-opal': '#B0D0D8',
  '--sn-moss': '#5AA878',
  '--sn-violet': '#B8A0D8',
  '--sn-success': '#5AA878',
  '--sn-warning': '#D4A04C',
  '--sn-error': '#C85858',
};

// =============================================================================
// Light Theme — Warm Counterpart (same hues, inverted luminance)
// =============================================================================

const light: FullThemeTokens = {
  // Core tokens (widget bridge contract)
  '--sn-bg': '#FAF8F5',
  '--sn-surface': '#FFFFFF',
  '--sn-accent': '#4E7B8E',
  '--sn-text': '#1A1820',
  '--sn-text-muted': '#7A7580',
  '--sn-border': 'rgba(0,0,0,0.08)',
  '--sn-radius': '12px',
  '--sn-font-family': "'Outfit', system-ui, -apple-system, sans-serif",

  // Extended tokens (app-internal)
  '--sn-bg-ground': '#F2EDE6',
  '--sn-surface-raised': '#FFFFFF',
  '--sn-surface-glass': 'rgba(255,255,255,0.75)',
  '--sn-surface-glass-light': 'rgba(255,255,255,0.60)',
  '--sn-accent-light': '#6A95A6',
  '--sn-text-soft': '#5A5560',
  '--sn-text-faint': '#C8C4CC',
  '--sn-border-hover': 'rgba(0,0,0,0.12)',
  '--sn-font-serif': "'Newsreader', Georgia, 'Times New Roman', serif",
  '--sn-font-mono': "'DM Mono', 'Fira Code', 'Cascadia Code', monospace",
  '--sn-storm': '#4E7B8E',
  '--sn-storm-light': '#6A95A6',
  '--sn-ember': '#D06850',
  '--sn-ember-light': '#E8806C',
  '--sn-opal': '#8BB8C4',
  '--sn-moss': '#4A9068',
  '--sn-violet': '#9A84C0',
  '--sn-success': '#4A9068',
  '--sn-warning': '#C08A30',
  '--sn-error': '#B84848',
};

// =============================================================================
// High-Contrast Theme — WCAG 4.5:1+ Accessible Palette (from Principles3)
// =============================================================================

const highContrast: FullThemeTokens = {
  // Core tokens (widget bridge contract)
  '--sn-bg': '#000000',
  '--sn-surface': '#111111',
  '--sn-accent': '#7A9DAE',
  '--sn-text': '#F2EDE6',
  '--sn-text-muted': '#A098A4',
  '--sn-border': '#F2EDE6',
  '--sn-radius': '0px',
  '--sn-font-family': "'Outfit', system-ui, -apple-system, sans-serif",

  // Extended tokens (app-internal)
  '--sn-bg-ground': '#110E14',
  '--sn-surface-raised': '#1A1A1F',
  '--sn-surface-glass': 'rgba(0,0,0,0.85)',
  '--sn-surface-glass-light': 'rgba(0,0,0,0.70)',
  '--sn-accent-light': '#7A9DAE',
  '--sn-text-soft': '#D0C8CF',
  '--sn-text-faint': '#A098A4',
  '--sn-border-hover': '#F2EDE6',
  '--sn-font-serif': "'Newsreader', Georgia, 'Times New Roman', serif",
  '--sn-font-mono': "'DM Mono', 'Fira Code', 'Cascadia Code', monospace",
  '--sn-storm': '#7A9DAE',
  '--sn-storm-light': '#7A9DAE',
  '--sn-ember': '#ECA080',
  '--sn-ember-light': '#ECA080',
  '--sn-opal': '#B8D4DE',
  '--sn-moss': '#8EC8A4',
  '--sn-violet': '#C4B0E0',
  '--sn-success': '#8EC8A4',
  '--sn-warning': '#E8C080',
  '--sn-error': '#F0A0A0',
};

// =============================================================================
// Theme Registry
// =============================================================================

export const THEME_TOKENS: Record<ThemeName, FullThemeTokens> = {
  light,
  dark,
  'high-contrast': highContrast,
};
