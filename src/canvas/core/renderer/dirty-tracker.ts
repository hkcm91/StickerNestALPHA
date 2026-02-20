/**
 * Dirty Region Tracker — tracks which areas need re-rendering
 *
 * @module canvas/core/renderer
 * @layer L4A-1
 */

import type { BoundingBox2D } from '@sn/types';

export interface DirtyTracker {
  markDirty(region: BoundingBox2D): void;
  getDirtyRegions(): BoundingBox2D[];
  clear(): void;
  readonly isDirty: boolean;
}

export function createDirtyTracker(): DirtyTracker {
  let regions: BoundingBox2D[] = [];

  return {
    markDirty(region: BoundingBox2D) {
      regions.push(region);
    },

    getDirtyRegions() {
      return [...regions];
    },

    clear() {
      regions = [];
    },

    get isDirty() {
      return regions.length > 0;
    },
  };
}
