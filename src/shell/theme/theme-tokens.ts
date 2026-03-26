/**
 * Theme token definitions for the StickerNest V5 design system.
 *
 * Five named themes with glassmorphic surface tokens:
 * - Midnight Aurora: deep purple/blue Her/Rothko palette
 * - Crystal Light: bright frosted glass with soft blue accents
 * - Bubbles & Sky: deep navy/teal with cyan accents
 * - Autumn Fireflies: warm amber/brown with golden accents
 * - High Contrast: WCAG 4.5:1+ accessible palette
 *
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

// Shared typography tokens across all themes
const SHARED_FONTS = {
  '--sn-font-family': "'Outfit', system-ui, -apple-system, sans-serif",
  '--sn-font-serif': "'Newsreader', Georgia, 'Times New Roman', serif",
  '--sn-font-mono': "'DM Mono', 'Fira Code', 'Cascadia Code', monospace",
} as const;

// =============================================================================
// Midnight Aurora — Deep purple/blue Her/Rothko palette (was "dark")
// =============================================================================

const midnightAurora: FullThemeTokens = {
  // Core tokens (widget bridge contract)
  '--sn-bg': '#0A0A0E',
  '--sn-surface': '#16161B',
  '--sn-accent': '#4E7B8E',
  '--sn-text': '#EDEBE6',
  '--sn-text-muted': '#8A8796',
  '--sn-border': 'rgba(255,255,255,0.10)',
  '--sn-radius': '12px',
  ...SHARED_FONTS,

  // Extended tokens (app-internal)
  '--sn-bg-ground': '#110E14',
  '--sn-surface-raised': '#1E1E24',
  '--sn-surface-glass': 'rgba(20,17,24,0.85)',
  '--sn-surface-glass-light': 'rgba(20,17,24,0.72)',
  '--sn-accent-light': '#6A95A6',
  '--sn-text-soft': '#A8A4AE',
  '--sn-text-faint': '#3A3842',
  '--sn-border-hover': 'rgba(255,255,255,0.16)',
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
// Crystal Light — Bright frosted glass with soft blue accents (was "light")
// =============================================================================

const crystalLight: FullThemeTokens = {
  // Core tokens (widget bridge contract)
  '--sn-bg': '#FAF8F5',
  '--sn-surface': '#FFFFFF',
  '--sn-accent': '#4E7B8E',
  '--sn-text': '#1A1820',
  '--sn-text-muted': '#7A7580',
  '--sn-border': 'rgba(0,0,0,0.12)',
  '--sn-radius': '12px',
  ...SHARED_FONTS,

  // Extended tokens (app-internal)
  '--sn-bg-ground': '#F2EDE6',
  '--sn-surface-raised': '#FFFFFF',
  '--sn-surface-glass': 'rgba(255,255,255,0.75)',
  '--sn-surface-glass-light': 'rgba(255,255,255,0.60)',
  '--sn-accent-light': '#6A95A6',
  '--sn-text-soft': '#5A5560',
  '--sn-text-faint': '#C8C4CC',
  '--sn-border-hover': 'rgba(0,0,0,0.18)',
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
// Bubbles & Sky — Deep navy/teal with cyan bubble accents
// =============================================================================

const bubblesSky: FullThemeTokens = {
  // Core tokens (widget bridge contract)
  '--sn-bg': '#0B1628',
  '--sn-surface': '#121E30',
  '--sn-accent': '#38BDF8',
  '--sn-text': '#E8F0F8',
  '--sn-text-muted': '#7A8FA8',
  '--sn-border': 'rgba(56,189,248,0.12)',
  '--sn-radius': '16px',
  ...SHARED_FONTS,

  // Extended tokens (app-internal)
  '--sn-bg-ground': '#081020',
  '--sn-surface-raised': '#182840',
  '--sn-surface-glass': 'rgba(16,26,44,0.85)',
  '--sn-surface-glass-light': 'rgba(16,26,44,0.70)',
  '--sn-accent-light': '#7DD3FC',
  '--sn-text-soft': '#A0B8D0',
  '--sn-text-faint': '#2A3C54',
  '--sn-border-hover': 'rgba(56,189,248,0.22)',
  '--sn-storm': '#0EA5E9',
  '--sn-storm-light': '#38BDF8',
  '--sn-ember': '#06B6D4',
  '--sn-ember-light': '#22D3EE',
  '--sn-opal': '#A5F3FC',
  '--sn-moss': '#2DD4BF',
  '--sn-violet': '#818CF8',
  '--sn-success': '#2DD4BF',
  '--sn-warning': '#FBBF24',
  '--sn-error': '#F87171',
};

// =============================================================================
// Autumn Fireflies — Warm amber/brown with golden particle accents
// =============================================================================

const autumnFireflies: FullThemeTokens = {
  // Core tokens (widget bridge contract)
  '--sn-bg': '#1A1008',
  '--sn-surface': '#241A10',
  '--sn-accent': '#E8A44C',
  '--sn-text': '#F0E8D8',
  '--sn-text-muted': '#9A8870',
  '--sn-border': 'rgba(232,164,76,0.14)',
  '--sn-radius': '12px',
  ...SHARED_FONTS,

  // Extended tokens (app-internal)
  '--sn-bg-ground': '#140C04',
  '--sn-surface-raised': '#2E2218',
  '--sn-surface-glass': 'rgba(30,22,12,0.85)',
  '--sn-surface-glass-light': 'rgba(30,22,12,0.70)',
  '--sn-accent-light': '#F0C070',
  '--sn-text-soft': '#C4B498',
  '--sn-text-faint': '#3A3020',
  '--sn-border-hover': 'rgba(232,164,76,0.24)',
  '--sn-storm': '#C8842C',
  '--sn-storm-light': '#E8A44C',
  '--sn-ember': '#E8806C',
  '--sn-ember-light': '#F09A88',
  '--sn-opal': '#D4C4A0',
  '--sn-moss': '#8AB060',
  '--sn-violet': '#A08868',
  '--sn-success': '#8AB060',
  '--sn-warning': '#E8A44C',
  '--sn-error': '#D06050',
};

// =============================================================================
// High-Contrast Theme — WCAG 4.5:1+ Accessible Palette
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
  ...SHARED_FONTS,

  // Extended tokens (app-internal)
  '--sn-bg-ground': '#110E14',
  '--sn-surface-raised': '#1A1A1F',
  '--sn-surface-glass': 'rgba(0,0,0,0.85)',
  '--sn-surface-glass-light': 'rgba(0,0,0,0.70)',
  '--sn-accent-light': '#7A9DAE',
  '--sn-text-soft': '#D0C8CF',
  '--sn-text-faint': '#A098A4',
  '--sn-border-hover': '#F2EDE6',
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
  'midnight-aurora': midnightAurora,
  'crystal-light': crystalLight,
  'bubbles-sky': bubblesSky,
  'autumn-fireflies': autumnFireflies,
  'high-contrast': highContrast,
};

/**
 * Human-readable display names for theme picker UI.
 */
export const THEME_DISPLAY_NAMES: Record<ThemeName, string> = {
  'midnight-aurora': 'Midnight Aurora',
  'crystal-light': 'Crystal Light',
  'bubbles-sky': 'Bubbles & Sky',
  'autumn-fireflies': 'Autumn Fireflies',
  'high-contrast': 'High Contrast',
};
