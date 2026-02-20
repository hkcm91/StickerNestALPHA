/**
 * Theme token definitions for light, dark, and high-contrast themes.
 *
 * @module shell/theme
 * @layer L6
 */

export interface ThemeTokenMap {
  '--sn-bg': string;
  '--sn-surface': string;
  '--sn-accent': string;
  '--sn-text': string;
  '--sn-text-muted': string;
  '--sn-border': string;
  '--sn-radius': string;
  '--sn-font-family': string;
}

export type ThemeName = 'light' | 'dark' | 'high-contrast';

export const THEME_TOKENS: Record<ThemeName, ThemeTokenMap> = {
  light: {
    '--sn-bg': '#ffffff',
    '--sn-surface': '#f9fafb',
    '--sn-accent': '#3B82F6',
    '--sn-text': '#111827',
    '--sn-text-muted': '#6b7280',
    '--sn-border': '#e5e7eb',
    '--sn-radius': '8px',
    '--sn-font-family': 'Inter, system-ui, -apple-system, sans-serif',
  },
  dark: {
    '--sn-bg': '#111827',
    '--sn-surface': '#1f2937',
    '--sn-accent': '#3B82F6',
    '--sn-text': '#f9fafb',
    '--sn-text-muted': '#9ca3af',
    '--sn-border': '#374151',
    '--sn-radius': '8px',
    '--sn-font-family': 'Inter, system-ui, -apple-system, sans-serif',
  },
  'high-contrast': {
    '--sn-bg': '#000000',
    '--sn-surface': '#111111',
    '--sn-accent': '#FACC15',
    '--sn-text': '#ffffff',
    '--sn-text-muted': '#d1d5db',
    '--sn-border': '#ffffff',
    '--sn-radius': '0px',
    '--sn-font-family': 'Inter, system-ui, -apple-system, sans-serif',
  },
};
