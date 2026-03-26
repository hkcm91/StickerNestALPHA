/**
 * Helpers for consuming StickerNest theme tokens in app UI.
 *
 * Keeps fallback values centralized so new UI surfaces stay
 * aligned with the same token contract.
 */

import type { FullThemeTokens } from '@sn/types';

import { THEME_TOKENS } from './theme-tokens';

export type ThemeTokenKey = keyof FullThemeTokens;

const FALLBACK_THEME = THEME_TOKENS['crystal-light'];

/**
 * Build a CSS var reference with a centralized fallback from the crystal-light theme.
 */
export function themeVar(token: ThemeTokenKey): string {
  return `var(${token}, ${FALLBACK_THEME[token]})`;
}

/**
 * Convenience object mapping semantic palette names to CSS var references.
 * Use in inline styles: `color: palette.storm`
 */
export const palette = {
  // Named colors
  storm: themeVar('--sn-storm'),
  stormLight: themeVar('--sn-storm-light'),
  ember: themeVar('--sn-ember'),
  emberLight: themeVar('--sn-ember-light'),
  opal: themeVar('--sn-opal'),
  moss: themeVar('--sn-moss'),
  violet: themeVar('--sn-violet'),

  // Semantic states
  success: themeVar('--sn-success'),
  warning: themeVar('--sn-warning'),
  error: themeVar('--sn-error'),

  // Surfaces
  bg: themeVar('--sn-bg'),
  bgGround: themeVar('--sn-bg-ground'),
  surface: themeVar('--sn-surface'),
  surfaceRaised: themeVar('--sn-surface-raised'),
  surfaceGlass: themeVar('--sn-surface-glass'),
  surfaceGlassLight: themeVar('--sn-surface-glass-light'),

  // Text
  text: themeVar('--sn-text'),
  textSoft: themeVar('--sn-text-soft'),
  textMuted: themeVar('--sn-text-muted'),
  textFaint: themeVar('--sn-text-faint'),

  // Borders
  border: themeVar('--sn-border'),
  borderHover: themeVar('--sn-border-hover'),

  // Typography
  fontSerif: themeVar('--sn-font-serif'),
  fontMono: themeVar('--sn-font-mono'),

  // Accent
  accent: themeVar('--sn-accent'),
  accentLight: themeVar('--sn-accent-light'),
} as const;
