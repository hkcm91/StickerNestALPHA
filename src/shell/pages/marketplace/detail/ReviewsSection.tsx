/**
 * ReviewsSection — paginated reviews list + write/edit review form.
 *
 * @module shell/pages/marketplace/detail
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuthStore } from '../../../../kernel/stores/auth/auth.store';
import type { PaginatedResult, WidgetReview } from '../../../../marketplace/api/types';
import { createReviewManager } from '../../../../marketplace/reviews/review-manager';
import { themeVar } from '../../../theme/theme-vars';
import { StarRating } from '../shared/StarRating';
import { btnDanger, btnPrimary, btnSecondary, inputStyle, sectionHeading } from '../styles';

export interface ReviewsSectionProps {
  widgetId: string;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ widgetId }) => {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const reviewManager = useMemo(
    () => (userId ? createReviewManager(userId) : null),
    [userId],
  );

  const [reviews, setReviews] = useState<PaginatedResult<WidgetReview> | null>(null);
  const [userReview, setUserReview] = useState<WidgetReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Review form state
  const [editing, setEditing] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!reviewManager) return;
    setLoading(true);
    try {
      const [reviewResult, existing] = await Promise.all([
        reviewManager.getReviews(widgetId, page),
        reviewManager.getUserReview(widgetId),
      ]);
      setReviews(reviewResult);
      setUserReview(existing);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [reviewManager, widgetId, page]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const startEditing = useCallback(() => {
    if (userReview) {
      setFormRating(userReview.rating);
      setFormText(userReview.reviewText ?? '');
    } else {
      setFormRating(5);
      setFormText('');
    }
    setEditing(true);
  }, [userReview]);

  const handleSubmit = useCallback(async () => {
    if (!reviewManager) return;
    setSubmitting(true);
    try {
      if (userReview) {
        await reviewManager.updateReview(widgetId, formRating, formText || undefined);
      } else {
        await reviewManager.addReview(widgetId, formRating, formText || undefined);
      }
      setEditing(false);
      await loadReviews();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }, [reviewManager, widgetId, formRating, formText, userReview, loadReviews]);

  const handleDelete = useCallback(async () => {
    if (!reviewManager) return;
    setSubmitting(true);
    try {
      await reviewManager.deleteReview(widgetId);
      setUserReview(null);
      setEditing(false);
      await loadReviews();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }, [reviewManager, widgetId, loadReviews]);

  const totalPages = reviews ? Math.ceil(reviews.total / reviews.pageSize) : 0;

  return (
    <div data-testid="reviews-section" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={sectionHeading}>Reviews</h3>
        {userId && !editing && (
          <button
            type="button"
            onClick={startEditing}
            style={btnSecondary}
            data-testid="write-review-btn"
          >
            {userReview ? 'Edit Review' : 'Write a Review'}
          </button>
        )}
      </div>

      {/* Review form */}
      {editing && (
        <div
          data-testid="review-form"
          style={{
            padding: '16px',
            marginBottom: '16px',
            borderRadius: '8px',
            border: `1px solid ${themeVar('--sn-border')}`,
            background: themeVar('--sn-surface'),
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', marginBottom: '4px', display: 'block' }}>
              Rating
            </label>
            <StarRating value={formRating} onChange={setFormRating} size={24} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', marginBottom: '4px', display: 'block' }}>
              Review (optional)
            </label>
            <textarea
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
              style={{
                ...inputStyle,
                width: '100%',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
              data-testid="review-text-input"
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1 }}
              data-testid="submit-review-btn"
            >
              {submitting ? 'Saving...' : userReview ? 'Update Review' : 'Submit Review'}
            </button>
            <button type="button" onClick={() => setEditing(false)} style={btnSecondary}>
              Cancel
            </button>
            {userReview && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                style={{ ...btnDanger, opacity: submitting ? 0.6 : 1 }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div style={{ color: themeVar('--sn-text-muted'), fontSize: '14px' }}>
          Loading reviews...
        </div>
      ) : reviews && reviews.items.length === 0 ? (
        <div style={{ color: themeVar('--sn-text-muted'), fontSize: '14px' }}>
          No reviews yet. Be the first to review this widget.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reviews?.items.map((review) => (
              <div
                key={review.id}
                data-testid="review-item"
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${themeVar('--sn-border')}`,
                  background: themeVar('--sn-surface'),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <StarRating value={review.rating} size={14} />
                  <span style={{ fontSize: '12px', color: themeVar('--sn-text-muted') }}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                  {review.userId === userId && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '6px',
                        background: themeVar('--sn-accent'),
                        color: '#fff',
                      }}
                    >
                      You
                    </span>
                  )}
                </div>
                {review.reviewText && (
                  <div style={{ fontSize: '14px', lineHeight: 1.5 }}>{review.reviewText}</div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{ ...btnSecondary, opacity: page <= 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <span style={{ padding: '8px 12px', fontSize: '13px', color: themeVar('--sn-text-muted') }}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!reviews?.hasMore}
                style={{ ...btnSecondary, opacity: !reviews?.hasMore ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
