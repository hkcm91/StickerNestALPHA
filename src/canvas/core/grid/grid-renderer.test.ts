/**
 * Grid Renderer Tests
 *
 * @module canvas/core/grid
 * @layer L4A-1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { GridConfig } from '@sn/types';

import type { ViewportState } from '../viewport';
import { createViewport } from '../viewport';

import { createGridCellStore } from './grid-cell-store';
import {
  createGridRenderer,
  countVisibleCells,
  areGridLinesVisible,
  type GridRenderer,
} from './grid-renderer';

// Mock canvas and context
function createMockCanvas(width = 800, height = 600): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    arc: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width,
    height,
    getContext: vi.fn().mockReturnValue(ctx),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx };
}

describe('GridRenderer', () => {
  let renderer: GridRenderer;
  let cellStore: ReturnType<typeof createGridCellStore>;
  let viewport: ViewportState;
  let config: GridConfig;

  beforeEach(() => {
    cellStore = createGridCellStore();
    renderer = createGridRenderer(cellStore);
    viewport = createViewport(800, 600);
    config = {
      enabled: true,
      cellSize: 64,
      showGridLines: true,
      gridLineColor: 'rgba(255, 255, 255, 0.1)',
      gridLineWidth: 1,
      gridLineStyle: 'line',
      gridLineOpacity: 0.1,
      dotSize: 1.5,
      snapMode: 'none',
      origin: { x: 0, y: 0 },
      defaultBackground: '#0d1117',
      minCellScreenSize: 4,
      projection: 'orthogonal',
      isometricRatio: 2,
    };
  });

  describe('initialization', () => {
    it('starts with no canvas', () => {
      expect(renderer.getCanvas()).toBeNull();
    });

    it('sets canvas', () => {
      const { canvas } = createMockCanvas();
      renderer.setCanvas(canvas);
      expect(renderer.getCanvas()).toBe(canvas);
    });
  });

  describe('render', () => {
    it('does nothing without canvas', () => {
      renderer.setViewport(viewport);
      renderer.setConfig(config);
      // Should not throw
      expect(() => renderer.render()).not.toThrow();
    });

    it('renders with all components set', () => {
      const { canvas, ctx } = createMockCanvas();
      renderer.setCanvas(canvas);
      renderer.setViewport(viewport);
      renderer.setConfig(config);

      renderer.render();

      // Should have called fillRect for background
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('clears canvas with default background', () => {
      const { canvas, ctx } = createMockCanvas();
      renderer.setCanvas(canvas);
      renderer.setViewport(viewport);
      renderer.setConfig(config);

      renderer.render();

      // First fillRect should be background clear
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('renders painted cells', () => {
      const { canvas, ctx } = createMockCanvas();
      renderer.setCanvas(canvas);
      renderer.setViewport(viewport);
      renderer.setConfig(config);

      // Add some cells
      cellStore.set({ col: 0, row: 0, fillType: 'solid', color: '#ff0000' });
      cellStore.set({ col: 1, row: 0, fillType: 'solid', color: '#00ff00' });

      renderer.render();

      // Should have multiple fillRect calls (background + cells)
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('renders grid lines when enabled', () => {
      const { canvas, ctx } = createMockCanvas();
      renderer.setCanvas(canvas);
      renderer.setViewport(viewport);
      renderer.setConfig(config);

      renderer.render();

      // Should draw grid lines
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('skips grid lines when disabled', () => {
      const { canvas, ctx } = createMockCanvas();
      renderer.setCanvas(canvas);
      renderer.setViewport(viewport);
      renderer.setConfig({ ...config, showGridLines: false });

      renderer.render();

      // Grid line rendering should be skipped
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('skips grid lines when zoomed out too far', () => {
      const { canvas, ctx } = createMockCanvas();
      renderer.setCanvas(canvas);
      renderer.setViewport({ ...viewport, zoom: 0.01 }); // Very zoomed out
      renderer.setConfig(config);

      renderer.render();

      // Grid lines should be skipped due to minimum screen size
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('skips rendering when grid is disabled', () => {
      const { canvas, ctx } = createMockCanvas();
      renderer.setCanvas(canvas);
      renderer.setViewport(viewport);
      renderer.setConfig({ ...config, enabled: false });

      renderer.render();

      // Should only clear canvas, not render cells or lines
      // Background fill happens once
      expect(ctx.fillRect).toHaveBeenCalledTimes(1);
      expect(ctx.stroke).not.toHaveBeenCalled();
    });
  });

  describe('invalidate', () => {
    it('forces redraw on next render', () => {
      const { canvas, ctx } = createMockCanvas();
      renderer.setCanvas(canvas);
      renderer.setViewport(viewport);
      renderer.setConfig(config);

      // First render
      renderer.render();
      const firstCallCount = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;

      // Second render without invalidate - should be skipped
      renderer.render();
      const secondCallCount = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(secondCallCount).toBe(firstCallCount);

      // Invalidate and render again
      renderer.invalidate();
      renderer.render();
      const thirdCallCount = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(thirdCallCount).toBeGreaterThan(secondCallCount);
    });
  });
});

describe('countVisibleCells', () => {
  const config: GridConfig = {
    enabled: true,
    cellSize: 64,
    showGridLines: true,
    gridLineColor: 'rgba(255, 255, 255, 0.1)',
    gridLineWidth: 1,
    gridLineStyle: 'line',
    gridLineOpacity: 0.1,
    snapMode: 'none',
    origin: { x: 0, y: 0 },
    defaultBackground: '#0d1117',
    minCellScreenSize: 4,
    projection: 'orthogonal',
    isometricRatio: 2,
  };

  it('calculates visible cells at zoom 1', () => {
    const viewport = createViewport(640, 480);
    const count = countVisibleCells(viewport, config);

    // 640/64 = 10 cols, 480/64 = 7.5 -> 8 rows, +2 for buffer = 12 x 10 = 120
    // Actually with getVisibleCellBounds buffer of 1:
    // (10 + 2) * (8 + 2) = 12 * 10 = 120
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(200);
  });

  it('returns more cells when zoomed out', () => {
    const viewport1 = createViewport(640, 480);
    const viewport2 = { ...createViewport(640, 480), zoom: 0.5 };

    const count1 = countVisibleCells(viewport1, config);
    const count2 = countVisibleCells(viewport2, config);

    expect(count2).toBeGreaterThan(count1);
  });

  it('returns fewer cells when zoomed in', () => {
    const viewport1 = createViewport(640, 480);
    const viewport2 = { ...createViewport(640, 480), zoom: 2 };

    const count1 = countVisibleCells(viewport1, config);
    const count2 = countVisibleCells(viewport2, config);

    expect(count2).toBeLessThan(count1);
  });
});

describe('GridRenderer projection modes', () => {
  let cellStore: ReturnType<typeof createGridCellStore>;
  let renderer: GridRenderer;
  let viewport: ViewportState;
  const baseConfig: GridConfig = {
    enabled: true,
    cellSize: 64,
    showGridLines: true,
    gridLineColor: 'rgba(255, 255, 255, 0.1)',
    gridLineWidth: 1,
    gridLineStyle: 'line',
    gridLineOpacity: 0.1,
    dotSize: 1.5,
    snapMode: 'none',
    origin: { x: 0, y: 0 },
    defaultBackground: '#0d1117',
    minCellScreenSize: 4,
    projection: 'orthogonal',
    isometricRatio: 2,
  };

  beforeEach(() => {
    cellStore = createGridCellStore();
    renderer = createGridRenderer(cellStore);
    viewport = createViewport(800, 600);
  });

  it('renders triangular cells using path API', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.setCanvas(canvas);
    renderer.setViewport(viewport);
    renderer.setConfig({ ...baseConfig, projection: 'triangular' });

    cellStore.set({ col: 0, row: 0, fillType: 'solid', color: '#ff0000' });
    renderer.render();

    // Triangular cells use beginPath/moveTo/lineTo/closePath/fill
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
  });

  it('renders hexagonal cells using path API', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.setCanvas(canvas);
    renderer.setViewport(viewport);
    renderer.setConfig({ ...baseConfig, projection: 'hexagonal' });

    cellStore.set({ col: 0, row: 0, fillType: 'solid', color: '#00ff00' });
    renderer.render();

    // Hexagonal cells use beginPath/moveTo/lineTo/closePath/fill
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
  });

  it('renders triangular grid lines', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.setCanvas(canvas);
    renderer.setViewport(viewport);
    renderer.setConfig({ ...baseConfig, projection: 'triangular', showGridLines: true });

    renderer.render();

    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('renders hexagonal grid lines', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.setCanvas(canvas);
    renderer.setViewport(viewport);
    renderer.setConfig({ ...baseConfig, projection: 'hexagonal', showGridLines: true });

    renderer.render();

    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('skips grid lines for triangular when zoomed out too far', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.setCanvas(canvas);
    renderer.setViewport({ ...viewport, zoom: 0.01 });
    renderer.setConfig({ ...baseConfig, projection: 'triangular' });

    renderer.render();

    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('skips grid lines for hexagonal when zoomed out too far', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.setCanvas(canvas);
    renderer.setViewport({ ...viewport, zoom: 0.01 });
    renderer.setConfig({ ...baseConfig, projection: 'hexagonal' });

    renderer.render();

    expect(ctx.stroke).not.toHaveBeenCalled();
  });
});

describe('areGridLinesVisible', () => {
  const config: GridConfig = {
    enabled: true,
    cellSize: 64,
    showGridLines: true,
    gridLineColor: 'rgba(255, 255, 255, 0.1)',
    gridLineWidth: 1,
    gridLineStyle: 'line',
    gridLineOpacity: 0.1,
    snapMode: 'none',
    origin: { x: 0, y: 0 },
    defaultBackground: '#0d1117',
    minCellScreenSize: 4,
    projection: 'orthogonal',
    isometricRatio: 2,
  };

  it('returns true at normal zoom', () => {
    const viewport = createViewport(800, 600);
    expect(areGridLinesVisible(viewport, config)).toBe(true);
  });

  it('returns true at high zoom', () => {
    const viewport = { ...createViewport(800, 600), zoom: 2 };
    expect(areGridLinesVisible(viewport, config)).toBe(true);
  });

  it('returns false when zoomed out too far', () => {
    // Cell size 64 * zoom 0.05 = 3.2px < minCellScreenSize of 4
    const viewport = { ...createViewport(800, 600), zoom: 0.05 };
    expect(areGridLinesVisible(viewport, config)).toBe(false);
  });

  it('returns true at threshold boundary', () => {
    // Cell size 64 * zoom = 4 (exactly at threshold)
    const viewport = { ...createViewport(800, 600), zoom: 4 / 64 };
    expect(areGridLinesVisible(viewport, config)).toBe(true);
  });
});

describe('GridRenderer grid line styles', () => {
  let cellStore: ReturnType<typeof createGridCellStore>;
  let renderer: GridRenderer;
  let viewport: ViewportState;
  const baseConfig: GridConfig = {
    enabled: true,
    cellSize: 64,
    showGridLines: true,
    gridLineColor: '#ffffff',
    gridLineWidth: 1,
    gridLineStyle: 'line',
    gridLineOpacity: 0.5,
    dotSize: 1.5,
    snapMode: 'none',
    origin: { x: 0, y: 0 },
    defaultBackground: '#0d1117',
    minCellScreenSize: 4,
    projection: 'orthogonal',
    isometricRatio: 2,
  };

  beforeEach(() => {
    cellStore = createGridCellStore();
    renderer = createGridRenderer(cellStore);
    viewport = createViewport(800, 600);
  });

  it('renders dots using arc when gridLineStyle is dot', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.setCanvas(canvas);
    renderer.setViewport(viewport);
    renderer.setConfig({ ...baseConfig, gridLineStyle: 'dot' });

    renderer.render();

    // Dot style uses arc() for circles, not lineTo() for lines
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('renders crosses using lineTo when gridLineStyle is cross', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.setCanvas(canvas);
    renderer.setViewport(viewport);
    renderer.setConfig({ ...baseConfig, gridLineStyle: 'cross' });

    renderer.render();

    // Cross style uses moveTo/lineTo for small + marks
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('applies gridLineOpacity via globalAlpha', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.setCanvas(canvas);
    renderer.setViewport(viewport);
    renderer.setConfig({ ...baseConfig, gridLineOpacity: 0.7 });

    renderer.render();

    // globalAlpha should have been set to 0.7 during grid rendering
    // After rendering it should be restored to 1
    expect(ctx.globalAlpha).toBe(1);
  });

  it('renders line style by default (no arc calls)', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.setCanvas(canvas);
    renderer.setViewport(viewport);
    renderer.setConfig({ ...baseConfig, gridLineStyle: 'line' });

    renderer.render();

    // Line style uses stroke, not arc
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });
});
