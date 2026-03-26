/**
 * Theme tokens tests
 * @module shell/theme
 */

import { describe, it, expect } from 'vitest';

import { CORE_TOKEN_KEYS } from '@sn/types';

import {
  THEME_TOKENS,
  THEME_DISPLAY_NAMES,
  extractCoreTokens,
} from './theme-tokens';

const THEME_NAMES = Object.keys(THEME_TOKENS) as Array<keyof typeof THEME_TOKENS>;

describe('THEME_TOKENS', () => {
  it('contains exactly five themes', () => {
    expect(THEME_NAMES).toHaveLength(5);
    expect(THEME_NAMES).toContain('midnight-aurora');
    expect(THEME_NAMES).toContain('crystal-light');
    expect(THEME_NAMES).toContain('bubbles-sky');
    expect(THEME_NAMES).toContain('autumn-fireflies');
    expect(THEME_NAMES).toContain('high-contrast');
  });

  it('every theme has all core token keys', () => {
    for (const name of THEME_NAMES) {
      const tokens = THEME_TOKENS[name];
      for (const key of CORE_TOKEN_KEYS) {
        expect(tokens).toHaveProperty(key);
        expect(typeof tokens[key]).toBe('string');
      }
    }
  });

  it('every theme has extended tokens (--sn-storm, --sn-ember, etc.)', () => {
    const extendedKeys = ['--sn-storm', '--sn-ember', '--sn-opal', '--sn-moss', '--sn-violet'];
    for (const name of THEME_NAMES) {
      const tokens = THEME_TOKENS[name];
      for (const key of extendedKeys) {
        expect(tokens).toHaveProperty(key);
      }
    }
  });

  it('all themes include shared font tokens', () => {
    for (const name of THEME_NAMES) {
      const tokens = THEME_TOKENS[name];
      expect(tokens['--sn-font-family']).toContain('Outfit');
      expect(tokens['--sn-font-serif']).toContain('Newsreader');
      expect(tokens['--sn-font-mono']).toContain('DM Mono');
    }
  });
});

describe('THEME_DISPLAY_NAMES', () => {
  it('has a display name for every theme', () => {
    for (const name of THEME_NAMES) {
      expect(THEME_DISPLAY_NAMES[name]).toBeDefined();
      expect(typeof THEME_DISPLAY_NAMES[name]).toBe('string');
      expect(THEME_DISPLAY_NAMES[name].length).toBeGreaterThan(0);
    }
  });

  it('contains expected display names', () => {
    expect(THEME_DISPLAY_NAMES['midnight-aurora']).toBe('Midnight Aurora');
    expect(THEME_DISPLAY_NAMES['high-contrast']).toBe('High Contrast');
    expect(THEME_DISPLAY_NAMES['bubbles-sky']).toBe('Bubbles & Sky');
  });
});

describe('extractCoreTokens', () => {
  it('returns only core token keys from a full token map', () => {
    const result = extractCoreTokens(THEME_TOKENS['midnight-aurora']);
    const keys = Object.keys(result);
    expect(keys).toHaveLength(CORE_TOKEN_KEYS.length);
    for (const key of CORE_TOKEN_KEYS) {
      expect(keys).toContain(key);
    }
  });

  it('does not include extended tokens', () => {
    const result = extractCoreTokens(THEME_TOKENS['midnight-aurora']);
    expect(result).not.toHaveProperty('--sn-storm');
    expect(result).not.toHaveProperty('--sn-ember');
    expect(result).not.toHaveProperty('--sn-surface-raised');
  });

  it('preserves core token values correctly', () => {
    const result = extractCoreTokens(THEME_TOKENS['crystal-light']);
    expect(result['--sn-bg']).toBe('#FAF8F5');
    expect(result['--sn-text']).toBe('#1A1820');
  });
});
