/**
 * Review Manager Tests
 *
 * @module marketplace/reviews
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createReviewManager } from './review-manager';

const mockAddReview = vi.fn();
const mockUpdateReview = vi.fn();
const mockDeleteReview = vi.fn();
const mockGetReviews = vi.fn();

vi.mock('../api/marketplace-api', () => ({
  createMarketplaceAPI: () => ({
    addReview: mockAddReview,
    updateReview: mockUpdateReview,
    deleteReview: mockDeleteReview,
    getReviews: mockGetReviews,
  }),
}));

describe('ReviewManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addReview', () => {
    it('adds a review with valid rating', async () => {
      mockAddReview.mockResolvedValue(undefined);

      const manager = createReviewManager('user1');
      await manager.addReview('w1', 4, 'Good widget');

      expect(mockAddReview).toHaveBeenCalledWith('w1', 'user1', 4, 'Good widget');
    });

    it('rejects rating below 1', async () => {
      const manager = createReviewManager('user1');

      await expect(manager.addReview('w1', 0)).rejects.toThrow('Rating must be between 1 and 5');
    });

    it('rejects rating above 5', async () => {
      const manager = createReviewManager('user1');

      await expect(manager.addReview('w1', 6)).rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  describe('updateReview', () => {
    it('updates an existing review', async () => {
      mockUpdateReview.mockResolvedValue(undefined);

      const manager = createReviewManager('user1');
      await manager.updateReview('w1', 5, 'Updated text');

      expect(mockUpdateReview).toHaveBeenCalledWith('w1', 'user1', 5, 'Updated text');
    });

    it('validates rating range on update', async () => {
      const manager = createReviewManager('user1');

      await expect(manager.updateReview('w1', 0)).rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  describe('deleteReview', () => {
    it('deletes user review', async () => {
      mockDeleteReview.mockResolvedValue(undefined);

      const manager = createReviewManager('user1');
      await manager.deleteReview('w1');

      expect(mockDeleteReview).toHaveBeenCalledWith('w1', 'user1');
    });
  });

  describe('getReviews', () => {
    it('returns paginated reviews', async () => {
      mockGetReviews.mockResolvedValue({
        items: [{ id: 'r1', rating: 4, userId: 'user2' }],
        total: 1,
        page: 0,
        pageSize: 20,
        hasMore: false,
      });

      const manager = createReviewManager('user1');
      const result = await manager.getReviews('w1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].rating).toBe(4);
    });
  });

  describe('getUserReview', () => {
    it('returns current user review', async () => {
      mockGetReviews.mockResolvedValue({
        items: [
          { id: 'r1', userId: 'user1', rating: 5 },
          { id: 'r2', userId: 'user2', rating: 3 },
        ],
        total: 2,
        page: 0,
        pageSize: 1000,
        hasMore: false,
      });

      const manager = createReviewManager('user1');
      const review = await manager.getUserReview('w1');

      expect(review).not.toBeNull();
      expect(review?.rating).toBe(5);
    });

    it('returns null if user has no review', async () => {
      mockGetReviews.mockResolvedValue({
        items: [{ id: 'r1', userId: 'user2', rating: 3 }],
        total: 1,
        page: 0,
        pageSize: 1000,
        hasMore: false,
      });

      const manager = createReviewManager('user1');
      const review = await manager.getUserReview('w1');

      expect(review).toBeNull();
    });
  });
});
