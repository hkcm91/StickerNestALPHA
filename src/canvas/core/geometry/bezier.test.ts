/**
 * Bezier math utility tests
 * @module canvas/core/geometry/bezier.test
 */

import { describe, it, expect } from 'vitest';

import type { Point2D, AnchorPoint } from '../../../kernel/schemas';

import {
  evaluateCubicBezier,
  splitCubicBezier,
  cubicBezierBounds,
  distanceToCubicBezier,
  anchorsToSvgPath,
  pathBounds,
  mirrorHandle,
  enforceSmooth,
  enforceSymmetric,
} from './bezier';

// Tolerance for floating-point comparisons
const EPS = 1e-6;

function expectClose(actual: Point2D, expected: Point2D, _tolerance = EPS) {
  expect(actual.x).toBeCloseTo(expected.x, 4);
  expect(actual.y).toBeCloseTo(expected.y, 4);
}

describe('evaluateCubicBezier', () => {
  const p0: Point2D = { x: 0, y: 0 };
  const cp1: Point2D = { x: 0, y: 100 };
  const cp2: Point2D = { x: 100, y: 100 };
  const p3: Point2D = { x: 100, y: 0 };

  it('should return p0 at t=0', () => {
    expectClose(evaluateCubicBezier(p0, cp1, cp2, p3, 0), p0);
  });

  it('should return p3 at t=1', () => {
    expectClose(evaluateCubicBezier(p0, cp1, cp2, p3, 1), p3);
  });

  it('should return midpoint at t=0.5', () => {
    const mid = evaluateCubicBezier(p0, cp1, cp2, p3, 0.5);
    // For a symmetric S-curve, midpoint should be at (50, 75)
    expect(mid.x).toBeCloseTo(50, 4);
    expect(mid.y).toBeCloseTo(75, 4);
  });

  it('should handle a straight line (control points on line)', () => {
    const lineP0: Point2D = { x: 0, y: 0 };
    const lineCp1: Point2D = { x: 33.33, y: 0 };
    const lineCp2: Point2D = { x: 66.67, y: 0 };
    const lineP3: Point2D = { x: 100, y: 0 };
    const mid = evaluateCubicBezier(lineP0, lineCp1, lineCp2, lineP3, 0.5);
    expect(mid.x).toBeCloseTo(50, 1);
    expect(mid.y).toBeCloseTo(0, 4);
  });
});

describe('splitCubicBezier', () => {
  const p0: Point2D = { x: 0, y: 0 };
  const cp1: Point2D = { x: 0, y: 100 };
  const cp2: Point2D = { x: 100, y: 100 };
  const p3: Point2D = { x: 100, y: 0 };

  it('should produce sub-curves that meet at the split point', () => {
    const t = 0.5;
    const [left, right] = splitCubicBezier(p0, cp1, cp2, p3, t);
    const splitPoint = evaluateCubicBezier(p0, cp1, cp2, p3, t);

    // Left curve ends at split point
    expectClose(left[3], splitPoint);
    // Right curve starts at split point
    expectClose(right[0], splitPoint);
  });

  it('should preserve endpoints', () => {
    const [left, right] = splitCubicBezier(p0, cp1, cp2, p3, 0.3);
    expectClose(left[0], p0);
    expectClose(right[3], p3);
  });

  it('should produce correct sub-curve at t=0.5', () => {
    const [left, right] = splitCubicBezier(p0, cp1, cp2, p3, 0.5);

    // Evaluate left sub-curve at t=0.5 should equal original at t=0.25
    const leftMid = evaluateCubicBezier(left[0], left[1], left[2], left[3], 0.5);
    const origQuarter = evaluateCubicBezier(p0, cp1, cp2, p3, 0.25);
    expectClose(leftMid, origQuarter);

    // Evaluate right sub-curve at t=0.5 should equal original at t=0.75
    const rightMid = evaluateCubicBezier(right[0], right[1], right[2], right[3], 0.5);
    const origThreeQuarter = evaluateCubicBezier(p0, cp1, cp2, p3, 0.75);
    expectClose(rightMid, origThreeQuarter);
  });
});

describe('cubicBezierBounds', () => {
  it('should return endpoints for a straight line', () => {
    const bounds = cubicBezierBounds(
      { x: 0, y: 0 },
      { x: 33, y: 0 },
      { x: 66, y: 0 },
      { x: 100, y: 0 },
    );
    expect(bounds.min.x).toBeCloseTo(0, 2);
    expect(bounds.max.x).toBeCloseTo(100, 2);
    expect(bounds.min.y).toBeCloseTo(0, 2);
    expect(bounds.max.y).toBeCloseTo(0, 2);
  });

  it('should include control point bulge', () => {
    const bounds = cubicBezierBounds(
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
    );
    expect(bounds.min.x).toBeLessThanOrEqual(0);
    expect(bounds.max.x).toBeGreaterThanOrEqual(100);
    expect(bounds.min.y).toBeLessThanOrEqual(0);
    // Curve bulges upward
    expect(bounds.max.y).toBeGreaterThan(50);
  });

  it('should handle degenerate (point) case', () => {
    const p: Point2D = { x: 42, y: 17 };
    const bounds = cubicBezierBounds(p, p, p, p);
    expect(bounds.min.x).toBeCloseTo(42, 4);
    expect(bounds.max.x).toBeCloseTo(42, 4);
    expect(bounds.min.y).toBeCloseTo(17, 4);
    expect(bounds.max.y).toBeCloseTo(17, 4);
  });
});

describe('distanceToCubicBezier', () => {
  const p0: Point2D = { x: 0, y: 0 };
  const cp1: Point2D = { x: 0, y: 100 };
  const cp2: Point2D = { x: 100, y: 100 };
  const p3: Point2D = { x: 100, y: 0 };

  it('should return ~0 for a point on the curve (start)', () => {
    expect(distanceToCubicBezier(p0, p0, cp1, cp2, p3, 0.5)).toBeLessThan(0.5);
  });

  it('should return ~0 for a point on the curve (end)', () => {
    expect(distanceToCubicBezier(p3, p0, cp1, cp2, p3, 0.5)).toBeLessThan(0.5);
  });

  it('should return ~0 for a point on the curve (midpoint)', () => {
    const mid = evaluateCubicBezier(p0, cp1, cp2, p3, 0.5);
    expect(distanceToCubicBezier(mid, p0, cp1, cp2, p3, 0.5)).toBeLessThan(1);
  });

  it('should return positive distance for a far-away point', () => {
    expect(distanceToCubicBezier({ x: 500, y: 500 }, p0, cp1, cp2, p3, 0.5)).toBeGreaterThan(400);
  });

  it('should handle straight line segment', () => {
    const d = distanceToCubicBezier(
      { x: 50, y: 10 },
      { x: 0, y: 0 },
      { x: 33, y: 0 },
      { x: 66, y: 0 },
      { x: 100, y: 0 },
      0.5,
    );
    expect(d).toBeCloseTo(10, 0);
  });
});

describe('anchorsToSvgPath', () => {
  it('should return empty string for empty anchors', () => {
    expect(anchorsToSvgPath([], false)).toBe('');
  });

  it('should return M command for single anchor', () => {
    const anchors: AnchorPoint[] = [{ position: { x: 10, y: 20 }, pointType: 'corner' }];
    expect(anchorsToSvgPath(anchors, false)).toBe('M10,20');
  });

  it('should produce L commands for corner-to-corner (no handles)', () => {
    const anchors: AnchorPoint[] = [
      { position: { x: 0, y: 0 }, pointType: 'corner' },
      { position: { x: 100, y: 0 }, pointType: 'corner' },
      { position: { x: 100, y: 100 }, pointType: 'corner' },
    ];
    expect(anchorsToSvgPath(anchors, false)).toBe('M0,0L100,0L100,100');
  });

  it('should produce C commands for smooth points with both handles', () => {
    const anchors: AnchorPoint[] = [
      { position: { x: 0, y: 0 }, handleOut: { x: 30, y: 0 }, pointType: 'smooth' },
      { position: { x: 100, y: 0 }, handleIn: { x: -30, y: 0 }, pointType: 'smooth' },
    ];
    const d = anchorsToSvgPath(anchors, false);
    expect(d).toContain('M0,0');
    expect(d).toContain('C30,0 70,0 100,0');
  });

  it('should close path with Z', () => {
    const anchors: AnchorPoint[] = [
      { position: { x: 0, y: 0 }, pointType: 'corner' },
      { position: { x: 100, y: 0 }, pointType: 'corner' },
      { position: { x: 50, y: 100 }, pointType: 'corner' },
    ];
    const d = anchorsToSvgPath(anchors, true);
    expect(d).toContain('Z');
    // Closed path should have 3 segments (including last→first)
    const lCount = (d.match(/L/g) || []).length;
    expect(lCount).toBe(3);
  });

  it('should handle one-handle segments (quadratic promotion)', () => {
    const anchors: AnchorPoint[] = [
      { position: { x: 0, y: 0 }, handleOut: { x: 50, y: 50 }, pointType: 'corner' },
      { position: { x: 100, y: 0 }, pointType: 'corner' },
    ];
    const d = anchorsToSvgPath(anchors, false);
    expect(d).toContain('C');
  });
});

describe('pathBounds', () => {
  it('should return zero rect for empty anchors', () => {
    const b = pathBounds([], false);
    expect(b.min.x).toBe(0);
    expect(b.max.x).toBe(0);
  });

  it('should return point for single anchor', () => {
    const anchors: AnchorPoint[] = [{ position: { x: 42, y: 17 }, pointType: 'corner' }];
    const b = pathBounds(anchors, false);
    expect(b.min.x).toBe(42);
    expect(b.min.y).toBe(17);
  });

  it('should encompass all line segments', () => {
    const anchors: AnchorPoint[] = [
      { position: { x: 0, y: 0 }, pointType: 'corner' },
      { position: { x: 100, y: 50 }, pointType: 'corner' },
      { position: { x: 50, y: 100 }, pointType: 'corner' },
    ];
    const b = pathBounds(anchors, false);
    expect(b.min.x).toBeLessThanOrEqual(0);
    expect(b.min.y).toBeLessThanOrEqual(0);
    expect(b.max.x).toBeGreaterThanOrEqual(100);
    expect(b.max.y).toBeGreaterThanOrEqual(100);
  });

  it('should encompass curve bulge', () => {
    const anchors: AnchorPoint[] = [
      { position: { x: 0, y: 0 }, handleOut: { x: 0, y: 100 }, pointType: 'smooth' },
      { position: { x: 100, y: 0 }, handleIn: { x: 0, y: 100 }, pointType: 'smooth' },
    ];
    const b = pathBounds(anchors, false);
    // Curve bulges upward (positive y)
    expect(b.max.y).toBeGreaterThan(50);
  });
});

describe('mirrorHandle', () => {
  it('should negate both components', () => {
    expect(mirrorHandle({ x: 20, y: -10 })).toEqual({ x: -20, y: 10 });
  });

  it('should return zero for zero handle', () => {
    const result = mirrorHandle({ x: 0, y: 0 });
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });
});

describe('enforceSmooth', () => {
  it('should make handleOut collinear with handleIn (opposite direction)', () => {
    const handleIn: Point2D = { x: -20, y: 0 };
    const handleOut: Point2D = { x: 15, y: 10 };
    const result = enforceSmooth(handleIn, handleOut);

    // Result should be in the +x direction (opposite of handleIn)
    expect(result.x).toBeGreaterThan(0);
    // Result should preserve original length of handleOut
    const originalLen = Math.sqrt(handleOut.x ** 2 + handleOut.y ** 2);
    const resultLen = Math.sqrt(result.x ** 2 + result.y ** 2);
    expect(resultLen).toBeCloseTo(originalLen, 4);
    // Y should be 0 (collinear with the x-axis handleIn)
    expect(result.y).toBeCloseTo(0, 4);
  });

  it('should handle zero-length handleIn gracefully', () => {
    const handleIn: Point2D = { x: 0, y: 0 };
    const handleOut: Point2D = { x: 10, y: 5 };
    const result = enforceSmooth(handleIn, handleOut);
    // Should return handleOut unchanged
    expect(result).toEqual(handleOut);
  });

  it('should handle zero-length handleOut gracefully', () => {
    const handleIn: Point2D = { x: -10, y: 0 };
    const handleOut: Point2D = { x: 0, y: 0 };
    const result = enforceSmooth(handleIn, handleOut);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('should produce handles at 180 degrees from each other', () => {
    const handleIn: Point2D = { x: -10, y: -10 };
    const handleOut: Point2D = { x: 20, y: 5 };
    const result = enforceSmooth(handleIn, handleOut);

    // Angle of handleIn
    const inAngle = Math.atan2(handleIn.y, handleIn.x);
    // Angle of result should differ by PI
    const outAngle = Math.atan2(result.y, result.x);
    const angleDiff = Math.abs(outAngle - inAngle);
    expect(Math.abs(angleDiff - Math.PI)).toBeLessThan(EPS);
  });
});

describe('enforceSymmetric', () => {
  it('should return exact mirror of handleIn', () => {
    expect(enforceSymmetric({ x: -20, y: 10 })).toEqual({ x: 20, y: -10 });
  });

  it('should produce equal lengths', () => {
    const handleIn: Point2D = { x: -15, y: 8 };
    const result = enforceSymmetric(handleIn);
    const inLen = Math.sqrt(handleIn.x ** 2 + handleIn.y ** 2);
    const outLen = Math.sqrt(result.x ** 2 + result.y ** 2);
    expect(outLen).toBeCloseTo(inLen, 10);
  });
});
