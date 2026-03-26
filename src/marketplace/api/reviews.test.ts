/**
 * Marketplace reviews tests
 *
 * @module marketplace/api
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getReviews, addReview, updateReview, deleteReview } from './reviews';

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

const makeReviewRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  widget_id: 'w1',
  user_id: 'u1',
  rating: 4,
  review_text: 'Nice widget',
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  ...overrides,
});

describe('reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of Object.values(mockChain)) {
      (method as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);
    }
  });

  describe('getReviews', () => {
    it('returns paginated reviews', async () => {
      mockChain.range.mockResolvedValue({
        data: [makeReviewRow(), makeReviewRow({ id: 'r2', user_id: 'u2' })],
        error: null,
        count: 5,
      });

      const result = await getReviews('w1', 0, 2);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.page).toBe(0);
      expect(result.pageSize).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('hasMore is false when all items fit on page', async () => {
      mockChain.range.mockResolvedValue({
        data: [makeReviewRow()],
        error: null,
        count: 1,
      });

      const result = await getReviews('w1', 0, 10);

      expect(result.hasMore).toBe(false);
    });

    it('returns empty items when no reviews exist', async () => {
      mockChain.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      const result = await getReviews('w1', 0, 10);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('throws on error', async () => {
      mockChain.range.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
        count: null,
      });

      await expect(getReviews('w1', 0, 10)).rejects.toThrow('Failed to fetch reviews: DB error');
    });

    it('maps review rows to domain objects', async () => {
      mockChain.range.mockResolvedValue({
        data: [makeReviewRow({ rating: 5, review_text: 'Excellent!' })],
        error: null,
        count: 1,
      });

      const result = await getReviews('w1', 0, 10);

      expect(result.items[0].rating).toBe(5);
      expect(result.items[0].reviewText).toBe('Excellent!');
      expect(result.items[0].widgetId).toBe('w1');
    });
  });

  describe('addReview', () => {
    it('inserts a review with text', async () => {
      mockChain.insert.mockResolvedValue({ error: null });

      await expect(addReview('w1', 'u1', 4, 'Great widget')).resolves.not.toThrow();

      expect(mockChain.insert).toHaveBeenCalledWith({
        widget_id: 'w1',
        user_id: 'u1',
        rating: 4,
        review_text: 'Great widget',
      });
    });

    it('inserts a review without text (defaults to null)', async () => {
      mockChain.insert.mockResolvedValue({ error: null });

      await addReview('w1', 'u1', 5);

      expect(mockChain.insert).toHaveBeenCalledWith({
        widget_id: 'w1',
        user_id: 'u1',
        rating: 5,
        review_text: null,
      });
    });

    it('throws on insert error', async () => {
      mockChain.insert.mockResolvedValue({ error: { message: 'Duplicate' } });

      await expect(addReview('w1', 'u1', 4, 'text')).rejects.toThrow(
        'Failed to add review: Duplicate',
      );
    });
  });

  describe('updateReview', () => {
    it('updates rating and text for a specific widget+user', async () => {
      const eqSecond = vi.fn().mockResolvedValue({ error: null });
      mockChain.eq.mockReturnValue({ eq: eqSecond });

      await expect(updateReview('w1', 'u1', 3, 'Updated text')).resolves.not.toThrow();

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 3,
          review_text: 'Updated text',
        }),
      );
    });

    it('defaults text to null when not provided', async () => {
      const eqSecond = vi.fn().mockResolvedValue({ error: null });
      mockChain.eq.mockReturnValue({ eq: eqSecond });

      await updateReview('w1', 'u1', 2);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 2,
          review_text: null,
        }),
      );
    });

    it('throws on update error', async () => {
      const eqSecond = vi.fn().mockResolvedValue({ error: { message: 'Not found' } });
      mockChain.eq.mockReturnValue({ eq: eqSecond });

      await expect(updateReview('w1', 'u1', 3)).rejects.toThrow(
        'Failed to update review: Not found',
      );
    });
  });

  describe('deleteReview', () => {
    it('deletes review for specific widget+user', async () => {
      const eqSecond = vi.fn().mockResolvedValue({ error: null });
      mockChain.eq.mockReturnValue({ eq: eqSecond });

      await expect(deleteReview('w1', 'u1')).resolves.not.toThrow();
    });

    it('throws on delete error', async () => {
      const eqSecond = vi.fn().mockResolvedValue({ error: { message: 'Not found' } });
      mockChain.eq.mockReturnValue({ eq: eqSecond });

      await expect(deleteReview('w1', 'u1')).rejects.toThrow(
        'Failed to delete review: Not found',
      );
    });
  });
});
