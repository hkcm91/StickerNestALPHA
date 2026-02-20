/**
 * Grid-based spatial index for O(1) hit-test lookups
 *
 * @module canvas/core/scene
 * @layer L4A-1
 */

import type { Point2D, BoundingBox2D } from '@sn/types';

export interface SpatialIndex {
  insert(id: string, bounds: BoundingBox2D): void;
  remove(id: string): void;
  update(id: string, bounds: BoundingBox2D): void;
  queryRegion(bounds: BoundingBox2D): string[];
  queryPoint(point: Point2D): string[];
  clear(): void;
}

const DEFAULT_CELL_SIZE = 256;

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export function createSpatialIndex(cellSize: number = DEFAULT_CELL_SIZE): SpatialIndex {
  // Maps cell key → set of entity IDs
  const grid = new Map<string, Set<string>>();
  // Maps entity ID → set of cell keys it occupies
  const entityCells = new Map<string, Set<string>>();

  function getCells(bounds: BoundingBox2D): string[] {
    const minCX = Math.floor(bounds.min.x / cellSize);
    const minCY = Math.floor(bounds.min.y / cellSize);
    const maxCX = Math.floor(bounds.max.x / cellSize);
    const maxCY = Math.floor(bounds.max.y / cellSize);

    const cells: string[] = [];
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        cells.push(cellKey(cx, cy));
      }
    }
    return cells;
  }

  return {
    insert(id: string, bounds: BoundingBox2D) {
      const cells = getCells(bounds);
      const entityCellSet = new Set<string>();
      for (const key of cells) {
        let bucket = grid.get(key);
        if (!bucket) {
          bucket = new Set();
          grid.set(key, bucket);
        }
        bucket.add(id);
        entityCellSet.add(key);
      }
      entityCells.set(id, entityCellSet);
    },

    remove(id: string) {
      const cells = entityCells.get(id);
      if (!cells) return;
      for (const key of cells) {
        const bucket = grid.get(key);
        if (bucket) {
          bucket.delete(id);
          if (bucket.size === 0) grid.delete(key);
        }
      }
      entityCells.delete(id);
    },

    update(id: string, bounds: BoundingBox2D) {
      this.remove(id);
      this.insert(id, bounds);
    },

    queryRegion(bounds: BoundingBox2D): string[] {
      const cells = getCells(bounds);
      const result = new Set<string>();
      for (const key of cells) {
        const bucket = grid.get(key);
        if (bucket) {
          for (const id of bucket) result.add(id);
        }
      }
      return Array.from(result);
    },

    queryPoint(point: Point2D): string[] {
      const key = cellKey(
        Math.floor(point.x / cellSize),
        Math.floor(point.y / cellSize),
      );
      const bucket = grid.get(key);
      return bucket ? Array.from(bucket) : [];
    },

    clear() {
      grid.clear();
      entityCells.clear();
    },
  };
}
