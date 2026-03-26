/**
 * Marketplace discovery tests
 *
 * @module marketplace/api
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { search, getFeatured, getWidget, getWidgetBySlug } from './discovery';

// Mock Supabase client
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

const makeListingRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'w1',
  name: 'Test Widget',
  slug: 'test-widget',
  description: 'A test widget',
  version: '1.0.0',
  author_id: 'u1',
  thumbnail_url: null,
  icon_url: null,
  category: 'utilities',
  tags: ['test'],
  license: 'MIT',
  is_published: true,
  is_deprecated: false,
  install_count: 10,
  rating_average: 4.5,
  rating_count: 2,
  is_free: true,
  price_cents: null,
  currency: 'usd',
  stripe_price_id: null,
  metadata: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of Object.values(mockChain)) {
      (method as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);
    }
  });

  describe('search', () => {
    it('returns paginated results', async () => {
      mockChain.range.mockResolvedValue({
        data: [makeListingRow()],
        error: null,
        count: 1,
      });

      const result = await search({ page: 1, pageSize: 20, sortBy: 'newest' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Test Widget');
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('applies query filter using or', async () => {
      mockChain.range.mockResolvedValue({ data: [], error: null, count: 0 });

      await search({ query: 'clock', page: 1, pageSize: 20 });

      expect(mockChain.or).toHaveBeenCalledWith(
        expect.stringContaining('clock'),
      );
    });

    it('applies category filter', async () => {
      mockChain.range.mockResolvedValue({ data: [], error: null, count: 0 });

      await search({ category: 'games', page: 1, pageSize: 20 });

      expect(mockChain.eq).toHaveBeenCalledWith('category', 'games');
    });

    it('applies tags filter using overlaps', async () => {
      mockChain.range.mockResolvedValue({ data: [], error: null, count: 0 });

      await search({ tags: ['productivity', 'tools'], page: 1, pageSize: 20 });

      expect(mockChain.overlaps).toHaveBeenCalledWith('tags', ['productivity', 'tools']);
    });

    it('sorts by rating when sortBy is rating', async () => {
      mockChain.range.mockResolvedValue({ data: [], error: null, count: 0 });

      await search({ page: 1, pageSize: 20, sortBy: 'rating' });

      expect(mockChain.order).toHaveBeenCalledWith('rating_average', {
        ascending: false,
        nullsFirst: false,
      });
    });

    it('sorts by install_count when sortBy is installs', async () => {
      mockChain.range.mockResolvedValue({ data: [], error: null, count: 0 });

      await search({ page: 1, pageSize: 20, sortBy: 'installs' });

      expect(mockChain.order).toHaveBeenCalledWith('install_count', { ascending: false });
    });

    it('defaults to sorting by created_at (newest) when sortBy is omitted', async () => {
      mockChain.range.mockResolvedValue({ data: [], error: null, count: 0 });

      await search({ page: 1, pageSize: 20 });

      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('throws on error', async () => {
      mockChain.range.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
        count: null,
      });

      await expect(search({ page: 1, pageSize: 20 })).rejects.toThrow('Search failed: DB error');
    });

    it('computes hasMore correctly when more items exist', async () => {
      mockChain.range.mockResolvedValue({
        data: [makeListingRow(), makeListingRow({ id: 'w2' })],
        error: null,
        count: 50,
      });

      const result = await search({ page: 1, pageSize: 2 });

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(50);
    });
  });

  describe('getFeatured', () => {
    it('returns up to 12 featured widgets', async () => {
      mockChain.limit.mockResolvedValue({
        data: [makeListingRow()],
        error: null,
      });

      const result = await getFeatured();

      expect(result).toHaveLength(1);
      expect(mockChain.limit).toHaveBeenCalledWith(12);
    });

    it('filters by is_published and not deprecated', async () => {
      mockChain.limit.mockResolvedValue({ data: [], error: null });

      await getFeatured();

      expect(mockChain.eq).toHaveBeenCalledWith('is_published', true);
      expect(mockChain.eq).toHaveBeenCalledWith('is_deprecated', false);
    });

    it('returns empty array when no featured widgets', async () => {
      mockChain.limit.mockResolvedValue({ data: [], error: null });

      const result = await getFeatured();
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockChain.limit.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(getFeatured()).rejects.toThrow('Failed to fetch featured: DB error');
    });
  });

  describe('getWidget', () => {
    it('returns widget detail by id', async () => {
      mockChain.single.mockResolvedValue({
        data: {
          ...makeListingRow(),
          html_content: '<div>Hello</div>',
          manifest: { id: 'w1', name: 'Test', version: '1.0.0' },
        },
        error: null,
      });

      const result = await getWidget('w1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('w1');
      expect(result!.htmlContent).toBe('<div>Hello</div>');
    });

    it('returns null when widget not found', async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getWidget('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null when manifest is invalid', async () => {
      mockChain.single.mockResolvedValue({
        data: {
          ...makeListingRow(),
          html_content: '<div/>',
          manifest: null,
        },
        error: null,
      });

      const result = await getWidget('w1');
      expect(result).toBeNull();
    });
  });

  describe('getWidgetBySlug', () => {
    it('returns widget detail by slug', async () => {
      mockChain.single.mockResolvedValue({
        data: {
          ...makeListingRow({ slug: 'my-widget' }),
          html_content: '<div>Slug Widget</div>',
          manifest: { id: 'w1', name: 'Test', version: '1.0.0' },
        },
        error: null,
      });

      const result = await getWidgetBySlug('my-widget');

      expect(result).not.toBeNull();
      expect(result!.slug).toBe('my-widget');
      expect(result!.htmlContent).toBe('<div>Slug Widget</div>');
    });

    it('returns null when slug not found', async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getWidgetBySlug('nonexistent-slug');
      expect(result).toBeNull();
    });

    it('queries by slug field', async () => {
      mockChain.single.mockResolvedValue({
        data: {
          ...makeListingRow(),
          html_content: '<div/>',
          manifest: { id: 'w1' },
        },
        error: null,
      });

      await getWidgetBySlug('test-slug');

      expect(mockChain.eq).toHaveBeenCalledWith('slug', 'test-slug');
    });
  });
});
