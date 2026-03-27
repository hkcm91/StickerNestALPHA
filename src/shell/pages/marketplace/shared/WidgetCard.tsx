/**
 * WidgetCard — reusable card for widget grid views (browse, library, publisher).
 *
 * @module shell/pages/marketplace/shared
 * @layer L6
 */

import React, { useState } from 'react';

import { ANIMATION_DURATION, ANIMATION_EASING } from '../../../theme/animation-tokens';
import { themeVar } from '../../../theme/theme-vars';
import { cardStyle, officialBadge } from '../styles';

import { PriceTag } from './PriceTag';
import { StarRating } from './StarRating';
import { WidgetThumbnail } from './WidgetThumbnail';

export interface WidgetCardProps {
  id: string;
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  category?: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  installCount: number;
  isFree: boolean;
  priceCents?: number | null;
  currency?: string;
  isOfficial?: boolean;
  isDeprecated?: boolean;
  onClick: (widgetId: string) => void;
  /** Optional action slot rendered below the card body (e.g., InstallButton). */
  action?: React.ReactNode;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  id,
  name,
  description,
  thumbnailUrl,
  category,
  ratingAverage,
  ratingCount,
  installCount,
  isFree,
  priceCents,
  currency,
  isOfficial,
  isDeprecated,
  onClick,
  action,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-testid="marketplace-widget-card"
      onClick={() => onClick(id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardStyle,
        opacity: isDeprecated ? 0.6 : 1,
        position: 'relative',
        transform: hovered ? 'scale(1.02) translateY(-2px)' : 'scale(1) translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(0, 0, 0, 0.3)' : 'none',
        borderColor: hovered ? themeVar('--sn-accent') : undefined,
        transition: `transform ${ANIMATION_DURATION.fast} ${ANIMATION_EASING.spring}, box-shadow ${ANIMATION_DURATION.fast} ${ANIMATION_EASING.spring}, border-color ${ANIMATION_DURATION.fast} ${ANIMATION_EASING.spring}`,
      }}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={name}
          style={{ width: '100%', height: '140px', objectFit: 'cover' }}
        />
      ) : (
        <WidgetThumbnail name={name} category={category} />
      )}

      {isDeprecated && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 600,
            background: '#6b7280',
            color: '#fff',
          }}
        >
          Deprecated
        </div>
      )}

      <div style={{ padding: '12px' }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '15px',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {name}
          {isOfficial && <span style={officialBadge}>Official</span>}
        </div>

        {description && (
          <div
            style={{
              fontSize: '13px',
              color: themeVar('--sn-text-muted'),
              marginBottom: '8px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.4',
            }}
          >
            {description}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: themeVar('--sn-text-muted'),
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {ratingAverage !== null ? (
              <>
                <StarRating value={ratingAverage} size={12} />
                <span>({ratingCount})</span>
              </>
            ) : (
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 600,
                  background: themeVar('--sn-accent'),
                  color: '#fff',
                }}
              >
                New
              </span>
            )}
            {installCount > 0 && (
              <span style={{ marginLeft: 4 }}>
                {installCount.toLocaleString()} installs
              </span>
            )}
          </span>
          {!isFree && (
            <PriceTag isFree={isFree} priceCents={priceCents} currency={currency} style={{ fontSize: '12px' }} />
          )}
        </div>

        {action && (
          <div style={{ marginTop: '8px' }} onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        )}
      </div>
    </div>
  );
};
