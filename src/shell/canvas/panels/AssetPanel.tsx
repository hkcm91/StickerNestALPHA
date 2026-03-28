/**
 * Asset Panel - sticker/widget library, search, drag-to-canvas.
 *
 * @remarks
 * Sticker assets open a settings modal before placement.
 * API assets (icons + lottie) can be searched and placed as canvas entities.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useQuotaCheck } from '../../../kernel/quota';
import { useGalleryStore } from '../../../kernel/stores/gallery';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { useWidgetStore, type WidgetRegistryEntry } from '../../../kernel/stores/widget';
import { StickerSettingsModal, type StickerSettings } from '../../components';
import { UpgradePrompt } from '../../components/UpgradePrompt';
import { searchIconAssets, searchLottieAssets } from '../apis/sticker-asset-apis';

import { DEFAULT_ASSETS, toLibraryLabel } from './asset-panel-data';
import type { AssetItem, AssetPanelProps, AssetTab } from './asset-panel-data';

// Re-export types for external consumers
export type { AssetItem, AssetPanelProps };

/* ── Panel design tokens (CSS vars) ── */
const panelVars = {
  '--asset-panel-space-1': '4px',
  '--asset-panel-space-2': '8px',
  '--asset-panel-space-3': '12px',
  '--asset-panel-space-4': '16px',
  '--asset-panel-radius-sm': '6px',
  '--asset-panel-radius-md': '8px',
  '--asset-panel-border': 'var(--sn-border, #e0e0e0)',
  '--asset-panel-bg': 'var(--sn-surface, #fff)',
  '--asset-panel-subtle': 'var(--sn-bg, #f8f9fa)',
  '--asset-panel-text': 'var(--sn-text, #1a1a2e)',
  '--asset-panel-muted': 'var(--sn-text-muted, #6b7280)',
} as React.CSSProperties;

/* ── Tab button helper ── */
const TabButton: React.FC<{
  label: string;
  tab: AssetTab;
  activeTab: AssetTab;
  onSelect: (t: AssetTab) => void;
}> = ({ label, tab, activeTab, onSelect }) => (
  <button
    type="button"
    role="tab"
    aria-selected={activeTab === tab}
    onClick={() => onSelect(tab)}
    style={{
      border: 'none',
      borderRadius: 'var(--asset-panel-radius-sm)',
      padding: '6px 4px',
      background: activeTab === tab ? 'var(--asset-panel-bg)' : 'transparent',
      color: activeTab === tab ? 'var(--asset-panel-text)' : 'var(--asset-panel-muted)',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: 600,
    }}
  >
    {label}
  </button>
);

/* ── Sticker grid card ── */
const StickerCard: React.FC<{ asset: AssetItem; onClick: () => void }> = ({ asset, onClick }) => (
  <button
    key={asset.id}
    data-testid={`asset-item-${asset.id}`}
    onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 'var(--asset-panel-space-1)', padding: 'var(--asset-panel-space-2)',
      border: '1px solid var(--asset-panel-border)', borderRadius: 'var(--asset-panel-radius-md)',
      background: 'var(--asset-panel-bg)', cursor: 'pointer', fontSize: '11px',
      fontFamily: 'inherit', color: 'var(--asset-panel-text)',
    }}
  >
    <div style={{
      width: '44px', height: '44px', background: 'var(--asset-panel-subtle)',
      borderRadius: 'var(--asset-panel-radius-sm)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: '18px',
    }}>
      {asset.icon ?? '\u2b50'}
    </div>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
      {asset.name}
    </span>
    <span style={{ fontSize: '9px', color: 'var(--asset-panel-muted)', textTransform: 'uppercase' }}>Sticker</span>
  </button>
);

/* ── Widget expandable card ── */
const WidgetCard: React.FC<{
  asset: AssetItem;
  isExpanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
}> = ({ asset, isExpanded, onToggle, onAdd }) => (
  <article data-testid={`asset-item-${asset.id}`} style={{
    border: '1px solid var(--asset-panel-border)', borderRadius: 'var(--asset-panel-radius-md)',
    background: 'var(--asset-panel-bg)', overflow: 'hidden',
  }}>
    <button type="button" data-testid={`widget-card-toggle-${asset.id}`} aria-expanded={isExpanded}
      onClick={onToggle} style={{
        width: '100%', border: 'none', background: 'transparent', padding: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', textAlign: 'left', color: 'inherit',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div aria-hidden style={{
          width: '32px', height: '32px', background: 'var(--asset-panel-subtle)',
          borderRadius: 'var(--asset-panel-radius-sm)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '16px',
        }}>
          {asset.icon ?? '\ud83e\udde9'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--asset-panel-text)' }}>{asset.name}</div>
          <div style={{ fontSize: '10px', color: 'var(--asset-panel-muted)', textTransform: 'capitalize' }}>
            {asset.widgetType ?? 'widget'}
          </div>
        </div>
      </div>
      <span aria-hidden style={{
        fontSize: '12px', color: 'var(--asset-panel-muted)',
        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s',
      }}>{'\u25be'}</span>
    </button>
    {isExpanded && (
      <div style={{
        borderTop: '1px solid var(--asset-panel-border)', padding: '10px',
        display: 'flex', flexDirection: 'column', gap: 'var(--asset-panel-space-2)',
      }}>
        <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.5, color: 'var(--asset-panel-muted)' }}>
          {asset.description ?? 'No description available.'}
        </p>
        <button type="button" data-testid={`widget-card-add-${asset.id}`} onClick={onAdd} style={{
          alignSelf: 'flex-start', border: '1px solid var(--asset-panel-border)',
          borderRadius: 'var(--asset-panel-radius-sm)', background: 'var(--asset-panel-bg)',
          color: 'var(--asset-panel-text)', padding: '6px 10px', fontSize: '11px', cursor: 'pointer',
        }}>
          Add Widget
        </button>
      </div>
    )}
  </article>
);

/* ════════════════════════════════════════════════════════════════════════ */

export const AssetPanel: React.FC<AssetPanelProps> = ({ assets = DEFAULT_ASSETS }) => {
  const mode = useUIStore((s) => s.canvasInteractionMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<AssetTab>('stickers');
  const [expandedWidgets, setExpandedWidgets] = useState<Record<string, boolean>>({});
  const [selectedSticker, setSelectedSticker] = useState<AssetItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { gateResource, blocked, clearBlocked } = useQuotaCheck();
  const installedRegistry = useWidgetStore((s) => s.registry);

  const installedWidgetAssets: AssetItem[] = useMemo(
    () => Object.values(installedRegistry)
      .filter((w: WidgetRegistryEntry) => !w.isBuiltIn)
      .map((w: WidgetRegistryEntry) => ({
        id: w.widgetId, name: w.manifest.name ?? w.widgetId, type: 'widget' as const,
        description: w.manifest.description ?? '', tags: w.manifest.tags ?? [],
        widgetType: 'installed', metadata: { widgetId: w.widgetId },
      })),
    [installedRegistry],
  );

  /* ── API search state ── */
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [iconApiAssets, setIconApiAssets] = useState<AssetItem[]>([]);
  const [lottieApiAssets, setLottieApiAssets] = useState<AssetItem[]>([]);
  const [selectedApiPreviewId, setSelectedApiPreviewId] = useState<string | null>(null);
  const [apiIconColor, setApiIconColor] = useState('#2563eb');

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) { setApiLoading(false); setApiError(null); setIconApiAssets([]); setLottieApiAssets([]); return; }
    let cancelled = false;
    setApiLoading(true); setApiError(null);
    const timer = window.setTimeout(async () => {
      try {
        const [icons, lotties] = await Promise.all([searchIconAssets(trimmed, 8), searchLottieAssets(trimmed, 8)]);
        if (cancelled) return;
        setIconApiAssets(icons.map((item) => {
          const iconPrefix = item.iconKey.split(':')[0] ?? 'icon';
          return { id: item.id, name: item.name, type: 'icon', icon: '\u25A3',
            description: `Iconify icon: ${item.iconKey}`, tags: item.tags, svgContent: item.svgContent,
            assetUrl: item.svgUrl, metadata: { source: item.source, iconKey: item.iconKey, library: toLibraryLabel(iconPrefix) } };
        }));
        setLottieApiAssets(lotties.map((item) => ({
          id: item.id, name: item.name, type: 'lottie', icon: '\u25B6',
          description: 'Lottie animation asset', tags: item.tags, assetUrl: item.assetUrl,
          previewUrl: item.previewUrl, metadata: { source: item.source, library: item.source === 'catalog' ? 'Curated Catalog' : 'Lottie API' },
        })));
      } catch (error) {
        if (cancelled) return;
        setApiError(error instanceof Error ? error.message : 'Failed to load API assets');
      } finally { if (!cancelled) setApiLoading(false); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [searchQuery]);

  const apiAssets = useMemo(() => [...iconApiAssets, ...lottieApiAssets], [iconApiAssets, lottieApiAssets]);

  useEffect(() => {
    if (apiAssets.length === 0) { setSelectedApiPreviewId(null); return; }
    if (!selectedApiPreviewId || !apiAssets.some((a) => a.id === selectedApiPreviewId)) setSelectedApiPreviewId(apiAssets[0].id);
  }, [apiAssets, selectedApiPreviewId]);

  const selectedApiPreviewAsset = useMemo(
    () => apiAssets.find((a) => a.id === selectedApiPreviewId) ?? null,
    [apiAssets, selectedApiPreviewId],
  );

  const widgetRegistry = useWidgetStore((s) => s.registry);
  const allAssets = useMemo(() => {
    const mp: AssetItem[] = Object.values(widgetRegistry).filter((e) => !e.isBuiltIn).map((e) => ({
      id: `mp-${e.widgetId}`, name: e.manifest.name, type: 'widget' as const,
      description: e.manifest.description ?? undefined, tags: e.manifest.tags ?? [],
      widgetType: e.manifest.category ?? 'other', metadata: { widgetId: e.widgetId, marketplace: true },
    }));
    return [...assets, ...mp];
  }, [assets, widgetRegistry]);

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return allAssets;
    const lower = searchQuery.toLowerCase();
    return allAssets.filter((item) =>
      item.name.toLowerCase().includes(lower) || item.type.toLowerCase().includes(lower) ||
      (item.description ?? '').toLowerCase().includes(lower) || (item.widgetType ?? '').toLowerCase().includes(lower) ||
      item.tags?.some((tag) => tag.toLowerCase().includes(lower)) === true);
  }, [assets, searchQuery]);

  const stickerAssets = useMemo(() => filteredAssets.filter((a) => a.type === 'sticker'), [filteredAssets]);
  const widgetAssets = useMemo(() => filteredAssets.filter((a) => a.type === 'widget'), [filteredAssets]);
  const { assets: galleryAssets, uploadAsset, isLoading: galleryLoading, error: galleryError } = useGalleryStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAssetClick = useCallback(async (asset: AssetItem) => {
    if (asset.type === 'sticker' || asset.type === 'gallery') { setSelectedSticker(asset); setIsModalOpen(true); return; }
    if (asset.type === 'icon') {
      if (!asset.svgContent) return;
      bus.emit(CanvasEvents.TOOL_CHANGED, { tool: 'svg', assetId: asset.id, metadata: {
        name: asset.name, svgContent: asset.svgContent, assetUrl: asset.assetUrl, altText: `${asset.name} icon`,
        aspectLocked: false, fill: apiIconColor, stroke: apiIconColor, defaultWidth: 260, defaultHeight: 260 } });
      return;
    }
    if (asset.type === 'lottie') {
      if (!asset.assetUrl) return;
      bus.emit(CanvasEvents.TOOL_CHANGED, { tool: 'lottie', assetId: asset.id, metadata: {
        name: asset.name, assetUrl: asset.assetUrl, loop: true, speed: 1, direction: 1, autoplay: true,
        altText: `${asset.name} animation`, aspectLocked: true, stickerAssetUrl: asset.previewUrl } });
      return;
    }
    const result = await gateResource('widgets_per_canvas');
    if (!result.allowed) return;
    bus.emit(CanvasEvents.TOOL_CHANGED, { tool: 'widget', widgetId: asset.id, metadata: asset.metadata });
  }, [apiIconColor, gateResource]);

  const toggleWidgetExpansion = useCallback((id: string) => {
    setExpandedWidgets((c) => ({ ...c, [id]: !c[id] }));
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await uploadAsset(file);
  }, [uploadAsset]);

  const handleModalClose = useCallback(() => { setIsModalOpen(false); setSelectedSticker(null); }, []);

  const handleStickerConfirm = useCallback((settings: StickerSettings) => {
    if (!selectedSticker) return;
    let clickEventPayload: Record<string, unknown> | undefined;
    try { const parsed = JSON.parse(settings.clickEventPayload); if (Object.keys(parsed).length > 0) clickEventPayload = parsed; } catch { /* skip */ }
    bus.emit(CanvasEvents.TOOL_CHANGED, { tool: 'sticker', assetId: selectedSticker.id,
      assetUrl: selectedSticker.assetUrl, assetType: selectedSticker.assetType ?? 'image', metadata: {
        ...selectedSticker.metadata, altText: settings.altText || undefined, hoverEffect: settings.hoverEffect,
        aspectLocked: settings.aspectLocked, clickEventType: settings.clickEventType || undefined, clickEventPayload } });
    setIsModalOpen(false); setSelectedSticker(null);
  }, [selectedSticker]);

  if (mode !== 'edit') return null;

  return (
    <>
      <div data-testid="asset-panel" style={{ ...panelVars, fontFamily: 'var(--sn-font-family, system-ui)',
        fontSize: '13px', display: 'flex', flexDirection: 'column', height: '100%',
        background: 'var(--asset-panel-bg)', color: 'var(--asset-panel-text)' }}>

        {/* Header */}
        <div style={{ padding: 'var(--asset-panel-space-2) var(--asset-panel-space-3)', fontWeight: 600,
          fontSize: '12px', color: 'var(--asset-panel-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
          borderBottom: '1px solid var(--asset-panel-border)' }}>Assets</div>

        {/* Search + Tabs */}
        <div style={{ padding: 'var(--asset-panel-space-3)', display: 'flex', flexDirection: 'column',
          gap: 'var(--asset-panel-space-2)', borderBottom: '1px solid var(--asset-panel-border)' }}>
          <input data-testid="asset-search" type="text" placeholder="Search assets..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '7px 10px',
              border: '1px solid var(--asset-panel-border)', borderRadius: 'var(--asset-panel-radius-sm)',
              fontSize: '12px', fontFamily: 'inherit', outline: 'none', background: 'var(--asset-panel-subtle)',
              color: 'var(--asset-panel-text)', boxSizing: 'border-box' }} />
          <div role="tablist" aria-label="Asset categories" style={{ display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--asset-panel-space-1)',
            background: 'var(--asset-panel-subtle)', borderRadius: 'var(--asset-panel-radius-sm)',
            padding: 'var(--asset-panel-space-1)' }}>
            <TabButton label="Stickers" tab="stickers" activeTab={activeTab} onSelect={setActiveTab} />
            <TabButton label="Widgets" tab="widgets" activeTab={activeTab} onSelect={setActiveTab} />
            <TabButton label="Gallery" tab="gallery" activeTab={activeTab} onSelect={setActiveTab} />
            <TabButton label="API" tab="api" activeTab={activeTab} onSelect={setActiveTab} />
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--asset-panel-space-3)' }}>

          {/* ── Stickers tab ── */}
          {activeTab === 'stickers' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--asset-panel-space-2)' }}>
              {stickerAssets.map((a) => <StickerCard key={a.id} asset={a} onClick={() => handleAssetClick(a)} />)}
            </div>
          )}

          {/* ── Gallery tab ── */}
          {activeTab === 'gallery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--asset-panel-space-3)' }}>
              {galleryError && <div style={{ fontSize: '11px', color: '#b91c1c', border: '1px solid #fecaca',
                borderRadius: 'var(--asset-panel-radius-sm)', background: '#fef2f2',
                padding: 'var(--asset-panel-space-2)', marginBottom: 'var(--asset-panel-space-1)' }}>{galleryError}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--asset-panel-space-2)',
                padding: 'var(--asset-panel-space-2)', border: '1px dashed var(--asset-panel-border)',
                borderRadius: 'var(--asset-panel-radius-md)', background: 'var(--asset-panel-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--asset-panel-muted)' }}>Upload your own photos to use as stickers.</div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={galleryLoading} style={{
                  alignSelf: 'center', padding: '6px 12px', background: 'var(--sn-accent, #3b82f6)', color: 'white',
                  border: 'none', borderRadius: 'var(--asset-panel-radius-sm)', fontSize: '11px', fontWeight: 600,
                  cursor: galleryLoading ? 'not-allowed' : 'pointer', opacity: galleryLoading ? 0.7 : 1 }}>
                  {galleryLoading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
              {galleryAssets.length === 0 && !galleryLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--asset-panel-muted)', fontSize: '11px', padding: 'var(--asset-panel-space-4)' }}>
                  No photos in your gallery yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--asset-panel-space-2)' }}>
                  {galleryAssets.map((ga) => (
                    <button key={ga.id} onClick={() => handleAssetClick({ id: ga.id, name: ga.name, type: 'gallery',
                      assetUrl: ga.url, assetType: 'image', metadata: {} })} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--asset-panel-space-1)',
                        padding: 'var(--asset-panel-space-1)', border: '1px solid var(--asset-panel-border)',
                        borderRadius: 'var(--asset-panel-radius-md)', background: 'var(--asset-panel-bg)',
                        cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit', color: 'var(--asset-panel-text)', minWidth: 0 }}>
                      <img src={ga.url} alt={ga.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover',
                        borderRadius: 'var(--asset-panel-radius-sm)' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{ga.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Widgets tab ── */}
          {activeTab === 'widgets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--asset-panel-space-2)' }}>
              {installedWidgetAssets.length > 0 && (
                <>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.3px', color: 'var(--asset-panel-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Installed</div>
                  {installedWidgetAssets.map((a) => (
                    <button key={a.id} data-testid={`installed-widget-${a.id}`} onClick={() => handleAssetClick(a)} style={{
                      width: '100%', border: '1px solid var(--sn-accent, #6366f1)', borderRadius: 'var(--asset-panel-radius-md)',
                      background: 'var(--asset-panel-bg)', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px',
                      cursor: 'pointer', textAlign: 'left', color: 'inherit', fontSize: '12px' }}>
                      <div style={{ width: '32px', height: '32px', background: 'var(--sn-accent, #6366f1)',
                        borderRadius: 'var(--asset-panel-radius-sm)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '14px', color: '#fff' }}>{a.icon ?? '\u2b50'}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--asset-panel-muted)' }}>Marketplace</div>
                      </div>
                    </button>
                  ))}
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.3px', color: 'var(--asset-panel-muted)',
                    textTransform: 'uppercase', marginTop: '8px', marginBottom: '2px' }}>Built-in</div>
                </>
              )}
              {widgetAssets.map((a) => (
                <WidgetCard key={a.id} asset={a} isExpanded={expandedWidgets[a.id] === true}
                  onToggle={() => toggleWidgetExpansion(a.id)} onAdd={() => handleAssetClick(a)} />
              ))}
            </div>
          )}

          {/* ── API tab ── */}
          {activeTab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--asset-panel-space-3)' }}>
              {apiLoading && <div style={{ fontSize: '12px', color: 'var(--asset-panel-muted)', border: '1px dashed var(--asset-panel-border)',
                borderRadius: 'var(--asset-panel-radius-sm)', padding: 'var(--asset-panel-space-2)' }}>Searching icon and lottie APIs...</div>}
              {apiError && <div style={{ fontSize: '12px', color: '#b91c1c', border: '1px solid #fecaca',
                borderRadius: 'var(--asset-panel-radius-sm)', background: '#fef2f2', padding: 'var(--asset-panel-space-2)' }}>{apiError}</div>}

              {/* Preview card */}
              {selectedApiPreviewAsset && (
                <section style={{ border: '1px solid var(--asset-panel-border)', borderRadius: 'var(--asset-panel-radius-md)',
                  background: 'var(--asset-panel-bg)', padding: 'var(--asset-panel-space-2)', display: 'flex',
                  flexDirection: 'column', gap: 'var(--asset-panel-space-2)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.3px', color: 'var(--asset-panel-muted)', textTransform: 'uppercase' }}>API Preview</div>
                  <div style={{ minHeight: '120px', borderRadius: 'var(--asset-panel-radius-sm)',
                    border: '1px solid var(--asset-panel-border)', background: 'var(--asset-panel-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {selectedApiPreviewAsset.type === 'icon' && selectedApiPreviewAsset.svgContent ? (
                      <div aria-label={`${selectedApiPreviewAsset.name} icon preview`} style={{ width: '88px', height: '88px', color: apiIconColor }}
                        dangerouslySetInnerHTML={{ __html: selectedApiPreviewAsset.svgContent }} />
                    ) : selectedApiPreviewAsset.type === 'lottie' && selectedApiPreviewAsset.previewUrl ? (
                      <img src={selectedApiPreviewAsset.previewUrl} alt={`${selectedApiPreviewAsset.name} preview`}
                        style={{ width: '100%', height: '120px', objectFit: 'cover' }} loading="lazy" />
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--asset-panel-muted)', padding: '0 10px' }}>Preview unavailable for this asset.</div>
                    )}
                  </div>
                  {selectedApiPreviewAsset.type === 'icon' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--asset-panel-muted)' }}>
                      Icon color
                      <input type="color" value={apiIconColor} onChange={(e) => setApiIconColor(e.target.value)} aria-label="Icon color"
                        style={{ width: '30px', height: '22px', border: '1px solid var(--asset-panel-border)', borderRadius: '4px', padding: 0, background: 'transparent', cursor: 'pointer' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--asset-panel-text)' }}>{apiIconColor.toUpperCase()}</span>
                    </label>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--asset-panel-text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {selectedApiPreviewAsset.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--asset-panel-muted)' }}>
                        {String(selectedApiPreviewAsset.metadata.library ?? selectedApiPreviewAsset.metadata.source ?? 'API')}</div>
                    </div>
                    <button type="button" onClick={() => handleAssetClick(selectedApiPreviewAsset)} style={{
                      border: '1px solid var(--asset-panel-border)', borderRadius: 'var(--asset-panel-radius-sm)',
                      background: 'var(--asset-panel-bg)', color: 'var(--asset-panel-text)', padding: '6px 10px',
                      fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Add Asset</button>
                  </div>
                </section>
              )}

              {/* Icon results */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--asset-panel-space-2)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--asset-panel-text)' }}>Icons</div>
                {iconApiAssets.length === 0 && !apiLoading ? (
                  <div style={{ fontSize: '11px', color: 'var(--asset-panel-muted)' }}>Search with 2+ characters to load icons.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--asset-panel-space-2)' }}>
                    {iconApiAssets.map((a) => (
                      <button key={a.id} type="button" data-testid={`api-icon-${a.id}`} onClick={() => handleAssetClick(a)}
                        onMouseEnter={() => setSelectedApiPreviewId(a.id)} onFocus={() => setSelectedApiPreviewId(a.id)}
                        style={{ border: '1px solid var(--asset-panel-border)', borderRadius: 'var(--asset-panel-radius-sm)',
                          padding: 'var(--asset-panel-space-2)', background: 'var(--asset-panel-bg)', textAlign: 'left',
                          cursor: 'pointer', fontSize: '11px', color: 'var(--asset-panel-text)' }}>
                        {a.svgContent && <div aria-hidden style={{ width: '24px', height: '24px', marginBottom: '6px', color: apiIconColor }}
                          dangerouslySetInnerHTML={{ __html: a.svgContent }} />}
                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{a.name}</div>
                        <div style={{ color: 'var(--asset-panel-muted)' }}>{String(a.metadata.library ?? 'Iconify')} • Add as SVG</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lottie results */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--asset-panel-space-2)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--asset-panel-text)' }}>Lottie</div>
                {lottieApiAssets.length === 0 && !apiLoading ? (
                  <div style={{ fontSize: '11px', color: 'var(--asset-panel-muted)' }}>Search with 2+ characters to load animations.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--asset-panel-space-2)' }}>
                    {lottieApiAssets.map((a) => (
                      <button key={a.id} type="button" data-testid={`api-lottie-${a.id}`} onClick={() => handleAssetClick(a)}
                        onMouseEnter={() => setSelectedApiPreviewId(a.id)} onFocus={() => setSelectedApiPreviewId(a.id)}
                        style={{ border: '1px solid var(--asset-panel-border)', borderRadius: 'var(--asset-panel-radius-sm)',
                          padding: 'var(--asset-panel-space-2)', background: 'var(--asset-panel-bg)', textAlign: 'left',
                          cursor: 'pointer', fontSize: '11px', color: 'var(--asset-panel-text)' }}>
                        {a.previewUrl && <img src={a.previewUrl} alt={`${a.name} preview`} style={{ width: '100%', height: '72px',
                          objectFit: 'cover', borderRadius: 'var(--asset-panel-radius-sm)', marginBottom: '6px',
                          border: '1px solid var(--asset-panel-border)' }} loading="lazy" />}
                        <div style={{ fontWeight: 600 }}>{a.name}</div>
                        <div style={{ color: 'var(--asset-panel-muted)' }}>{String(a.metadata.library ?? 'Lottie')} • Add as animation</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!apiLoading && filteredAssets.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--asset-panel-muted)', fontSize: '12px',
              padding: 'var(--asset-panel-space-4)', border: '1px dashed var(--asset-panel-border)',
              borderRadius: 'var(--asset-panel-radius-sm)' }}>No assets found</div>
          )}
        </div>
      </div>

      <StickerSettingsModal isOpen={isModalOpen} onClose={handleModalClose} onConfirm={handleStickerConfirm}
        assetUrl={selectedSticker?.assetUrl} assetType={selectedSticker?.assetType} />

      {blocked && <UpgradePrompt resource={blocked.resource} current={blocked.current} limit={blocked.limit}
        upgradeTier={blocked.upgradeTier as 'creator' | 'pro' | 'enterprise' | null} onClose={clearBlocked} />}
    </>
  );
};
