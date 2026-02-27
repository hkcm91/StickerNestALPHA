/**
 * MarketplacePageFull — Widget marketplace with search, browsing, and install.
 *
 * @module shell/pages
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';
import { createMarketplaceAPI } from '../../marketplace/api/marketplace-api';
import type {
  MarketplaceWidgetListing,
  MarketplaceWidgetDetail,
  PaginatedResult,
} from '../../marketplace/api/types';
import { createInstallFlowService } from '../../marketplace/install/install-flow';
import { themeVar } from '../theme/theme-vars';

const PAGE_SIZE = 20;

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'data', label: 'Data & Databases' },
  { value: 'social', label: 'Social' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'games', label: 'Games' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'installs', label: 'Most Installed' },
] as const;

type SortBy = (typeof SORT_OPTIONS)[number]['value'];
type View = 'listing' | 'detail';

export const MarketplacePageFull: React.FC = () => {
  const api = useMemo(() => createMarketplaceAPI(), []);
  const installService = useMemo(() => createInstallFlowService(), []);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const widgetRegistry = useWidgetStore((s) => s.registry);

  const [view, setView] = useState<View>('listing');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<PaginatedResult<MarketplaceWidgetListing> | null>(null);
  const [detail, setDetail] = useState<MarketplaceWidgetDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [installStatus, setInstallStatus] = useState<Record<string, 'installing' | 'installed' | 'error'>>({});

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.search({
        query: query || undefined, category: category || undefined,
        page, pageSize: PAGE_SIZE, sortBy,
      });
      setResults(result);
    } catch {
      setResults({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE, hasMore: false });
    } finally {
      setLoading(false);
    }
  }, [api, query, category, page, sortBy]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const openDetail = useCallback(async (widgetId: string) => {
    setLoading(true);
    try {
      const widget = await api.getWidget(widgetId);
      if (widget) { setDetail(widget); setView('detail'); }
    } catch {} finally { setLoading(false); }
  }, [api]);

  const goBackToListing = useCallback(() => { setView('listing'); setDetail(null); }, []);

  const handleInstall = useCallback(async (widgetId: string) => {
    if (!userId) return;
    setInstallStatus((prev) => ({ ...prev, [widgetId]: 'installing' }));
    try {
      const result = await installService.install(userId, widgetId);
      setInstallStatus((prev) => ({ ...prev, [widgetId]: result.success ? 'installed' : 'error' }));
    } catch {
      setInstallStatus((prev) => ({ ...prev, [widgetId]: 'error' }));
    }
  }, [userId, installService]);

  const isInstalled = useCallback((widgetId: string) => {
    return widgetId in widgetRegistry || installStatus[widgetId] === 'installed';
  }, [widgetRegistry, installStatus]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { setPage(1); fetchListings(); }
  }, [fetchListings]);

  const pageStyle: React.CSSProperties = {
    minHeight: 'calc(100vh - 44px)', padding: '24px', boxSizing: 'border-box',
    background: themeVar('--sn-bg'), color: themeVar('--sn-text'),
    fontFamily: themeVar('--sn-font-family'), maxWidth: '1100px', margin: '0 auto',
  };
  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', border: `1px solid ${themeVar('--sn-border')}`,
    borderRadius: '6px', background: themeVar('--sn-surface'),
    color: themeVar('--sn-text'), fontSize: '14px', fontFamily: 'inherit',
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
  const btnPrimary: React.CSSProperties = {
    padding: '8px 16px', border: 'none', borderRadius: '6px',
    background: themeVar('--sn-accent'), color: '#fff', cursor: 'pointer',
    fontSize: '14px', fontFamily: 'inherit',
  };
  const btnSecondary: React.CSSProperties = {
    ...btnPrimary, background: 'transparent',
    border: `1px solid ${themeVar('--sn-border')}`, color: themeVar('--sn-text'),
  };

  // Detail view
  if (view === 'detail' && detail) {
    return (
      <div data-testid="page-marketplace-detail" style={pageStyle}>
        <button type="button" onClick={goBackToListing} style={{ ...btnSecondary, marginBottom: '16px' }}>
          Back to Marketplace
        </button>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 280px' }}>
            {detail.thumbnailUrl ? (
              <img src={detail.thumbnailUrl} alt={detail.name} style={{ width: '100%', borderRadius: '8px', border: `1px solid ${themeVar('--sn-border')}` }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '16/10', background: themeVar('--sn-surface'), borderRadius: '8px', border: `1px solid ${themeVar('--sn-border')}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: themeVar('--sn-text-muted') }}>W</div>
            )}
            <div style={{ marginTop: '16px' }}>
              {isInstalled(detail.id) ? (
                <button type="button" disabled style={{ ...btnPrimary, opacity: 0.6, cursor: 'default' }}>Installed</button>
              ) : (
                <button type="button" onClick={() => handleInstall(detail.id)}
                  disabled={installStatus[detail.id] === 'installing'}
                  style={{ ...btnPrimary, opacity: installStatus[detail.id] === 'installing' ? 0.6 : 1 }}
                  data-testid="marketplace-install-btn">
                  {installStatus[detail.id] === 'installing' ? 'Installing...' : detail.isFree ? 'Install' : `Install — $${((detail.priceCents ?? 0) / 100).toFixed(2)}`}
                </button>
              )}
              {installStatus[detail.id] === 'error' && (
                <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>Installation failed. Please try again.</div>
              )}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h1 style={{ margin: '0 0 4px', fontSize: '24px' }}>{detail.name}</h1>
            <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted'), marginBottom: '12px' }}>
              v{detail.version}
              {detail.ratingAverage !== null && <span> — {detail.ratingAverage.toFixed(1)} rating ({detail.ratingCount} reviews)</span>}
              <span> — {detail.installCount.toLocaleString()} installs</span>
            </div>
            {detail.description && <p style={{ lineHeight: 1.6, margin: '0 0 16px' }}>{detail.description}</p>}
            {detail.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {detail.tags.map((tag) => (
                  <span key={tag} style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', background: themeVar('--sn-surface'), border: `1px solid ${themeVar('--sn-border')}` }}>{tag}</span>
                ))}
              </div>
            )}
            <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted') }}>
              <div>License: <strong>{detail.license}</strong></div>
              {detail.category && <div>Category: <strong>{detail.category}</strong></div>}
            </div>
            {detail.manifest.events && (
              <div style={{ marginTop: '16px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Event Contract</h3>
                <div style={{ fontSize: '13px', fontFamily: 'monospace', background: themeVar('--sn-surface'), padding: '12px', borderRadius: '6px', border: `1px solid ${themeVar('--sn-border')}` }}>
                  {detail.manifest.events.emits && detail.manifest.events.emits.length > 0 && (
                    <div style={{ marginBottom: '8px' }}><strong>Emits:</strong> {detail.manifest.events.emits.join(', ')}</div>
                  )}
                  {detail.manifest.events.subscribes && detail.manifest.events.subscribes.length > 0 && (
                    <div><strong>Subscribes:</strong> {detail.manifest.events.subscribes.join(', ')}</div>
                  )}
                </div>
              </div>
            )}
            {detail.manifest.permissions && detail.manifest.permissions.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Permissions</h3>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                  {detail.manifest.permissions.map((perm: string) => <li key={perm}>{perm}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Listing view
  return (
    <div data-testid="page-marketplace" style={pageStyle}>
      <h1 style={{ margin: '0 0 20px', fontSize: '24px' }}>Marketplace</h1>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search widgets..." value={query}
          onChange={(e) => setQuery(e.target.value)} onKeyDown={handleSearchKeyDown}
          style={{ ...inputStyle, flex: 1, minWidth: '200px' }} data-testid="marketplace-search" />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          style={selectStyle} data-testid="marketplace-category">
          {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(1); }}
          style={selectStyle} data-testid="marketplace-sort">
          {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      {loading && !results ? (
        <div style={{ textAlign: 'center', padding: '40px', color: themeVar('--sn-text-muted') }}>Loading widgets...</div>
      ) : results && results.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: themeVar('--sn-text-muted') }}>No widgets found. Try a different search.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }} data-testid="marketplace-grid">
            {results?.items.map((widget) => (
              <div key={widget.id} data-testid="marketplace-widget-card" onClick={() => openDetail(widget.id)}
                style={{ border: `1px solid ${themeVar('--sn-border')}`, borderRadius: themeVar('--sn-radius'), background: themeVar('--sn-surface'), overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                {widget.thumbnailUrl ? (
                  <img src={widget.thumbnailUrl} alt={widget.name} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '140px', background: themeVar('--sn-bg'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: themeVar('--sn-text-muted') }}>W</div>
                )}
                <div style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{widget.name}</div>
                  {widget.description && (
                    <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted'), marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {widget.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: themeVar('--sn-text-muted') }}>
                    <span>{widget.ratingAverage !== null ? `${widget.ratingAverage.toFixed(1)}` : '—'} · {widget.installCount.toLocaleString()} installs</span>
                    <span style={{ fontWeight: 600, color: widget.isFree ? '#16a34a' : themeVar('--sn-text') }}>
                      {widget.isFree ? 'Free' : `$${((widget.priceCents ?? 0) / 100).toFixed(2)}`}
                    </span>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    {isInstalled(widget.id) ? (
                      <span style={{ fontSize: '12px', color: themeVar('--sn-text-muted') }}>Installed</span>
                    ) : (
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleInstall(widget.id); }}
                        disabled={installStatus[widget.id] === 'installing'}
                        style={{ padding: '4px 12px', border: 'none', borderRadius: '4px', background: themeVar('--sn-accent'), color: '#fff', cursor: installStatus[widget.id] === 'installing' ? 'not-allowed' : 'pointer', fontSize: '12px', fontFamily: 'inherit', opacity: installStatus[widget.id] === 'installing' ? 0.6 : 1 }}>
                        {installStatus[widget.id] === 'installing' ? 'Installing...' : 'Install'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {results && results.total > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                style={{ ...btnSecondary, opacity: page <= 1 ? 0.5 : 1 }}>Previous</button>
              <span style={{ padding: '8px 12px', fontSize: '14px', color: themeVar('--sn-text-muted') }}>
                Page {page} of {Math.ceil(results.total / PAGE_SIZE)}
              </span>
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={!results.hasMore}
                style={{ ...btnSecondary, opacity: !results.hasMore ? 0.5 : 1 }}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
