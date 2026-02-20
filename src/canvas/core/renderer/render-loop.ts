/**
 * Render Loop — RAF-based rendering with dirty region support
 *
 * @module canvas/core/renderer
 * @layer L4A-1
 */

import type { BoundingBox2D } from '@sn/types';

import type { DirtyTracker } from './dirty-tracker';

export type FrameCallback = (dirtyRegions: BoundingBox2D[]) => void;

export interface RenderLoop {
  start(): void;
  stop(): void;
  requestFrame(): void;
  onFrame(callback: FrameCallback): () => void;
  readonly isRunning: boolean;
}

export function createRenderLoop(dirtyTracker: DirtyTracker): RenderLoop {
  let running = false;
  let rafId: number | null = null;
  const callbacks = new Set<FrameCallback>();

  function tick(): void {
    if (!running) return;

    if (dirtyTracker.isDirty) {
      const regions = dirtyTracker.getDirtyRegions();
      dirtyTracker.clear();
      for (const cb of callbacks) {
        cb(regions);
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  return {
    start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    },

    stop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },

    requestFrame() {
      if (!dirtyTracker.isDirty) {
        dirtyTracker.markDirty({
          min: { x: -Infinity, y: -Infinity },
          max: { x: Infinity, y: Infinity },
        });
      }
    },

    onFrame(callback: FrameCallback) {
      callbacks.add(callback);
      return () => { callbacks.delete(callback); };
    },

    get isRunning() {
      return running;
    },
  };
}
