import { describe, it, expect } from 'vitest';

import type { GridConfig } from '@sn/types';

import { snapToGrid, snapToGridCell, findAlignmentGuides } from './snap';

const baseGridConfig: GridConfig = {
  enabled: true,
  cellSize: 64,
  showGridLines: false,
  gridLineColor: 'rgba(255, 255, 255, 0.1)',
  gridLineWidth: 1,
  gridLineStyle: 'line',
  gridLineOpacity: 0.1,
  dotSize: 1.5,
  snapMode: 'none',
  origin: { x: 0, y: 0 },
  defaultBackground: 'transparent',
  minCellScreenSize: 4,
  projection: 'orthogonal',
  isometricRatio: 2,
};

describe('snapToGrid', () => {
  it('rounds to nearest grid position', () => {
    expect(snapToGrid({ x: 23, y: 47 }, 10)).toEqual({ x: 20, y: 50 });
    expect(snapToGrid({ x: 25, y: 55 }, 10)).toEqual({ x: 30, y: 60 });
  });

  it('handles exact grid positions', () => {
    expect(snapToGrid({ x: 50, y: 100 }, 50)).toEqual({ x: 50, y: 100 });
  });
});

describe('snapToGridCell', () => {
  it('returns position unchanged when snapMode is none', () => {
    const config = { ...baseGridConfig, snapMode: 'none' as const };
    const pos = { x: 30, y: 45 };
    expect(snapToGridCell(pos, config)).toEqual(pos);
  });

  it('snaps to cell corner in corner mode', () => {
    const config = { ...baseGridConfig, snapMode: 'corner' as const };
    // Position at (30, 45) is in cell (0, 0) with cellSize 64
    const result = snapToGridCell({ x: 30, y: 45 }, config);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('snaps to cell corner for next cell', () => {
    const config = { ...baseGridConfig, snapMode: 'corner' as const };
    // Position at (70, 130) is in cell (1, 2) with cellSize 64
    const result = snapToGridCell({ x: 70, y: 130 }, config);
    expect(result).toEqual({ x: 64, y: 128 });
  });

  it('snaps point to cell center in center mode without widget size', () => {
    const config = { ...baseGridConfig, snapMode: 'center' as const };
    // Cell (0, 0) center is at (32, 32)
    const result = snapToGridCell({ x: 10, y: 10 }, config);
    expect(result).toEqual({ x: 32, y: 32 });
  });

  it('snaps widget center to cell center in center mode with widget size', () => {
    const config = { ...baseGridConfig, snapMode: 'center' as const };
    const widgetSize = { width: 20, height: 20 };
    // Cell (0, 0) center is at (32, 32); widget center at (32, 32) means top-left at (22, 22)
    const result = snapToGridCell({ x: 10, y: 10 }, config, widgetSize);
    expect(result).toEqual({ x: 22, y: 22 });
  });

  it('snaps to nearest edge in edge mode with widget size', () => {
    const config = { ...baseGridConfig, snapMode: 'edge' as const };
    const widgetSize = { width: 20, height: 20 };
    // Position (5, 5) is close to left/top edges of cell (0, 0)
    const result = snapToGridCell({ x: 5, y: 5 }, config, widgetSize);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('respects grid origin offset', () => {
    const config = { ...baseGridConfig, snapMode: 'corner' as const, origin: { x: 10, y: 10 } };
    // Position at (20, 20) is in cell (0, 0) offset by origin (10, 10)
    const result = snapToGridCell({ x: 20, y: 20 }, config);
    expect(result).toEqual({ x: 10, y: 10 });
  });
});

describe('findAlignmentGuides', () => {
  it('finds edge-aligned guides', () => {
    const entity = { min: { x: 100, y: 100 }, max: { x: 200, y: 200 } };
    const others = [{ min: { x: 100, y: 300 }, max: { x: 250, y: 400 } }];
    const guides = findAlignmentGuides(entity, others);
    expect(guides.some((g) => g.axis === 'x' && g.position === 100)).toBe(true);
  });

  it('finds center-aligned guides', () => {
    const entity = { min: { x: 100, y: 100 }, max: { x: 200, y: 200 } };
    const others = [{ min: { x: 100, y: 300 }, max: { x: 200, y: 400 } }];
    const guides = findAlignmentGuides(entity, others);
    expect(guides.some((g) => g.axis === 'x' && g.position === 150)).toBe(true);
  });

  it('returns no guides when too far apart', () => {
    const entity = { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };
    const others = [{ min: { x: 500, y: 500 }, max: { x: 600, y: 600 } }];
    const guides = findAlignmentGuides(entity, others, 5);
    expect(guides).toHaveLength(0);
  });
});
