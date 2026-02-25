/**
 * Bezier curve math utilities for path rendering, hit-testing, and editing.
 *
 * All functions are pure — no side effects, no store access.
 * Handles are stored as relative offsets in AnchorPoint; these utilities
 * work with absolute Point2D coordinates throughout.
 *
 * @module canvas/core/geometry/bezier
 * @layer L4A-1
 */

import type { Point2D, AnchorPoint } from '../../../kernel/schemas';

// ---------------------------------------------------------------------------
// Core cubic Bezier evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a cubic Bezier curve at parameter t using De Casteljau's algorithm.
 *
 * @param p0  Start point
 * @param cp1 First control point
 * @param cp2 Second control point
 * @param p3  End point
 * @param t   Parameter in [0, 1]
 * @returns   Point on the curve at t
 */
export function evaluateCubicBezier(
  p0: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  p3: Point2D,
  t: number,
): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t2 * t * p3.y,
  };
}

/**
 * Split a cubic Bezier at parameter t into two sub-curves (De Casteljau split).
 *
 * @returns `[left, right]` — each is a 4-point tuple `[p0, cp1, cp2, p3]`.
 */
export function splitCubicBezier(
  p0: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  p3: Point2D,
  t: number,
): [left: [Point2D, Point2D, Point2D, Point2D], right: [Point2D, Point2D, Point2D, Point2D]] {
  const mt = 1 - t;

  // Level 1
  const m01: Point2D = { x: mt * p0.x + t * cp1.x, y: mt * p0.y + t * cp1.y };
  const m12: Point2D = { x: mt * cp1.x + t * cp2.x, y: mt * cp1.y + t * cp2.y };
  const m23: Point2D = { x: mt * cp2.x + t * p3.x, y: mt * cp2.y + t * p3.y };

  // Level 2
  const m012: Point2D = { x: mt * m01.x + t * m12.x, y: mt * m01.y + t * m12.y };
  const m123: Point2D = { x: mt * m12.x + t * m23.x, y: mt * m12.y + t * m23.y };

  // Level 3 — the point on the curve
  const mid: Point2D = { x: mt * m012.x + t * m123.x, y: mt * m012.y + t * m123.y };

  return [
    [p0, m01, m012, mid],
    [mid, m123, m23, p3],
  ];
}

// ---------------------------------------------------------------------------
// Bounding box
// ---------------------------------------------------------------------------

/**
 * Compute the tight axis-aligned bounding box of a cubic Bezier segment.
 *
 * Finds extrema by solving the derivative B'(t) = 0 for each axis,
 * then evaluating B(t) at the extrema plus t=0 and t=1.
 */
export function cubicBezierBounds(
  p0: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  p3: Point2D,
): { min: Point2D; max: Point2D } {
  const extremaT = findCubicExtrema(p0, cp1, cp2, p3);
  let minX = Math.min(p0.x, p3.x);
  let maxX = Math.max(p0.x, p3.x);
  let minY = Math.min(p0.y, p3.y);
  let maxY = Math.max(p0.y, p3.y);

  for (const t of extremaT) {
    const pt = evaluateCubicBezier(p0, cp1, cp2, p3, t);
    minX = Math.min(minX, pt.x);
    maxX = Math.max(maxX, pt.x);
    minY = Math.min(minY, pt.y);
    maxY = Math.max(maxY, pt.y);
  }

  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

/**
 * Find parameter values where the cubic Bezier derivative is zero (extrema).
 * Returns t values in the open range (0, 1).
 */
function findCubicExtrema(p0: Point2D, cp1: Point2D, cp2: Point2D, p3: Point2D): number[] {
  const results: number[] = [];
  // Solve for each axis independently
  solveQuadraticRoots(
    -p0.x + 3 * cp1.x - 3 * cp2.x + p3.x,
    2 * (p0.x - 2 * cp1.x + cp2.x),
    -p0.x + cp1.x,
    results,
  );
  solveQuadraticRoots(
    -p0.y + 3 * cp1.y - 3 * cp2.y + p3.y,
    2 * (p0.y - 2 * cp1.y + cp2.y),
    -p0.y + cp1.y,
    results,
  );
  return results;
}

/** Solve at^2 + bt + c = 0, pushing roots in (0, 1) to `out`. */
function solveQuadraticRoots(a: number, b: number, c: number, out: number[]): void {
  const EPS = 1e-12;
  if (Math.abs(a) < EPS) {
    // Linear: bt + c = 0
    if (Math.abs(b) > EPS) {
      const t = -c / b;
      if (t > 0 && t < 1) out.push(t);
    }
    return;
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return;
  const sqrtDisc = Math.sqrt(disc);
  const inv2a = 1 / (2 * a);
  const t1 = (-b + sqrtDisc) * inv2a;
  const t2 = (-b - sqrtDisc) * inv2a;
  if (t1 > 0 && t1 < 1) out.push(t1);
  if (t2 > 0 && t2 < 1) out.push(t2);
}

// ---------------------------------------------------------------------------
// Distance / hit-testing
// ---------------------------------------------------------------------------

/**
 * Approximate closest distance from a point to a cubic Bezier segment
 * using recursive subdivision.
 *
 * @param point     The query point
 * @param p0        Bezier start
 * @param cp1       First control point
 * @param cp2       Second control point
 * @param p3        Bezier end
 * @param tolerance Subdivision stops when the segment's bounding box
 *                  diagonal is below this value. Default 1.0.
 * @returns         Closest distance (approximate)
 */
export function distanceToCubicBezier(
  point: Point2D,
  p0: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  p3: Point2D,
  tolerance: number = 1.0,
): number {
  return subdivideDistance(point, p0, cp1, cp2, p3, tolerance, 0);
}

const MAX_SUBDIVISION_DEPTH = 16;

function subdivideDistance(
  point: Point2D,
  p0: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  p3: Point2D,
  tolerance: number,
  depth: number,
): number {
  const bounds = cubicBezierBounds(p0, cp1, cp2, p3);
  const dx = bounds.max.x - bounds.min.x;
  const dy = bounds.max.y - bounds.min.y;

  // Base case: segment small enough to approximate as a line
  if ((dx * dx + dy * dy < tolerance * tolerance) || depth >= MAX_SUBDIVISION_DEPTH) {
    return distanceToLineSegment(point, p0, p3);
  }

  const [left, right] = splitCubicBezier(p0, cp1, cp2, p3, 0.5);
  const dLeft = subdivideDistance(point, ...left, tolerance, depth + 1);
  const dRight = subdivideDistance(point, ...right, tolerance, depth + 1);
  return Math.min(dLeft, dRight);
}

/** Distance from point to line segment (p1, p2). */
function distanceToLineSegment(point: Point2D, p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(point, p1);

  let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return dist(point, { x: p1.x + t * dx, y: p1.y + t * dy });
}

function dist(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------------------------------------------------------------------------
// SVG path generation
// ---------------------------------------------------------------------------

/**
 * Convert an array of AnchorPoints to an SVG `d` attribute string.
 *
 * @remarks
 * Handles are relative offsets in AnchorPoint, so absolute handle positions
 * are computed as `anchor.position + handle`.
 *
 * Segment rules between anchor[i] and anchor[i+1]:
 * - Both handleOut[i] and handleIn[i+1] present → cubic `C`
 * - Only one handle → quadratic promoted to cubic (2/3 rule) → `C`
 * - Neither handle → line `L`
 *
 * For closed paths, adds final segment from last → first, then `Z`.
 */
export function anchorsToSvgPath(anchors: AnchorPoint[], closed: boolean): string {
  if (anchors.length === 0) return '';
  if (anchors.length === 1) {
    const p = anchors[0].position;
    return `M${fmt(p.x)},${fmt(p.y)}`;
  }

  const parts: string[] = [];
  const first = anchors[0].position;
  parts.push(`M${fmt(first.x)},${fmt(first.y)}`);

  const segmentCount = closed ? anchors.length : anchors.length - 1;

  for (let i = 0; i < segmentCount; i++) {
    const from = anchors[i];
    const to = anchors[(i + 1) % anchors.length];
    const hasOut = from.handleOut != null;
    const hasIn = to.handleIn != null;

    if (hasOut && hasIn) {
      // Cubic bezier
      const cp1 = absHandle(from.position, from.handleOut!);
      const cp2 = absHandle(to.position, to.handleIn!);
      parts.push(`C${fmt(cp1.x)},${fmt(cp1.y)} ${fmt(cp2.x)},${fmt(cp2.y)} ${fmt(to.position.x)},${fmt(to.position.y)}`);
    } else if (hasOut || hasIn) {
      // One handle only — promote quadratic to cubic using 2/3 rule
      const qp = hasOut ? absHandle(from.position, from.handleOut!) : absHandle(to.position, to.handleIn!);
      const cp1: Point2D = {
        x: from.position.x + (2 / 3) * (qp.x - from.position.x),
        y: from.position.y + (2 / 3) * (qp.y - from.position.y),
      };
      const cp2: Point2D = {
        x: to.position.x + (2 / 3) * (qp.x - to.position.x),
        y: to.position.y + (2 / 3) * (qp.y - to.position.y),
      };
      parts.push(`C${fmt(cp1.x)},${fmt(cp1.y)} ${fmt(cp2.x)},${fmt(cp2.y)} ${fmt(to.position.x)},${fmt(to.position.y)}`);
    } else {
      // Line
      parts.push(`L${fmt(to.position.x)},${fmt(to.position.y)}`);
    }
  }

  if (closed) parts.push('Z');
  return parts.join('');
}

/** Format number to max 4 decimal places, trimming trailing zeros. */
function fmt(n: number): string {
  return parseFloat(n.toFixed(4)).toString();
}

/** Compute absolute handle position from anchor position + relative offset. */
function absHandle(anchor: Point2D, handle: Point2D): Point2D {
  return { x: anchor.x + handle.x, y: anchor.y + handle.y };
}

// ---------------------------------------------------------------------------
// Path bounding box
// ---------------------------------------------------------------------------

/**
 * Compute the axis-aligned bounding box of an entire multi-segment path.
 */
export function pathBounds(
  anchors: AnchorPoint[],
  closed: boolean,
): { min: Point2D; max: Point2D } {
  if (anchors.length === 0) {
    return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
  }
  if (anchors.length === 1) {
    const p = anchors[0].position;
    return { min: { x: p.x, y: p.y }, max: { x: p.x, y: p.y } };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const segmentCount = closed ? anchors.length : anchors.length - 1;

  for (let i = 0; i < segmentCount; i++) {
    const from = anchors[i];
    const to = anchors[(i + 1) % anchors.length];
    const segBounds = segmentBounds(from, to);
    minX = Math.min(minX, segBounds.min.x);
    maxX = Math.max(maxX, segBounds.max.x);
    minY = Math.min(minY, segBounds.min.y);
    maxY = Math.max(maxY, segBounds.max.y);
  }

  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

/**
 * Compute bounds for a single segment between two anchors.
 * Resolves handle presence and promotes quadratics to cubics.
 */
function segmentBounds(
  from: AnchorPoint,
  to: AnchorPoint,
): { min: Point2D; max: Point2D } {
  const p0 = from.position;
  const p3 = to.position;
  const hasOut = from.handleOut != null;
  const hasIn = to.handleIn != null;

  if (!hasOut && !hasIn) {
    // Line segment
    return {
      min: { x: Math.min(p0.x, p3.x), y: Math.min(p0.y, p3.y) },
      max: { x: Math.max(p0.x, p3.x), y: Math.max(p0.y, p3.y) },
    };
  }

  let cp1: Point2D;
  let cp2: Point2D;

  if (hasOut && hasIn) {
    cp1 = absHandle(p0, from.handleOut!);
    cp2 = absHandle(p3, to.handleIn!);
  } else {
    // One handle — promote quadratic to cubic
    const qp = hasOut ? absHandle(p0, from.handleOut!) : absHandle(p3, to.handleIn!);
    cp1 = { x: p0.x + (2 / 3) * (qp.x - p0.x), y: p0.y + (2 / 3) * (qp.y - p0.y) };
    cp2 = { x: p3.x + (2 / 3) * (qp.x - p3.x), y: p3.y + (2 / 3) * (qp.y - p3.y) };
  }

  return cubicBezierBounds(p0, cp1, cp2, p3);
}

// ---------------------------------------------------------------------------
// Handle constraint utilities
// ---------------------------------------------------------------------------

/**
 * Mirror a handle offset (for symmetric point enforcement).
 * Returns `{ x: -handle.x, y: -handle.y }`.
 */
export function mirrorHandle(handle: Point2D): Point2D {
  return { x: handle.x === 0 ? 0 : -handle.x, y: handle.y === 0 ? 0 : -handle.y };
}

/**
 * Enforce smooth constraint: make handleOut collinear with handleIn
 * (same angle, preserving handleOut's original length).
 *
 * @param handleIn  The incoming handle offset (relative to anchor)
 * @param handleOut The outgoing handle offset (relative to anchor)
 * @returns         Adjusted handleOut that is collinear with handleIn
 */
export function enforceSmooth(handleIn: Point2D, handleOut: Point2D): Point2D {
  const inLen = Math.sqrt(handleIn.x * handleIn.x + handleIn.y * handleIn.y);
  if (inLen === 0) return handleOut;

  const outLen = Math.sqrt(handleOut.x * handleOut.x + handleOut.y * handleOut.y);
  if (outLen === 0) return handleOut;

  // Direction: opposite of handleIn (collinear means 180 degrees apart)
  const dirX = -handleIn.x / inLen;
  const dirY = -handleIn.y / inLen;

  return { x: dirX * outLen, y: dirY * outLen };
}

/**
 * Enforce symmetric constraint: make handleOut the exact mirror of handleIn.
 * Length and angle are both mirrored.
 */
export function enforceSymmetric(handleIn: Point2D): Point2D {
  return mirrorHandle(handleIn);
}
