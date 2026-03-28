/**
 * CanvasCard — visual card for displaying a canvas in the gallery grid.
 *
 * Shows thumbnail (or gradient placeholder), name, description snippet,
 * tag chips, category badge, and last-updated time. Hover reveals CRUD
 * actions for the owner.
 *
 * @module shell/profile
 * @layer L6
 */

import React, { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import type { PublicCanvas, CanvasCategory } from '../../kernel/social-graph';
import { deriveCanvasCategory, validateSlug } from '../../kernel/social-graph';
import { themeVar } from '../theme/theme-vars';

// ── Icons ────────────────────────────────────────────────────────

const GlobeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UsersIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const LinkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const PencilIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CATEGORY_CONFIG: Record<CanvasCategory, { icon: React.FC; label: string; color: string }> = {
  public: { icon: GlobeIcon, label: 'Public', color: '#22c55e' },
  private: { icon: LockIcon, label: 'Private', color: '#f59e0b' },
  collaborative: { icon: UsersIcon, label: 'Collaborative', color: '#3b82f6' },
};

// ── Helpers ──────────────────────────────────────────────────────

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

/** Deterministic gradient based on canvas id */
function placeholderGradient(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hash * 7) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 60%, 65%) 0%, hsl(${hue2}, 50%, 55%) 100%)`;
}

// ── Component ────────────────────────────────────────────────────

export interface CanvasCardProps {
  canvas: PublicCanvas;
  isOwnProfile?: boolean;
  onDuplicate?: (canvas: PublicCanvas) => void;
  onDelete?: (canvas: PublicCanvas) => void;
  onSetSlug?: (canvas: PublicCanvas, slug: string | null) => void;
}

export const CanvasCard: React.FC<CanvasCardProps> = ({
  canvas,
  isOwnProfile = false,
  onDuplicate,
  onDelete,
  onSetSlug,
}) => {
  const [hovered, setHovered] = useState(false);
  const [slugEditing, setSlugEditing] = useState(false);
  const [slugInput, setSlugInput] = useState(canvas.slug ?? '');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const category = deriveCanvasCategory(canvas);
  const catConfig = CATEGORY_CONFIG[category];
  const CatIcon = catConfig.icon;
  const tags = canvas.tags ?? [];
  const visibleTags = tags.slice(0, 3);
  const extraTagCount = tags.length - visibleTags.length;

  const handleCopyLink = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canvas.slug) return;
    const url = `${window.location.origin}/canvas/${canvas.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    });
  }, [canvas.slug]);

  const handleSlugSave = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = slugInput.trim().toLowerCase();
    if (!trimmed) {
      setSlugError('Enter a slug or click Clear.');
      return;
    }
    const v = validateSlug(trimmed);
    if (!v.valid) {
      setSlugError(v.error!);
      return;
    }
    setSlugError(null);
    setSlugEditing(false);
    onSetSlug?.(canvas, trimmed);
  }, [slugInput, canvas, onSetSlug]);

  const handleSlugClear = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSlugInput('');
    setSlugError(null);
    setSlugEditing(false);
    onSetSlug?.(canvas, null);
  }, [canvas, onSetSlug]);

  const openSlugEditor = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSlugInput(canvas.slug ?? '');
    setSlugError(null);
    setSlugEditing(true);
  }, [canvas.slug]);

  return (
    <div
      data-testid="canvas-card"
      className="sn-glass sn-neo sn-lift-on-hover sn-holo-border"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Thumbnail */}
      <Link
        to={canvas.slug ? `/canvas/${canvas.slug}` : `/canvas/${canvas.id}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div
          data-testid="canvas-card-thumbnail"
          style={{
            height: 160,
            background: canvas.thumbnailUrl
              ? `url(${canvas.thumbnailUrl}) center/cover no-repeat`
              : placeholderGradient(canvas.id),
            position: 'relative',
          }}
        >
          {/* Category badge */}
          <div
            data-testid="canvas-card-category"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 12,
              background: 'rgba(0,0,0,0.6)',
              color: catConfig.color,
              fontSize: 11,
              fontWeight: 600,
              backdropFilter: 'blur(4px)',
            }}
          >
            <CatIcon />
            {catConfig.label}
          </div>
        </div>
      </Link>

      {/* Content */}
      <div style={{ padding: '12px 14px' }}>
        <Link
          to={canvas.slug ? `/canvas/${canvas.slug}` : `/canvas/${canvas.id}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div
            data-testid="canvas-card-name"
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: themeVar('--sn-text'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 4,
            }}
          >
            {canvas.name}
          </div>
        </Link>

        {canvas.description && (
          <div
            style={{
              fontSize: 12,
              color: themeVar('--sn-text-muted'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 8,
            }}
          >
            {canvas.description}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div
            data-testid="canvas-card-tags"
            style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}
          >
            {visibleTags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '1px 8px',
                  borderRadius: 10,
                  background: themeVar('--sn-surface-raised'),
                  color: themeVar('--sn-text-muted'),
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
            {extraTagCount > 0 && (
              <span
                style={{
                  padding: '1px 8px',
                  borderRadius: 10,
                  background: themeVar('--sn-surface-raised'),
                  color: themeVar('--sn-text-muted'),
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                +{extraTagCount}
              </span>
            )}
          </div>
        )}

        {/* Footer: updated time + member count */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: themeVar('--sn-text-muted'),
          }}
        >
          <span>{relativeTime(canvas.updatedAt)}</span>
          {canvas.memberCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <UsersIcon /> {canvas.memberCount}
            </span>
          )}
        </div>
      </div>

      {/* Hover actions for own canvas */}
      {isOwnProfile && hovered && (
        <div
          data-testid="canvas-card-actions"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 4,
          }}
        >
          {canvas.slug && (
            <button
              onClick={handleCopyLink}
              title={copyFeedback ? 'Copied!' : 'Copy link'}
              data-testid="canvas-copy-link"
              style={{ ...actionBtnStyle, color: copyFeedback ? '#22c55e' : '#fff' }}
            >
              {copyFeedback ? <CheckIcon /> : <LinkIcon />}
            </button>
          )}
          {onSetSlug && (
            <button
              onClick={openSlugEditor}
              title="Set slug"
              data-testid="canvas-set-slug"
              style={actionBtnStyle}
            >
              <PencilIcon />
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={(e) => { e.preventDefault(); onDuplicate(canvas); }}
              title="Duplicate"
              style={actionBtnStyle}
            >
              Dup
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); onDelete(canvas); }}
              title="Delete"
              style={{ ...actionBtnStyle, color: '#ef4444' }}
            >
              Del
            </button>
          )}
        </div>
      )}

      {/* Slug editor popover */}
      {slugEditing && (
        <div
          ref={popoverRef}
          className="sn-glass sn-neo"
          data-testid="slug-editor-popover"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 40,
            right: 8,
            left: 8,
            zIndex: 10,
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          <div style={{ marginBottom: 6, color: themeVar('--sn-text-muted'), fontSize: 11 }}>
            /canvas/<span style={{ color: themeVar('--sn-text') }}>{slugInput || '...'}</span>
          </div>
          <input
            data-testid="slug-input"
            type="text"
            value={slugInput}
            onChange={(e) => {
              setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              setSlugError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSlugSave(e as unknown as React.MouseEvent);
              if (e.key === 'Escape') setSlugEditing(false);
            }}
            placeholder="my-canvas"
            autoFocus
            style={{
              width: '100%',
              padding: '5px 8px',
              border: `1px solid ${slugError ? '#ef4444' : 'var(--sn-border, rgba(255,255,255,0.06))'}`,
              borderRadius: 'var(--sn-radius, 4px)',
              background: 'var(--sn-bg, rgba(10,10,14,0.5))',
              color: 'var(--sn-text, #E8E6ED)',
              fontSize: 12,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          {slugError && (
            <div data-testid="slug-error" style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>
              {slugError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'space-between' }}>
            <button
              onClick={handleSlugSave}
              data-testid="slug-save"
              style={{
                ...actionBtnStyle,
                background: 'var(--sn-accent, #3E7D94)',
                padding: '4px 12px',
              }}
            >
              Save
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              {canvas.slug && (
                <button
                  onClick={handleSlugClear}
                  data-testid="slug-clear"
                  style={{ ...actionBtnStyle, color: '#ef4444', padding: '4px 10px' }}
                >
                  Clear
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setSlugEditing(false); }}
                style={{ ...actionBtnStyle, padding: '4px 10px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const actionBtnStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 6,
  border: 'none',
  background: 'rgba(0,0,0,0.6)',
  color: '#fff',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
};
