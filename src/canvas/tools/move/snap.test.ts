import { describe, it, expect } from 'vitest';

import { snapToGrid, findAlignmentGuides } from './snap';

describe('snapToGrid', () => {
  it('rounds to nearest grid position', () => {
    expect(snapToGrid({ x: 23, y: 47 }, 10)).toEqual({ x: 20, y: 50 });
    expect(snapToGrid({ x: 25, y: 55 }, 10)).toEqual({ x: 30, y: 60 });
  });

  it('handles exact grid positions', () => {
    expect(snapToGrid({ x: 50, y: 100 }, 50)).toEqual({ x: 50, y: 100 });
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
