import { describe, it, expect } from 'vitest';

import type { Pipeline } from '@sn/types';

import { createPipelinePersistence } from './pipeline-persistence';

function makePipeline(id: string, canvasId: string): Pipeline {
  return {
    id,
    canvasId,
    nodes: [],
    edges: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

describe('PipelinePersistence', () => {
  it('saves and loads a pipeline', async () => {
    const persistence = createPipelinePersistence();
    const pipeline = makePipeline('p1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    await persistence.save(pipeline);
    const loaded = await persistence.load('p1');
    expect(loaded).toEqual(pipeline);
  });

  it('returns null for unknown pipeline', async () => {
    const persistence = createPipelinePersistence();
    const loaded = await persistence.load('nonexistent');
    expect(loaded).toBeNull();
  });

  it('loadForCanvas returns matching pipelines', async () => {
    const persistence = createPipelinePersistence();
    await persistence.save(makePipeline('p1', 'canvas-1'));
    await persistence.save(makePipeline('p2', 'canvas-1'));
    await persistence.save(makePipeline('p3', 'canvas-2'));
    const results = await persistence.loadForCanvas('canvas-1');
    expect(results).toHaveLength(2);
    expect(results.every((p) => p.canvasId === 'canvas-1')).toBe(true);
  });

  it('removes a pipeline', async () => {
    const persistence = createPipelinePersistence();
    await persistence.save(makePipeline('p1', 'canvas-1'));
    await persistence.remove('p1');
    const loaded = await persistence.load('p1');
    expect(loaded).toBeNull();
  });
});
