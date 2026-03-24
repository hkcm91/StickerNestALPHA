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
import { useGalleryStore } from '../../../kernel/stores/gallery';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { StickerSettingsModal, type StickerSettings } from '../../components';
import { searchIconAssets, searchLottieAssets } from '../apis/sticker-asset-apis';

export interface AssetItem {
  id: string;
  name: string;
  type: 'sticker' | 'widget' | 'icon' | 'lottie' | 'gallery';
  thumbnailUrl?: string;
  icon?: string;
  description?: string;
  tags?: string[];
  widgetType?: string;
  assetUrl?: string;
  assetType?: 'image' | 'gif' | 'video';
  svgContent?: string;
  previewUrl?: string;
  metadata: Record<string, unknown>;
}

export interface AssetPanelProps {
  assets?: AssetItem[];
}

type AssetTab = 'stickers' | 'widgets' | 'api' | 'gallery';

function toLibraryLabel(input: string): string {
  return input
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

const DEFAULT_ASSETS: AssetItem[] = [
  {
    id: 'stk-star',
    name: 'Star',
    type: 'sticker',
    icon: '\u2b50',
    description: 'Five-pointed accent sticker.',
    tags: ['shape', 'highlight'],
    assetUrl: '/assets/stickers/star.png',
    assetType: 'image',
    metadata: { shape: 'star' },
  },
  {
    id: 'stk-heart',
    name: 'Heart',
    type: 'sticker',
    icon: '\u2764\ufe0f',
    description: 'Friendly reaction sticker.',
    tags: ['reaction', 'shape'],
    assetUrl: '/assets/stickers/heart.png',
    assetType: 'image',
    metadata: { shape: 'heart' },
  },
  {
    id: 'stk-arrow',
    name: 'Arrow',
    type: 'sticker',
    icon: '\u27a1\ufe0f',
    description: 'Directional callout sticker.',
    tags: ['pointer', 'annotation'],
    assetUrl: '/assets/stickers/arrow.png',
    assetType: 'image',
    metadata: { shape: 'arrow' },
  },
  {
    id: 'wgt-clock',
    name: 'Clock',
    type: 'widget',
    icon: '\u23f1\ufe0f',
    description: 'Live time widget with timezone-ready display.',
    tags: ['productivity', 'time', 'utility'],
    widgetType: 'information',
    metadata: { widgetType: 'clock' },
  },
  {
    id: 'wgt-note',
    name: 'Sticky Note',
    type: 'widget',
    icon: '\ud83d\udcdd',
    description: 'Quick text capture widget for annotations and reminders.',
    tags: ['notes', 'text', 'collaboration'],
    widgetType: 'content',
    metadata: { widgetType: 'sticky-note' },
  },
  {
    id: 'wgt-counter',
    name: 'Counter',
    type: 'widget',
    icon: '\ud83d\udd22',
    description: 'Increment/decrement control for goals, votes, or tracking.',
    tags: ['input', 'tracking', 'interactive'],
    widgetType: 'control',
    metadata: { widgetType: 'counter' },
  },
  {
    id: 'sn.builtin.image-generator',
    name: 'AI Image Generator',
    type: 'widget',
    icon: '\ud83e\ude84',
    description: 'Generate AI images and place them on the canvas.',
    tags: ['ai', 'image', 'generation', 'creative'],
    widgetType: 'media',
    metadata: { widgetId: 'sn.builtin.image-generator' },
  },
  {
    id: 'sn.builtin.pathfinder',
    name: 'Pathfinder',
    type: 'widget',
    icon: '✨',
    description: 'Vector pathfinder and shapebuilder tool panel.',
    tags: ['vector', 'geometry', 'path', 'shapebuilder'],
    widgetType: 'utility',
    metadata: { widgetId: 'sn.builtin.pathfinder' },
  },
  {
    id: 'sn.builtin.kanban',
    name: 'Kanban Board',
    type: 'widget',
    icon: '📋',
    description: 'Drag-and-drop Kanban board with columns, cards, and color labels.',
    tags: ['productivity', 'project', 'tasks', 'kanban', 'board'],
    widgetType: 'productivity',
    metadata: { widgetId: 'sn.builtin.kanban' },
  },
  {
    id: 'sn.builtin.todo-list',
    name: 'Todo List',
    type: 'widget',
    icon: '✅',
    description: 'Task manager with priorities, filtering, and sorting.',
    tags: ['productivity', 'tasks', 'todo', 'checklist', 'organizer'],
    widgetType: 'productivity',
    metadata: { widgetId: 'sn.builtin.todo-list' },
  },
  {
    id: 'sn.builtin.xc-broadcaster',
    name: 'Broadcaster',
    type: 'widget',
    icon: '📡',
    description: 'Send messages to other canvases via a named channel.',
    tags: ['cross-canvas', 'communication', 'broadcast'],
    widgetType: 'utility',
    metadata: { widgetId: 'sn.builtin.xc-broadcaster' },
  },
  {
    id: 'sn.builtin.xc-listener',
    name: 'Listener',
    type: 'widget',
    icon: '👂',
    description: 'Receive messages from other canvases via a named channel.',
    tags: ['cross-canvas', 'communication', 'listen'],
    widgetType: 'utility',
    metadata: { widgetId: 'sn.builtin.xc-listener' },
  },
  {
    id: 'sn.builtin.data-table',
    name: 'Data Table',
    type: 'widget',
    icon: '📊',
    description: 'Create and read DataSources via the SDK.',
    tags: ['data', 'table', 'datasource', 'test'],
    widgetType: 'data',
    metadata: { widgetId: 'sn.builtin.data-table' },
  },
  {
    id: 'sn.builtin.entity-spawner',
    name: 'Entity Spawner',
    type: 'widget',
    icon: '🔮',
    description: 'Create canvas entities (stickers, text, shapes) via the SDK.',
    tags: ['canvas', 'entity', 'spawn', 'test'],
    widgetType: 'utility',
    metadata: { widgetId: 'sn.builtin.entity-spawner' },
  },
  {
    id: 'sn.builtin.social-feed',
    name: 'Social Feed',
    type: 'widget',
    icon: '📰',
    description: 'Social feed showing posts from followed users.',
    tags: ['social', 'feed', 'posts'],
    widgetType: 'social',
    metadata: { widgetId: 'sn.builtin.social-feed' },
  },
  {
    id: 'sn.builtin.signup',
    name: 'Sign Up',
    type: 'widget',
    icon: '🔐',
    description: 'Email/password signup and login form for canvas visitors.',
    tags: ['commerce', 'auth', 'signup', 'login'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.signup' },
  },
  {
    id: 'sn.builtin.subscribe',
    name: 'Subscribe',
    type: 'widget',
    icon: '💳',
    description: 'Displays canvas subscription tiers for visitor purchase.',
    tags: ['commerce', 'subscription', 'monetization'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.subscribe' },
  },
  {
    id: 'sn.builtin.shop',
    name: 'Shop',
    type: 'widget',
    icon: '🛒',
    description: 'Displays canvas shop items for purchase.',
    tags: ['commerce', 'shop', 'store'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.shop' },
  },
  {
    id: 'sn.builtin.creator-setup',
    name: 'Creator Setup',
    type: 'widget',
    icon: '⚡',
    description: 'Multi-page Stripe Connect onboarding for creators.',
    tags: ['commerce', 'creator', 'stripe', 'onboarding'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.creator-setup' },
  },
  {
    id: 'sn.builtin.tier-manager',
    name: 'Tier Manager',
    type: 'widget',
    icon: '🏷️',
    description: 'Create, edit, and delete subscription tiers.',
    tags: ['commerce', 'creator', 'tiers', 'subscription'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.tier-manager' },
  },
  {
    id: 'sn.builtin.item-manager',
    name: 'Item Manager',
    type: 'widget',
    icon: '📦',
    description: 'Create, edit, and delete shop items.',
    tags: ['commerce', 'creator', 'items', 'products'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.item-manager' },
  },
  {
    id: 'sn.builtin.orders',
    name: 'My Orders',
    type: 'widget',
    icon: '🧾',
    description: 'Purchase history and active subscriptions for buyers.',
    tags: ['commerce', 'buyer', 'orders', 'history'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.orders' },
  },
  {
    id: 'sn.builtin.creator-dashboard',
    name: 'Creator Dashboard',
    type: 'widget',
    icon: '📈',
    description: 'Revenue, subscriber, and order overview for creators.',
    tags: ['commerce', 'creator', 'analytics', 'dashboard'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.creator-dashboard' },
  },
];

export const AssetPanel: React.FC<AssetPanelProps> = ({ assets = DEFAULT_ASSETS }) => {
  const mode = useUIStore((s) => s.canvasInteractionMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<AssetTab>('stickers');
  const [expandedWidgets, setExpandedWidgets] = useState<Record<string, boolean>>({});
  const [selectedSticker, setSelectedSticker] = useState<AssetItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [iconApiAssets, setIconApiAssets] = useState<AssetItem[]>([]);
  const [lottieApiAssets, setLottieApiAssets] = useState<AssetItem[]>([]);
  const [selectedApiPreviewId, setSelectedApiPreviewId] = useState<string | null>(null);
  const [apiIconColor, setApiIconColor] = useState('#2563eb');

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setApiLoading(false);
      setApiError(null);
      setIconApiAssets([]);
      setLottieApiAssets([]);
      return;
    }

    let cancelled = false;
    setApiLoading(true);
    setApiError(null);

    const timer = window.setTimeout(async () => {
      try {
        const [icons, lotties] = await Promise.all([
          searchIconAssets(trimmed, 8),
          searchLottieAssets(trimmed, 8),
        ]);

        if (cancelled) return;

        setIconApiAssets(
          icons.map((item) => {
            const iconPrefix = item.iconKey.split(':')[0] ?? 'icon';
            return {
              id: item.id,
              name: item.name,
              type: 'icon',
              icon: '\u25A3',
              description: `Iconify icon: ${item.iconKey}`,
              tags: item.tags,
              svgContent: item.svgContent,
              assetUrl: item.svgUrl,
              metadata: {
                source: item.source,
                iconKey: item.iconKey,
                library: toLibraryLabel(iconPrefix),
              },
            };
          }),
        );

        setLottieApiAssets(
          lotties.map((item) => ({
            id: item.id,
            name: item.name,
            type: 'lottie',
            icon: '\u25B6',
            description: 'Lottie animation asset',
            tags: item.tags,
            assetUrl: item.assetUrl,
            previewUrl: item.previewUrl,
            metadata: {
              source: item.source,
              library: item.source === 'catalog' ? 'Curated Catalog' : 'Lottie API',
            },
          })),
        );
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load API assets';
        setApiError(message);
      } finally {
        if (!cancelled) {
          setApiLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const apiAssets = useMemo(() => [...iconApiAssets, ...lottieApiAssets], [iconApiAssets, lottieApiAssets]);

  useEffect(() => {
    if (apiAssets.length === 0) {
      setSelectedApiPreviewId(null);
      return;
    }

    if (!selectedApiPreviewId || !apiAssets.some((asset) => asset.id === selectedApiPreviewId)) {
      setSelectedApiPreviewId(apiAssets[0].id);
    }
  }, [apiAssets, selectedApiPreviewId]);

  const selectedApiPreviewAsset = useMemo(
    () => apiAssets.find((asset) => asset.id === selectedApiPreviewId) ?? null,
    [apiAssets, selectedApiPreviewId],
  );

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const lower = searchQuery.toLowerCase();
    return assets.filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        item.type.toLowerCase().includes(lower) ||
        (item.description ?? '').toLowerCase().includes(lower) ||
        (item.widgetType ?? '').toLowerCase().includes(lower) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(lower)) === true,
    );
  }, [assets, searchQuery]);

  const stickerAssets = useMemo(
    () => filteredAssets.filter((asset) => asset.type === 'sticker'),
    [filteredAssets],
  );

  const widgetAssets = useMemo(
    () => filteredAssets.filter((asset) => asset.type === 'widget'),
    [filteredAssets],
  );

  const { assets: galleryAssets, uploadAsset, isLoading: galleryLoading, error: galleryError } = useGalleryStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAssetClick = useCallback((asset: AssetItem) => {
    if (asset.type === 'sticker' || asset.type === 'gallery') {
      setSelectedSticker(asset);
      setIsModalOpen(true);
      return;
    }

    if (asset.type === 'icon') {
      if (!asset.svgContent) return;
      bus.emit(CanvasEvents.TOOL_CHANGED, {
        tool: 'svg',
        assetId: asset.id,
        metadata: {
          name: asset.name,
          svgContent: asset.svgContent,
          assetUrl: asset.assetUrl,
          altText: `${asset.name} icon`,
          aspectLocked: false,
          fill: apiIconColor,
          stroke: apiIconColor,
          defaultWidth: 260,
          defaultHeight: 260,
        },
      });
      return;
    }

    if (asset.type === 'lottie') {
      if (!asset.assetUrl) return;
      bus.emit(CanvasEvents.TOOL_CHANGED, {
        tool: 'lottie',
        assetId: asset.id,
        metadata: {
          name: asset.name,
          assetUrl: asset.assetUrl,
          loop: true,
          speed: 1,
          direction: 1,
          autoplay: true,
          altText: `${asset.name} animation`,
          aspectLocked: true,
          stickerAssetUrl: asset.previewUrl,
        },
      });
      return;
    }

    bus.emit(CanvasEvents.TOOL_CHANGED, {
      tool: 'widget',
      widgetId: asset.id,
      metadata: asset.metadata,
    });
  }, [apiIconColor]);

  const toggleWidgetExpansion = useCallback((assetId: string) => {
    setExpandedWidgets((current) => ({ ...current, [assetId]: !current[assetId] }));
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadAsset(file);
    }
  }, [uploadAsset]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedSticker(null);
  }, []);

  const handleStickerConfirm = useCallback(
    (settings: StickerSettings) => {
      if (!selectedSticker) return;

      let clickEventPayload: Record<string, unknown> | undefined;
      try {
        const parsed = JSON.parse(settings.clickEventPayload);
        if (Object.keys(parsed).length > 0) {
          clickEventPayload = parsed;
        }
      } catch {
        // Skip invalid payload JSON.
      }

      bus.emit(CanvasEvents.TOOL_CHANGED, {
        tool: 'sticker',
        assetId: selectedSticker.id,
        assetUrl: selectedSticker.assetUrl,
        assetType: selectedSticker.assetType ?? 'image',
        metadata: {
          ...selectedSticker.metadata,
          altText: settings.altText || undefined,
          hoverEffect: settings.hoverEffect,
          aspectLocked: settings.aspectLocked,
          clickEventType: settings.clickEventType || undefined,
          clickEventPayload,
        },
      });

      setIsModalOpen(false);
      setSelectedSticker(null);
    },
    [selectedSticker],
  );

  if (mode !== 'edit') return null;

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

  return (
    <>
      <div
        data-testid="asset-panel"
        style={{
          ...panelVars,
          fontFamily: 'var(--sn-font-family, system-ui)',
          fontSize: '13px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--asset-panel-bg)',
          color: 'var(--asset-panel-text)',
        }}
      >
        <div
          style={{
            padding: 'var(--asset-panel-space-2) var(--asset-panel-space-3)',
            fontWeight: 600,
            fontSize: '12px',
            color: 'var(--asset-panel-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '1px solid var(--asset-panel-border)',
          }}
        >
          Assets
        </div>

        <div
          style={{
            padding: 'var(--asset-panel-space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--asset-panel-space-2)',
            borderBottom: '1px solid var(--asset-panel-border)',
          }}
        >
          <input
            data-testid="asset-search"
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              border: '1px solid var(--asset-panel-border)',
              borderRadius: 'var(--asset-panel-radius-sm)',
              fontSize: '12px',
              fontFamily: 'inherit',
              outline: 'none',
              background: 'var(--asset-panel-subtle)',
              color: 'var(--asset-panel-text)',
              boxSizing: 'border-box',
            }}
          />

          <div
            role="tablist"
            aria-label="Asset categories"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 'var(--asset-panel-space-1)',
              background: 'var(--asset-panel-subtle)',
              borderRadius: 'var(--asset-panel-radius-sm)',
              padding: 'var(--asset-panel-space-1)',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'stickers'}
              onClick={() => setActiveTab('stickers')}
              style={{
                border: 'none',
                borderRadius: 'var(--asset-panel-radius-sm)',
                padding: '6px 4px',
                background: activeTab === 'stickers' ? 'var(--asset-panel-bg)' : 'transparent',
                color: activeTab === 'stickers' ? 'var(--asset-panel-text)' : 'var(--asset-panel-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              Stickers
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'widgets'}
              onClick={() => setActiveTab('widgets')}
              style={{
                border: 'none',
                borderRadius: 'var(--asset-panel-radius-sm)',
                padding: '6px 4px',
                background: activeTab === 'widgets' ? 'var(--asset-panel-bg)' : 'transparent',
                color: activeTab === 'widgets' ? 'var(--asset-panel-text)' : 'var(--asset-panel-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              Widgets
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'gallery'}
              onClick={() => setActiveTab('gallery')}
              style={{
                border: 'none',
                borderRadius: 'var(--asset-panel-radius-sm)',
                padding: '6px 4px',
                background: activeTab === 'gallery' ? 'var(--asset-panel-bg)' : 'transparent',
                color: activeTab === 'gallery' ? 'var(--asset-panel-text)' : 'var(--asset-panel-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              Gallery
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'api'}
              onClick={() => setActiveTab('api')}
              style={{
                border: 'none',
                borderRadius: 'var(--asset-panel-radius-sm)',
                padding: '6px 4px',
                background: activeTab === 'api' ? 'var(--asset-panel-bg)' : 'transparent',
                color: activeTab === 'api' ? 'var(--asset-panel-text)' : 'var(--asset-panel-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              API
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--asset-panel-space-3)',
          }}
        >
          {activeTab === 'stickers' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 'var(--asset-panel-space-2)',
              }}
            >
              {stickerAssets.map((asset) => (
                <button
                  key={asset.id}
                  data-testid={`asset-item-${asset.id}`}
                  onClick={() => handleAssetClick(asset)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--asset-panel-space-1)',
                    padding: 'var(--asset-panel-space-2)',
                    border: '1px solid var(--asset-panel-border)',
                    borderRadius: 'var(--asset-panel-radius-md)',
                    background: 'var(--asset-panel-bg)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: 'inherit',
                    color: 'var(--asset-panel-text)',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      background: 'var(--asset-panel-subtle)',
                      borderRadius: 'var(--asset-panel-radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}
                  >
                    {asset.icon ?? '\u2b50'}
                  </div>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}
                  >
                    {asset.name}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      color: 'var(--asset-panel-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Sticker
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {activeTab === 'gallery' ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--asset-panel-space-3)',
              }}
            >
              {galleryError ? (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--asset-panel-radius-sm)',
                    background: '#fef2f2',
                    padding: 'var(--asset-panel-space-2)',
                    marginBottom: 'var(--asset-panel-space-1)',
                  }}
                >
                  {galleryError}
                </div>
              ) : null}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--asset-panel-space-2)',
                  padding: 'var(--asset-panel-space-2)',
                  border: '1px dashed var(--asset-panel-border)',
                  borderRadius: 'var(--asset-panel-radius-md)',
                  background: 'var(--asset-panel-subtle)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--asset-panel-muted)' }}>
                  Upload your own photos to use as stickers.
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={galleryLoading}
                  style={{
                    alignSelf: 'center',
                    padding: '6px 12px',
                    background: 'var(--sn-accent, #3b82f6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--asset-panel-radius-sm)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: galleryLoading ? 'not-allowed' : 'pointer',
                    opacity: galleryLoading ? 0.7 : 1,
                  }}
                >
                  {galleryLoading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>

              {galleryAssets.length === 0 && !galleryLoading ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--asset-panel-muted)',
                    fontSize: '11px',
                    padding: 'var(--asset-panel-space-4)',
                  }}
                >
                  No photos in your gallery yet.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 'var(--asset-panel-space-2)',
                  }}
                >
                  {galleryAssets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => handleAssetClick({
                        id: asset.id,
                        name: asset.name,
                        type: 'gallery',
                        assetUrl: asset.url,
                        assetType: 'image',
                        metadata: {},
                      })}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 'var(--asset-panel-space-1)',
                        padding: 'var(--asset-panel-space-1)',
                        border: '1px solid var(--asset-panel-border)',
                        borderRadius: 'var(--asset-panel-radius-md)',
                        background: 'var(--asset-panel-bg)',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontFamily: 'inherit',
                        color: 'var(--asset-panel-text)',
                        minWidth: 0,
                      }}
                    >
                      <img
                        src={asset.url}
                        alt={asset.name}
                        style={{
                          width: '100%',
                          aspectRatio: '1/1',
                          objectFit: 'cover',
                          borderRadius: 'var(--asset-panel-radius-sm)',
                        }}
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                      >
                        {asset.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {activeTab === 'widgets' ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--asset-panel-space-2)',
              }}
            >
              {widgetAssets.map((asset) => {
                const isExpanded = expandedWidgets[asset.id] === true;
                return (
                  <article
                    key={asset.id}
                    data-testid={`asset-item-${asset.id}`}
                    style={{
                      border: '1px solid var(--asset-panel-border)',
                      borderRadius: 'var(--asset-panel-radius-md)',
                      background: 'var(--asset-panel-bg)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      data-testid={`widget-card-toggle-${asset.id}`}
                      aria-expanded={isExpanded}
                      onClick={() => toggleWidgetExpansion(asset.id)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          aria-hidden
                          style={{
                            width: '32px',
                            height: '32px',
                            background: 'var(--asset-panel-subtle)',
                            borderRadius: 'var(--asset-panel-radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                          }}
                        >
                          {asset.icon ?? '\ud83e\udde9'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--asset-panel-text)',
                            }}
                          >
                            {asset.name}
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              color: 'var(--asset-panel-muted)',
                              textTransform: 'capitalize',
                            }}
                          >
                            {asset.widgetType ?? 'widget'}
                          </div>
                        </div>
                      </div>
                      <span
                        aria-hidden
                        style={{
                          fontSize: '12px',
                          color: 'var(--asset-panel-muted)',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.15s',
                        }}
                      >
                        \u25be
                      </span>
                    </button>

                    {isExpanded ? (
                      <div
                        style={{
                          borderTop: '1px solid var(--asset-panel-border)',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--asset-panel-space-2)',
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: '11px',
                            lineHeight: 1.5,
                            color: 'var(--asset-panel-muted)',
                          }}
                        >
                          {asset.description ?? 'No description available.'}
                        </p>
                        <button
                          type="button"
                          data-testid={`widget-card-add-${asset.id}`}
                          onClick={() => handleAssetClick(asset)}
                          style={{
                            alignSelf: 'flex-start',
                            border: '1px solid var(--asset-panel-border)',
                            borderRadius: 'var(--asset-panel-radius-sm)',
                            background: 'var(--asset-panel-bg)',
                            color: 'var(--asset-panel-text)',
                            padding: '6px 10px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Add Widget
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}

          {activeTab === 'api' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--asset-panel-space-3)' }}>
              {apiLoading ? (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--asset-panel-muted)',
                    border: '1px dashed var(--asset-panel-border)',
                    borderRadius: 'var(--asset-panel-radius-sm)',
                    padding: 'var(--asset-panel-space-2)',
                  }}
                >
                  Searching icon and lottie APIs...
                </div>
              ) : null}

              {apiError ? (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--asset-panel-radius-sm)',
                    background: '#fef2f2',
                    padding: 'var(--asset-panel-space-2)',
                  }}
                >
                  {apiError}
                </div>
              ) : null}

              {selectedApiPreviewAsset ? (
                <section
                  style={{
                    border: '1px solid var(--asset-panel-border)',
                    borderRadius: 'var(--asset-panel-radius-md)',
                    background: 'var(--asset-panel-bg)',
                    padding: 'var(--asset-panel-space-2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--asset-panel-space-2)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                      color: 'var(--asset-panel-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    API Preview
                  </div>
                  <div
                    style={{
                      minHeight: '120px',
                      borderRadius: 'var(--asset-panel-radius-sm)',
                      border: '1px solid var(--asset-panel-border)',
                      background: 'var(--asset-panel-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {selectedApiPreviewAsset.type === 'icon' && selectedApiPreviewAsset.svgContent ? (
                      <div
                        aria-label={`${selectedApiPreviewAsset.name} icon preview`}
                        style={{ width: '88px', height: '88px', color: apiIconColor }}
                        dangerouslySetInnerHTML={{ __html: selectedApiPreviewAsset.svgContent }}
                      />
                    ) : selectedApiPreviewAsset.type === 'lottie' && selectedApiPreviewAsset.previewUrl ? (
                      <img
                        src={selectedApiPreviewAsset.previewUrl}
                        alt={`${selectedApiPreviewAsset.name} preview`}
                        style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--asset-panel-muted)', padding: '0 10px' }}>
                        Preview unavailable for this asset.
                      </div>
                    )}
                  </div>
                  {selectedApiPreviewAsset.type === 'icon' ? (
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        color: 'var(--asset-panel-muted)',
                      }}
                    >
                      Icon color
                      <input
                        type="color"
                        value={apiIconColor}
                        onChange={(event) => setApiIconColor(event.target.value)}
                        aria-label="Icon color"
                        style={{
                          width: '30px',
                          height: '22px',
                          border: '1px solid var(--asset-panel-border)',
                          borderRadius: '4px',
                          padding: 0,
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      />
                      <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--asset-panel-text)' }}>
                        {apiIconColor.toUpperCase()}
                      </span>
                    </label>
                  ) : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--asset-panel-text)',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {selectedApiPreviewAsset.name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--asset-panel-muted)' }}>
                        {String(selectedApiPreviewAsset.metadata.library ?? selectedApiPreviewAsset.metadata.source ?? 'API')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAssetClick(selectedApiPreviewAsset)}
                      style={{
                        border: '1px solid var(--asset-panel-border)',
                        borderRadius: 'var(--asset-panel-radius-sm)',
                        background: 'var(--asset-panel-bg)',
                        color: 'var(--asset-panel-text)',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Add Asset
                    </button>
                  </div>
                </section>
              ) : null}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--asset-panel-space-2)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--asset-panel-text)' }}>
                  Icons
                </div>
                {iconApiAssets.length === 0 && !apiLoading ? (
                  <div style={{ fontSize: '11px', color: 'var(--asset-panel-muted)' }}>
                    Search with 2+ characters to load icons.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 'var(--asset-panel-space-2)',
                    }}
                  >
                    {iconApiAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        data-testid={`api-icon-${asset.id}`}
                        onClick={() => handleAssetClick(asset)}
                        onMouseEnter={() => setSelectedApiPreviewId(asset.id)}
                        onFocus={() => setSelectedApiPreviewId(asset.id)}
                        style={{
                          border: '1px solid var(--asset-panel-border)',
                          borderRadius: 'var(--asset-panel-radius-sm)',
                          padding: 'var(--asset-panel-space-2)',
                          background: 'var(--asset-panel-bg)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '11px',
                          color: 'var(--asset-panel-text)',
                        }}
                      >
                        {asset.svgContent ? (
                          <div
                            aria-hidden
                            style={{
                              width: '24px',
                              height: '24px',
                              marginBottom: '6px',
                              color: apiIconColor,
                            }}
                            dangerouslySetInnerHTML={{ __html: asset.svgContent }}
                          />
                        ) : null}
                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{asset.name}</div>
                        <div style={{ color: 'var(--asset-panel-muted)' }}>
                          {String(asset.metadata.library ?? 'Iconify')} • Add as SVG
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--asset-panel-space-2)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--asset-panel-text)' }}>
                  Lottie
                </div>
                {lottieApiAssets.length === 0 && !apiLoading ? (
                  <div style={{ fontSize: '11px', color: 'var(--asset-panel-muted)' }}>
                    Search with 2+ characters to load animations.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--asset-panel-space-2)' }}>
                    {lottieApiAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        data-testid={`api-lottie-${asset.id}`}
                        onClick={() => handleAssetClick(asset)}
                        onMouseEnter={() => setSelectedApiPreviewId(asset.id)}
                        onFocus={() => setSelectedApiPreviewId(asset.id)}
                        style={{
                          border: '1px solid var(--asset-panel-border)',
                          borderRadius: 'var(--asset-panel-radius-sm)',
                          padding: 'var(--asset-panel-space-2)',
                          background: 'var(--asset-panel-bg)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '11px',
                          color: 'var(--asset-panel-text)',
                        }}
                      >
                        {asset.previewUrl ? (
                          <img
                            src={asset.previewUrl}
                            alt={`${asset.name} preview`}
                            style={{
                              width: '100%',
                              height: '72px',
                              objectFit: 'cover',
                              borderRadius: 'var(--asset-panel-radius-sm)',
                              marginBottom: '6px',
                              border: '1px solid var(--asset-panel-border)',
                            }}
                            loading="lazy"
                          />
                        ) : null}
                        <div style={{ fontWeight: 600 }}>{asset.name}</div>
                        <div style={{ color: 'var(--asset-panel-muted)' }}>
                          {String(asset.metadata.library ?? 'Lottie')} • Add as animation
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {!apiLoading && filteredAssets.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--asset-panel-muted)',
                fontSize: '12px',
                padding: 'var(--asset-panel-space-4)',
                border: '1px dashed var(--asset-panel-border)',
                borderRadius: 'var(--asset-panel-radius-sm)',
              }}
            >
              No assets found
            </div>
          ) : null}
        </div>
      </div>

      <StickerSettingsModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onConfirm={handleStickerConfirm}
        assetUrl={selectedSticker?.assetUrl}
        assetType={selectedSticker?.assetType}
      />
    </>
  );
};
