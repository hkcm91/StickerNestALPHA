/**
 * Viewport Momentum — inertial pan scrolling after gesture release
 *
 * When a pan gesture ends with velocity, this module applies a decaying
 * momentum animation that smoothly decelerates the viewport.
 *
 * @module canvas/core/viewport
 * @layer L4A-1
 */

import type { Point2D } from '@sn/types';

import { bus } from '../../../kernel/bus';

import type { ViewportState } from './viewport';
import { panBy } from './viewport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MomentumOptions {
  /** Friction coefficient per frame — 0.95 = 5% speed loss/frame (default: 0.95) */
  friction?: number;
  /** Minimum speed before stopping — px/frame (default: 0.5) */
  threshold?: number;
}

export interface MomentumController {
  /**
   * Start momentum scrolling with the given velocity (px/sec).
   * If already running, the previous momentum is replaced.
   */
  start(velocity: Point2D): void;
  /** Cancel any running momentum immediately */
  cancel(): void;
  /** Whether momentum is currently active */
  isActive(): boolean;
}

export interface MomentumDeps {
  getViewport: () => ViewportState;
  setViewport: (vp: ViewportState) => void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createMomentumController(
  deps: MomentumDeps,
  options?: MomentumOptions,
  rafFn?: typeof requestAnimationFrame,
  cancelRafFn?: typeof cancelAnimationFrame,
): MomentumController {
  const friction = options?.friction ?? 0.95;
  const threshold = options?.threshold ?? 0.5;
  const raf = rafFn ?? requestAnimationFrame;
  const cancelRaf = cancelRafFn ?? cancelAnimationFrame;

  let active = false;
  let rafId = 0;
  let vx = 0;
  let vy = 0;
  let lastTime = 0;

  function tick(timestamp: number) {
    if (!active) return;

    // Convert velocity from px/sec to px/frame using dt
    const dt = lastTime > 0 ? (timestamp - lastTime) / 1000 : 1 / 60;
    lastTime = timestamp;

    // Apply friction
    vx *= friction;
    vy *= friction;

    // Check threshold
    if (Math.abs(vx) < threshold && Math.abs(vy) < threshold) {
      stop();
      return;
    }

    // Apply velocity to viewport (convert px/sec * dt to canvas-space offset delta)
    const vp = deps.getViewport();
    const dx = (vx * dt) / vp.zoom;
    const dy = (vy * dt) / vp.zoom;

    const next = panBy(vp, { x: dx, y: dy });
    deps.setViewport(next);
    bus.emit('canvas.viewport.changed', { offset: next.offset, zoom: next.zoom });

    rafId = raf(tick);
  }

  function stop() {
    if (rafId) cancelRaf(rafId);
    active = false;
    rafId = 0;
    vx = 0;
    vy = 0;
    lastTime = 0;
  }

  return {
    start(velocity: Point2D) {
      stop(); // Cancel any existing momentum

      if (Math.abs(velocity.x) < threshold && Math.abs(velocity.y) < threshold) {
        return; // No meaningful velocity — skip
      }

      vx = velocity.x;
      vy = velocity.y;
      active = true;
      lastTime = 0;
      rafId = raf(tick);
    },

    cancel() {
      stop();
    },

    isActive() {
      return active;
    },
  };
}
