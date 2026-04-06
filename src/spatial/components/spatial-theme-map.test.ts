/**
 * Tests for spatial-theme-map
 *
 * Verifies all ThemeName values have valid spatial color entries.
 *
 * @module spatial/components/spatial-theme-map.test
 * @layer L4B
 */

import { describe, it, expect } from 'vitest';

import type { ThemeName } from '@sn/types';

import { getSpatialThemeColors } from './spatial-theme-map';

// ---------------------------------------------------------------------------
// All known theme names (must match ThemeNameSchema enum)
// ---------------------------------------------------------------------------

const ALL_THEMES: ThemeName[] = [
  'midnight-aurora',
  'crystal-light',
  'bubbles-sky',
  'autumn-fireflies',
  'high-contrast',
  'ember',
];

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getSpatialThemeColors', () => {
  it.each(ALL_THEMES)('returns colors for theme "%s"', (theme) => {
    const colors = getSpatialThemeColors(theme);
    expect(colors).toBeDefined();
    expect(colors.ground).toBeDefined();
    expect(colors.storm).toBeDefined();
    expect(colors.opal).toBeDefined();
    expect(colors.ember).toBeDefined();
  });

  it.each(ALL_THEMES)('all colors for "%s" are valid hex', (theme) => {
    const colors = getSpatialThemeColors(theme);
    expect(colors.ground).toMatch(HEX_PATTERN);
    expect(colors.storm).toMatch(HEX_PATTERN);
    expect(colors.opal).toMatch(HEX_PATTERN);
    expect(colors.ember).toMatch(HEX_PATTERN);
  });

  it('returns midnight-aurora as default fallback', () => {
    const defaultColors = getSpatialThemeColors('midnight-aurora');
    expect(defaultColors.ground).toBe('#110E14');
    expect(defaultColors.storm).toBe('#6BA4B8');
    expect(defaultColors.opal).toBe('#B8D4DE');
    expect(defaultColors.ember).toBe('#ECA080');
  });
});
