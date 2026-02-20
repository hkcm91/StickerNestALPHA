import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { bus } from '../../kernel/bus';

import { initCanvasWiring, teardownCanvasWiring, isCanvasWiringInitialized } from './init';

describe('Canvas Wiring Init', () => {
  beforeEach(() => {
    teardownCanvasWiring();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    teardownCanvasWiring();
    bus.unsubscribeAll();
  });

  it('initializes and reports initialized', () => {
    expect(isCanvasWiringInitialized()).toBe(false);
    initCanvasWiring();
    expect(isCanvasWiringInitialized()).toBe(true);
  });

  it('returns context with graph, engine, persistence', () => {
    const ctx = initCanvasWiring();
    expect(ctx.graph).toBeDefined();
    expect(ctx.engine).toBeDefined();
    expect(ctx.engine.isRunning).toBe(true);
    expect(ctx.persistence).toBeDefined();
  });

  it('returns same context on double init', () => {
    const ctx1 = initCanvasWiring();
    const ctx2 = initCanvasWiring();
    expect(ctx1).toBe(ctx2);
  });

  it('teardown stops engine and resets', () => {
    const ctx = initCanvasWiring();
    teardownCanvasWiring();
    expect(isCanvasWiringInitialized()).toBe(false);
    expect(ctx.engine.isRunning).toBe(false);
  });
});
