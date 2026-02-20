import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { initSpatial, teardownSpatial, isSpatialInitialized } from './init';

describe('Spatial Init', () => {
  beforeEach(() => teardownSpatial());
  afterEach(() => teardownSpatial());

  it('initializes and reports initialized', () => {
    expect(isSpatialInitialized()).toBe(false);
    initSpatial();
    expect(isSpatialInitialized()).toBe(true);
  });

  it('returns context with all modules', () => {
    const ctx = initSpatial();
    expect(ctx.scene).toBeDefined();
    expect(ctx.xrSession).toBeDefined();
    expect(ctx.controller).toBeDefined();
    expect(ctx.entityMapper).toBeDefined();
  });

  it('returns same context on double init', () => {
    const ctx1 = initSpatial();
    const ctx2 = initSpatial();
    expect(ctx1).toBe(ctx2);
  });

  it('teardown resets state', () => {
    initSpatial();
    teardownSpatial();
    expect(isSpatialInitialized()).toBe(false);
  });
});
