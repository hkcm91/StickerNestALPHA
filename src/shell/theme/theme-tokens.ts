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

  // Overhaul tokens
  '--sn-surface-elevated': 'rgba(30,26,36,0.80)',
  '--sn-glow': 'rgba(184,160,216,0.08)',
  '--sn-accent-muted': 'rgba(78,123,142,0.35)',
  '--sn-transition-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--sn-blur-surface': '16px',

  // Obsidian design system tokens
  '--sn-surface-glass-heavy': 'rgba(20,17,24,0.92)',
  '--sn-surface-liquid-glass': 'rgba(20,17,24,0.55)',
  '--sn-blur-heavy': '40px',
  '--sn-border-accent': 'rgba(78,123,142,0.30)',
  '--sn-accent-glow': 'rgba(184,160,216,0.15)',
  '--sn-chrome-gradient': 'linear-gradient(135deg, #B8A0D8 0%, #4E7B8E 40%, #B0D0D8 70%, #B8A0D8 100%)',
  '--sn-holographic-border': 'linear-gradient(135deg, rgba(184,160,216,0.4), rgba(78,123,142,0.2), rgba(176,208,216,0.4))',
  '--sn-grain-opacity': '0.035',
  '--sn-hex-opacity': '0.04',
  '--sn-refraction-edge': 'rgba(255,255,255,0.08)',
  '--sn-shadow-neo': '6px 6px 16px rgba(0,0,0,0.5), -2px -2px 8px rgba(255,255,255,0.03)',
  '--sn-shadow-neo-inset': 'inset 2px 2px 6px rgba(0,0,0,0.4), inset -1px -1px 4px rgba(255,255,255,0.02)',
};

// =============================================================================
// Crystal Light — Bright frosted glass with soft blue accents (was "light")
// =============================================================================

const crystalLight: FullThemeTokens = {
  // Core tokens (widget bridge contract)
  '--sn-bg': '#FAF6F1',
  '--sn-surface': '#FFFEFA',
  '--sn-accent': '#4E7B8E',
  '--sn-text': '#1A1820',
  '--sn-text-muted': '#7A7580',
  '--sn-border': 'rgba(0,0,0,0.12)',
  '--sn-radius': '12px',
  ...SHARED_FONTS,

  // Extended tokens (app-internal)
  '--sn-bg-ground': '#F0EAE2',
  '--sn-surface-raised': '#FFFEFA',
  '--sn-surface-glass': 'rgba(255,254,250,0.75)',
  '--sn-surface-glass-light': 'rgba(255,254,250,0.60)',
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

  // Overhaul tokens
  '--sn-surface-elevated': 'rgba(255,255,255,0.88)',
  '--sn-glow': 'rgba(78,123,142,0.06)',
  '--sn-accent-muted': 'rgba(78,123,142,0.20)',
  '--sn-transition-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--sn-blur-surface': '16px',

  // Obsidian design system tokens
  '--sn-surface-glass-heavy': 'rgba(255,254,250,0.92)',
  '--sn-surface-liquid-glass': 'rgba(255,254,250,0.55)',
  '--sn-blur-heavy': '40px',
  '--sn-border-accent': 'rgba(78,123,142,0.25)',
  '--sn-accent-glow': 'rgba(78,123,142,0.10)',
  '--sn-chrome-gradient': 'linear-gradient(135deg, #9A84C0 0%, #4E7B8E 40%, #8BB8C4 70%, #9A84C0 100%)',
  '--sn-holographic-border': 'linear-gradient(135deg, rgba(154,132,192,0.3), rgba(78,123,142,0.15), rgba(139,184,196,0.3))',
  '--sn-grain-opacity': '0.025',
  '--sn-hex-opacity': '0.03',
  '--sn-refraction-edge': 'rgba(255,255,255,0.25)',
  '--sn-shadow-neo': '4px 4px 12px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.7)',
  '--sn-shadow-neo-inset': 'inset 2px 2px 4px rgba(0,0,0,0.06), inset -1px -1px 3px rgba(255,255,255,0.5)',
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

  // Overhaul tokens
  '--sn-surface-elevated': 'rgba(24,40,64,0.88)',
  '--sn-glow': 'rgba(56,189,248,0.08)',
  '--sn-accent-muted': 'rgba(56,189,248,0.25)',
  '--sn-transition-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--sn-blur-surface': '16px',

  // Obsidian design system tokens
  '--sn-surface-glass-heavy': 'rgba(16,26,44,0.92)',
  '--sn-surface-liquid-glass': 'rgba(16,26,44,0.55)',
  '--sn-blur-heavy': '40px',
  '--sn-border-accent': 'rgba(56,189,248,0.30)',
  '--sn-accent-glow': 'rgba(56,189,248,0.18)',
  '--sn-chrome-gradient': 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 40%, #A5F3FC 70%, #818CF8 100%)',
  '--sn-holographic-border': 'linear-gradient(135deg, rgba(56,189,248,0.4), rgba(14,165,233,0.2), rgba(129,140,248,0.4))',
  '--sn-grain-opacity': '0.03',
  '--sn-hex-opacity': '0.04',
  '--sn-refraction-edge': 'rgba(165,243,252,0.10)',
  '--sn-shadow-neo': '6px 6px 16px rgba(0,0,0,0.5), -2px -2px 8px rgba(56,189,248,0.04)',
  '--sn-shadow-neo-inset': 'inset 2px 2px 6px rgba(0,0,0,0.4), inset -1px -1px 4px rgba(56,189,248,0.03)',
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

  // Overhaul tokens
  '--sn-surface-elevated': 'rgba(46,34,24,0.85)',
  '--sn-glow': 'rgba(232,164,76,0.08)',
  '--sn-accent-muted': 'rgba(232,164,76,0.25)',
  '--sn-transition-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--sn-blur-surface': '16px',

  // Obsidian design system tokens
  '--sn-surface-glass-heavy': 'rgba(30,22,12,0.92)',
  '--sn-surface-liquid-glass': 'rgba(30,22,12,0.55)',
  '--sn-blur-heavy': '40px',
  '--sn-border-accent': 'rgba(232,164,76,0.30)',
  '--sn-accent-glow': 'rgba(232,164,76,0.15)',
  '--sn-chrome-gradient': 'linear-gradient(135deg, #F0C070 0%, #E8A44C 40%, #D4C4A0 70%, #E8806C 100%)',
  '--sn-holographic-border': 'linear-gradient(135deg, rgba(240,192,112,0.4), rgba(232,164,76,0.2), rgba(232,128,108,0.4))',
  '--sn-grain-opacity': '0.035',
  '--sn-hex-opacity': '0.04',
  '--sn-refraction-edge': 'rgba(255,255,255,0.07)',
  '--sn-shadow-neo': '6px 6px 16px rgba(0,0,0,0.5), -2px -2px 8px rgba(232,164,76,0.03)',
  '--sn-shadow-neo-inset': 'inset 2px 2px 6px rgba(0,0,0,0.4), inset -1px -1px 4px rgba(232,164,76,0.02)',
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

  // Overhaul tokens
  '--sn-surface-elevated': 'rgba(26,26,31,0.90)',
  '--sn-glow': 'rgba(236,160,128,0.08)',
  '--sn-accent-muted': 'rgba(122,157,174,0.35)',
  '--sn-transition-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--sn-blur-surface': '16px',

  // Obsidian design system tokens — high-contrast uses minimal effects
  '--sn-surface-glass-heavy': 'rgba(0,0,0,0.95)',
  '--sn-surface-liquid-glass': 'rgba(0,0,0,0.80)',
  '--sn-blur-heavy': '20px',
  '--sn-border-accent': '#F2EDE6',
  '--sn-accent-glow': 'rgba(122,157,174,0.12)',
  '--sn-chrome-gradient': 'linear-gradient(135deg, #C4B0E0 0%, #7A9DAE 40%, #B8D4DE 70%, #ECA080 100%)',
  '--sn-holographic-border': 'linear-gradient(135deg, rgba(196,176,224,0.4), rgba(122,157,174,0.2), rgba(236,160,128,0.4))',
  '--sn-grain-opacity': '0',
  '--sn-hex-opacity': '0',
  '--sn-refraction-edge': 'rgba(255,255,255,0.12)',
  '--sn-shadow-neo': '4px 4px 0 rgba(0,0,0,0.8)',
  '--sn-shadow-neo-inset': 'inset 2px 2px 0 rgba(0,0,0,0.6)',
};

// =============================================================================
// Ember — Warm coral/charcoal "Her"-inspired palette (new default)
// =============================================================================

const ember: FullThemeTokens = {
  // Core tokens (widget bridge contract)
  '--sn-bg': '#1A1210',
  '--sn-surface': 'rgba(45,32,28,0.72)',
  '--sn-accent': '#E8806C',
  '--sn-text': '#F2E8E4',
  '--sn-text-muted': 'rgba(242,232,228,0.55)',
  '--sn-border': 'rgba(232,128,108,0.12)',
  '--sn-radius': '14px',
  ...SHARED_FONTS,

  // Extended tokens (app-internal)
  '--sn-bg-ground': '#150E0B',
  '--sn-surface-raised': '#2D201C',
  '--sn-surface-glass': 'rgba(45,32,28,0.85)',
  '--sn-surface-glass-light': 'rgba(45,32,28,0.72)',
  '--sn-accent-light': '#F09A88',
  '--sn-text-soft': '#C4B0A8',
  '--sn-text-faint': '#3A2E28',
  '--sn-border-hover': 'rgba(232,128,108,0.22)',
  '--sn-storm': '#C4684A',
  '--sn-storm-light': '#E8806C',
  '--sn-ember': '#E8806C',
  '--sn-ember-light': '#F09A88',
  '--sn-opal': '#D4A574',
  '--sn-moss': '#8AAC6C',
  '--sn-violet': '#C4A088',
  '--sn-success': '#8AAC6C',
  '--sn-warning': '#D4A574',
  '--sn-error': '#D06050',

  // Overhaul tokens
  '--sn-surface-elevated': 'rgba(58,42,36,0.80)',
  '--sn-glow': 'rgba(232,128,108,0.08)',
  '--sn-accent-muted': 'rgba(232,128,108,0.35)',
  '--sn-transition-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--sn-blur-surface': '16px',

  // Obsidian design system tokens
  '--sn-surface-glass-heavy': 'rgba(45,32,28,0.92)',
  '--sn-surface-liquid-glass': 'rgba(45,32,28,0.55)',
  '--sn-blur-heavy': '40px',
  '--sn-border-accent': 'rgba(232,128,108,0.30)',
  '--sn-accent-glow': 'rgba(232,128,108,0.18)',
  '--sn-chrome-gradient': 'linear-gradient(135deg, #F09A88 0%, #E8806C 40%, #D4A574 70%, #C4A088 100%)',
  '--sn-holographic-border': 'linear-gradient(135deg, rgba(240,154,136,0.4), rgba(232,128,108,0.2), rgba(212,165,116,0.4))',
  '--sn-grain-opacity': '0.035',
  '--sn-hex-opacity': '0.04',
  '--sn-refraction-edge': 'rgba(255,255,255,0.07)',
  '--sn-shadow-neo': '6px 6px 16px rgba(0,0,0,0.5), -2px -2px 8px rgba(232,128,108,0.04)',
  '--sn-shadow-neo-inset': 'inset 2px 2px 6px rgba(0,0,0,0.4), inset -1px -1px 4px rgba(232,128,108,0.03)',
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
  'ember': ember,
};

/**
 * Human-readable display names for theme picker UI.
 */
export const THEME_DISPLAY_NAMES: Record<ThemeName, string> = {
  'ember': 'Ember',
  'midnight-aurora': 'Midnight Aurora',
  'crystal-light': 'Crystal Light',
  'bubbles-sky': 'Bubbles & Sky',
  'autumn-fireflies': 'Autumn Fireflies',
  'high-contrast': 'High Contrast',
};
