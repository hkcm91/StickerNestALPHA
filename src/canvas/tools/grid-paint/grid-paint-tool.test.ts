/**
 * Grid Paint Tool Tests
 *
 * @module canvas/tools/grid-paint
 * @layer L4A-2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { GridConfig } from '@sn/types';

import type { GridLayer } from '../../core/grid';
import type { CanvasPointerEvent, Tool } from '../registry';

import {
  createGridPaintTool,
  createGridPaintToolWithController,
} from './grid-paint-tool';

// Mock GridLayer
function createMockGridLayer(): GridLayer & {
  paintedCells: Array<{ col: number; row: number; color: string }>;
  clearedCells: Array<{ col: number; row: number }>;
} {
  const paintedCells: Array<{ col: number; row: number; color: string }> = [];
  const clearedCells: Array<{ col: number; row: number }> = [];
  const config: GridConfig = {
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

  return {
    paintedCells,
    clearedCells,
    init: vi.fn(),
    dispose: vi.fn(),
    setViewport: vi.fn(),
    setConfig: vi.fn(),
    getConfig: () => config,
    paintAtPosition: vi.fn(),
    paintCell: vi.fn((col, row, color) => {
      paintedCells.push({ col, row, color });
      return { col, row, fillType: 'solid' as const, color };
    }),
    paintCells: vi.fn(),
    clearAtPosition: vi.fn(),
    clearCell: vi.fn((col, row) => {
      clearedCells.push({ col, row });
      return true;
    }),
    clearAllCells: vi.fn(),
    getCellAtPosition: vi.fn(),
    getCell: vi.fn(),
    positionToCell: vi.fn((x, y) => ({
      col: Math.floor(x / 64),
      row: Math.floor(y / 64),
    })),
    cellToPosition: vi.fn((col, row) => ({
      x: col * 64,
      y: row * 64,
    })),
    getCellBounds: vi.fn(),
    getCellCenter: vi.fn(),
    toggle: vi.fn(),
    toggleGridLines: vi.fn(),
    getCellStore: vi.fn(),
    invalidate: vi.fn(),
    isEnabled: true,
    cellCount: 0,
  };
}

function createPointerEvent(
  x: number,
  y: number,
  overrides: Partial<CanvasPointerEvent> = {}
): CanvasPointerEvent {
  return {
    canvasPosition: { x, y },
    screenPosition: { x, y },
    entityId: null,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...overrides,
  };
}

describe('createGridPaintTool', () => {
  let gridLayer: ReturnType<typeof createMockGridLayer>;
  let tool: Tool;

  beforeEach(() => {
    gridLayer = createMockGridLayer();
    tool = createGridPaintTool({
      gridLayer,
      color: '#ff0000',
      eraseMode: false,
    });
    tool.onActivate();
  });

  describe('single click painting', () => {
    it('paints a cell on pointer down', () => {
      const event = createPointerEvent(100, 100);
      tool.onPointerDown(event);

      expect(gridLayer.paintCell).toHaveBeenCalledWith(1, 1, '#ff0000');
      expect(gridLayer.paintedCells).toHaveLength(1);
    });

    it('converts position to cell correctly', () => {
      const event = createPointerEvent(64, 128);
      tool.onPointerDown(event);

      expect(gridLayer.paintCell).toHaveBeenCalledWith(1, 2, '#ff0000');
    });

    it('paints cell at origin', () => {
      const event = createPointerEvent(0, 0);
      tool.onPointerDown(event);

      expect(gridLayer.paintCell).toHaveBeenCalledWith(0, 0, '#ff0000');
    });
  });

  describe('drag painting', () => {
    it('paints continuously while dragging', () => {
      tool.onPointerDown(createPointerEvent(0, 0));
      tool.onPointerMove(createPointerEvent(64, 0));
      tool.onPointerMove(createPointerEvent(128, 0));

      // Should have painted 3 cells: (0,0), (1,0), (2,0)
      expect(gridLayer.paintedCells.length).toBeGreaterThanOrEqual(3);
    });

    it('interpolates between distant cells', () => {
      tool.onPointerDown(createPointerEvent(0, 0));
      // Jump several cells
      tool.onPointerMove(createPointerEvent(192, 0));

      // Should fill in intermediate cells
      expect(gridLayer.paintedCells.length).toBeGreaterThan(1);
    });

    it('does not paint duplicates in same stroke', () => {
      tool.onPointerDown(createPointerEvent(0, 0));
      tool.onPointerMove(createPointerEvent(0, 0)); // Same cell
      tool.onPointerMove(createPointerEvent(10, 10)); // Still same cell (0,0)

      expect(gridLayer.paintedCells).toHaveLength(1);
    });

    it('stops painting on pointer up', () => {
      tool.onPointerDown(createPointerEvent(0, 0));
      tool.onPointerUp(createPointerEvent(0, 0));
      tool.onPointerMove(createPointerEvent(64, 0));

      // Should only have the initial cell
      expect(gridLayer.paintedCells).toHaveLength(1);
    });
  });

  describe('erase mode', () => {
    it('erases when in erase mode', () => {
      const eraseTool = createGridPaintTool({
        gridLayer,
        color: '#ff0000',
        eraseMode: true,
      });
      eraseTool.onActivate();
      eraseTool.onPointerDown(createPointerEvent(0, 0));

      expect(gridLayer.clearCell).toHaveBeenCalledWith(0, 0);
    });

    it('erases with alt key', () => {
      tool.onPointerDown(createPointerEvent(0, 0, { altKey: true }));

      expect(gridLayer.clearCell).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('disabled grid', () => {
    it('does not paint when grid is disabled', () => {
      (gridLayer as unknown as { isEnabled: boolean }).isEnabled = false;
      tool.onPointerDown(createPointerEvent(0, 0));

      expect(gridLayer.paintCell).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle', () => {
    it('resets state on deactivate', () => {
      tool.onPointerDown(createPointerEvent(0, 0));
      tool.onDeactivate();

      // Reactivate
      tool.onActivate();
      // Should be able to paint same cell again in new session
      tool.onPointerDown(createPointerEvent(0, 0));

      expect(gridLayer.paintedCells).toHaveLength(2);
    });

    it('cancels ongoing paint operation', () => {
      tool.onPointerDown(createPointerEvent(0, 0));
      tool.cancel();
      tool.onPointerMove(createPointerEvent(64, 0));

      expect(gridLayer.paintedCells).toHaveLength(1);
    });
  });
});

describe('createGridPaintToolWithController', () => {
  let gridLayer: ReturnType<typeof createMockGridLayer>;

  beforeEach(() => {
    gridLayer = createMockGridLayer();
  });

  it('creates tool and controller', () => {
    const { tool, controller } = createGridPaintToolWithController(gridLayer);
    expect(tool).toBeDefined();
    expect(controller).toBeDefined();
  });

  it('uses initial color', () => {
    const { tool, controller } = createGridPaintToolWithController(gridLayer, '#00ff00');
    tool.onActivate();

    expect(controller.getColor()).toBe('#00ff00');

    tool.onPointerDown(createPointerEvent(0, 0));
    expect(gridLayer.paintedCells[0].color).toBe('#00ff00');
  });

  it('controller can change color', () => {
    const { tool, controller } = createGridPaintToolWithController(gridLayer);
    tool.onActivate();

    controller.setColor('#0000ff');
    tool.onPointerDown(createPointerEvent(0, 0));

    expect(gridLayer.paintedCells[0].color).toBe('#0000ff');
  });

  it('controller can toggle erase mode', () => {
    const { tool, controller } = createGridPaintToolWithController(gridLayer);
    tool.onActivate();

    expect(controller.isEraseMode()).toBe(false);
    controller.toggleEraseMode();
    expect(controller.isEraseMode()).toBe(true);

    tool.onPointerDown(createPointerEvent(0, 0));
    expect(gridLayer.clearCell).toHaveBeenCalled();
  });

  it('controller can set erase mode explicitly', () => {
    const { tool, controller } = createGridPaintToolWithController(gridLayer);
    tool.onActivate();

    controller.setEraseMode(true);
    expect(controller.isEraseMode()).toBe(true);

    controller.setEraseMode(false);
    expect(controller.isEraseMode()).toBe(false);
  });
});

describe('painting on non-orthogonal grids', () => {
  it('paints on triangular grid via positionToCell', () => {
    const gridLayer = createMockGridLayer();
    // Override positionToCell to simulate triangular grid (returns different cells)
    (gridLayer.positionToCell as ReturnType<typeof vi.fn>).mockImplementation(
      (x: number, y: number) => ({
        col: Math.floor(x / 32), // triangular has narrower cols
        row: Math.floor(y / 55), // h = 64 * sqrt(3)/2 ≈ 55
      })
    );

    const tool = createGridPaintTool({
      gridLayer,
      color: '#ff0000',
      eraseMode: false,
    });
    tool.onActivate();
    tool.onPointerDown(createPointerEvent(50, 50));

    expect(gridLayer.paintCell).toHaveBeenCalledWith(1, 0, '#ff0000');
  });

  it('paints on hexagonal grid via positionToCell', () => {
    const gridLayer = createMockGridLayer();
    // Override positionToCell to simulate hex grid
    (gridLayer.positionToCell as ReturnType<typeof vi.fn>).mockImplementation(
      (x: number, y: number) => ({
        col: Math.round(x / 110), // hex width ≈ sqrt(3) * 64
        row: Math.round(y / 96),  // hex row spacing ≈ 1.5 * 64
      })
    );

    const tool = createGridPaintTool({
      gridLayer,
      color: '#00ff00',
      eraseMode: false,
    });
    tool.onActivate();
    tool.onPointerDown(createPointerEvent(110, 96));

    expect(gridLayer.paintCell).toHaveBeenCalledWith(1, 1, '#00ff00');
  });

  it('drag paints on hexagonal grid with interpolation', () => {
    const gridLayer = createMockGridLayer();
    (gridLayer.positionToCell as ReturnType<typeof vi.fn>).mockImplementation(
      (x: number, y: number) => ({
        col: Math.round(x / 110),
        row: Math.round(y / 96),
      })
    );

    const tool = createGridPaintTool({
      gridLayer,
      color: '#0000ff',
      eraseMode: false,
    });
    tool.onActivate();
    tool.onPointerDown(createPointerEvent(0, 0));
    tool.onPointerMove(createPointerEvent(220, 0)); // Jump 2 hex cells

    // Should have painted at least the start and end cells
    expect(gridLayer.paintedCells.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Bresenham line algorithm', () => {
  let gridLayer: ReturnType<typeof createMockGridLayer>;
  let tool: Tool;

  beforeEach(() => {
    gridLayer = createMockGridLayer();
    tool = createGridPaintTool({
      gridLayer,
      color: '#ff0000',
      eraseMode: false,
    });
    tool.onActivate();
  });

  it('draws diagonal line', () => {
    tool.onPointerDown(createPointerEvent(0, 0));
    tool.onPointerMove(createPointerEvent(192, 192));

    // Should paint cells along the diagonal
    const cells = gridLayer.paintedCells;
    expect(cells.length).toBeGreaterThan(1);

    // All cells should be on or near the diagonal
    for (const cell of cells) {
      expect(Math.abs(cell.col - cell.row)).toBeLessThanOrEqual(1);
    }
  });

  it('draws horizontal line', () => {
    tool.onPointerDown(createPointerEvent(0, 32)); // Middle of row 0
    tool.onPointerMove(createPointerEvent(256, 32));

    // Should paint cells in a row
    const cells = gridLayer.paintedCells;
    expect(cells.every((c) => c.row === 0)).toBe(true);
    expect(cells.length).toBeGreaterThanOrEqual(4);
  });

  it('draws vertical line', () => {
    tool.onPointerDown(createPointerEvent(32, 0)); // Middle of col 0
    tool.onPointerMove(createPointerEvent(32, 256));

    // Should paint cells in a column
    const cells = gridLayer.paintedCells;
    expect(cells.every((c) => c.col === 0)).toBe(true);
    expect(cells.length).toBeGreaterThanOrEqual(4);
  });
});
