/**
 * LibraryPage — shows user's installed widgets with uninstall management.
 *
 * @module shell/pages/marketplace/library
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { WidgetManifest, WidgetPackageContents } from '@sn/types';

import { useAuthStore } from '../../../../kernel/stores/auth/auth.store';
import { useWidgetStore } from '../../../../kernel/stores/widget/widget.store';
import { extractWidgetPackage } from '../../../../runtime/package/extractor';
import { generateManifestFromHtml } from '../../../../runtime/ai/manifest-generator';
import { createMarketplaceAPI } from '../../../../marketplace/api/marketplace-api';
import type { MarketplaceWidgetListing } from '../../../../marketplace/api/types';
import { createInstallFlowService } from '../../../../marketplace/install/install-flow';
import { themeVar } from '../../../theme/theme-vars';
import { InstallButton, type UninstallState } from '../shared/InstallButton';
import { WidgetCard } from '../shared/WidgetCard';
import { btnSecondary, pageStyle, sectionHeading } from '../styles';
import { PackageUpload } from '../shared/PackageUpload';
import { ManifestReview } from '../shared/ManifestReview';

export const LibraryPage: React.FC = () => {
  const api = useMemo(() => createMarketplaceAPI(), []);
  const installService = useMemo(() => createInstallFlowService(), []);
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const widgetRegistry = useWidgetStore((s) => s.registry);

  const [widgets, setWidgets] = useState<MarketplaceWidgetListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [uninstallStatus, setUninstallStatus] = useState<Record<string, UninstallState>>({});

  // Package upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingPackage, setPendingPackage] = useState<{
    contents: WidgetPackageContents;
    data: ArrayBuffer;
  } | null>(null);

  const handlePackageLoaded = useCallback((data: ArrayBuffer) => {
    setUploadError(null);
    const result = extractWidgetPackage(data);
    if (!result.success) {
      setUploadError(result.error);
      return;
    }
    let contents = result.contents;
    if (contents.manifestGenerated) {
      const aiResult = generateManifestFromHtml(contents.htmlContent);
      contents = { ...contents, manifest: aiResult.manifest, manifestConfidence: aiResult.confidence };
    }
    setPendingPackage({ contents, data });
  }, []);

  const handleInstallPackage = useCallback(async (manifest: WidgetManifest) => {
    if (!userId || !pendingPackage) return;
    setUploadLoading(true);
    try {
      const result = await installService.installFromPackage(userId, pendingPackage.data, manifest);
      if (result.success) {
        setPendingPackage(null);
        setShowUpload(false);
        const items = await api.getInstalledWidgets(userId);
        setWidgets(items);
      } else {
        setUploadError(result.error ?? 'Installation failed');
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Installation failed');
    } finally {
      setUploadLoading(false);
    }
  }, [userId, pendingPackage, installService, api]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api.getInstalledWidgets(userId).then((items) => {
      if (!cancelled) {
        setWidgets(items);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [api, userId]);

  const handleWidgetClick = useCallback(
    (widgetId: string) => navigate(`/marketplace/widget/${widgetId}`),
    [navigate],
  );

  const handleUninstall = useCallback(
    async (widgetId: string) => {
      if (!userId) return;
      setUninstallStatus((prev) => ({ ...prev, [widgetId]: 'uninstalling' }));
      try {
        const result = await installService.uninstall(userId, widgetId, { confirmed: true });
        if (result.success) {
          setUninstallStatus((prev) => ({ ...prev, [widgetId]: 'uninstalled' }));
          setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
        } else {
          setUninstallStatus((prev) => ({ ...prev, [widgetId]: 'error' }));
        }
      } catch {
        setUninstallStatus((prev) => ({ ...prev, [widgetId]: 'error' }));
      }
    },
    [userId, installService],
  );

  // Stub install handler (library only uninstalls)
  const handleInstallNoop = useCallback(async () => {}, []);

  // Include built-in widgets from the registry
  const builtInWidgets = useMemo(() => {
    return Object.values(widgetRegistry)
      .filter((entry) => entry.isBuiltIn)
      .map((entry): MarketplaceWidgetListing => ({
        id: entry.widgetId,
        name: entry.manifest.name,
        slug: entry.widgetId,
        description: entry.manifest.description ?? null,
        version: entry.manifest.version,
        authorId: '',
        thumbnailUrl: null,
        iconUrl: null,
        category: entry.manifest.category ?? null,
        tags: entry.manifest.tags ?? [],
        license: entry.manifest.license ?? 'MIT',
        isPublished: true,
        isDeprecated: false,
        installCount: 0,
        ratingAverage: null,
        ratingCount: 0,
        isFree: true,
        priceCents: null,
        currency: 'usd',
        stripePriceId: null,
        metadata: { builtIn: true },
        createdAt: '',
        updatedAt: '',
      }));
  }, [widgetRegistry]);

  const allWidgets = useMemo(
    () => [...builtInWidgets, ...widgets],
    [builtInWidgets, widgets],
  );

  return (
    <div data-testid="page-marketplace-library" style={pageStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>My Library</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => { setShowUpload(true); setPendingPackage(null); setUploadError(null); }}
            style={{
              ...btnSecondary,
              background: themeVar('--sn-accent'),
              color: '#fff',
              borderColor: themeVar('--sn-accent'),
            }}
          >
            Install from file
          </button>
          <button type="button" onClick={() => navigate('/marketplace')} style={btnSecondary}>
            Browse Marketplace
          </button>
        </div>
      </div>

      {showUpload && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpload(false); }}
        >
          <div
            style={{
              background: themeVar('--sn-bg'),
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '520px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Install Widget from File</h2>
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: themeVar('--sn-text-muted') }}
              >
                &times;
              </button>
            </div>

            {!pendingPackage ? (
              <PackageUpload
                onPackageLoaded={handlePackageLoaded}
                isLoading={uploadLoading}
                error={uploadError}
              />
            ) : (
              <ManifestReview
                manifest={pendingPackage.contents.manifest}
                confidence={pendingPackage.contents.manifestConfidence}
                readme={pendingPackage.contents.readme}
                onConfirm={handleInstallPackage}
                onCancel={() => { setPendingPackage(null); setUploadError(null); }}
                isInstalling={uploadLoading}
              />
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: themeVar('--sn-text-muted'), padding: '40px', textAlign: 'center' }}>
          Loading your widgets...
        </div>
      ) : allWidgets.length === 0 ? (
        <div style={{ color: themeVar('--sn-text-muted'), padding: '40px', textAlign: 'center' }}>
          No widgets installed yet. Browse the marketplace to find widgets.
        </div>
      ) : (
        <>
          {builtInWidgets.length > 0 && (
            <>
              <h2 style={sectionHeading}>Built-in Widgets</h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '16px',
                  marginBottom: '32px',
                }}
              >
                {builtInWidgets.map((widget) => (
                  <WidgetCard
                    key={widget.id}
                    id={widget.id}
                    name={widget.name}
                    description={widget.description}
                    thumbnailUrl={widget.thumbnailUrl}
                    category={widget.category}
                    ratingAverage={widget.ratingAverage}
                    ratingCount={widget.ratingCount}
                    installCount={widget.installCount}
                    isFree={widget.isFree}
                    onClick={handleWidgetClick}
                    action={
                      <InstallButton
                        widgetId={widget.id}
                        isInstalled
                        isBuiltIn
                        isFree
                        onInstall={handleInstallNoop}
                        onUninstall={handleInstallNoop}
                        compact
                      />
                    }
                  />
                ))}
              </div>
            </>
          )}

          {widgets.length > 0 && (
            <>
              <h2 style={sectionHeading}>Installed Widgets</h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '16px',
                }}
              >
                {widgets.map((widget) => (
                  <WidgetCard
                    key={widget.id}
                    id={widget.id}
                    name={widget.name}
                    description={widget.description}
                    thumbnailUrl={widget.thumbnailUrl}
                    category={widget.category}
                    ratingAverage={widget.ratingAverage}
                    ratingCount={widget.ratingCount}
                    installCount={widget.installCount}
                    isFree={widget.isFree}
                    priceCents={widget.priceCents}
                    currency={widget.currency}
                    onClick={handleWidgetClick}
                    action={
                      <InstallButton
                        widgetId={widget.id}
                        isInstalled
                        isBuiltIn={false}
                        isFree={widget.isFree}
                        uninstallState={uninstallStatus[widget.id]}
                        onInstall={handleInstallNoop}
                        onUninstall={handleUninstall}
                        compact
                      />
                    }
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
