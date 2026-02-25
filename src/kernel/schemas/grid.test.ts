/**
 * Grid Schema Tests
 *
 * @module @sn/types/grid
 * @layer L0
 */

import { describe, it, expect } from 'vitest';

import {
  GridProjectionModeSchema,
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
});
