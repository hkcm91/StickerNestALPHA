/**
 * Helpers for consuming StickerNest theme tokens in app UI.
 *
 * Keeps fallback values centralized so new UI surfaces stay
 * aligned with the same token contract.
 */

import type { ThemeTokenMap } from './theme-tokens';
import { THEME_TOKENS } from './theme-tokens';

export type ThemeTokenKey = keyof ThemeTokenMap;

const LIGHT_THEME_FALLBACKS = THEME_TOKENS.light;

/**
 * Build a CSS var reference with a centralized fallback from the light theme.
 */
export function themeVar(token: ThemeTokenKey): string {
  return `var(${token}, ${LIGHT_THEME_FALLBACKS[token]})`;
}
