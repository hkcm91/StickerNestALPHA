/**
 * WidgetCard — reusable card for widget grid views (browse, library, publisher).
 *
 * @module shell/pages/marketplace/shared
 * @layer L6
 */

import React from 'react';

import { themeVar } from '../../../theme/theme-vars';
import { cardStyle, officialBadge } from '../styles';

import { PriceTag } from './PriceTag';
import { StarRating } from './StarRating';

export interface WidgetCardProps {
  id: string;
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
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
  return (
    <div
      data-testid="marketplace-widget-card"
      onClick={() => onClick(id)}
      style={{
        ...cardStyle,
        opacity: isDeprecated ? 0.6 : 1,
        position: 'relative',
      }}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={name}
          style={{ width: '100%', height: '140px', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '140px',
            background: themeVar('--sn-bg'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            color: themeVar('--sn-text-muted'),
          }}
        >
          W
        </div>
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
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
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
              '—'
            )}
            <span style={{ marginLeft: 4 }}>
              {installCount.toLocaleString()} installs
            </span>
          </span>
          <PriceTag isFree={isFree} priceCents={priceCents} currency={currency} style={{ fontSize: '12px' }} />
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
