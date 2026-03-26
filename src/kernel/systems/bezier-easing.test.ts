/**
 * Cubic Bezier Easing Tests
 *
 * @module kernel/systems/bezier-easing.test
 */

import { describe, it, expect } from 'vitest';

import { evaluateCubicBezier, BEZIER_PRESETS } from './bezier-easing';

describe('evaluateCubicBezier', () => {
  it('returns 0 at t=0', () => {
    expect(evaluateCubicBezier(0, 0.42, 0, 0.58, 1)).toBe(0);
  });

  it('returns 1 at t=1', () => {
    expect(evaluateCubicBezier(1, 0.42, 0, 0.58, 1)).toBe(1);
  });

  it('handles linear curve (0,0,1,1)', () => {
    expect(evaluateCubicBezier(0.25, 0, 0, 1, 1)).toBeCloseTo(0.25, 3);
    expect(evaluateCubicBezier(0.5, 0, 0, 1, 1)).toBeCloseTo(0.5, 3);
    expect(evaluateCubicBezier(0.75, 0, 0, 1, 1)).toBeCloseTo(0.75, 3);
  });

  it('ease-in-out is symmetric around 0.5', () => {
    const [x1, y1, x2, y2] = BEZIER_PRESETS['ease-in-out'];
    const at25 = evaluateCubicBezier(0.25, x1, y1, x2, y2);
    const at75 = evaluateCubicBezier(0.75, x1, y1, x2, y2);
    // For a symmetric curve, f(0.25) + f(0.75) ≈ 1.0
    expect(at25 + at75).toBeCloseTo(1.0, 2);
  });

  it('ease-in starts slow', () => {
    const [x1, y1, x2, y2] = BEZIER_PRESETS['ease-in'];
    const at25 = evaluateCubicBezier(0.25, x1, y1, x2, y2);
    // Should be less than linear (0.25) for ease-in
    expect(at25).toBeLessThan(0.25);
  });

  it('ease-out starts fast', () => {
    const [x1, y1, x2, y2] = BEZIER_PRESETS['ease-out'];
    const at25 = evaluateCubicBezier(0.25, x1, y1, x2, y2);
    // Should be greater than linear (0.25) for ease-out
    expect(at25).toBeGreaterThan(0.25);
  });

  it('ease-out-back overshoots past 1.0', () => {
    const [x1, y1, x2, y2] = BEZIER_PRESETS['ease-out-back'];
    const at75 = evaluateCubicBezier(0.75, x1, y1, x2, y2);
    // Back curves overshoot
    expect(at75).toBeGreaterThan(1.0);
  });

  it('midpoint of ease-in-out is close to 0.5', () => {
    const [x1, y1, x2, y2] = BEZIER_PRESETS['ease-in-out'];
    const mid = evaluateCubicBezier(0.5, x1, y1, x2, y2);
    expect(mid).toBeCloseTo(0.5, 1);
  });

  it('is monotonically increasing for standard curves', () => {
    const [x1, y1, x2, y2] = BEZIER_PRESETS['ease'];
    let prev = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const val = evaluateCubicBezier(t, x1, y1, x2, y2);
      expect(val).toBeGreaterThanOrEqual(prev - 0.001);
      prev = val;
    }
  });
});
