/**
 * FeaturedSection — horizontal scroll of featured widgets.
 *
 * @module shell/pages/marketplace/browse
 * @layer L6
 */

import React, { useEffect, useState } from 'react';

import type { MarketplaceAPI } from '../../../../marketplace/api/marketplace-api';
import type { MarketplaceWidgetListing } from '../../../../marketplace/api/types';
import { themeVar } from '../../../theme/theme-vars';
import { WidgetCard } from '../shared/WidgetCard';
import { sectionHeading } from '../styles';

export interface FeaturedSectionProps {
  api: MarketplaceAPI;
  onWidgetClick: (widgetId: string) => void;
  /** Render an action slot for each card (e.g., InstallButton). */
  renderAction?: (widget: MarketplaceWidgetListing) => React.ReactNode;
}

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({
  api,
  onWidgetClick,
  renderAction,
}) => {
  const [featured, setFeatured] = useState<MarketplaceWidgetListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getFeatured().then((items) => {
      if (!cancelled) {
        setFeatured(items);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [api]);

  if (loading) {
    return (
      <div style={{ marginBottom: '24px' }}>
        <h2 style={sectionHeading}>Featured</h2>
        <div style={{ color: themeVar('--sn-text-muted'), fontSize: '14px' }}>
          Loading featured widgets...
        </div>
      </div>
    );
  }

  if (featured.length === 0) return null;

  return (
    <div data-testid="featured-section" style={{ marginBottom: '32px' }}>
      <h2 style={sectionHeading}>Featured</h2>
      <div
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}
      >
        {featured.map((widget) => (
          <div key={widget.id} style={{ flex: '0 0 240px' }}>
            <WidgetCard
              id={widget.id}
              name={widget.name}
              description={widget.description}
              thumbnailUrl={widget.thumbnailUrl}
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
          </div>
        ))}
      </div>
    </div>
  );
};
