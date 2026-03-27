/**
 * WidgetThumbnail — generated gradient card replacing the "W" placeholder.
 *
 * Derives a unique gradient from widget name + category using the SN palette.
 * Shows a category icon and stylized initial.
 *
 * @module shell/pages/marketplace/shared
 * @layer L6
 */

import React from 'react';

import { themeVar } from '../../../theme/theme-vars';

/** Gradient palette pairs — storm, ember, moss, violet, opal blends. */
const GRADIENT_PAIRS = [
  ['#1e3a5f', '#2d5a87'],   // storm
  ['#5f1e1e', '#874a2d'],   // ember
  ['#1e5f3a', '#2d874a'],   // moss
  ['#3a1e5f', '#5f2d87'],   // violet
  ['#1e4f5f', '#2d7a87'],   // opal
  ['#5f4a1e', '#876b2d'],   // amber
  ['#2d1e5f', '#5f2d6b'],   // indigo
  ['#1e5f5f', '#2d8787'],   // teal
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  productivity: '\u2610',   // ballot box
  data: '\u25a6',           // square with diagonal fill
  social: '\u263a',         // smiley
  utilities: '\u2699',      // gear
  games: '\u265e',          // chess knight
  media: '\u25b6',          // play
};

/** Simple hash to derive a consistent index from a string. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export interface WidgetThumbnailProps {
  name: string;
  category?: string | null;
  iconUrl?: string | null;
  height?: number;
}

export const WidgetThumbnail: React.FC<WidgetThumbnailProps> = ({
  name,
  category,
  iconUrl,
  height = 140,
}) => {
  const hash = hashString(name);
  const pair = GRADIENT_PAIRS[hash % GRADIENT_PAIRS.length];
  const angle = (hash % 360);
  const initial = name.charAt(0).toUpperCase();
  const categoryIcon = category ? CATEGORY_ICONS[category.toLowerCase()] : undefined;

  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        background: `linear-gradient(${angle}deg, ${pair[0]}, ${pair[1]})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Frosted glass overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(1px)',
        }}
      />

      {/* Decorative glow circle */}
      <div
        style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${pair[1]}66, transparent 70%)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          style={{
            width: '48px',
            height: '48px',
            objectFit: 'contain',
            position: 'relative',
            zIndex: 1,
          }}
        />
      ) : (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: 1,
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            {initial}
          </span>
          {categoryIcon && (
            <span
              style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              {categoryIcon}
            </span>
          )}
        </div>
      )}

      {/* Category label */}
      {category && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            fontSize: '10px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            zIndex: 1,
          }}
        >
          {category}
        </div>
      )}
    </div>
  );
};
