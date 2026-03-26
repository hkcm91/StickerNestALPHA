/**
 * BrowsePage — main marketplace landing: Featured + search + paginated grid.
 *
 * Search/filter/page state is persisted to URL search params so users
 * can navigate to a detail page and back without losing their filters.
 *
 * @module shell/pages/marketplace/browse
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuthStore } from '../../../../kernel/stores/auth/auth.store';
import { useWidgetStore } from '../../../../kernel/stores/widget/widget.store';
import { createMarketplaceAPI } from '../../../../marketplace/api/marketplace-api';
import type { MarketplaceWidgetListing, PaginatedResult } from '../../../../marketplace/api/types';
import { createInstallFlowService } from '../../../../marketplace/install/install-flow';
import { InstallButton, type InstallState, type UninstallState } from '../shared/InstallButton';
import { pageStyle, PAGE_SIZE, type SortBy } from '../styles';

import { FeaturedSection } from './FeaturedSection';
import { SearchBar } from './SearchBar';
import { WidgetGrid } from './WidgetGrid';

export const BrowsePage: React.FC = () => {
  const api = useMemo(() => createMarketplaceAPI(), []);
  const installService = useMemo(() => createInstallFlowService(), []);
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const widgetRegistry = useWidgetStore((s) => s.registry);

  // Persist search state to URL params
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const category = searchParams.get('cat') ?? '';
  const sortBy = (searchParams.get('sort') ?? 'newest') as SortBy;
  const page = parseInt(searchParams.get('page') ?? '1', 10) || 1;

  const [results, setResults] = useState<PaginatedResult<MarketplaceWidgetListing> | null>(null);
  const [loading, setLoading] = useState(false);
  const [installStatus, setInstallStatus] = useState<Record<string, InstallState>>({});
  const [uninstallStatus, setUninstallStatus] = useState<Record<string, UninstallState>>({});

  const updateParam = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        if (value) {
          prev.set(key, value);
        } else {
          prev.delete(key);
        }
        return prev;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const setQuery = useCallback((q: string) => updateParam('q', q), [updateParam]);
  const setCategory = useCallback((cat: string) => {
    updateParam('cat', cat);
    updateParam('page', '');
  }, [updateParam]);
  const setSortBy = useCallback((sort: SortBy) => {
    updateParam('sort', sort === 'newest' ? '' : sort);
    updateParam('page', '');
  }, [updateParam]);
  const setPage = useCallback((p: number) => {
    updateParam('page', p <= 1 ? '' : String(p));
  }, [updateParam]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.search({
        query: query || undefined,
        category: category || undefined,
        page,
        pageSize: PAGE_SIZE,
        sortBy,
      });
      setResults(result);
    } catch {
      setResults({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE, hasMore: false });
    } finally {
      setLoading(false);
    }
  }, [api, query, category, page, sortBy]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleWidgetClick = useCallback(
    (widgetId: string) => navigate(`/marketplace/widget/${widgetId}`),
    [navigate],
  );

  const handleInstall = useCallback(
    async (widgetId: string) => {
      if (!userId) return;
      setInstallStatus((prev) => ({ ...prev, [widgetId]: 'installing' }));
      try {
        const result = await installService.install(userId, widgetId);
        setInstallStatus((prev) => ({
          ...prev,
          [widgetId]: result.success ? 'installed' : 'error',
        }));
      } catch {
        setInstallStatus((prev) => ({ ...prev, [widgetId]: 'error' }));
      }
    },
    [userId, installService],
  );

  const handleUninstall = useCallback(
    async (widgetId: string) => {
      if (!userId) return;
      setUninstallStatus((prev) => ({ ...prev, [widgetId]: 'uninstalling' }));
      try {
        const result = await installService.uninstall(userId, widgetId, { confirmed: true });
        setUninstallStatus((prev) => ({
          ...prev,
          [widgetId]: result.success ? 'uninstalled' : 'error',
        }));
      } catch {
        setUninstallStatus((prev) => ({ ...prev, [widgetId]: 'error' }));
      }
    },
    [userId, installService],
  );

  const isInstalled = useCallback(
    (widgetId: string) => {
      if (uninstallStatus[widgetId] === 'uninstalled') return false;
      return widgetId in widgetRegistry || installStatus[widgetId] === 'installed';
    },
    [widgetRegistry, installStatus, uninstallStatus],
  );

  const isBuiltIn = useCallback(
    (widgetId: string) => widgetRegistry[widgetId]?.isBuiltIn === true,
    [widgetRegistry],
  );

  const handleSearch = useCallback(() => {
    setPage(1);
  }, [setPage]);

  const renderAction = useCallback(
    (widget: MarketplaceWidgetListing) => (
      <InstallButton
        widgetId={widget.id}
        isInstalled={isInstalled(widget.id)}
        isBuiltIn={isBuiltIn(widget.id)}
        isFree={widget.isFree}
        priceCents={widget.priceCents}
        currency={widget.currency}
        stripePriceId={widget.stripePriceId}
        installState={installStatus[widget.id]}
        uninstallState={uninstallStatus[widget.id]}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
        compact
      />
    ),
    [isInstalled, isBuiltIn, installStatus, uninstallStatus, handleInstall, handleUninstall],
  );

  return (
    <div data-testid="page-marketplace" style={pageStyle}>
      <h1 style={{ margin: '0 0 20px', fontSize: '24px' }}>Marketplace</h1>

      <FeaturedSection
        api={api}
        onWidgetClick={handleWidgetClick}
        renderAction={renderAction}
      />

      <SearchBar
        query={query}
        category={category}
        sortBy={sortBy}
        onQueryChange={setQuery}
        onCategoryChange={setCategory}
        onSortChange={setSortBy}
        onSearch={handleSearch}
      />

      <WidgetGrid
        results={results}
        loading={loading}
        page={page}
        onPageChange={setPage}
        onWidgetClick={handleWidgetClick}
        renderAction={renderAction}
      />
    </div>
  );
};
