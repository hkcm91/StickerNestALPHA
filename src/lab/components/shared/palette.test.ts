/**
 * Lab palette tests.
 *
 * @module lab/components/shared
 * @layer L2
 */

import { describe, it, expect } from 'vitest';

import { labPalette, SPRING, STAGGER_MS, hexToRgb, HEX } from './palette';

describe('labPalette', () => {
  it('exports all required named color properties', () => {
    expect(labPalette.storm).toContain('--sn-storm');
    expect(labPalette.ember).toContain('--sn-ember');
    expect(labPalette.opal).toContain('--sn-opal');
    expect(labPalette.moss).toContain('--sn-moss');
    expect(labPalette.violet).toContain('--sn-violet');
  });

  it('exports semantic state colors', () => {
    expect(labPalette.success).toContain('--sn-success');
    expect(labPalette.warning).toContain('--sn-warning');
    expect(labPalette.error).toContain('--sn-error');
  });

  it('exports surface, text, border, and accent tokens', () => {
    expect(labPalette.bg).toContain('--sn-bg');
    expect(labPalette.surface).toContain('--sn-surface');
    expect(labPalette.text).toContain('--sn-text');
    expect(labPalette.textMuted).toContain('--sn-text-muted');
    expect(labPalette.border).toContain('--sn-border');
    expect(labPalette.accent).toContain('--sn-accent');
  });
});

describe('SPRING', () => {
  it('is a valid cubic-bezier string', () => {
    expect(SPRING).toMatch(/^cubic-bezier\(.+\)$/);
  });
});

describe('STAGGER_MS', () => {
  it('is a positive number', () => {
    expect(STAGGER_MS).toBeGreaterThan(0);
    expect(typeof STAGGER_MS).toBe('number');
  });
});

describe('hexToRgb', () => {
  it('converts #000000 to [0, 0, 0]', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });

  it('converts #FFFFFF to [255, 255, 255]', () => {
    expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
  });

  it('converts storm hex correctly', () => {
    const [r, g, b] = hexToRgb(HEX.storm);
    expect(r).toBe(0x4E);
    expect(g).toBe(0x7B);
    expect(b).toBe(0x8E);
  });

  it('converts ember hex correctly', () => {
    const [r, g, b] = hexToRgb(HEX.ember);
    expect(r).toBe(0xE8);
    expect(g).toBe(0x80);
    expect(b).toBe(0x6C);
  });
});

describe('HEX', () => {
  it('contains expected named color keys', () => {
    expect(HEX.storm).toBe('#4E7B8E');
    expect(HEX.ember).toBe('#E8806C');
    expect(HEX.moss).toBe('#5AA878');
    expect(HEX.violet).toBe('#B8A0D8');
  });
});
