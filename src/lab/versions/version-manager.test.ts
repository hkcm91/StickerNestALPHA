import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { WidgetManifest } from '@sn/types';

import { createVersionManager } from './version-manager';

vi.mock('../../kernel/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '../../kernel/supabase/client';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

function makeManifest(): WidgetManifest {
  return {
    id: 'test-widget',
    name: 'Test',
    version: '1.0.0',
    license: 'MIT',
    tags: [],
    category: 'other',
    permissions: [],
    events: { emits: [], subscribes: [] },
    config: { fields: [] },
    size: { defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
    entry: 'index.html',
    spatialSupport: false,
  };
}

describe('createVersionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves a snapshot via insert', async () => {
    const mockRow = {
      id: 'test-uuid',
      widget_id: 'widget-1',
      label: 'v1',
      html_content: '<div>Hello</div>',
      manifest: makeManifest(),
      created_by: '',
      created_at: '2024-01-01T00:00:00Z',
    };
    const mockSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const vm = createVersionManager('widget-1');
    const snap = await vm.save('v1', '<div>Hello</div>', makeManifest());

    expect(mockFrom).toHaveBeenCalledWith('widget_snapshots');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        widget_id: 'widget-1',
        label: 'v1',
        html_content: '<div>Hello</div>',
        created_by: '',
      }),
    );
    expect(snap.label).toBe('v1');
    expect(snap.html).toBe('<div>Hello</div>');
    expect(snap.widgetId).toBe('widget-1');
    expect(snap.id).toBeTruthy();
    expect(snap.createdAt).toBeTruthy();
  });

  it('throws on save error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const vm = createVersionManager('widget-1');
    await expect(vm.save('v1', '<div>1</div>', makeManifest())).rejects.toThrow(
      'Failed to save snapshot: insert failed',
    );
  });

  it('lists saved snapshots', async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'snap-1',
          widget_id: 'widget-1',
          label: 'v2',
          html_content: '<div>2</div>',
          manifest: makeManifest(),
          created_at: '2024-01-02T00:00:00Z',
        },
        {
          id: 'snap-2',
          widget_id: 'widget-1',
          label: 'v1',
          html_content: '<div>1</div>',
          manifest: makeManifest(),
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const vm = createVersionManager('widget-1');
    const list = await vm.list();

    expect(mockFrom).toHaveBeenCalledWith('widget_snapshots');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('widget_id', 'widget-1');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(list).toHaveLength(2);
  });

  it('throws on list error', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: 'list failed' } });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const vm = createVersionManager('widget-1');
    await expect(vm.list()).rejects.toThrow('Failed to list snapshots: list failed');
  });

  it('restores a snapshot by id', async () => {
    const mockRow = {
      id: 'snap-1',
      widget_id: 'widget-1',
      label: 'v1',
      html_content: '<div>1</div>',
      manifest: makeManifest(),
      created_at: '2024-01-01T00:00:00Z',
    };
    const mockSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const vm = createVersionManager('widget-1');
    const restored = await vm.restore('snap-1');

    expect(mockFrom).toHaveBeenCalledWith('widget_snapshots');
    expect(mockEq).toHaveBeenCalledWith('id', 'snap-1');
    expect(restored).not.toBeNull();
    expect(restored!.id).toBe('snap-1');
    expect(restored!.label).toBe('v1');
    expect(restored!.html).toBe('<div>1</div>');
  });

  it('returns null for unknown snapshot id', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const vm = createVersionManager('widget-1');
    const restored = await vm.restore('unknown-id');
    expect(restored).toBeNull();
  });

  it('deletes a snapshot', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });

    const vm = createVersionManager('widget-1');
    const result = await vm.delete('snap-1');

    expect(mockFrom).toHaveBeenCalledWith('widget_snapshots');
    expect(mockEq).toHaveBeenCalledWith('id', 'snap-1');
    expect(result).toBe(true);
  });

  it('returns false when delete fails', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });

    const vm = createVersionManager('widget-1');
    const result = await vm.delete('unknown');
    expect(result).toBe(false);
  });

  it('destroy is a no-op', () => {
    const vm = createVersionManager('widget-1');
    // Should not throw
    expect(() => vm.destroy()).not.toThrow();
  });

  it('passes userId as created_by when provided', async () => {
    const mockRow = {
      id: 'test-uuid',
      widget_id: 'widget-1',
      label: 'v1',
      html_content: '<div>Hello</div>',
      manifest: makeManifest(),
      created_by: 'user-123',
      created_at: '2024-01-01T00:00:00Z',
    };
    const mockSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const vm = createVersionManager('widget-1', 'user-123');
    await vm.save('v1', '<div>Hello</div>', makeManifest());

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by: 'user-123',
      }),
    );
  });
});
