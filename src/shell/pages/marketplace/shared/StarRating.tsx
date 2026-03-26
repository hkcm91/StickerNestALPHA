/**
 * StarRating — display (read-only) or interactive (input) star rating.
 *
 * @module shell/pages/marketplace/shared
 * @layer L6
 */

import React, { useCallback, useState } from 'react';

import { themeVar } from '../../../theme/theme-vars';

export interface StarRatingProps {
  /** Current rating value (0–5, decimals allowed for display). */
  value: number;
  /** If provided, the component becomes interactive and calls this on click. */
  onChange?: (rating: number) => void;
  /** Max stars (default 5). */
  max?: number;
  /** Size in px (default 16). */
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  max = 5,
  size = 16,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const interactive = typeof onChange === 'function';

  const handleClick = useCallback(
    (star: number) => {
      if (interactive) onChange!(star);
    },
    [interactive, onChange],
  );

  const displayValue = hovered ?? value;

  return (
    <span
      data-testid="star-rating"
      style={{ display: 'inline-flex', gap: 2, cursor: interactive ? 'pointer' : 'default' }}
      onMouseLeave={() => interactive && setHovered(null)}
    >
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1;
        const filled = displayValue >= star;
        const half = !filled && displayValue >= star - 0.5;
        return (
          <span
            key={star}
            data-testid={`star-${star}`}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={() => handleClick(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onKeyDown={(e) => {
              if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleClick(star);
              }
            }}
            style={{
              fontSize: size,
              lineHeight: 1,
              color: filled || half ? '#f59e0b' : themeVar('--sn-text-muted'),
              transition: 'color 0.1s',
            }}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            {filled ? '\u2605' : half ? '\u2BEA' : '\u2606'}
          </span>
        );
      })}
    </span>
  );
};
