/**
 * Grid Schema Tests
 *
 * @module @sn/types/grid
 * @layer L0
 */

import { describe, it, expect } from 'vitest';

import {
  GridProjectionModeSchema,
  GridLineStyleSchema,
  GridConfigSchema,
} from './grid';

describe('GridProjectionModeSchema', () => {
  it('accepts orthogonal', () => {
    expect(GridProjectionModeSchema.parse('orthogonal')).toBe('orthogonal');
  });

  it('accepts isometric', () => {
    expect(GridProjectionModeSchema.parse('isometric')).toBe('isometric');
  });

  it('accepts triangular', () => {
    expect(GridProjectionModeSchema.parse('triangular')).toBe('triangular');
  });

  it('accepts hexagonal', () => {
    expect(GridProjectionModeSchema.parse('hexagonal')).toBe('hexagonal');
  });

  it('rejects invalid projection', () => {
    expect(() => GridProjectionModeSchema.parse('invalid')).toThrow();
  });
});

describe('GridLineStyleSchema', () => {
  it('accepts line', () => {
    expect(GridLineStyleSchema.parse('line')).toBe('line');
  });

  it('accepts dot', () => {
    expect(GridLineStyleSchema.parse('dot')).toBe('dot');
  });

  it('accepts cross', () => {
    expect(GridLineStyleSchema.parse('cross')).toBe('cross');
  });

  it('rejects invalid style', () => {
    expect(() => GridLineStyleSchema.parse('dashed')).toThrow();
  });
});

describe('GridConfigSchema', () => {
  it('parses config with triangular projection', () => {
    const config = GridConfigSchema.parse({
      projection: 'triangular',
    });
    expect(config.projection).toBe('triangular');
    expect(config.cellSize).toBe(64); // default
  });

  it('parses config with hexagonal projection', () => {
    const config = GridConfigSchema.parse({
      projection: 'hexagonal',
    });
    expect(config.projection).toBe('hexagonal');
    expect(config.enabled).toBe(true); // default
  });

  it('defaults gridLineStyle to line', () => {
    const config = GridConfigSchema.parse({});
    expect(config.gridLineStyle).toBe('line');
  });

  it('accepts dot gridLineStyle', () => {
    const config = GridConfigSchema.parse({ gridLineStyle: 'dot' });
    expect(config.gridLineStyle).toBe('dot');
  });

  it('accepts cross gridLineStyle', () => {
    const config = GridConfigSchema.parse({ gridLineStyle: 'cross' });
    expect(config.gridLineStyle).toBe('cross');
  });

  it('defaults gridLineOpacity to 0.1', () => {
    const config = GridConfigSchema.parse({});
    expect(config.gridLineOpacity).toBe(0.1);
  });

  it('accepts custom gridLineOpacity', () => {
    const config = GridConfigSchema.parse({ gridLineOpacity: 0.5 });
    expect(config.gridLineOpacity).toBe(0.5);
  });

  it('rejects gridLineOpacity out of range', () => {
    expect(() => GridConfigSchema.parse({ gridLineOpacity: 1.5 })).toThrow();
    expect(() => GridConfigSchema.parse({ gridLineOpacity: -0.1 })).toThrow();
  });
});
