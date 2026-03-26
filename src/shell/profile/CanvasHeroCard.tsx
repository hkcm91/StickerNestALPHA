/**
 * CanvasHeroCard — large featured canvas card for the hero row.
 *
 * Displays a prominent thumbnail with name, description, tags,
 * and recent activity. Used for the top 1-2 most recently updated canvases.
 *
 * @module shell/profile
 * @layer L6
 */

import React from 'react';
import { Link } from 'react-router-dom';

import type { PublicCanvas, CanvasCategory } from '../../kernel/social-graph';
import { deriveCanvasCategory } from '../../kernel/social-graph';
import { themeVar } from '../theme/theme-vars';

const CATEGORY_LABELS: Record<CanvasCategory, string> = {
  public: 'Public',
  private: 'Private',
  collaborative: 'Collaborative',
};

const CATEGORY_COLORS: Record<CanvasCategory, string> = {
  public: '#22c55e',
  private: '#f59e0b',
  collaborative: '#3b82f6',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function placeholderGradient(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hash * 7) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 60%, 65%) 0%, hsl(${hue2}, 50%, 55%) 100%)`;
}

export interface CanvasHeroCardProps {
  canvas: PublicCanvas;
}

export const CanvasHeroCard: React.FC<CanvasHeroCardProps> = ({ canvas }) => {
  const category = deriveCanvasCategory(canvas);
  const visibleTags = (canvas.tags ?? []).slice(0, 5);

  return (
    <Link
      to={canvas.slug ? `/canvas/${canvas.slug}` : `/canvas/${canvas.id}`}
      data-testid="canvas-hero-card"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        borderRadius: 'var(--sn-radius, 8px)',
        border: `1px solid ${themeVar('--sn-border')}`,
        background: themeVar('--sn-surface'),
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      {/* Large thumbnail */}
      <div
        data-testid="hero-thumbnail"
        style={{
          height: 240,
          background: canvas.thumbnailUrl
            ? `url(${canvas.thumbnailUrl}) center/cover no-repeat`
            : placeholderGradient(canvas.id),
          position: 'relative',
        }}
      >
        {/* Category badge */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '4px 12px',
            borderRadius: 16,
            background: 'rgba(0,0,0,0.6)',
            color: CATEGORY_COLORS[category],
            fontSize: 12,
            fontWeight: 600,
            backdropFilter: 'blur(4px)',
          }}
        >
          {CATEGORY_LABELS[category]}
        </div>

        {/* Updated time */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            padding: '3px 10px',
            borderRadius: 12,
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 500,
            backdropFilter: 'blur(4px)',
          }}
        >
          {relativeTime(canvas.updatedAt)}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px' }}>
        <div
          data-testid="hero-name"
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: themeVar('--sn-text'),
            marginBottom: 6,
          }}
        >
          {canvas.name}
        </div>

        {canvas.description && (
          <div
            style={{
              fontSize: 13,
              color: themeVar('--sn-text-muted'),
              lineHeight: 1.5,
              marginBottom: 10,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          >
            {canvas.description}
          </div>
        )}

        {visibleTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {visibleTags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '2px 10px',
                  borderRadius: 12,
                  background: themeVar('--sn-surface-raised'),
                  color: themeVar('--sn-text-muted'),
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};
