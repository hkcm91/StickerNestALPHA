import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Pipeline } from '@sn/types';

import { createPipelinePersistence } from './pipeline-persistence';

vi.mock('../../../kernel/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '../../../kernel/supabase/client';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves a pipeline via upsert', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    const persistence = createPipelinePersistence();
    const pipeline = makePipeline('p1', 'canvas-1');
    await persistence.save(pipeline);

    expect(mockFrom).toHaveBeenCalledWith('pipelines');
    expect(mockUpsert).toHaveBeenCalledWith({
      id: 'p1',
      canvas_id: 'canvas-1',
      nodes: [],
      edges: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
  });

  it('throws on save error', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: { message: 'db error' } });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    const persistence = createPipelinePersistence();
    await expect(persistence.save(makePipeline('p1', 'canvas-1'))).rejects.toThrow(
      'Failed to save pipeline: db error',
    );
  });

  it('loads a pipeline by id', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'p1',
        canvas_id: 'canvas-1',
        nodes: [],
        edges: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const persistence = createPipelinePersistence();
    const loaded = await persistence.load('p1');

    expect(mockFrom).toHaveBeenCalledWith('pipelines');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('id', 'p1');
    expect(loaded).toEqual({
      id: 'p1',
      canvasId: 'canvas-1',
      nodes: [],
      edges: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  });

  it('returns null for unknown pipeline', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const persistence = createPipelinePersistence();
    const loaded = await persistence.load('nonexistent');
    expect(loaded).toBeNull();
  });

  it('loadForCanvas returns matching pipelines', async () => {
    const mockEq = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'p1',
          canvas_id: 'canvas-1',
          nodes: [],
          edges: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'p2',
          canvas_id: 'canvas-1',
          nodes: [],
          edges: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const persistence = createPipelinePersistence();
    const results = await persistence.loadForCanvas('canvas-1');

    expect(mockEq).toHaveBeenCalledWith('canvas_id', 'canvas-1');
    expect(results).toHaveLength(2);
    expect(results.every((p) => p.canvasId === 'canvas-1')).toBe(true);
  });

  it('removes a pipeline', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });

    const persistence = createPipelinePersistence();
    await persistence.remove('p1');

    expect(mockFrom).toHaveBeenCalledWith('pipelines');
    expect(mockEq).toHaveBeenCalledWith('id', 'p1');
  });

  it('throws on remove error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });

    const persistence = createPipelinePersistence();
    await expect(persistence.remove('p1')).rejects.toThrow(
      'Failed to remove pipeline: delete failed',
    );
  });
});
