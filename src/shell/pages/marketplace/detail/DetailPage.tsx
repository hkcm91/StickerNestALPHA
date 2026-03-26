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
import { themeVar } from '../../../theme/theme-vars';
import { InstallButton, type InstallState, type UninstallState } from '../shared/InstallButton';
import { LicenseBadge } from '../shared/LicenseBadge';
import { StarRating } from '../shared/StarRating';
import { btnSecondary, officialBadge, pageStyle, tagStyle } from '../styles';

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

  // Load widget detail
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api.getWidget(id).then((widget) => {
      if (!cancelled) {
        setDetail(widget);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [api, id]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, searchParams]);

  const isInstalled = useMemo(() => {
    if (!detail) return false;
    if (uninstallState === 'uninstalled') return false;
    return detail.id in widgetRegistry || installState === 'installed';
  }, [detail, widgetRegistry, installState, uninstallState]);

  const isBuiltIn = useMemo(() => {
    if (!detail) return false;
    return widgetRegistry[detail.id]?.isBuiltIn === true;
  }, [detail, widgetRegistry]);

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

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ color: themeVar('--sn-text-muted'), padding: '40px', textAlign: 'center' }}>
          Loading widget...
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div style={pageStyle}>
        <button type="button" onClick={() => navigate('/marketplace')} style={{ ...btnSecondary, marginBottom: '16px' }}>
          Back to Marketplace
        </button>
        <div style={{ color: themeVar('--sn-text-muted'), padding: '40px', textAlign: 'center' }}>
          Widget not found.
        </div>
      </div>
    );
  }

  const isOfficial = !!(detail.metadata as Record<string, unknown>)?.official;

  return (
    <div data-testid="page-marketplace-detail" style={pageStyle}>
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
                aspectRatio: '16/10',
                background: themeVar('--sn-surface'),
                borderRadius: '8px',
                border: `1px solid ${themeVar('--sn-border')}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                color: themeVar('--sn-text-muted'),
              }}
            >
              W
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

          <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted'), marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>v{detail.version}</span>
            {detail.ratingAverage !== null && (
              <>
                <StarRating value={detail.ratingAverage} size={14} />
                <span>({detail.ratingCount} reviews)</span>
              </>
            )}
            <span>{detail.installCount.toLocaleString()} installs</span>
          </div>

          {detail.description && (
            <p style={{ lineHeight: 1.6, margin: '0 0 16px' }}>{detail.description}</p>
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
            {detail.category && <span>Category: <strong>{detail.category}</strong></span>}
          </div>

          {/* Event Contract */}
          {detail.manifest.events && (
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Event Contract</h3>
              <div
                style={{
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  background: themeVar('--sn-surface'),
                  padding: '12px',
                  borderRadius: '6px',
                  border: `1px solid ${themeVar('--sn-border')}`,
                }}
              >
                {detail.manifest.events.emits && detail.manifest.events.emits.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Emits:</strong>{' '}
                    {detail.manifest.events.emits
                      .map((e: unknown) =>
                        typeof e === 'string'
                          ? e
                          : ((e as Record<string, unknown>)?.name ??
                             (e as Record<string, unknown>)?.type ??
                             String(e)),
                      )
                      .join(', ')}
                  </div>
                )}
                {detail.manifest.events.subscribes && detail.manifest.events.subscribes.length > 0 && (
                  <div>
                    <strong>Subscribes:</strong>{' '}
                    {detail.manifest.events.subscribes
                      .map((e: unknown) =>
                        typeof e === 'string'
                          ? e
                          : ((e as Record<string, unknown>)?.name ??
                             (e as Record<string, unknown>)?.type ??
                             String(e)),
                      )
                      .join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Permissions */}
          {detail.manifest.permissions && detail.manifest.permissions.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Permissions</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                {detail.manifest.permissions.map((perm: string) => (
                  <li key={perm}>{perm}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Reviews */}
          <ReviewsSection widgetId={detail.id} />
        </div>
      </div>
    </div>
  );
};
