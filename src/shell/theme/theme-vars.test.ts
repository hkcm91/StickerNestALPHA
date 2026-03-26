/**
 * Theme vars helper tests
 * @module shell/theme
 */

import { describe, it, expect } from 'vitest';

import { THEME_TOKENS } from './theme-tokens';
import { themeVar, palette } from './theme-vars';

const FALLBACK = THEME_TOKENS['crystal-light'];

describe('themeVar', () => {
  it('returns a CSS var() reference with crystal-light fallback', () => {
    const result = themeVar('--sn-bg');
    expect(result).toBe(`var(--sn-bg, ${FALLBACK['--sn-bg']})`);
  });

  it('works for extended tokens', () => {
    const result = themeVar('--sn-storm');
    expect(result).toBe(`var(--sn-storm, ${FALLBACK['--sn-storm']})`);
  });

  it('works for typography tokens', () => {
    const result = themeVar('--sn-font-family');
    expect(result).toContain('var(--sn-font-family,');
    expect(result).toContain('Outfit');
  });
});

describe('palette', () => {
  it('contains all expected named color entries', () => {
    expect(palette.storm).toContain('var(--sn-storm');
    expect(palette.ember).toContain('var(--sn-ember');
    expect(palette.opal).toContain('var(--sn-opal');
    expect(palette.moss).toContain('var(--sn-moss');
    expect(palette.violet).toContain('var(--sn-violet');
  });

  it('contains semantic state entries', () => {
    expect(palette.success).toContain('var(--sn-success');
    expect(palette.warning).toContain('var(--sn-warning');
    expect(palette.error).toContain('var(--sn-error');
  });

  it('contains surface, text, and border entries', () => {
    expect(palette.bg).toContain('var(--sn-bg');
    expect(palette.surface).toContain('var(--sn-surface');
    expect(palette.text).toContain('var(--sn-text');
    expect(palette.textMuted).toContain('var(--sn-text-muted');
    expect(palette.border).toContain('var(--sn-border');
  });

  it('all palette values are CSS var references with fallbacks', () => {
    for (const [, value] of Object.entries(palette)) {
      expect(value).toMatch(/^var\(--sn-.+,.+\)$/);
    }
  });
});
