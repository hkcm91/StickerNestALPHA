/**
 * Cubic Bezier Easing — Newton-Raphson solver for custom easing curves
 *
 * @module kernel/systems/bezier-easing
 *
 * @remarks
 * Implements the same algorithm as CSS cubic-bezier(). Given control points
 * (x1, y1, x2, y2), evaluates the Y value at a given T (0-1) progress.
 *
 * Uses Newton-Raphson iteration to solve for the parametric T given X,
 * then evaluates Y at that T.
 */

const NEWTON_ITERATIONS = 8;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_PRECISION = 0.0000001;
const SUBDIVISION_MAX_ITERATIONS = 10;

/**
 * Calculate the polynomial coefficients for a cubic bezier axis.
 */
function calcA(a1: number, a2: number): number {
  return 1.0 - 3.0 * a2 + 3.0 * a1;
}

function calcB(a1: number, a2: number): number {
  return 3.0 * a2 - 6.0 * a1;
}

function calcC(a1: number): number {
  return 3.0 * a1;
}

/**
 * Evaluate the cubic bezier polynomial at parameter t.
 */
function calcBezier(t: number, a1: number, a2: number): number {
  return ((calcA(a1, a2) * t + calcB(a1, a2)) * t + calcC(a1)) * t;
}

/**
 * Evaluate the derivative of the cubic bezier polynomial at parameter t.
 */
function getSlope(t: number, a1: number, a2: number): number {
  return 3.0 * calcA(a1, a2) * t * t + 2.0 * calcB(a1, a2) * t + calcC(a1);
}

/**
 * Newton-Raphson iteration to find the parametric t for a given x.
 */
function newtonRaphsonIterate(aX: number, aGuessT: number, x1: number, x2: number): number {
  let currentT = aGuessT;
  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const currentSlope = getSlope(currentT, x1, x2);
    if (currentSlope === 0.0) return currentT;
    const currentX = calcBezier(currentT, x1, x2) - aX;
    currentT -= currentX / currentSlope;
  }
  return currentT;
}

/**
 * Binary subdivision fallback for when Newton-Raphson doesn't converge.
 */
function binarySubdivide(aX: number, aA: number, aB: number, x1: number, x2: number): number {
  let currentX: number;
  let currentT: number;
  let i = 0;
  let a = aA;
  let b = aB;

  do {
    currentT = a + (b - a) / 2.0;
    currentX = calcBezier(currentT, x1, x2) - aX;
    if (currentX > 0.0) {
      b = currentT;
    } else {
      a = currentT;
    }
  } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);

  return currentT;
}

/**
 * Find the parametric t for a given x value on the bezier curve.
 */
function getTForX(x: number, x1: number, x2: number): number {
  // Initial guess using linear interpolation
  let intervalStart = 0.0;
  const sampleStepSize = 1.0 / 10.0;
  let currentSample = 1;
  const lastSample = 10;

  // Find the interval containing x
  for (; currentSample !== lastSample && calcBezier(currentSample * sampleStepSize, x1, x2) <= x; ++currentSample) {
    intervalStart += sampleStepSize;
  }
  --currentSample;

  // Interpolate to provide an initial guess for t
  const dist = (x - calcBezier(currentSample * sampleStepSize, x1, x2)) /
    (calcBezier((currentSample + 1) * sampleStepSize, x1, x2) - calcBezier(currentSample * sampleStepSize, x1, x2));
  const guessForT = intervalStart + dist * sampleStepSize;

  const initialSlope = getSlope(guessForT, x1, x2);
  if (initialSlope >= NEWTON_MIN_SLOPE) {
    return newtonRaphsonIterate(x, guessForT, x1, x2);
  } else if (initialSlope === 0.0) {
    return guessForT;
  } else {
    return binarySubdivide(x, intervalStart, intervalStart + sampleStepSize, x1, x2);
  }
}

/**
 * Evaluate a cubic bezier easing function at progress t (0-1).
 *
 * @param t - Progress value (0-1)
 * @param x1 - First control point X
 * @param y1 - First control point Y
 * @param x2 - Second control point X
 * @param y2 - Second control point Y
 * @returns Eased value (0-1, may overshoot for elastic-like curves)
 *
 * @example
 * ```ts
 * // CSS ease-in-out equivalent
 * evaluateCubicBezier(0.5, 0.42, 0, 0.58, 1)
 * ```
 */
export function evaluateCubicBezier(
  t: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  // Linear case
  if (x1 === y1 && x2 === y2) return t;

  // Boundary cases
  if (t === 0) return 0;
  if (t === 1) return 1;

  // Find the parametric t for the given x (progress)
  const parametricT = getTForX(t, x1, x2);

  // Evaluate Y at that parametric t
  return calcBezier(parametricT, y1, y2);
}

/**
 * Common CSS easing curves as bezier handles.
 */
export const BEZIER_PRESETS: Record<string, [number, number, number, number]> = {
  'ease': [0.25, 0.1, 0.25, 1.0],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  'ease-in-back': [0.6, -0.28, 0.735, 0.045],
  'ease-out-back': [0.175, 0.885, 0.32, 1.275],
  'ease-in-out-back': [0.68, -0.55, 0.265, 1.55],
};
