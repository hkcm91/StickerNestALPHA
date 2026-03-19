/**
 * Vector Boolean Operations Engine
 *
 * Implements Adobe Illustrator-style path operations using polygon-clipping:
 * - Unite: Merge paths into one (union)
 * - Subtract: Remove front path from back (difference)
 * - Intersect: Keep only overlapping area (intersection)
 * - Exclude: Keep non-overlapping areas (xor)
 * - Divide: Split overlapping paths into atomic segments
 *
 * @module canvas/core/geometry/boolean
 * @layer L4A-1
 */

import polygonClipping from 'polygon-clipping';
import type { Polygon, MultiPolygon } from 'polygon-clipping';

const { union, difference, intersection, xor } = polygonClipping;

import type { Point2D, AnchorPoint } from '@sn/types';

import { evaluateCubicBezier } from './bezier';

// ---------------------------------------------------------------------------
// Line Segment Types (kept for Divide operation)
// ---------------------------------------------------------------------------

export interface LineSegment {
  p1: Point2D;
  p2: Point2D;
}

// ---------------------------------------------------------------------------
// Bezier-aware path flattening
// ---------------------------------------------------------------------------

/** Number of sample points per cubic bezier curve segment. */
const BEZIER_SAMPLES = 16;

/**
 * Resolve an anchor handle (stored as relative offset) to absolute coordinates.
 */
function resolveHandle(anchor: AnchorPoint, handle: Point2D | undefined): Point2D {
  if (!handle) return anchor.position;
  return {
    x: anchor.position.x + handle.x,
    y: anchor.position.y + handle.y,
  };
}

/**
 * Flattens a pair of anchors into polyline points, sampling the cubic bezier
 * curve when handles are present.
 */
function flattenSegment(a0: AnchorPoint, a1: AnchorPoint, samples: number): Point2D[] {
  const cp1 = resolveHandle(a0, a0.handleOut);
  const cp2 = resolveHandle(a1, a1.handleIn);

  const hasHandles =
    (a0.handleOut && (a0.handleOut.x !== 0 || a0.handleOut.y !== 0)) ||
    (a1.handleIn && (a1.handleIn.x !== 0 || a1.handleIn.y !== 0));

  if (!hasHandles) {
    // Straight line — no intermediate samples needed
    return [a0.position];
  }

  // Sample the cubic bezier curve
  const pts: Point2D[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    pts.push(evaluateCubicBezier(a0.position, cp1, cp2, a1.position, t));
  }
  return pts;
}

/**
 * Flattens a list of Bezier anchors into a polyline (array of Point2D).
 * Properly samples cubic bezier curves when handles are present.
 */
export function flattenPathToPoints(anchors: AnchorPoint[], closed: boolean): Point2D[] {
  if (anchors.length < 2) return anchors.map(a => a.position);

  const points: Point2D[] = [];

  for (let i = 0; i < anchors.length - 1; i++) {
    points.push(...flattenSegment(anchors[i], anchors[i + 1], BEZIER_SAMPLES));
  }
  // Always include the last anchor
  points.push(anchors[anchors.length - 1].position);

  if (closed && anchors.length > 2) {
    // Flatten the closing segment (last → first)
    const closingPts = flattenSegment(
      anchors[anchors.length - 1],
      anchors[0],
      BEZIER_SAMPLES,
    );
    // Skip the first point (it's the last anchor, already added)
    points.push(...closingPts.slice(1));
  }

  return points;
}

/**
 * Flattens a list of Bezier anchors into a list of line segments.
 * Uses bezier sampling for curves.
 */
export function flattenPath(anchors: AnchorPoint[], closed: boolean): LineSegment[] {
  const points = flattenPathToPoints(anchors, closed);
  const segments: LineSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({ p1: points[i], p2: points[i + 1] });
  }
  return segments;
}

// ---------------------------------------------------------------------------
// polygon-clipping conversions
// ---------------------------------------------------------------------------

/**
 * Converts an AnchorPoint[] path into polygon-clipping's Polygon format.
 * Flattens bezier curves into polyline points first.
 */
export function anchorsToPolygon(anchors: AnchorPoint[], closed: boolean): Polygon {
  const points = flattenPathToPoints(anchors, closed);
  const ring: [number, number][] = points.map(p => [p.x, p.y]);

  // polygon-clipping requires closed rings — ensure first === last
  if (ring.length > 0) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
  }

  return [ring];
}

/**
 * Converts a polygon-clipping MultiPolygon result back to AnchorPoint arrays.
 * Each returned array represents one resulting path (corner-type anchors).
 */
export function multiPolygonToAnchors(mp: MultiPolygon): AnchorPoint[][] {
  const results: AnchorPoint[][] = [];

  for (const polygon of mp) {
    // Use only the outer ring (index 0); holes could be separate paths
    for (const ring of polygon) {
      // Remove duplicate closing point if present
      let pts = ring;
      if (pts.length > 1) {
        const first = pts[0];
        const last = pts[pts.length - 1];
        if (first[0] === last[0] && first[1] === last[1]) {
          pts = pts.slice(0, -1);
        }
      }

      if (pts.length < 2) continue;

      const anchors: AnchorPoint[] = pts.map(([x, y]) => ({
        position: { x, y },
        pointType: 'corner' as const,
      }));

      results.push(anchors);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Boolean Operations
// ---------------------------------------------------------------------------

interface PathInput {
  anchors: AnchorPoint[];
  closed: boolean;
}

/**
 * Unite (union) multiple paths into one.
 */
export function unitePaths(paths: PathInput[]): AnchorPoint[][] {
  if (paths.length < 2) return paths.map(p => p.anchors);

  const polygons = paths.map(p => anchorsToPolygon(p.anchors, p.closed));
  let result: MultiPolygon = [polygons[0]];

  for (let i = 1; i < polygons.length; i++) {
    result = union(result, [polygons[i]]);
  }

  return multiPolygonToAnchors(result);
}

/**
 * Subtract the front paths from the base path.
 */
export function subtractPaths(base: PathInput, subtract: PathInput[]): AnchorPoint[][] {
  let result: MultiPolygon = [anchorsToPolygon(base.anchors, base.closed)];

  for (const sub of subtract) {
    const subPoly = anchorsToPolygon(sub.anchors, sub.closed);
    result = difference(result, [subPoly]);
  }

  return multiPolygonToAnchors(result);
}

/**
 * Intersect multiple paths — keep only the overlapping area.
 */
export function intersectPaths(paths: PathInput[]): AnchorPoint[][] {
  if (paths.length < 2) return paths.map(p => p.anchors);

  const polygons = paths.map(p => anchorsToPolygon(p.anchors, p.closed));
  let result: MultiPolygon = [polygons[0]];

  for (let i = 1; i < polygons.length; i++) {
    result = intersection(result, [polygons[i]]);
  }

  return multiPolygonToAnchors(result);
}

/**
 * Exclude (XOR) multiple paths — keep non-overlapping areas.
 */
export function excludePaths(paths: PathInput[]): AnchorPoint[][] {
  if (paths.length < 2) return paths.map(p => p.anchors);

  const polygons = paths.map(p => anchorsToPolygon(p.anchors, p.closed));
  let result: MultiPolygon = [polygons[0]];

  for (let i = 1; i < polygons.length; i++) {
    result = xor(result, [polygons[i]]);
  }

  return multiPolygonToAnchors(result);
}

// ---------------------------------------------------------------------------
// Line-segment intersection (used by Divide)
// ---------------------------------------------------------------------------

/**
 * Finds the intersection point of two line segments.
 * Returns null if they don't intersect or are collinear.
 */
export function intersectLineSegments(s1: LineSegment, s2: LineSegment): Point2D | null {
  const x1 = s1.p1.x, y1 = s1.p1.y;
  const x2 = s1.p2.x, y2 = s1.p2.y;
  const x3 = s2.p1.x, y3 = s2.p1.y;
  const x4 = s2.p2.x, y4 = s2.p2.y;

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return null; // Parallel

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: x1 + ua * (x2 - x1),
      y: y1 + ua * (y2 - y1),
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Divide
// ---------------------------------------------------------------------------

/**
 * Segments an array of paths into atomic non-overlapping segments.
 * This is the Divide operation — splits at all intersection points.
 */
export function dividePaths(paths: PathInput[]): LineSegment[] {
  const allSegments: LineSegment[] = paths.flatMap(p => flattenPath(p.anchors, p.closed));

  const result: LineSegment[] = [];

  for (let i = 0; i < allSegments.length; i++) {
    const s1 = allSegments[i];
    const intersections: { pt: Point2D; t: number }[] = [];

    for (let j = 0; j < allSegments.length; j++) {
      if (i === j) continue;
      const s2 = allSegments[j];
      const pt = intersectLineSegments(s1, s2);
      if (pt) {
        const dx = s1.p2.x - s1.p1.x;
        const dy = s1.p2.y - s1.p1.y;
        const t =
          Math.abs(dx) > Math.abs(dy)
            ? (pt.x - s1.p1.x) / dx
            : (pt.y - s1.p1.y) / dy;

        if (t > 0.001 && t < 0.999) {
          intersections.push({ pt, t });
        }
      }
    }

    if (intersections.length === 0) {
      result.push(s1);
    } else {
      intersections.sort((a, b) => a.t - b.t);
      let lastPt = s1.p1;
      for (const inter of intersections) {
        result.push({ p1: lastPt, p2: inter.pt });
        lastPt = inter.pt;
      }
      result.push({ p1: lastPt, p2: s1.p2 });
    }
  }

  return result;
}

/**
 * Finds all atomic regions (faces) from a set of intersecting segments.
 * Placeholder — full DCEL/winged-edge implementation is a future phase.
 */
export function discoverRegions(segments: LineSegment[]): Point2D[][] {
  console.log(`[Geometry] Discovering regions from ${segments.length} segments`);
  return [];
}
