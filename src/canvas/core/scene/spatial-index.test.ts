import { describe, it, expect } from 'vitest';

import { createSpatialIndex } from './spatial-index';

describe('SpatialIndex', () => {
  it('inserts and queries by point', () => {
    const idx = createSpatialIndex(100);
    idx.insert('e1', { min: { x: 0, y: 0 }, max: { x: 50, y: 50 } });
    const results = idx.queryPoint({ x: 25, y: 25 });
    expect(results).toContain('e1');
  });

  it('queries by region', () => {
    const idx = createSpatialIndex(100);
    idx.insert('e1', { min: { x: 0, y: 0 }, max: { x: 50, y: 50 } });
    idx.insert('e2', { min: { x: 500, y: 500 }, max: { x: 600, y: 600 } });
    const results = idx.queryRegion({ min: { x: 0, y: 0 }, max: { x: 100, y: 100 } });
    expect(results).toContain('e1');
    expect(results).not.toContain('e2');
  });

  it('removes entries', () => {
    const idx = createSpatialIndex(100);
    idx.insert('e1', { min: { x: 0, y: 0 }, max: { x: 50, y: 50 } });
    idx.remove('e1');
    const results = idx.queryPoint({ x: 25, y: 25 });
    expect(results).not.toContain('e1');
  });

  it('updates entries', () => {
    const idx = createSpatialIndex(100);
    idx.insert('e1', { min: { x: 0, y: 0 }, max: { x: 50, y: 50 } });
    idx.update('e1', { min: { x: 500, y: 500 }, max: { x: 600, y: 600 } });
    expect(idx.queryPoint({ x: 25, y: 25 })).not.toContain('e1');
    expect(idx.queryPoint({ x: 550, y: 550 })).toContain('e1');
  });

  it('handles entities spanning multiple cells', () => {
    const idx = createSpatialIndex(100);
    idx.insert('e1', { min: { x: 50, y: 50 }, max: { x: 250, y: 250 } });
    expect(idx.queryPoint({ x: 75, y: 75 })).toContain('e1');
    expect(idx.queryPoint({ x: 150, y: 150 })).toContain('e1');
    expect(idx.queryPoint({ x: 200, y: 200 })).toContain('e1');
  });

  it('clears all entries', () => {
    const idx = createSpatialIndex(100);
    idx.insert('e1', { min: { x: 0, y: 0 }, max: { x: 50, y: 50 } });
    idx.insert('e2', { min: { x: 100, y: 100 }, max: { x: 200, y: 200 } });
    idx.clear();
    expect(idx.queryPoint({ x: 25, y: 25 })).toHaveLength(0);
    expect(idx.queryPoint({ x: 150, y: 150 })).toHaveLength(0);
  });
});
