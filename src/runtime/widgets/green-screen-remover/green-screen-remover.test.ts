/**
 * Green Screen Remover Widget — Unit Tests
 *
 * Tests the core chroma-key logic (pure functions) and manifest validity.
 *
 * @module runtime/widgets/green-screen-remover
 */

import { describe, it, expect } from 'vitest';

import { WidgetManifestSchema } from '@sn/types';

import { GREEN_SCREEN_REMOVER_EVENTS } from './green-screen-remover.events';
import { greenScreenRemoverConfigSchema } from './green-screen-remover.schema';
import {
  rgbToHsl,
  greenScore,
  removeGreenFromImageData,
  greenScreenRemoverManifest,
} from './green-screen-remover.widget';

// ─── Default config for tests ────────────────────────────────────────────────

const DEFAULT_CONFIG = greenScreenRemoverConfigSchema.parse({});

// ─── rgbToHsl ────────────────────────────────────────────────────────────────

describe('rgbToHsl', () => {
  it('converts pure red to ~0° hue', () => {
    const [h, s, l] = rgbToHsl(255, 0, 0);
    expect(h).toBeCloseTo(0, 0);
    expect(s).toBeCloseTo(1, 1);
    expect(l).toBeCloseTo(0.5, 1);
  });

  it('converts pure green to ~120° hue', () => {
    const [h, s, l] = rgbToHsl(0, 255, 0);
    expect(h).toBeCloseTo(120, 0);
    expect(s).toBeCloseTo(1, 1);
    expect(l).toBeCloseTo(0.5, 1);
  });

  it('converts pure blue to ~240° hue', () => {
    const [h, s, l] = rgbToHsl(0, 0, 255);
    expect(h).toBeCloseTo(240, 0);
    expect(s).toBeCloseTo(1, 1);
    expect(l).toBeCloseTo(0.5, 1);
  });

  it('converts white to 0° hue, 0 saturation, 1 lightness', () => {
    const [h, s, l] = rgbToHsl(255, 255, 255);
    expect(h).toBe(0);
    expect(s).toBe(0);
    expect(l).toBeCloseTo(1, 1);
  });

  it('converts black to 0° hue, 0 saturation, 0 lightness', () => {
    const [h, s, l] = rgbToHsl(0, 0, 0);
    expect(h).toBe(0);
    expect(s).toBe(0);
    expect(l).toBe(0);
  });

  it('converts a mid-gray to achromatic', () => {
    const [_h, s, l] = rgbToHsl(128, 128, 128);
    expect(s).toBe(0);
    expect(l).toBeCloseTo(0.502, 1);
  });
});

// ─── greenScore ──────────────────────────────────────────────────────────────

describe('greenScore', () => {
  it('returns a high score for pure green (0, 255, 0)', () => {
    const score = greenScore(0, 255, 0, DEFAULT_CONFIG);
    expect(score).toBeGreaterThan(0.8);
  });

  it('returns a high score for typical green-screen green (0, 177, 64)', () => {
    const score = greenScore(0, 177, 64, DEFAULT_CONFIG);
    expect(score).toBeGreaterThan(0.5);
  });

  it('returns 0 for pure red', () => {
    expect(greenScore(255, 0, 0, DEFAULT_CONFIG)).toBe(0);
  });

  it('returns 0 for pure blue', () => {
    expect(greenScore(0, 0, 255, DEFAULT_CONFIG)).toBe(0);
  });

  it('returns 0 for white (low saturation)', () => {
    expect(greenScore(255, 255, 255, DEFAULT_CONFIG)).toBe(0);
  });

  it('returns 0 for black (low lightness below threshold)', () => {
    expect(greenScore(0, 0, 0, DEFAULT_CONFIG)).toBe(0);
  });

  it('returns 0 for desaturated green-ish gray', () => {
    // Gray-green with very low saturation
    expect(greenScore(120, 130, 120, DEFAULT_CONFIG)).toBe(0);
  });

  it('responds to hueRange config changes', () => {
    // A yellow-green pixel that is borderline
    const yellowGreen = { r: 100, g: 200, b: 0 };
    const narrow = { ...DEFAULT_CONFIG, hueRangeDeg: 10 };
    const wide = { ...DEFAULT_CONFIG, hueRangeDeg: 80 };

    const scoreNarrow = greenScore(yellowGreen.r, yellowGreen.g, yellowGreen.b, narrow);
    const scoreWide = greenScore(yellowGreen.r, yellowGreen.g, yellowGreen.b, wide);
    expect(scoreWide).toBeGreaterThanOrEqual(scoreNarrow);
  });
});

// ─── removeGreenFromImageData ────────────────────────────────────────────────

describe('removeGreenFromImageData', () => {
  function makeImageData(pixels: [number, number, number, number][]): ImageData {
    const data = new Uint8ClampedArray(pixels.length * 4);
    pixels.forEach(([r, g, b, a], i) => {
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = a;
    });
    return { data, width: pixels.length, height: 1, colorSpace: 'srgb' } as ImageData;
  }

  it('makes pure green pixels transparent', () => {
    const imgData = makeImageData([
      [0, 255, 0, 255],  // pure green
      [255, 0, 0, 255],  // red — should be untouched
    ]);

    removeGreenFromImageData(imgData, DEFAULT_CONFIG);

    // Green pixel alpha should be significantly reduced
    expect(imgData.data[3]).toBeLessThan(100);
    // Red pixel alpha should be untouched
    expect(imgData.data[7]).toBe(255);
  });

  it('leaves non-green pixels completely intact', () => {
    const imgData = makeImageData([
      [255, 0, 0, 255],   // red
      [0, 0, 255, 255],   // blue
      [255, 255, 0, 255], // yellow
      [128, 128, 128, 255], // gray
    ]);

    removeGreenFromImageData(imgData, DEFAULT_CONFIG);

    // All alphas should remain 255
    for (let i = 0; i < 4; i++) {
      expect(imgData.data[i * 4 + 3]).toBe(255);
    }
  });

  it('handles already-transparent pixels gracefully', () => {
    const imgData = makeImageData([
      [0, 255, 0, 0], // green but already fully transparent
    ]);

    removeGreenFromImageData(imgData, DEFAULT_CONFIG);

    // Should stay at 0 (not go negative)
    expect(imgData.data[3]).toBe(0);
  });

  it('handles typical green-screen color (#00B140)', () => {
    const imgData = makeImageData([
      [0, 177, 64, 255], // common chroma-key green
    ]);

    removeGreenFromImageData(imgData, DEFAULT_CONFIG);
    expect(imgData.data[3]).toBeLessThan(200);
  });
});

// ─── Manifest validity ──────────────────────────────────────────────────────

describe('greenScreenRemoverManifest', () => {
  it('passes WidgetManifestSchema validation', () => {
    const result = WidgetManifestSchema.safeParse(greenScreenRemoverManifest);
    expect(result.success).toBe(true);
  });

  it('has the correct widget id', () => {
    expect(greenScreenRemoverManifest.id).toBe('sn.builtin.green-screen-remover');
  });

  it('declares canvas-write permission', () => {
    expect(greenScreenRemoverManifest.permissions).toContain('canvas-write');
  });

  it('is categorized as media', () => {
    expect(greenScreenRemoverManifest.category).toBe('media');
  });
});

// ─── Config schema ───────────────────────────────────────────────────────────

describe('greenScreenRemoverConfigSchema', () => {
  it('provides sensible defaults', () => {
    const config = greenScreenRemoverConfigSchema.parse({});
    expect(config.hueCenterDeg).toBe(120);
    expect(config.hueRangeDeg).toBe(40);
    expect(config.minSaturation).toBe(0.15);
  });

  it('rejects out-of-range hue center', () => {
    const result = greenScreenRemoverConfigSchema.safeParse({ hueCenterDeg: 400 });
    expect(result.success).toBe(false);
  });

  it('rejects negative saturation', () => {
    const result = greenScreenRemoverConfigSchema.safeParse({ minSaturation: -0.5 });
    expect(result.success).toBe(false);
  });
});

// ─── Event constants ─────────────────────────────────────────────────────────

describe('GREEN_SCREEN_REMOVER_EVENTS', () => {
  it('uses the widget.green-screen-remover.* namespace', () => {
    for (const key of Object.values(GREEN_SCREEN_REMOVER_EVENTS.emits)) {
      expect(key).toMatch(/^widget\.green-screen-remover\./);
    }
  });
});
