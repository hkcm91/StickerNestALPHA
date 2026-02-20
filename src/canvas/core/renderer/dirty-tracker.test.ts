import { describe, it, expect } from 'vitest';

import { createDirtyTracker } from './dirty-tracker';

describe('DirtyTracker', () => {
  it('starts clean', () => {
    const tracker = createDirtyTracker();
    expect(tracker.isDirty).toBe(false);
    expect(tracker.getDirtyRegions()).toEqual([]);
  });

  it('marks regions dirty', () => {
    const tracker = createDirtyTracker();
    const region = { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };
    tracker.markDirty(region);
    expect(tracker.isDirty).toBe(true);
    expect(tracker.getDirtyRegions()).toEqual([region]);
  });

  it('accumulates multiple dirty regions', () => {
    const tracker = createDirtyTracker();
    const r1 = { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };
    const r2 = { min: { x: 200, y: 200 }, max: { x: 300, y: 300 } };
    tracker.markDirty(r1);
    tracker.markDirty(r2);
    expect(tracker.getDirtyRegions()).toHaveLength(2);
  });

  it('clears dirty state', () => {
    const tracker = createDirtyTracker();
    tracker.markDirty({ min: { x: 0, y: 0 }, max: { x: 100, y: 100 } });
    tracker.clear();
    expect(tracker.isDirty).toBe(false);
    expect(tracker.getDirtyRegions()).toEqual([]);
  });

  it('getDirtyRegions returns a copy', () => {
    const tracker = createDirtyTracker();
    const region = { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };
    tracker.markDirty(region);
    const regions = tracker.getDirtyRegions();
    regions.pop();
    expect(tracker.getDirtyRegions()).toHaveLength(1);
  });

  it('entity move marks old and new bounding boxes dirty', () => {
    const tracker = createDirtyTracker();
    const oldBounds = { min: { x: 10, y: 10 }, max: { x: 60, y: 60 } };
    const newBounds = { min: { x: 100, y: 100 }, max: { x: 150, y: 150 } };
    tracker.markDirty(oldBounds);
    tracker.markDirty(newBounds);
    const regions = tracker.getDirtyRegions();
    expect(regions).toHaveLength(2);
    expect(regions[0]).toEqual(oldBounds);
    expect(regions[1]).toEqual(newBounds);
  });
});
