import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { bus } from '../../kernel/bus';
import { createSceneGraph } from '../core';

import { initCanvasTools, teardownCanvasTools, isCanvasToolsInitialized } from './init';

describe('Canvas Tools Init', () => {
  beforeEach(() => {
    teardownCanvasTools();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    teardownCanvasTools();
    bus.unsubscribeAll();
  });

  it('initializes and reports initialized', () => {
    expect(isCanvasToolsInitialized()).toBe(false);
    const scene = createSceneGraph();
    initCanvasTools(scene, () => 'edit');
    expect(isCanvasToolsInitialized()).toBe(true);
  });

  it('returns context with registry', () => {
    const scene = createSceneGraph();
    const ctx = initCanvasTools(scene, () => 'edit');
    expect(ctx.registry).toBeDefined();
    expect(ctx.registry.getActiveName()).toBe('select');
  });

  it('returns same context on double init', () => {
    const scene = createSceneGraph();
    const ctx1 = initCanvasTools(scene, () => 'edit');
    const ctx2 = initCanvasTools(scene, () => 'edit');
    expect(ctx1).toBe(ctx2);
  });

  it('teardown resets', () => {
    const scene = createSceneGraph();
    initCanvasTools(scene, () => 'edit');
    teardownCanvasTools();
    expect(isCanvasToolsInitialized()).toBe(false);
  });
});
