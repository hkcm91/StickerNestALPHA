/**
 * DetailPage — full widget detail with info, manifest, install/buy, and reviews.
 *
 * Handles ?purchase=success query param for post-Stripe auto-install.
 *
 * @module shell/pages/marketplace/detail
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useAuthStore } from '../../../../kernel/stores/auth/auth.store';
import { useWidgetStore } from '../../../../kernel/stores/widget/widget.store';
import { createMarketplaceAPI } from '../../../../marketplace/api/marketplace-api';
import type { MarketplaceWidgetDetail } from '../../../../marketplace/api/types';
import { createInstallFlowService } from '../../../../marketplace/install/install-flow';
import { buildWidgetPackage, downloadPackage } from '../../../../runtime/package/builder';
import { themeVar } from '../../../theme/theme-vars';
import { InstallButton, type InstallState, type UninstallState } from '../shared/InstallButton';
import { LicenseBadge } from '../shared/LicenseBadge';
import { StarRating } from '../shared/StarRating';
import { WidgetThumbnail } from '../shared/WidgetThumbnail';
import { btnPrimary, btnSecondary, officialBadge, pageStyle, tagStyle } from '../styles';

import { ReviewsSection } from './ReviewsSection';

export const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const api = useMemo(() => createMarketplaceAPI(), []);
  const installService = useMemo(() => createInstallFlowService(), []);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const widgetRegistry = useWidgetStore((s) => s.registry);

  const [detail, setDetail] = useState<MarketplaceWidgetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [uninstallState, setUninstallState] = useState<UninstallState>('idle');

  // Find a registry entry by direct key, widgetId, or manifest.id
  const findRegistryEntry = useCallback((lookupId: string) => {
    // Direct key match
    if (widgetRegistry[lookupId]) return widgetRegistry[lookupId];
    // Search all entries by widgetId or manifest.id
    for (const entry of Object.values(widgetRegistry)) {
      if (entry.widgetId === lookupId || entry.manifest.id === lookupId) return entry;
    }
    return null;
  }, [widgetRegistry]);

  // Construct a MarketplaceWidgetDetail from a local registry entry
  const detailFromRegistry = useCallback((lookupId: string): MarketplaceWidgetDetail | null => {
    const entry = findRegistryEntry(lookupId);
    if (!entry) return null;
    const m = entry.manifest;
    return {
      id: lookupId, // preserve the URL id so install/uninstall buttons work with it
      name: m.name,
      slug: m.id,
      description: m.description ?? null,
      version: m.version,
      authorId: null,
      thumbnailUrl: null,
      iconUrl: null,
      category: m.category ?? null,
      tags: m.tags ?? [],
      license: 'MIT',
      isPublished: true,
      isDeprecated: false,
      installCount: 0,
      ratingAverage: null,
      ratingCount: 0,
      isFree: true,
      priceCents: null,
      currency: 'usd',
      stripePriceId: null,
      metadata: { official: entry.isBuiltIn, builtIn: entry.isBuiltIn },
      createdAt: entry.installedAt,
      updatedAt: entry.installedAt,
      htmlContent: entry.htmlContent,
      manifest: m,
    };
  }, [findRegistryEntry]);

  // Load widget detail — try Supabase first, fall back to local widgetStore registry
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api.getWidget(id).then((widget) => {
      if (cancelled) return;
      if (widget) {
        setDetail(widget);
      } else {
        const fallback = detailFromRegistry(id);
        if (fallback) setDetail(fallback);
      }
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      const fallback = detailFromRegistry(id);
      if (fallback) setDetail(fallback);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [api, id, widgetRegistry]);

  // Handle post-purchase auto-install with retry (webhook may not have fired yet)
  useEffect(() => {
    if (searchParams.get('purchase') !== 'success' || !detail || !userId || isInstalled) return;

    let attempts = 0;
    const maxAttempts = 5;
    let cancelled = false;

    async function tryInstall() {
      if (cancelled) return;
      attempts++;
      try {
        const result = await installService.install(userId!, detail!.id);
        if (cancelled) return;
        if (result.success) {
          setInstallState('installed');
          setSearchParams({}, { replace: true });
          return;
        }
        // Payment not yet recorded by webhook — retry after delay
        if (attempts < maxAttempts) {
          setTimeout(tryInstall, 2000);
        } else {
          setInstallState('error');
          setSearchParams({}, { replace: true });
        }
      } catch {
        if (cancelled) return;
        if (attempts < maxAttempts) {
          setTimeout(tryInstall, 2000);
        } else {
          setInstallState('error');
          setSearchParams({}, { replace: true });
        }
      }
    }

    tryInstall();
    return () => { cancelled = true; };
  }, [detail, searchParams]);

  const isInstalled = useMemo(() => {
    if (!detail) return false;
    if (uninstallState === 'uninstalled') return false;
    // Check by UUID, manifest.id (slug), and slug — covers built-in widgets whose
    // registry key (sn.builtin.*) differs from the Supabase row UUID.
    return !!findRegistryEntry(detail.id)
      || !!findRegistryEntry(detail.manifest.id)
      || (detail.slug ? !!findRegistryEntry(detail.slug) : false)
      || installState === 'installed';
  }, [detail, widgetRegistry, installState, uninstallState, findRegistryEntry]);

  const isBuiltIn = useMemo(() => {
    if (!detail) return false;
    return (findRegistryEntry(detail.id) ?? findRegistryEntry(detail.manifest.id))?.isBuiltIn === true;
  }, [detail, widgetRegistry, findRegistryEntry]);

  const handleInstall = useCallback(
    async (widgetId: string) => {
      if (!userId) return;
      setInstallState('installing');
      try {
        const result = await installService.install(userId, widgetId);
        setInstallState(result.success ? 'installed' : 'error');
      } catch {
        setInstallState('error');
      }
    },
    [userId, installService],
  );

  const handleUninstall = useCallback(
    async (widgetId: string) => {
      if (!userId) return;
      setUninstallState('uninstalling');
      try {
        const result = await installService.uninstall(userId, widgetId, { confirmed: true });
        setUninstallState(result.success ? 'uninstalled' : 'error');
      } catch {
        setUninstallState('error');
      }
    },
    [userId, installService],
  );

  const handleDownloadZip = useCallback(() => {
    if (!detail) return;
    const entry = findRegistryEntry(detail.id);
    if (!entry) return;
    const data = buildWidgetPackage({
      manifest: entry.manifest,
      htmlContent: entry.htmlContent,
    });
    downloadPackage(data, `${entry.manifest.id}.snwidget.zip`);
  }, [detail, widgetRegistry]);

  if (loading) {
    return (
      <div data-marketplace-scroll style={pageStyle}>
        <div style={{ color: themeVar('--sn-text-muted'), padding: '40px', textAlign: 'center' }}>
          Loading widget...
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div data-marketplace-scroll style={pageStyle}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            textAlign: 'center',
          }}
        >
          {/* Search icon illustration */}
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ marginBottom: '24px', opacity: 0.4 }}>
            <circle cx="28" cy="28" r="20" stroke={themeVar('--sn-text-muted')} strokeWidth="3" fill="none" />
            <line x1="43" y1="43" x2="58" y2="58" stroke={themeVar('--sn-text-muted')} strokeWidth="3" strokeLinecap="round" />
            <line x1="20" y1="28" x2="36" y2="28" stroke={themeVar('--sn-text-muted')} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600 }}>
            Widget not found
          </h2>
          <p style={{ color: themeVar('--sn-text-muted'), fontSize: '14px', margin: '0 0 24px', maxWidth: '360px' }}>
            This widget may have been removed or the link may be incorrect.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/marketplace')}
              style={btnPrimary}
            >
              Browse Marketplace
            </button>
            <button
              type="button"
              onClick={() => navigate('/marketplace?q=')}
              style={btnSecondary}
            >
              Search for widgets
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOfficial = !!(detail.metadata as Record<string, unknown>)?.official;
  const hasEvents = detail.manifest.events &&
    ((detail.manifest.events.emits && detail.manifest.events.emits.length > 0) ||
     (detail.manifest.events.subscribes && detail.manifest.events.subscribes.length > 0));
  const hasPermissions = detail.manifest.permissions && detail.manifest.permissions.length > 0;

  return (
    <div data-testid="page-marketplace-detail" data-marketplace-scroll style={pageStyle}>
      <button
        type="button"
        onClick={() => navigate('/marketplace')}
        style={{ ...btnSecondary, marginBottom: '16px' }}
      >
        Back to Marketplace
      </button>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Left column: thumbnail + install button */}
        <div style={{ flex: '0 0 280px' }}>
          {detail.thumbnailUrl ? (
            <img
              src={detail.thumbnailUrl}
              alt={detail.name}
              style={{
                width: '100%',
                borderRadius: '8px',
                border: `1px solid ${themeVar('--sn-border')}`,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                borderRadius: '8px',
                border: `1px solid ${themeVar('--sn-border')}`,
                overflow: 'hidden',
              }}
            >
              <WidgetThumbnail name={detail.name} category={detail.category} height={175} />
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <InstallButton
              widgetId={detail.id}
              isInstalled={isInstalled}
              isBuiltIn={isBuiltIn}
              isFree={detail.isFree}
              priceCents={detail.priceCents}
              currency={detail.currency}
              stripePriceId={detail.stripePriceId}
              installState={installState}
              uninstallState={uninstallState}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
            />
            {installState === 'error' && (
              <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>
                Installation failed. Please try again.
              </div>
            )}
            {uninstallState === 'error' && (
              <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>
                Uninstall failed. Please try again.
              </div>
            )}

            {/* Post-install guidance */}
            {isInstalled && !isBuiltIn && (
              <div
                data-testid="post-install-cta"
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: themeVar('--sn-surface'),
                  border: `1px solid ${themeVar('--sn-border')}`,
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                  Widget installed!
                </div>
                <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted'), marginBottom: '8px' }}>
                  Open any canvas and find this widget in the Asset Panel to place it.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => navigate('/')} style={btnPrimary}>
                    Go to Canvas
                  </button>
                  <button type="button" onClick={handleDownloadZip} style={btnSecondary}>
                    Download .zip
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: details */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h1
            style={{
              margin: '0 0 4px',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {detail.name}
            {isOfficial && <span style={{ ...officialBadge, fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>Official</span>}
          </h1>

          <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted'), marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>{isOfficial ? 'StickerNest' : `v${detail.version}`}</span>
            {detail.ratingAverage !== null && (
              <>
                <StarRating value={detail.ratingAverage} size={14} />
                <span>({detail.ratingCount} reviews)</span>
              </>
            )}
            {detail.installCount > 0 && (
              <span>{detail.installCount.toLocaleString()} installs</span>
            )}
          </div>

          {detail.description && (
            <p style={{ lineHeight: 1.6, margin: '0 0 16px', fontSize: '15px' }}>{detail.description}</p>
          )}

          {detail.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {detail.tags.map((tag) => (
                <span key={tag} style={tagStyle}>{tag}</span>
              ))}
            </div>
          )}

          <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted'), display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            {detail.license && <LicenseBadge license={detail.license} />}
            {detail.category && <span>{detail.category}</span>}
          </div>

          {/* Event contract */}
          {hasEvents && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }}>Event Contract</h3>
              {detail.manifest.events?.emits && detail.manifest.events.emits.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: themeVar('--sn-text-muted') }}>Emits:</span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {detail.manifest.events.emits.map((e) => {
                      const label = typeof e === 'string' ? e : e.name;
                      return <span key={label} style={tagStyle}>{label}</span>;
                    })}
                  </div>
                </div>
              )}
              {detail.manifest.events?.subscribes && detail.manifest.events.subscribes.length > 0 && (
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: themeVar('--sn-text-muted') }}>Subscribes:</span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {detail.manifest.events.subscribes.map((e) => {
                      const label = typeof e === 'string' ? e : e.name;
                      return <span key={label} style={tagStyle}>{label}</span>;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Permissions */}
          {hasPermissions && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }}>Permissions</h3>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {detail.manifest.permissions!.map((p: string) => (
                  <span key={p} style={tagStyle}>{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <ReviewsSection widgetId={detail.id} api={api} />
        </div>
      </div>
    </div>
  );
};