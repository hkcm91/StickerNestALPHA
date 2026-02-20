/**
 * Theme Provider — injects CSS custom properties and emits bus events on theme change.
 *
 * @module shell/theme
 * @layer L6
 */

import React, { useEffect } from 'react';

import { ShellEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useUIStore } from '../../kernel/stores/ui/ui.store';

import type { ThemeName } from './theme-tokens';
import { THEME_TOKENS } from './theme-tokens';

/**
 * Apply theme CSS variables to document.documentElement.
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
 * Emit a theme change event on the bus so runtime/lab can react.
 */
export function emitThemeChange(theme: ThemeName): void {
  const tokens = THEME_TOKENS[theme];
  bus.emit(ShellEvents.THEME_CHANGED, { theme, tokens });
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

  useEffect(() => {
    applyThemeTokens(theme);
  }, [theme]);

  return <>{children}</>;
};
