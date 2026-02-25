/**
 * Grid Cell Store Tests
 *
 * @module canvas/core/grid
 * @layer L4A-1
 */

import { describe, it, expect, beforeEach } from 'vitest';

import type { GridCell, GridConfig } from '@sn/types';

import {
  createGridCellStore,
  cellKey,
  parseKey,
  positionToCell,
  cellToPosition,
  getCellBounds,
  cellCenter,
  getVisibleCellBounds,
  getTriangularCellCorners,
  getHexagonalCellCorners,
  type GridCellStore,
} from './grid-cell-store';

describe('cellKey/parseKey', () => {
  it('creates correct key format', () => {
    expect(cellKey(0, 0)).toBe('0,0');
    expect(cellKey(5, 10)).toBe('5,10');
    expect(cellKey(-3, 7)).toBe('-3,7');
  });

  it('parses key back to col/row', () => {
    expect(parseKey('0,0')).toEqual({ col: 0, row: 0 });
    expect(parseKey('5,10')).toEqual({ col: 5, row: 10 });
    expect(parseKey('-3,7')).toEqual({ col: -3, row: 7 });
  });

  it('round-trips correctly', () => {
    const testCases = [
      { col: 0, row: 0 },
      { col: 100, row: -50 },
      { col: -10, row: -20 },
    ];
    for (const { col, row } of testCases) {
      expect(parseKey(cellKey(col, row))).toEqual({ col, row });
    }
  });
});

describe('GridCellStore', () => {
  let store: GridCellStore;

  const makeCell = (col: number, row: number, color = '#ff0000'): GridCell => ({
    col,
    row,
    fillType: 'solid',
    color,
  });

  beforeEach(() => {
    store = createGridCellStore();
  });

  describe('basic operations', () => {
    it('starts empty', () => {
      expect(store.size).toBe(0);
      expect(store.get(0, 0)).toBeUndefined();
    });

    it('sets and gets a cell', () => {
      const cell = makeCell(5, 10);
      store.set(cell);
      expect(store.get(5, 10)).toEqual(cell);
      expect(store.size).toBe(1);
    });

    it('overwrites existing cell', () => {
      store.set(makeCell(5, 10, '#ff0000'));
      store.set(makeCell(5, 10, '#00ff00'));
      expect(store.get(5, 10)?.color).toBe('#00ff00');
      expect(store.size).toBe(1);
    });

    it('has() returns correct state', () => {
      expect(store.has(5, 10)).toBe(false);
      store.set(makeCell(5, 10));
      expect(store.has(5, 10)).toBe(true);
    });

    it('deletes a cell', () => {
      store.set(makeCell(5, 10));
      expect(store.delete(5, 10)).toBe(true);
      expect(store.get(5, 10)).toBeUndefined();
      expect(store.size).toBe(0);
    });

    it('delete returns false for non-existent cell', () => {
      expect(store.delete(5, 10)).toBe(false);
    });

    it('clears all cells', () => {
      store.set(makeCell(0, 0));
      store.set(makeCell(1, 1));
      store.set(makeCell(2, 2));
      expect(store.size).toBe(3);
      store.clear();
      expect(store.size).toBe(0);
    });
  });

  describe('iteration', () => {
    it('getAll returns all cells', () => {
      const cells = [makeCell(0, 0), makeCell(1, 1), makeCell(2, 2)];
      cells.forEach((c) => store.set(c));
      const all = store.getAll();
      expect(all).toHaveLength(3);
      expect(all).toEqual(expect.arrayContaining(cells));
    });

    it('forEach iterates all cells', () => {
      const cells = [makeCell(0, 0), makeCell(1, 1), makeCell(2, 2)];
      cells.forEach((c) => store.set(c));
      const visited: GridCell[] = [];
      store.forEach((cell) => visited.push(cell));
      expect(visited).toHaveLength(3);
    });
  });

  describe('getCellsInBounds', () => {
    beforeEach(() => {
      // Create a 5x5 grid of cells
      for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 5; row++) {
          store.set(makeCell(col, row));
        }
      }
    });

    it('returns cells within bounds', () => {
      const cells = store.getCellsInBounds({
        minCol: 1,
        maxCol: 3,
        minRow: 1,
        maxRow: 3,
      });
      expect(cells).toHaveLength(9); // 3x3 grid
    });

    it('returns empty for out-of-range bounds', () => {
      const cells = store.getCellsInBounds({
        minCol: 10,
        maxCol: 15,
        minRow: 10,
        maxRow: 15,
      });
      expect(cells).toHaveLength(0);
    });

    it('handles partial overlap', () => {
      const cells = store.getCellsInBounds({
        minCol: -2,
        maxCol: 1,
        minRow: -2,
        maxRow: 1,
      });
      // Only cells at (0,0), (0,1), (1,0), (1,1) are in bounds
      expect(cells).toHaveLength(4);
    });

    it('handles negative coordinates', () => {
      store.set(makeCell(-1, -1));
      store.set(makeCell(-2, -2));
      const cells = store.getCellsInBounds({
        minCol: -5,
        maxCol: 0,
        minRow: -5,
        maxRow: 0,
      });
      // Should include the two negative cells plus (0,0)
      expect(cells).toHaveLength(3);
    });
  });
});

describe('coordinate utilities', () => {
  const defaultConfig: GridConfig = {
    enabled: true,
    cellSize: 64,
    showGridLines: true,
    gridLineColor: 'rgba(255, 255, 255, 0.1)',
    gridLineWidth: 1,
    snapMode: 'none',
    origin: { x: 0, y: 0 },
    defaultBackground: '#0d1117',
    minCellScreenSize: 4,
    projection: 'orthogonal',
    isometricRatio: 2,
  };

  describe('positionToCell', () => {
    it('converts position to cell at origin', () => {
      expect(positionToCell(0, 0, defaultConfig)).toEqual({ col: 0, row: 0 });
      expect(positionToCell(63, 63, defaultConfig)).toEqual({ col: 0, row: 0 });
      expect(positionToCell(64, 64, defaultConfig)).toEqual({ col: 1, row: 1 });
    });

    it('handles negative positions', () => {
      expect(positionToCell(-1, -1, defaultConfig)).toEqual({ col: -1, row: -1 });
      expect(positionToCell(-64, -64, defaultConfig)).toEqual({ col: -1, row: -1 });
      expect(positionToCell(-65, -65, defaultConfig)).toEqual({ col: -2, row: -2 });
    });

    it('respects grid origin', () => {
      const config = { ...defaultConfig, origin: { x: 32, y: 32 } };
      expect(positionToCell(32, 32, config)).toEqual({ col: 0, row: 0 });
      expect(positionToCell(96, 96, config)).toEqual({ col: 1, row: 1 });
    });

    it('respects different cell sizes', () => {
      const config = { ...defaultConfig, cellSize: 32 };
      expect(positionToCell(0, 0, config)).toEqual({ col: 0, row: 0 });
      expect(positionToCell(32, 32, config)).toEqual({ col: 1, row: 1 });
      expect(positionToCell(64, 64, config)).toEqual({ col: 2, row: 2 });
    });
  });

  describe('cellToPosition', () => {
    it('converts cell to top-left position', () => {
      expect(cellToPosition(0, 0, defaultConfig)).toEqual({ x: 0, y: 0 });
      expect(cellToPosition(1, 1, defaultConfig)).toEqual({ x: 64, y: 64 });
      expect(cellToPosition(2, 3, defaultConfig)).toEqual({ x: 128, y: 192 });
    });

    it('handles negative cells', () => {
      expect(cellToPosition(-1, -1, defaultConfig)).toEqual({ x: -64, y: -64 });
      expect(cellToPosition(-2, -3, defaultConfig)).toEqual({ x: -128, y: -192 });
    });

    it('respects grid origin', () => {
      const config = { ...defaultConfig, origin: { x: 100, y: 50 } };
      expect(cellToPosition(0, 0, config)).toEqual({ x: 100, y: 50 });
      expect(cellToPosition(1, 1, config)).toEqual({ x: 164, y: 114 });
    });
  });

  describe('getCellBounds', () => {
    it('returns correct bounding box', () => {
      expect(getCellBounds(0, 0, defaultConfig)).toEqual({
        x: 0,
        y: 0,
        width: 64,
        height: 64,
      });
      expect(getCellBounds(1, 2, defaultConfig)).toEqual({
        x: 64,
        y: 128,
        width: 64,
        height: 64,
      });
    });
  });

  describe('cellCenter', () => {
    it('returns center of cell', () => {
      expect(cellCenter(0, 0, defaultConfig)).toEqual({ x: 32, y: 32 });
      expect(cellCenter(1, 1, defaultConfig)).toEqual({ x: 96, y: 96 });
    });
  });

  describe('getVisibleCellBounds', () => {
    it('calculates visible cells from viewport', () => {
      const visibleBounds = {
        min: { x: 0, y: 0 },
        max: { x: 640, y: 480 },
      };
      const bounds = getVisibleCellBounds(visibleBounds, defaultConfig);
      // With 64px cells and 1 cell buffer:
      // min: 0/64 = 0 - 1 = -1
      // max x: 640/64 = 10 + 1 = 11
      // max y: 480/64 = 7.5 -> 7 + 1 = 8
      expect(bounds.minCol).toBe(-1);
      expect(bounds.minRow).toBe(-1);
      expect(bounds.maxCol).toBe(11);
      expect(bounds.maxRow).toBe(8);
    });

    it('handles negative viewport positions', () => {
      const visibleBounds = {
        min: { x: -200, y: -200 },
        max: { x: 200, y: 200 },
      };
      const bounds = getVisibleCellBounds(visibleBounds, defaultConfig);
      expect(bounds.minCol).toBeLessThan(0);
      expect(bounds.minRow).toBeLessThan(0);
      expect(bounds.maxCol).toBeGreaterThan(0);
      expect(bounds.maxRow).toBeGreaterThan(0);
    });

    it('respects buffer parameter', () => {
      const visibleBounds = {
        min: { x: 0, y: 0 },
        max: { x: 64, y: 64 },
      };
      const bounds0 = getVisibleCellBounds(visibleBounds, defaultConfig, 0);
      const bounds2 = getVisibleCellBounds(visibleBounds, defaultConfig, 2);
      expect(bounds2.minCol).toBe(bounds0.minCol - 2);
      expect(bounds2.maxCol).toBe(bounds0.maxCol + 2);
    });
  });

  describe('round-trip accuracy', () => {
    it('position -> cell -> position returns cell origin', () => {
      const testPositions = [
        { x: 100, y: 150 },
        { x: -50, y: -75 },
        { x: 0, y: 0 },
      ];
      for (const pos of testPositions) {
        const cell = positionToCell(pos.x, pos.y, defaultConfig);
        const cellPos = cellToPosition(cell.col, cell.row, defaultConfig);
        // Position should be the top-left of the containing cell
        expect(cellPos.x).toBeLessThanOrEqual(pos.x);
        expect(cellPos.y).toBeLessThanOrEqual(pos.y);
        expect(cellPos.x + defaultConfig.cellSize).toBeGreaterThan(pos.x);
        expect(cellPos.y + defaultConfig.cellSize).toBeGreaterThan(pos.y);
      }
    });
  });

  // ===========================================================================
  // Triangular projection tests
  // ===========================================================================

  describe('triangular projection', () => {
    const triConfig: GridConfig = {
      ...defaultConfig,
      projection: 'triangular',
    };

    describe('positionToCell round-trip', () => {
      it('round-trips for UP triangles (even col)', () => {
        const testCells = [
          { col: 0, row: 0 },
          { col: 2, row: 1 },
          { col: 4, row: 3 },
          { col: -2, row: 0 },
        ];
        for (const { col, row } of testCells) {
          const center = cellToPosition(col, row, triConfig);
          const result = positionToCell(center.x, center.y, triConfig);
          expect(result).toEqual({ col, row });
        }
      });

      it('round-trips for DOWN triangles (odd col)', () => {
        const testCells = [
          { col: 1, row: 0 },
          { col: 3, row: 1 },
          { col: 5, row: 2 },
          { col: -1, row: 0 },
        ];
        for (const { col, row } of testCells) {
          const center = cellToPosition(col, row, triConfig);
          const result = positionToCell(center.x, center.y, triConfig);
          expect(result).toEqual({ col, row });
        }
      });
    });

    describe('getTriangularCellCorners', () => {
      it('returns 3 corners for UP triangle', () => {
        const corners = getTriangularCellCorners(0, 0, triConfig);
        expect(corners).toHaveLength(3);
      });

      it('returns 3 corners for DOWN triangle', () => {
        const corners = getTriangularCellCorners(1, 0, triConfig);
        expect(corners).toHaveLength(3);
      });

      it('UP triangle apex is above base', () => {
        const corners = getTriangularCellCorners(0, 0, triConfig);
        const [bl, br, top] = corners;
        // Apex (top) y should be less than base y
        expect(top.y).toBeLessThan(bl.y);
        expect(top.y).toBeLessThan(br.y);
        // Base vertices should have same y
        expect(bl.y).toBeCloseTo(br.y, 5);
      });

      it('DOWN triangle apex is below base', () => {
        const corners = getTriangularCellCorners(1, 0, triConfig);
        const [tl, tr, bottom] = corners;
        // Apex (bottom) y should be greater than top edge y
        expect(bottom.y).toBeGreaterThan(tl.y);
        expect(bottom.y).toBeGreaterThan(tr.y);
        // Top vertices should have same y
        expect(tl.y).toBeCloseTo(tr.y, 5);
      });

      it('triangle side length approximately equals cellSize', () => {
        const corners = getTriangularCellCorners(0, 0, triConfig);
        const [bl, br] = corners;
        const baseLength = Math.abs(br.x - bl.x);
        expect(baseLength).toBeCloseTo(triConfig.cellSize, 5);
      });
    });

    describe('getCellBounds for triangular', () => {
      it('returns bounding box enclosing the triangle', () => {
        const bounds = getCellBounds(0, 0, triConfig);
        const corners = getTriangularCellCorners(0, 0, triConfig);
        for (const c of corners) {
          expect(c.x).toBeGreaterThanOrEqual(bounds.x - 0.001);
          expect(c.y).toBeGreaterThanOrEqual(bounds.y - 0.001);
          expect(c.x).toBeLessThanOrEqual(bounds.x + bounds.width + 0.001);
          expect(c.y).toBeLessThanOrEqual(bounds.y + bounds.height + 0.001);
        }
      });
    });

    describe('cellCenter for triangular', () => {
      it('returns center inside the triangle bounds', () => {
        const center = cellCenter(0, 0, triConfig);
        const bounds = getCellBounds(0, 0, triConfig);
        expect(center.x).toBeGreaterThanOrEqual(bounds.x);
        expect(center.x).toBeLessThanOrEqual(bounds.x + bounds.width);
        expect(center.y).toBeGreaterThanOrEqual(bounds.y);
        expect(center.y).toBeLessThanOrEqual(bounds.y + bounds.height);
      });
    });

    describe('getVisibleCellBounds for triangular', () => {
      it('uses larger buffer than orthogonal', () => {
        const visibleBounds = {
          min: { x: 0, y: 0 },
          max: { x: 640, y: 480 },
        };
        const orthBounds = getVisibleCellBounds(visibleBounds, defaultConfig, 1);
        const triBounds = getVisibleCellBounds(visibleBounds, triConfig, 1);
        // Triangular should have wider bounds (buffer + 2 extra)
        const orthRange = orthBounds.maxCol - orthBounds.minCol;
        const triRange = triBounds.maxCol - triBounds.minCol;
        expect(triRange).toBeGreaterThanOrEqual(orthRange);
      });
    });
  });

  // ===========================================================================
  // Hexagonal projection tests
  // ===========================================================================

  describe('hexagonal projection', () => {
    const hexConfig: GridConfig = {
      ...defaultConfig,
      projection: 'hexagonal',
    };

    describe('positionToCell round-trip', () => {
      it('round-trips for various hex cells', () => {
        const testCells = [
          { col: 0, row: 0 },
          { col: 1, row: 0 },
          { col: 0, row: 1 },
          { col: 2, row: 3 },
          { col: -1, row: -1 },
          { col: -2, row: 1 },
        ];
        for (const { col, row } of testCells) {
          const center = cellToPosition(col, row, hexConfig);
          const result = positionToCell(center.x, center.y, hexConfig);
          expect(result).toEqual({ col, row });
        }
      });

      it('cube-rounding handles boundary positions', () => {
        // Test positions near hex edges — should still resolve to correct hex
        const center = cellToPosition(0, 0, hexConfig);
        // Small perturbation near center should still resolve to (0,0)
        const result = positionToCell(center.x + 1, center.y + 1, hexConfig);
        expect(result).toEqual({ col: 0, row: 0 });
      });
    });

    describe('getHexagonalCellCorners', () => {
      it('returns 6 corners', () => {
        const corners = getHexagonalCellCorners(0, 0, hexConfig);
        expect(corners).toHaveLength(6);
      });

      it('corners are equidistant from center', () => {
        const corners = getHexagonalCellCorners(0, 0, hexConfig);
        const center = cellToPosition(0, 0, hexConfig);
        const distances = corners.map(c =>
          Math.sqrt((c.x - center.x) ** 2 + (c.y - center.y) ** 2)
        );
        // All distances should equal cellSize
        for (const d of distances) {
          expect(d).toBeCloseTo(hexConfig.cellSize, 3);
        }
      });

      it('forms a regular hexagon (equal edge lengths)', () => {
        const corners = getHexagonalCellCorners(0, 0, hexConfig);
        const edgeLengths: number[] = [];
        for (let i = 0; i < 6; i++) {
          const a = corners[i];
          const b = corners[(i + 1) % 6];
          edgeLengths.push(Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2));
        }
        // All edges should be equal
        for (const len of edgeLengths) {
          expect(len).toBeCloseTo(edgeLengths[0], 3);
        }
      });
    });

    describe('getCellBounds for hexagonal', () => {
      it('returns bounding box enclosing all 6 corners', () => {
        const bounds = getCellBounds(0, 0, hexConfig);
        const corners = getHexagonalCellCorners(0, 0, hexConfig);
        for (const c of corners) {
          expect(c.x).toBeGreaterThanOrEqual(bounds.x - 0.001);
          expect(c.y).toBeGreaterThanOrEqual(bounds.y - 0.001);
          expect(c.x).toBeLessThanOrEqual(bounds.x + bounds.width + 0.001);
          expect(c.y).toBeLessThanOrEqual(bounds.y + bounds.height + 0.001);
        }
      });
    });

    describe('cellCenter for hexagonal', () => {
      it('returns center inside the hex bounds', () => {
        const center = cellCenter(1, 1, hexConfig);
        const bounds = getCellBounds(1, 1, hexConfig);
        expect(center.x).toBeGreaterThanOrEqual(bounds.x);
        expect(center.x).toBeLessThanOrEqual(bounds.x + bounds.width);
        expect(center.y).toBeGreaterThanOrEqual(bounds.y);
        expect(center.y).toBeLessThanOrEqual(bounds.y + bounds.height);
      });
    });

    describe('getVisibleCellBounds for hexagonal', () => {
      it('uses larger buffer than orthogonal', () => {
        const visibleBounds = {
          min: { x: 0, y: 0 },
          max: { x: 640, y: 480 },
        };
        const orthBounds = getVisibleCellBounds(visibleBounds, defaultConfig, 1);
        const hexBounds = getVisibleCellBounds(visibleBounds, hexConfig, 1);
        const orthRange = orthBounds.maxCol - orthBounds.minCol;
        const hexRange = hexBounds.maxCol - hexBounds.minCol;
        expect(hexRange).toBeGreaterThanOrEqual(orthRange);
      });
    });
  });
});
