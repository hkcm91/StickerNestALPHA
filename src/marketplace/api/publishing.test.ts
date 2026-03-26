/**
 * Marketplace publishing tests
 *
 * @module marketplace/api
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { WidgetManifest } from '@sn/types';

import { publish, updateWidget, deprecateWidget, deleteWidget, getPublishedByAuthor, getVersionHistory } from './publishing';

// Mock Supabase client — vi.mock is hoisted, so use vi.hoisted for shared refs
const { mockChain } = vi.hoisted(() => {
  const _mockChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    overlaps: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
  };
  for (const method of Object.values(_mockChain)) {
    method.mockReturnValue(_mockChain);
  }
  return { mockChain: _mockChain };
});

vi.mock('../../kernel/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockChain),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/thumb.png' } }),
      })),
    },
  },
}));

vi.mock('@sn/types', () => ({
  WidgetManifestSchema: {
    safeParse: vi.fn((data: unknown) => {
      if (data === null || data === undefined) {
        return { success: false, error: { issues: [{ message: 'Invalid' }] } };
      }
      return { success: true, data };
    }),
  },
}));

const makeManifest = (overrides: Partial<WidgetManifest> = {}): WidgetManifest =>
  ({
    id: 'test-widget',
    name: 'Test Widget',
    version: '1.0.0',
    description: 'A test widget',
    tags: ['test'],
    category: 'utilities',
    license: 'MIT',
    ...overrides,
  }) as unknown as WidgetManifest;

describe('publishing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of Object.values(mockChain)) {
      (method as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);
    }
  });

  describe('publish', () => {
    it('creates a widget and returns widgetId', async () => {
      mockChain.single.mockResolvedValue({
        data: { id: 'new-id' },
        error: null,
      });
      mockChain.insert.mockReturnValue(mockChain);

      const result = await publish('author1', '<div/>', makeManifest(), null);

      expect(result.widgetId).toBe('new-id');
    });

    it('uploads thumbnail when provided', async () => {
      const { supabase } = await import('../../kernel/supabase');
      mockChain.single.mockResolvedValue({
        data: { id: 'new-id' },
        error: null,
      });
      mockChain.insert.mockReturnValue(mockChain);

      const blob = new Blob(['png data'], { type: 'image/png' });
      await publish('author1', '<div/>', makeManifest(), blob);

      expect(supabase.storage.from).toHaveBeenCalledWith('widget-assets');
    });

    it('throws when insert fails', async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Duplicate slug' },
      });

      await expect(publish('author1', '<div/>', makeManifest(), null)).rejects.toThrow(
        'Publish failed: Duplicate slug',
      );
    });

    it('creates a version entry after widget insert', async () => {
      const { supabase } = await import('../../kernel/supabase');
      mockChain.single.mockResolvedValue({
        data: { id: 'new-id' },
        error: null,
      });
      mockChain.insert.mockReturnValue(mockChain);

      await publish('author1', '<div/>', makeManifest(), null);

      // supabase.from should be called for both 'widgets' and 'widget_versions'
      expect(supabase.from).toHaveBeenCalledWith('widgets');
      expect(supabase.from).toHaveBeenCalledWith('widget_versions');
    });

    it('uses manifest fields for widget properties', async () => {
      mockChain.single.mockResolvedValue({
        data: { id: 'new-id' },
        error: null,
      });
      mockChain.insert.mockReturnValue(mockChain);

      const manifest = makeManifest({ name: 'Custom Name', version: '2.0.0' });
      await publish('author1', '<div/>', manifest, null);

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom Name',
          version: '2.0.0',
          author_id: 'author1',
        }),
      );
    });
  });

  describe('updateWidget', () => {
    it('updates widget and creates version entry', async () => {
      mockChain.eq.mockResolvedValue({ error: null });
      // For the version insert
      mockChain.insert.mockResolvedValue({ error: null });

      await expect(
        updateWidget('w1', '<div>v2</div>', makeManifest({ version: '2.0.0' }), 'Bug fixes'),
      ).resolves.not.toThrow();
    });

    it('throws when update fails', async () => {
      mockChain.eq.mockResolvedValue({ error: { message: 'Not found' } });

      await expect(
        updateWidget('w1', '<div/>', makeManifest()),
      ).rejects.toThrow('Update failed: Not found');
    });

    it('throws when version creation fails', async () => {
      mockChain.eq.mockResolvedValue({ error: null });
      mockChain.insert.mockResolvedValue({ error: { message: 'Version conflict' } });

      await expect(
        updateWidget('w1', '<div/>', makeManifest()),
      ).rejects.toThrow('Version creation failed: Version conflict');
    });
  });

  describe('deprecateWidget', () => {
    it('sets is_deprecated to true', async () => {
      mockChain.eq.mockResolvedValue({ error: null });

      await expect(deprecateWidget('w1')).resolves.not.toThrow();
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_deprecated: true }),
      );
    });

    it('throws on error', async () => {
      mockChain.eq.mockResolvedValue({ error: { message: 'DB error' } });

      await expect(deprecateWidget('w1')).rejects.toThrow('Deprecate failed: DB error');
    });
  });

  describe('deleteWidget', () => {
    it('deletes the widget', async () => {
      mockChain.eq.mockResolvedValue({ error: null });

      await expect(deleteWidget('w1')).resolves.not.toThrow();
    });

    it('throws on error', async () => {
      mockChain.eq.mockResolvedValue({ error: { message: 'Not found' } });

      await expect(deleteWidget('w1')).rejects.toThrow('Delete failed: Not found');
    });
  });

  describe('getPublishedByAuthor', () => {
    it('returns listings for the given author', async () => {
      mockChain.order.mockResolvedValue({
        data: [
          {
            id: 'w1',
            name: 'Widget 1',
            slug: 'widget-1',
            description: null,
            version: '1.0.0',
            author_id: 'author1',
            thumbnail_url: null,
            icon_url: null,
            category: null,
            tags: [],
            license: 'MIT',
            is_published: true,
            is_deprecated: false,
            install_count: 5,
            rating_average: null,
            rating_count: 0,
            is_free: true,
            price_cents: null,
            currency: 'usd',
            stripe_price_id: null,
            metadata: {},
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        error: null,
      });

      const result = await getPublishedByAuthor('author1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Widget 1');
    });

    it('throws on error', async () => {
      mockChain.order.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(getPublishedByAuthor('author1')).rejects.toThrow(
        'Failed to fetch author widgets',
      );
    });
  });

  describe('getVersionHistory', () => {
    it('returns version list filtered by valid manifests', async () => {
      mockChain.order.mockResolvedValue({
        data: [
          {
            id: 'v1',
            widget_id: 'w1',
            version: '1.0.0',
            html_content: '<div/>',
            manifest: { id: 'w1' },
            changelog: 'Initial',
            created_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 'v2',
            widget_id: 'w1',
            version: '2.0.0',
            html_content: '<div/>',
            manifest: null, // invalid — should be filtered out
            changelog: null,
            created_at: '2026-02-01T00:00:00Z',
          },
        ],
        error: null,
      });

      const result = await getVersionHistory('w1');
      expect(result).toHaveLength(1);
      expect(result[0].version).toBe('1.0.0');
    });

    it('throws on error', async () => {
      mockChain.order.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(getVersionHistory('w1')).rejects.toThrow('Failed to fetch versions');
    });
  });
});
