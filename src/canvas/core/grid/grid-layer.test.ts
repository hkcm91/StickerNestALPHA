/**
 * Grid Layer Tests
 *
 * @module canvas/core/grid
 * @layer L4A-1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { GridEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { createViewport } from '../viewport';

import { createGridLayer, DEFAULT_GRID_CONFIG, type GridLayer } from './grid-layer';

// Mock the bus
vi.mock('../../../kernel/bus', () => ({
  bus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
  };

  return {
    width,
    height,
    getContext: vi.fn().mockReturnValue(ctx),
  } as unknown as HTMLCanvasElement;
}

describe('GridLayer', () => {
  let gridLayer: GridLayer;
  const canvasId = 'test-canvas-123';

  beforeEach(() => {
    vi.clearAllMocks();
    gridLayer = createGridLayer(undefined, canvasId);
  });

  describe('initialization', () => {
    it('creates with default config', () => {
      const config = gridLayer.getConfig();
      expect(config).toEqual(DEFAULT_GRID_CONFIG);
    });

    it('initializes with canvas', () => {
      const canvas = createMockCanvas();
      expect(() => gridLayer.init(canvas)).not.toThrow();
    });

    it('starts with zero cells', () => {
      expect(gridLayer.cellCount).toBe(0);
    });

    it('starts enabled', () => {
      expect(gridLayer.isEnabled).toBe(true);
    });
  });

  describe('configuration', () => {
    it('updates config partially', () => {
      gridLayer.setConfig({ cellSize: 32 });
      const config = gridLayer.getConfig();
      expect(config.cellSize).toBe(32);
      expect(config.enabled).toBe(false); // Other values preserved
    });

    it('emits config changed event', () => {
      gridLayer.setConfig({ cellSize: 32 });
      expect(bus.emit).toHaveBeenCalledWith(
        GridEvents.CONFIG_CHANGED,
        expect.objectContaining({
          canvasId,
          config: { cellSize: 32 },
        })
      );
    });
  });

  describe('cell painting', () => {
    it('paints a cell', () => {
      const cell = gridLayer.paintCell(5, 10, '#ff0000');
      expect(cell).toEqual({
        col: 5,
        row: 10,
        fillType: 'solid',
        color: '#ff0000',
      });
      expect(gridLayer.cellCount).toBe(1);
    });

    it('paints at canvas position', () => {
      const cell = gridLayer.paintAtPosition(100, 150, '#ff0000');
      // With 64px cells: 100/64 = 1, 150/64 = 2
      expect(cell.col).toBe(1);
      expect(cell.row).toBe(2);
    });

    it('emits cell painted event', () => {
      gridLayer.paintCell(5, 10, '#ff0000');
      expect(bus.emit).toHaveBeenCalledWith(
        GridEvents.CELL_PAINTED,
        expect.objectContaining({
          canvasId,
          cell: expect.objectContaining({ col: 5, row: 10 }),
        })
      );
    });

    it('paints multiple cells at once', () => {
      const cells = gridLayer.paintCells([
        { col: 0, row: 0, color: '#ff0000' },
        { col: 1, row: 0, color: '#00ff00' },
        { col: 2, row: 0, color: '#0000ff' },
      ]);
      expect(cells).toHaveLength(3);
      expect(gridLayer.cellCount).toBe(3);
    });

    it('emits batch painted event for multiple cells', () => {
      gridLayer.paintCells([
        { col: 0, row: 0, color: '#ff0000' },
        { col: 1, row: 0, color: '#00ff00' },
      ]);
      expect(bus.emit).toHaveBeenCalledWith(
        GridEvents.CELLS_BATCH_PAINTED,
        expect.objectContaining({
          canvasId,
          cells: expect.arrayContaining([
            expect.objectContaining({ col: 0, row: 0 }),
            expect.objectContaining({ col: 1, row: 0 }),
          ]),
        })
      );
    });

    it('overwrites existing cell', () => {
      gridLayer.paintCell(5, 10, '#ff0000');
      gridLayer.paintCell(5, 10, '#00ff00');
      expect(gridLayer.cellCount).toBe(1);
      expect(gridLayer.getCell(5, 10)?.color).toBe('#00ff00');
    });
  });

  describe('cell clearing', () => {
    beforeEach(() => {
      gridLayer.paintCell(5, 10, '#ff0000');
    });

    it('clears a cell', () => {
      expect(gridLayer.clearCell(5, 10)).toBe(true);
      expect(gridLayer.cellCount).toBe(0);
    });

    it('returns false for non-existent cell', () => {
      expect(gridLayer.clearCell(99, 99)).toBe(false);
    });

    it('clears at canvas position', () => {
      // Cell (5, 10) is at position (320, 640) with 64px cells
      expect(gridLayer.clearAtPosition(320, 640)).toBe(true);
      expect(gridLayer.cellCount).toBe(0);
    });

    it('emits cell cleared event', () => {
      gridLayer.clearCell(5, 10);
      expect(bus.emit).toHaveBeenCalledWith(
        GridEvents.CELL_CLEARED,
        expect.objectContaining({
          canvasId,
          col: 5,
          row: 10,
        })
      );
    });

    it('clears all cells', () => {
      gridLayer.paintCell(1, 1, '#ff0000');
      gridLayer.paintCell(2, 2, '#00ff00');
      expect(gridLayer.cellCount).toBe(3);

      gridLayer.clearAllCells();
      expect(gridLayer.cellCount).toBe(0);
    });

    it('emits cleared event for clearAll', () => {
      gridLayer.clearAllCells();
      expect(bus.emit).toHaveBeenCalledWith(
        GridEvents.CLEARED,
        expect.objectContaining({ canvasId })
      );
    });
  });

  describe('cell retrieval', () => {
    beforeEach(() => {
      gridLayer.paintCell(5, 10, '#ff0000');
    });

    it('gets cell by coordinates', () => {
      const cell = gridLayer.getCell(5, 10);
      expect(cell).toBeDefined();
      expect(cell?.color).toBe('#ff0000');
    });

    it('returns undefined for empty cell', () => {
      expect(gridLayer.getCell(99, 99)).toBeUndefined();
    });

    it('gets cell at canvas position', () => {
      const cell = gridLayer.getCellAtPosition(320, 640);
      expect(cell).toBeDefined();
      expect(cell?.col).toBe(5);
      expect(cell?.row).toBe(10);
    });
  });

  describe('coordinate utilities', () => {
    it('converts position to cell', () => {
      const cell = gridLayer.positionToCell(100, 150);
      expect(cell).toEqual({ col: 1, row: 2 });
    });

    it('converts cell to position', () => {
      const pos = gridLayer.cellToPosition(1, 2);
      expect(pos).toEqual({ x: 64, y: 128 });
    });

    it('gets cell bounds', () => {
      const bounds = gridLayer.getCellBounds(1, 2);
      expect(bounds).toEqual({ x: 64, y: 128, width: 64, height: 64 });
    });

    it('gets cell center', () => {
      const center = gridLayer.getCellCenter(1, 2);
      expect(center).toEqual({ x: 96, y: 160 });
    });
  });

  describe('toggling', () => {
    it('toggles grid on/off', () => {
      expect(gridLayer.isEnabled).toBe(true);
      gridLayer.toggle();
      expect(gridLayer.isEnabled).toBe(false);
      gridLayer.toggle();
      expect(gridLayer.isEnabled).toBe(true);
    });

    it('sets specific toggle state', () => {
      gridLayer.toggle(false);
      expect(gridLayer.isEnabled).toBe(false);
      gridLayer.toggle(false); // Already false
      expect(gridLayer.isEnabled).toBe(false);
      gridLayer.toggle(true);
      expect(gridLayer.isEnabled).toBe(true);
    });

    it('emits toggled event', () => {
      gridLayer.toggle(false);
      expect(bus.emit).toHaveBeenCalledWith(
        GridEvents.TOGGLED,
        expect.objectContaining({ canvasId, enabled: false })
      );
    });

    it('toggles grid lines', () => {
      expect(gridLayer.getConfig().showGridLines).toBe(false);
      gridLayer.toggleGridLines();
      expect(gridLayer.getConfig().showGridLines).toBe(true);
      gridLayer.toggleGridLines();
      expect(gridLayer.getConfig().showGridLines).toBe(false);
    });
  });

  describe('viewport', () => {
    it('sets viewport', () => {
      const viewport = createViewport(800, 600);
      expect(() => gridLayer.setViewport(viewport)).not.toThrow();
    });
  });

  describe('cell store access', () => {
    it('exposes cell store', () => {
      const store = gridLayer.getCellStore();
      expect(store).toBeDefined();
      expect(typeof store.get).toBe('function');
      expect(typeof store.set).toBe('function');
    });

    it('cell store reflects layer state', () => {
      gridLayer.paintCell(5, 10, '#ff0000');
      const store = gridLayer.getCellStore();
      expect(store.get(5, 10)).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('clears all state on dispose', () => {
      gridLayer.paintCell(5, 10, '#ff0000');
      gridLayer.dispose();
      expect(gridLayer.cellCount).toBe(0);
    });
  });
});

describe('DEFAULT_GRID_CONFIG', () => {
  it('has correct defaults', () => {
    expect(DEFAULT_GRID_CONFIG.enabled).toBe(false);
    expect(DEFAULT_GRID_CONFIG.cellSize).toBe(64);
    expect(DEFAULT_GRID_CONFIG.showGridLines).toBe(false);
    expect(DEFAULT_GRID_CONFIG.snapMode).toBe('none');
    expect(DEFAULT_GRID_CONFIG.origin).toEqual({ x: 0, y: 0 });
  });
});
