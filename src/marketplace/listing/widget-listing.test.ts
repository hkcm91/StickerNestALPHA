/**
 * Widget Listing Service Tests
 *
 * @module marketplace/listing
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createWidgetListingService } from './widget-listing';
import type { WidgetListingService } from './widget-listing';

// Mock the marketplace API
const mockSearch = vi.fn();
const mockGetFeatured = vi.fn();

vi.mock('../api/marketplace-api', () => ({
  createMarketplaceAPI: () => ({
    search: mockSearch,
    getFeatured: mockGetFeatured,
  }),
}));

describe('WidgetListingService', () => {
  let service: WidgetListingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createWidgetListingService();
  });

  describe('search', () => {
    it('delegates to API with query', async () => {
      mockSearch.mockResolvedValue({
        items: [{ id: 'w1', name: 'Clock Widget' }],
        total: 1,
        page: 0,
        pageSize: 20,
        hasMore: false,
      });

      const result = await service.search('clock');

      expect(mockSearch).toHaveBeenCalledWith({
        query: 'clock',
        page: 0,
        pageSize: 20,
        sortBy: 'newest',
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Clock Widget');
    });

    it('returns full list for empty query', async () => {
      mockSearch.mockResolvedValue({
        items: [{ id: 'w1' }, { id: 'w2' }],
        total: 2,
        page: 0,
        pageSize: 20,
        hasMore: false,
      });

      const result = await service.search('');

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ query: undefined }),
      );
      expect(result.total).toBe(2);
    });
  });

  describe('browse', () => {
    it('filters by category', async () => {
      mockSearch.mockResolvedValue({
        items: [],
        total: 0,
        page: 0,
        pageSize: 20,
        hasMore: false,
      });

      await service.browse('utilities');

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'utilities' }),
      );
    });

    it('supports pagination', async () => {
      mockSearch.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        pageSize: 20,
        hasMore: false,
      });

      await service.browse(undefined, 2);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });

  describe('getFeatured', () => {
    it('delegates to API', async () => {
      mockGetFeatured.mockResolvedValue([{ id: 'w1' }]);

      const result = await service.getFeatured();

      expect(result).toHaveLength(1);
    });
  });

  describe('getCategories', () => {
    it('returns all categories', () => {
      const categories = service.getCategories();

      expect(categories).toContain('productivity');
      expect(categories).toContain('data');
      expect(categories).toContain('social');
      expect(categories).toContain('utilities');
      expect(categories).toContain('games');
      expect(categories).toContain('media');
      expect(categories).toContain('other');
      expect(categories.length).toBe(7);
    });
  });
});
