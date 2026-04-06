/**
 * Theme Provider — injects CSS custom properties and emits bus events on theme change.
 *
 * Critical boundary: `applyThemeTokens` applies ALL tokens (core + extended) to the DOM,
 * but `emitThemeChange` emits ONLY core tokens on the bus. This preserves the Runtime
 * bridge contract — extended tokens never cross the iframe boundary.
 *
 * @module shell/theme
 * @layer L6
 */

import React, { useEffect } from 'react';

import { ShellEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useUIStore } from '../../kernel/stores/ui/ui.store';

import { injectAnimationKeyframes } from './animation-keyframes';
import { applyAnimationTokens } from './animation-tokens';
import {
  injectObsidianEffects,
  mountGrainOverlay,
  mountHexPattern,
  mountAmbientOrbs,
} from './obsidian-effects';
import type { ThemeName } from './theme-tokens';
import { THEME_TOKENS, extractCoreTokens } from './theme-tokens';

/**
 * Apply all theme CSS variables (core + extended) to document.documentElement.
 */
export function applyThemeTokens(theme: ThemeName): void {
  const tokens = THEME_TOKENS[theme];
  if (!tokens) return;
  const el = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    el.style.setProperty(key, value);
  }
  el.dataset.theme = theme;
}

/**
 * Emit a theme change event on the bus with ONLY core tokens.
 * The Runtime layer forwards this payload to widget iframes — extended
 * tokens must not leak across the bridge boundary.
 */
export function emitThemeChange(theme: ThemeName): void {
  const tokens = THEME_TOKENS[theme];
  const coreTokens = extractCoreTokens(tokens);
  bus.emit(ShellEvents.THEME_CHANGED, { theme, tokens: coreTokens });
}

/**
 * Hook for changing the active theme. Applies CSS vars and emits bus event.
 */
export function useThemeActions(): { changeTheme: (theme: ThemeName) => void } {
  return {
    changeTheme(theme: ThemeName) {
      applyThemeTokens(theme);
      emitThemeChange(theme);
    },
  };
}

/**
 * ThemeProvider component — watches uiStore.theme and applies CSS vars.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useUIStore((s) => s.theme);

  // Inject global animation keyframes, tokens, and Obsidian effects once on mount.
  // These are theme-independent constants — not re-applied on theme change.
  useEffect(() => {
    injectAnimationKeyframes();
    applyAnimationTokens();
    injectObsidianEffects();

    // Mount ambient visual layers into body
    mountGrainOverlay(document.body);
    mountHexPattern(document.body);
    mountAmbientOrbs(document.body);
  }, []);

  useEffect(() => {
    applyThemeTokens(theme);
  }, [theme]);

  return <>{children}</>;
};
