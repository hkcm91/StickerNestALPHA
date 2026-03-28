/**
 * CanvasGallerySection — canvas gallery with hero row, filters, tags, search, and grid.
 *
 * Used within the unified ProfilePage. Shows different views for
 * own profile (all canvases + CRUD + filters) vs other user (public only).
 *
 * @module shell/profile
 * @layer L6
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { PublicCanvas } from '../../kernel/social-graph';
import { deriveCanvasCategory } from '../../kernel/social-graph';
import { themeVar } from '../theme/theme-vars';

import { CanvasCard } from './CanvasCard';
import { CanvasHeroCard } from './CanvasHeroCard';

// ── Filter Types ─────────────────────────────────────────────────

export type CanvasFilter = 'all' | 'public' | 'private' | 'collaborative' | 'shared';

const FILTER_TABS: Array<{ id: CanvasFilter; label: string; ownOnly?: boolean }> = [
  { id: 'all', label: 'All' },
  { id: 'public', label: 'Public' },
  { id: 'private', label: 'Private', ownOnly: true },
  { id: 'collaborative', label: 'Collaborative' },
  { id: 'shared', label: 'Shared with me', ownOnly: true },
];

// ── Component ────────────────────────────────────────────────────

export interface CanvasGallerySectionProps {
  ownedCanvases: PublicCanvas[];
  sharedCanvases: PublicCanvas[];
  isOwnProfile: boolean;
  onCreateCanvas?: () => void;
  onDuplicateCanvas?: (canvas: PublicCanvas) => void;
  onDeleteCanvas?: (canvas: PublicCanvas) => void;
  onSetSlug?: (canvas: PublicCanvas, slug: string | null) => void;
}

export const CanvasGallerySection: React.FC<CanvasGallerySectionProps> = ({
  ownedCanvases,
  sharedCanvases,
  isOwnProfile,
  onCreateCanvas,
  onDuplicateCanvas,
  onDeleteCanvas,
  onSetSlug,
}) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<CanvasFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const c of ownedCanvases) {
      for (const t of c.tags ?? []) tagSet.add(t);
    }
    for (const c of sharedCanvases) {
      for (const t of c.tags ?? []) tagSet.add(t);
    }
    return Array.from(tagSet).sort();
  }, [ownedCanvases, sharedCanvases]);

  // Apply filters
  const filteredCanvases = useMemo(() => {
    let canvases: PublicCanvas[];

    switch (activeFilter) {
      case 'shared':
        canvases = sharedCanvases;
        break;
      case 'public':
        canvases = ownedCanvases.filter((c) => deriveCanvasCategory(c) === 'public');
        break;
      case 'private':
        canvases = ownedCanvases.filter((c) => deriveCanvasCategory(c) === 'private');
        break;
      case 'collaborative':
        canvases = [
          ...ownedCanvases.filter((c) => deriveCanvasCategory(c) === 'collaborative'),
          ...sharedCanvases,
        ];
        break;
      default:
        canvases = [...ownedCanvases, ...sharedCanvases];
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      canvases = canvases.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description?.toLowerCase().includes(q) ?? false) ||
          (c.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Tag filter
    if (activeTag) {
      canvases = canvases.filter((c) => (c.tags ?? []).includes(activeTag));
    }

    // Sort by most recently updated
    return canvases.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [ownedCanvases, sharedCanvases, activeFilter, searchQuery, activeTag]);

  // Hero canvases: first 2 from the filtered list
  const heroCanvases = filteredCanvases.slice(0, 2);
  const gridCanvases = filteredCanvases.slice(2);

  const visibleTabs = isOwnProfile
    ? FILTER_TABS
    : FILTER_TABS.filter((t) => !t.ownOnly);

  const handleCreateClick = useCallback(() => {
    if (onCreateCanvas) {
      onCreateCanvas();
    } else {
      navigate('/canvas/new');
    }
  }, [onCreateCanvas, navigate]);

  return (
    <div
      data-testid="canvas-gallery-section"
      style={{
        padding: '24px',
        background: themeVar('--sn-surface'),
        borderLeft: `1px solid ${themeVar('--sn-border')}`,
        borderRight: `1px solid ${themeVar('--sn-border')}`,
        borderBottom: `1px solid ${themeVar('--sn-border')}`,
        borderRadius: '0 0 var(--sn-radius, 8px) var(--sn-radius, 8px)',
      }}
    >
      {/* Header row: title + create button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2
          data-testid="gallery-heading"
          style={{ margin: 0, fontSize: 18, fontWeight: 600, color: themeVar('--sn-text') }}
        >
          Canvases
        </h2>
        {isOwnProfile && (
          <button
            data-testid="create-canvas-btn"
            onClick={handleCreateClick}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--sn-radius, 8px)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: 'var(--sn-accent, #6366f1)',
              color: '#fff',
              fontFamily: 'var(--sn-font-family, system-ui)',
            }}
          >
            New Canvas
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div
        data-testid="filter-tabs"
        style={{
          display: 'flex',
          gap: 2,
          marginBottom: 12,
          borderBottom: `1px solid ${themeVar('--sn-border')}`,
          paddingBottom: 0,
        }}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`filter-${tab.id}`}
            onClick={() => setActiveFilter(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeFilter === tab.id
                ? '2px solid var(--sn-accent, #6366f1)'
                : '2px solid transparent',
              background: 'transparent',
              color: activeFilter === tab.id ? themeVar('--sn-text') : themeVar('--sn-text-muted'),
              fontSize: 13,
              fontWeight: activeFilter === tab.id ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + tag chips */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          data-testid="canvas-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search canvases..."
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--sn-radius, 6px)',
            border: `1px solid ${themeVar('--sn-border')}`,
            background: themeVar('--sn-bg'),
            color: themeVar('--sn-text'),
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
            minWidth: 200,
          }}
        />

        {allTags.length > 0 && (
          <div
            data-testid="tag-filter-chips"
            style={{
              display: 'flex',
              gap: 4,
              flexWrap: 'wrap',
              flex: 1,
              overflow: 'hidden',
            }}
          >
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                style={{
                  ...tagChipStyle,
                  background: 'var(--sn-accent, #6366f1)',
                  color: '#fff',
                }}
              >
                {activeTag} x
              </button>
            )}
            {allTags
              .filter((t) => t !== activeTag)
              .slice(0, 10)
              .map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  style={tagChipStyle}
                >
                  {tag}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Canvas content */}
      {filteredCanvases.length === 0 ? (
        <div
          data-testid="no-canvases"
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: themeVar('--sn-text-muted'),
          }}
        >
          {searchQuery || activeTag
            ? 'No canvases match your search.'
            : isOwnProfile
              ? 'No canvases yet. Create your first canvas!'
              : 'No public canvases yet.'}
        </div>
      ) : (
        <>
          {/* Hero row */}
          {heroCanvases.length > 0 && (
            <div
              data-testid="hero-row"
              style={{
                display: 'grid',
                gridTemplateColumns: heroCanvases.length === 1 ? '1fr' : '1fr 1fr',
                gap: 16,
                marginBottom: gridCanvases.length > 0 ? 20 : 0,
              }}
            >
              {heroCanvases.map((c) => (
                <CanvasHeroCard key={c.id} canvas={c} />
              ))}
            </div>
          )}

          {/* Grid */}
          {gridCanvases.length > 0 && (
            <div
              data-testid="canvas-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              {gridCanvases.map((c) => (
                <CanvasCard
                  key={c.id}
                  canvas={c}
                  isOwnProfile={isOwnProfile}
                  onDuplicate={onDuplicateCanvas}
                  onDelete={onDeleteCanvas}
                  onSetSlug={onSetSlug}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const tagChipStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 12,
  border: 'none',
  background: 'var(--sn-surface-raised, #2a2a30)',
  color: 'var(--sn-text-muted, #9ca3af)',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.15s',
};
