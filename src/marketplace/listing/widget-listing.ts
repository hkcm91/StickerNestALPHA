/**
 * Widget Listing Service
 *
 * Search, browse, and discover widgets in the marketplace.
 *
 * @module marketplace/listing
 * @layer L5
 */

import { createMarketplaceAPI } from '../api/marketplace-api';
import type {
  MarketplaceWidgetListing,
  PaginatedResult,
} from '../api/marketplace-api';

const DEFAULT_PAGE_SIZE = 20;

const CATEGORIES = [
  'productivity',
  'data',
  'social',
  'utilities',
  'games',
  'media',
  'other',
] as const;

export type WidgetCategory = (typeof CATEGORIES)[number];

export interface WidgetListingService {
  search(query: string, page?: number): Promise<PaginatedResult<MarketplaceWidgetListing>>;
  browse(category?: string, page?: number): Promise<PaginatedResult<MarketplaceWidgetListing>>;
  getFeatured(): Promise<MarketplaceWidgetListing[]>;
  getCategories(): readonly string[];
}

export function createWidgetListingService(): WidgetListingService {
  const api = createMarketplaceAPI();

  return {
    async search(
      query: string,
      page = 0,
    ): Promise<PaginatedResult<MarketplaceWidgetListing>> {
      return api.search({
        query: query || undefined,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        sortBy: 'newest',
      });
    },

    async browse(
      category?: string,
      page = 0,
    ): Promise<PaginatedResult<MarketplaceWidgetListing>> {
      return api.search({
        category: category || undefined,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        sortBy: 'newest',
      });
    },

    async getFeatured(): Promise<MarketplaceWidgetListing[]> {
      return api.getFeatured();
    },

    getCategories(): readonly string[] {
      return CATEGORIES;
    },
  };
}
