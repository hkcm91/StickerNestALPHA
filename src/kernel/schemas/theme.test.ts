/**
 * Theme schema tests
 * @module @sn/types/theme
 */

import { describe, it, expect } from 'vitest';

import {
  CoreThemeTokensSchema,
  FullThemeTokensSchema,
  ThemeNameSchema,
  CORE_TOKEN_KEYS,
  type CoreThemeTokens,
  type FullThemeTokens,
} from './theme';

const validCoreTokens: CoreThemeTokens = {
  '--sn-bg': '#0A0A0E',
  '--sn-surface': '#131317',
  '--sn-accent': '#3E7D94',
  '--sn-text': '#EDEBE6',
  '--sn-text-muted': '#6B6878',
  '--sn-border': 'rgba(255,255,255,0.04)',
  '--sn-radius': '12px',
  '--sn-font-family': 'Inter, system-ui, sans-serif',
};

const validFullTokens: FullThemeTokens = {
  ...validCoreTokens,
  '--sn-bg-ground': '#110E14',
  '--sn-surface-raised': '#1A1A1F',
  '--sn-surface-glass': 'rgba(20,17,24,0.75)',
  '--sn-surface-glass-light': 'rgba(20,17,24,0.65)',
  '--sn-accent-light': '#5A92A8',
  '--sn-text-soft': '#A8A4AE',
  '--sn-text-faint': '#3A3842',
  '--sn-border-hover': 'rgba(255,255,255,0.08)',
  '--sn-font-serif': "'Newsreader', Georgia, 'Times New Roman', serif",
  '--sn-font-mono': "'DM Mono', 'Fira Code', 'Cascadia Code', monospace",
  '--sn-storm': '#3E7D94',
  '--sn-storm-light': '#5A92A8',
  '--sn-ember': '#E8806C',
  '--sn-ember-light': '#F09A88',
  '--sn-opal': '#B0D0D8',
  '--sn-moss': '#5AA878',
  '--sn-violet': '#B8A0D8',
  '--sn-success': '#5AA878',
  '--sn-warning': '#D4A04C',
  '--sn-error': '#C85858',
  '--sn-surface-elevated': 'rgba(30,30,35,0.80)',
  '--sn-glow': 'rgba(232,128,108,0.08)',
  '--sn-accent-muted': 'rgba(78,123,142,0.35)',
  '--sn-transition-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--sn-blur-surface': '16px',
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

describe('Theme schemas', () => {
  describe('CoreThemeTokensSchema', () => {
    it('accepts valid core tokens', () => {
      const result = CoreThemeTokensSchema.safeParse(validCoreTokens);
      expect(result.success).toBe(true);
    });

    it('rejects missing keys', () => {
      const partial = { '--sn-bg': '#000' };
      const result = CoreThemeTokensSchema.safeParse(partial);
      expect(result.success).toBe(false);
    });

    it('rejects non-string values', () => {
      const invalid = { ...validCoreTokens, '--sn-bg': 123 };
      const result = CoreThemeTokensSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('FullThemeTokensSchema', () => {
    it('accepts valid full tokens', () => {
      const result = FullThemeTokensSchema.safeParse(validFullTokens);
      expect(result.success).toBe(true);
    });

    it('rejects when extended tokens are missing', () => {
      const result = FullThemeTokensSchema.safeParse(validCoreTokens);
      expect(result.success).toBe(false);
    });
  });

  describe('CORE_TOKEN_KEYS', () => {
    it('contains exactly 8 keys', () => {
      expect(CORE_TOKEN_KEYS).toHaveLength(8);
    });

    it('matches the CoreThemeTokensSchema shape keys', () => {
      const shapeKeys = Object.keys(CoreThemeTokensSchema.shape);
      expect(CORE_TOKEN_KEYS).toEqual(shapeKeys);
    });

    it('is a strict subset of FullThemeTokensSchema keys', () => {
      const fullKeys = Object.keys(FullThemeTokensSchema.shape);
      for (const key of CORE_TOKEN_KEYS) {
        expect(fullKeys).toContain(key);
      }
    });
  });

  describe('ThemeNameSchema', () => {
    it('accepts valid theme names', () => {
      expect(ThemeNameSchema.safeParse('midnight-aurora').success).toBe(true);
      expect(ThemeNameSchema.safeParse('crystal-light').success).toBe(true);
      expect(ThemeNameSchema.safeParse('bubbles-sky').success).toBe(true);
      expect(ThemeNameSchema.safeParse('autumn-fireflies').success).toBe(true);
      expect(ThemeNameSchema.safeParse('high-contrast').success).toBe(true);
      expect(ThemeNameSchema.safeParse('ember').success).toBe(true);
    });

    it('rejects old theme names', () => {
      expect(ThemeNameSchema.safeParse('dark').success).toBe(false);
      expect(ThemeNameSchema.safeParse('light').success).toBe(false);
    });

    it('rejects invalid theme names', () => {
      expect(ThemeNameSchema.safeParse('neon').success).toBe(false);
      expect(ThemeNameSchema.safeParse('').success).toBe(false);
    });
  });
});
