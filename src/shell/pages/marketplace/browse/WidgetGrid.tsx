/**
 * WidgetGrid — paginated grid of WidgetCards with loading/empty states.
 *
 * @module shell/pages/marketplace/browse
 * @layer L6
 */

import React from 'react';

import type { MarketplaceWidgetListing, PaginatedResult } from '../../../../marketplace/api/types';
import { themeVar } from '../../../theme/theme-vars';
import { WidgetCard } from '../shared/WidgetCard';
import { btnSecondary, PAGE_SIZE, sectionHeading } from '../styles';

export interface WidgetGridProps {
  results: PaginatedResult<MarketplaceWidgetListing> | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onWidgetClick: (widgetId: string) => void;
  /** Render an action slot for each card. */
  renderAction?: (widget: MarketplaceWidgetListing) => React.ReactNode;
}

export const WidgetGrid: React.FC<WidgetGridProps> = ({
  results,
  loading,
  page,
  onPageChange,
  onWidgetClick,
  renderAction,
}) => {
  if (loading && !results) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: themeVar('--sn-text-muted') }}>
        Loading widgets...
      </div>
    );
  }

  if (results && results.items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: themeVar('--sn-text-muted') }}>
        No widgets found. Try a different search.
      </div>
    );
  }

  const totalPages = results ? Math.ceil(results.total / PAGE_SIZE) : 0;
  const totalCount = results?.total ?? 0;

  return (
    <>
      <h2 style={{ ...sectionHeading, display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        All Widgets
        {totalCount > 0 && (
          <span style={{ fontSize: '14px', fontWeight: 400, color: themeVar('--sn-text-muted') }}>
            ({totalCount})
          </span>
        )}
      </h2>
      <div
        data-testid="marketplace-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {results?.items.map((widget) => (
          <WidgetCard
            key={widget.id}
            id={widget.id}
            name={widget.name}
            description={widget.description}
            thumbnailUrl={widget.thumbnailUrl}
            category={widget.category}
            ratingAverage={widget.ratingAverage}
            ratingCount={widget.ratingCount}
            installCount={widget.installCount}
            isFree={widget.isFree}
            priceCents={widget.priceCents}
            currency={widget.currency}
            isOfficial={!!(widget.metadata as Record<string, unknown>)?.official}
            onClick={onWidgetClick}
            action={renderAction?.(widget)}
          />
        ))}
      </div>

      {results && results.total > PAGE_SIZE && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '24px',
          }}
        >
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            style={{ ...btnSecondary, opacity: page <= 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <span
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              color: themeVar('--sn-text-muted'),
            }}
          >
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!results.hasMore}
            style={{ ...btnSecondary, opacity: !results.hasMore ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
};
