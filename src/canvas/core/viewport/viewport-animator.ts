/**
 * Viewport Animator — smooth animated viewport transitions
 *
 * Wraps the pure viewport functions (panBy, zoomTo) with
 * requestAnimationFrame-based interpolation for fluid navigation.
 *
 * @module canvas/core/viewport
 * @layer L4A-1
 */

import type { Point2D } from '@sn/types';

import { bus } from '../../../kernel/bus';

import type { ViewportState } from './viewport';

// ---------------------------------------------------------------------------
// Easing functions
// ---------------------------------------------------------------------------

export type EasingFn = (t: number) => number;

/** Decelerating curve — fast start, gentle stop (default) */
export const easeOutCubic: EasingFn = (t) => 1 - (1 - t) ** 3;

/** Smooth acceleration + deceleration */
export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/** Constant speed */
export const linear: EasingFn = (t) => t;

export const EASING = { easeOutCubic, easeInOutCubic, linear } as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnimationTarget {
  offset?: Point2D;
  zoom?: number;
}

export interface AnimationOptions {
  /** Duration in milliseconds (default: 250) */
  duration?: number;
  /** Easing function (default: easeOutCubic) */
  easing?: EasingFn;
}

type AnimationState = {
  startTime: number;
  duration: number;
  easing: EasingFn;
  from: { offset: Point2D; zoom: number };
  to: { offset: Point2D; zoom: number };
  rafId: number;
  resolve: () => void;
};

/** Callback that receives the interpolated ViewportState each frame */
export type ViewportUpdateFn = (vp: ViewportState) => void;

// ---------------------------------------------------------------------------
// ViewportAnimator
// ---------------------------------------------------------------------------

export class ViewportAnimator {
  private state: AnimationState | null = null;
  private getViewport: () => ViewportState;
  private onUpdate: ViewportUpdateFn;
  private raf: typeof requestAnimationFrame;
  private cancelRaf: typeof cancelAnimationFrame;

  /**
   * @param getViewport  Returns current viewport state (read-only)
   * @param onUpdate     Called each frame with the interpolated viewport state
   * @param rafFn        Optional override for requestAnimationFrame (testing)
   * @param cancelRafFn  Optional override for cancelAnimationFrame (testing)
   */
  constructor(
    getViewport: () => ViewportState,
    onUpdate: ViewportUpdateFn,
    rafFn?: typeof requestAnimationFrame,
    cancelRafFn?: typeof cancelAnimationFrame,
  ) {
    this.getViewport = getViewport;
    this.onUpdate = onUpdate;
    this.raf = rafFn ?? requestAnimationFrame;
    this.cancelRaf = cancelRafFn ?? cancelAnimationFrame;
  }

  /**
   * Animate the viewport to the target offset and/or zoom.
   *
   * Returns a promise that resolves when the animation completes.
   * If another animation is already running, it is cancelled first.
   */
  animateTo(target: AnimationTarget, options?: AnimationOptions): Promise<void> {
    this.cancel();

    const vp = this.getViewport();
    const duration = options?.duration ?? 250;
    const easing = options?.easing ?? easeOutCubic;

    const from = { offset: { ...vp.offset }, zoom: vp.zoom };
    const to = {
      offset: target.offset ? { ...target.offset } : { ...vp.offset },
      zoom: target.zoom ?? vp.zoom,
    };

    // If duration is 0, apply immediately
    if (duration <= 0) {
      this.applyFrame(vp, from, to, 1);
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.state = {
        startTime: -1, // set on first frame
        duration,
        easing,
        from,
        to,
        rafId: 0,
        resolve,
      };
      this.state.rafId = this.raf(this.tick);
    });
  }

  /** Cancel any running animation immediately */
  cancel(): void {
    if (!this.state) return;
    this.cancelRaf(this.state.rafId);
    const { resolve } = this.state;
    this.state = null;
    resolve();
  }

  /** Whether an animation is currently running */
  isAnimating(): boolean {
    return this.state !== null;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private tick = (timestamp: number): void => {
    const s = this.state;
    if (!s) return;

    if (s.startTime < 0) {
      s.startTime = timestamp;
    }

    const elapsed = timestamp - s.startTime;
    const rawProgress = Math.min(elapsed / s.duration, 1);
    const progress = s.easing(rawProgress);

    const vp = this.getViewport();
    this.applyFrame(vp, s.from, s.to, progress);

    if (rawProgress >= 1) {
      const { resolve } = s;
      this.state = null;
      resolve();
      return;
    }

    s.rafId = this.raf(this.tick);
  };

  private applyFrame(
    vp: ViewportState,
    from: { offset: Point2D; zoom: number },
    to: { offset: Point2D; zoom: number },
    progress: number,
  ): void {
    const offset: Point2D = {
      x: lerp(from.offset.x, to.offset.x, progress),
      y: lerp(from.offset.y, to.offset.y, progress),
    };
    const zoom = lerp(from.zoom, to.zoom, progress);

    const next: ViewportState = {
      ...vp,
      offset,
      zoom: Math.min(vp.maxZoom, Math.max(vp.minZoom, zoom)),
    };

    this.onUpdate(next);
    bus.emit('canvas.viewport.changed', { offset: next.offset, zoom: next.zoom });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Create a ViewportAnimator instance.
 *
 * @param getViewport  Returns current viewport state
 * @param onUpdate     Called each frame with interpolated state
 */
export function createViewportAnimator(
  getViewport: () => ViewportState,
  onUpdate: ViewportUpdateFn,
): ViewportAnimator {
  return new ViewportAnimator(getViewport, onUpdate);
}
