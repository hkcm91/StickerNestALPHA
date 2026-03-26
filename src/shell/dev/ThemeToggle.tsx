/**
 * ThemeToggle — cycles through dark/light/high-contrast themes
 * Extracted from TestHarness.tsx
 *
 * @module shell/dev
 * @layer L6
 */

import React from 'react';

import { useUIStore } from '../../kernel/stores/ui/ui.store';
import { applyThemeTokens, emitThemeChange } from '../theme/theme-provider';
import type { ThemeName } from '../theme/theme-tokens';

const THEME_CYCLE: ThemeName[] = ['midnight-aurora', 'crystal-light', 'bubbles-sky', 'autumn-fireflies', 'high-contrast'];

export const ThemeToggle: React.FC = () => {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const cycle = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    setTheme(next);
    applyThemeTokens(next);
    emitThemeChange(next);
  };

  return (
    <button
      onClick={cycle}
      style={{
        padding: '6px 14px',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: 12,
        border: '1px solid var(--sn-border, #555)',
        borderRadius: 'var(--sn-radius, 4px)',
        background: 'var(--sn-surface, #333)',
        color: 'var(--sn-text, #eee)',
      }}
    >
      Theme: {theme}
    </button>
  );
};
