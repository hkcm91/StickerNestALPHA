/**
 * Marketplace API Tests
 *
 * @module marketplace/api
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createMarketplaceAPI } from './marketplace-api';
import type { MarketplaceAPI } from './marketplace-api';

// Mock Supabase client — vi.mock is hoisted, so use vi.hoisted for shared refs
const { mockChain, mockRpc } = vi.hoisted(() => {
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
  // Make chain methods return themselves for chaining
  for (const method of Object.values(_mockChain)) {
    method.mockReturnValue(_mockChain);
  }
  const _mockRpc = vi.fn();
  return { mockChain: _mockChain, mockRpc: _mockRpc };
});

vi.mock('../../kernel/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockChain),
    rpc: mockRpc,
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
    safeParse: vi.fn((data: unknown) => ({
      success: true,
      data,
    })),
  },
}));

describe('MarketplaceAPI', () => {
  let api: MarketplaceAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    api = createMarketplaceAPI();

    // Reset chain returns
    for (const method of Object.values(mockChain)) {
      (method as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);
    }
  });

  describe('search', () => {
    it('returns paginated results', async () => {
      const mockData = [
        {
          id: 'w1',
          name: 'Test Widget',
          slug: 'test-widget',
          description: 'A test',
          version: '1.0.0',
          author_id: 'u1',
          thumbnail_url: null,
          icon_url: null,
          category: 'utilities',
          tags: [],
          license: 'MIT',
          is_published: true,
          is_deprecated: false,
          install_count: 10,
          rating_average: 4.5,
          rating_count: 2,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ];

      mockChain.range.mockResolvedValue({
        data: mockData,
        error: null,
        count: 1,
      });

      const result = await api.search({ page: 1, pageSize: 20, sortBy: 'newest' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Test Widget');
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('applies query filter', async () => {
      mockChain.range.mockResolvedValue({ data: [], error: null, count: 0 });

      await api.search({ query: 'clock', page: 0, pageSize: 20 });

      expect(mockChain.or).toHaveBeenCalledWith(
        expect.stringContaining('clock'),
      );
    });

    it('applies category filter', async () => {
      mockChain.range.mockResolvedValue({ data: [], error: null, count: 0 });

      await api.search({ category: 'utilities', page: 0, pageSize: 20 });

      expect(mockChain.eq).toHaveBeenCalledWith('category', 'utilities');
    });

    it('throws on error', async () => {
      mockChain.range.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
        count: null,
      });

      await expect(api.search({ page: 0, pageSize: 20 })).rejects.toThrow('Search failed');
    });
  });

  describe('getFeatured', () => {
    it('returns up to 12 featured widgets', async () => {
      mockChain.limit.mockResolvedValue({ data: [], error: null });

      const result = await api.getFeatured();

      expect(result).toEqual([]);
      expect(mockChain.limit).toHaveBeenCalledWith(12);
    });
  });

  describe('getWidget', () => {
    it('returns widget detail by id', async () => {
      mockChain.single.mockResolvedValue({
        data: {
          id: 'w1',
          name: 'Test',
          slug: 'test',
          description: null,
          version: '1.0.0',
          author_id: null,
          html_content: '<div>Hello</div>',
          manifest: { id: 'w1', name: 'Test', version: '1.0.0' },
          thumbnail_url: null,
          icon_url: null,
          category: null,
          tags: [],
          license: 'MIT',
          is_published: true,
          is_deprecated: false,
          install_count: 0,
          rating_average: null,
          rating_count: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await api.getWidget('w1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('w1');
      expect(result?.htmlContent).toBe('<div>Hello</div>');
    });

    it('returns null on not found', async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await api.getWidget('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('install', () => {
    it('fetches and validates manifest', async () => {
      mockChain.single.mockResolvedValue({
        data: {
          html_content: '<div>Widget</div>',
          manifest: { id: 'w1', name: 'Test', version: '1.0.0' },
        },
        error: null,
      });
      mockChain.upsert.mockReturnValue(mockChain);
      mockRpc.mockResolvedValue({ error: null });

      const result = await api.install('user1', 'w1');

      expect(result.htmlContent).toBe('<div>Widget</div>');
      expect(result.manifest).toBeDefined();
    });

    it('throws if widget not found', async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(api.install('user1', 'bad')).rejects.toThrow(
        'Widget not found or not published',
      );
    });
  });

  describe('publish', () => {
    it('creates widget and version entry', async () => {
      mockChain.single.mockResolvedValue({
        data: { id: 'new-widget-id' },
        error: null,
      });
      mockChain.insert.mockReturnValue(mockChain);

      const manifest = {
        id: 'test',
        name: 'Test Widget',
        version: '1.0.0',
        description: 'A test',
        tags: ['test'],
        category: 'utilities',
        license: 'MIT',
      } as unknown as import('@sn/types').WidgetManifest;

      const result = await api.publish('author1', '<div/>', manifest, null);

      expect(result.widgetId).toBe('new-widget-id');
    });
  });

  describe('reviews', () => {
    it('adds a review', async () => {
      mockChain.insert.mockReturnValue({ error: null });

      await expect(api.addReview('w1', 'u1', 4, 'Good widget')).resolves.not.toThrow();
    });

    it('deletes a review', async () => {
      // deleteReview chains .eq().eq() so the first .eq returns an object with a second .eq
      const eqSecond = vi.fn().mockResolvedValue({ error: null });
      mockChain.eq.mockReturnValue({ eq: eqSecond });

      await expect(api.deleteReview('w1', 'u1')).resolves.not.toThrow();
    });
  });

  describe('deprecateWidget', () => {
    it('sets is_deprecated to true', async () => {
      mockChain.eq.mockResolvedValue({ error: null });

      await expect(api.deprecateWidget('w1')).resolves.not.toThrow();
    });
  });

  describe('deleteWidget', () => {
    it('removes the widget', async () => {
      mockChain.eq.mockResolvedValue({ error: null });

      await expect(api.deleteWidget('w1')).resolves.not.toThrow();
    });
  });
});
