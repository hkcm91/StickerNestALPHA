import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { initCanvasPanels, teardownCanvasPanels, isCanvasPanelsInitialized } from './init';

describe('Canvas Panels Init', () => {
  beforeEach(() => {
    teardownCanvasPanels();
  });

  afterEach(() => {
    teardownCanvasPanels();
  });

  it('initializes and reports initialized', () => {
    expect(isCanvasPanelsInitialized()).toBe(false);
    initCanvasPanels(() => 1);
    expect(isCanvasPanelsInitialized()).toBe(true);
  });

  it('returns context with all controllers', () => {
    const ctx = initCanvasPanels(() => 1);
    expect(ctx.toolbar).toBeDefined();
    expect(ctx.properties).toBeDefined();
    expect(ctx.layers).toBeDefined();
    expect(ctx.assets).toBeDefined();
    expect(ctx.pipelineInspector).toBeDefined();
    expect(ctx.contextMenu).toBeDefined();
    expect(ctx.floatingBar).toBeDefined();
  });

  it('returns same context on double init', () => {
    const ctx1 = initCanvasPanels(() => 1);
    const ctx2 = initCanvasPanels(() => 1);
    expect(ctx1).toBe(ctx2);
  });

  it('teardown resets state', () => {
    initCanvasPanels(() => 1);
    teardownCanvasPanels();
    expect(isCanvasPanelsInitialized()).toBe(false);
  });
});
