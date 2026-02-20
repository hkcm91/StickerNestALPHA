/**
 * Review Manager
 *
 * Ratings and reviews CRUD for marketplace widgets.
 * DB trigger automatically updates rating_average/rating_count on widgets table.
 *
 * @module marketplace/reviews
 * @layer L5
 */

import { createMarketplaceAPI } from '../api/marketplace-api';
import type { WidgetReview, PaginatedResult } from '../api/marketplace-api';

const DEFAULT_PAGE_SIZE = 20;

export interface ReviewManager {
  getReviews(widgetId: string, page?: number): Promise<PaginatedResult<WidgetReview>>;
  addReview(widgetId: string, rating: number, text?: string): Promise<void>;
  updateReview(widgetId: string, rating: number, text?: string): Promise<void>;
  deleteReview(widgetId: string): Promise<void>;
  getUserReview(widgetId: string): Promise<WidgetReview | null>;
}

export function createReviewManager(userId: string): ReviewManager {
  const api = createMarketplaceAPI();

  return {
    async getReviews(
      widgetId: string,
      page = 0,
    ): Promise<PaginatedResult<WidgetReview>> {
      return api.getReviews(widgetId, page, DEFAULT_PAGE_SIZE);
    },

    async addReview(widgetId: string, rating: number, text?: string): Promise<void> {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }
      return api.addReview(widgetId, userId, rating, text);
    },

    async updateReview(widgetId: string, rating: number, text?: string): Promise<void> {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }
      return api.updateReview(widgetId, userId, rating, text);
    },

    async deleteReview(widgetId: string): Promise<void> {
      return api.deleteReview(widgetId, userId);
    },

    async getUserReview(widgetId: string): Promise<WidgetReview | null> {
      const result = await api.getReviews(widgetId, 0, 1000);
      return result.items.find((r) => r.userId === userId) ?? null;
    },
  };
}
