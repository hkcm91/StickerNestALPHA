/**
 * PriceTag — displays "Free" badge or formatted price.
 *
 * @module shell/pages/marketplace/shared
 * @layer L6
 */

import React from 'react';

export interface PriceTagProps {
  isFree: boolean;
  priceCents?: number | null;
  currency?: string;
  style?: React.CSSProperties;
}

export const PriceTag: React.FC<PriceTagProps> = ({
  isFree,
  priceCents,
  currency = 'usd',
  style,
}) => {
  if (isFree) {
    return (
      <span data-testid="price-tag" style={{ fontWeight: 600, color: '#16a34a', ...style }}>
        Free
      </span>
    );
  }

  const formatted = ((priceCents ?? 0) / 100).toLocaleString(undefined, {
    style: 'currency',
    currency,
  });

  return (
    <span data-testid="price-tag" style={{ fontWeight: 600, ...style }}>
      {formatted}
    </span>
  );
};
