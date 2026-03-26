/**
 * Route page components for each top-level route.
 *
 * @module shell/router
 * @layer L6
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import type { BackgroundSpec, CanvasEntity, StickerEntity, ThemeName, ViewportConfig } from '@sn/types';
import { CanvasDocumentEvents, CanvasEvents, DEFAULT_BACKGROUND, DockerEvents } from '@sn/types';

import { initCanvasCore, teardownCanvasCore, project2Dto3D } from '../../canvas/core';
import type { SceneGraph } from '../../canvas/core';
// Canvas sub-layer init/teardown loaded via dynamic import (L6 boundary rule allows dynamic imports only)
import { bus } from '../../kernel/bus';
import { useAuthStore, selectIsAuthenticated } from '../../kernel/stores/auth/auth.store';
import { useCanvasStore } from '../../kernel/stores/canvas/canvas.store';
import { useDockerStore } from '../../kernel/stores/docker';
import { useUIStore } from '../../kernel/stores/ui/ui.store';
import { WidgetFrame, InlineWidgetFrame } from '../../runtime';
import { BUILT_IN_WIDGET_HTML, BUILT_IN_WIDGET_COMPONENTS } from '../../runtime/widgets';
import {
  CanvasWorkspace,
  useViewport,
  Toolbar,
  PropertiesPanel,
  LayersPanel,
  TextSettingsPanel,
  AssetPanel,
  useSceneGraph,
  usePersistence,
  createLocalCanvas,
  deleteLocalCanvas,
  duplicateLocalCanvas,
  renameLocalCanvas,
  ensureLocalCanvas,
  listLocalCanvases,
} from '../canvas';
import type { LocalCanvasSummary } from '../canvas';
import { HistoryPanel } from '../canvas/panels';
import type { CanvasPositionConfig } from '../canvas/panels/CanvasSettingsDropdown';
import { seedDemoEntities, seedCommerceCanvas, seedClaudeLabCanvas } from '../canvas/seedDemoEntities';
import { StickerSettingsModal, LoginForm } from '../components';
import { GhostWidgetOverlay } from '../components/GhostWidgetOverlay';
import type { StickerSettings } from '../components/StickerSettingsModal';
import { ShellLayout } from '../layout';
import { applyThemeTokens, emitThemeChange } from '../theme/theme-provider';
import { THEME_TOKENS } from '../theme/theme-tokens';
import { themeVar } from '../theme/theme-vars';


const CANVAS_DOCKER_NAME = 'Canvas Docker';
const HISTORY_WIDGET_INSTANCE_ID = '44444444-4444-4444-4444-444444444444';
const DEFAULT_DOCKER_WIDGET_ID = 'wgt-clock';
const DEFAULT_DOCKER_WIDGET_INSTANCE_ID = '33333333-3333-4333-8333-333333333333';
const DEFAULT_DOCKER_WIDGET_ENTITY_ID = 'ddc00000-0000-4000-a000-000000000001';
const DEMO_CANVAS_ID = '00000000-0000-4000-8000-000000000001';
const DEFAULT_CANVAS_TOP_SPACING = 40;

/** Parse hex color to RGB components */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
const DEFAULT_ARTBOARD_LIMIT_PER_DASHBOARD = 10;
const BUILT_IN_WIDGET_HTML_KEY_BY_WIDGET_ID: Record<string, string> = {
  'sn.builtin.clock': 'wgt-clock',
  'sn.builtin.sticky-note': 'wgt-note',
  'sn.builtin.counter': 'wgt-counter',
  'sn.builtin.signup': 'wgt-signup',
  'sn.builtin.subscribe': 'wgt-subscribe',
  'sn.builtin.shop': 'wgt-shop',
  'sn.builtin.creator-setup': 'wgt-creator-setup',
  'sn.builtin.tier-manager': 'wgt-tier-manager',
  'sn.builtin.item-manager': 'wgt-item-manager',
  'sn.builtin.orders': 'wgt-orders',
  'sn.builtin.creator-dashboard': 'wgt-creator-dashboard',
  'sn.builtin.xc-broadcaster': 'wgt-xc-broadcaster',
  'sn.builtin.xc-listener': 'wgt-xc-listener',
  'sn.builtin.data-table': 'wgt-data-table',
  'sn.builtin.entity-spawner': 'wgt-entity-spawner',
  // Connection invite test widgets
  'live-chat-v1': 'wgt-live-chat',
  'price-ticker-v2': 'wgt-price-ticker',
  'weather-dashboard-v1': 'wgt-weather',
  'ai-agent-v1': 'wgt-ai-agent',
  'tictactoe-v1': 'wgt-tictactoe',
  'connect4-v1': 'wgt-connect4',
  'pong-v1': 'wgt-pong',
  'battleship-v1': 'wgt-battleship',
};

function resolveBuiltInWidgetHtml(widgetId: string): string {
  if (BUILT_IN_WIDGET_HTML[widgetId]) {
    return BUILT_IN_WIDGET_HTML[widgetId];
  }
  const htmlKey = BUILT_IN_WIDGET_HTML_KEY_BY_WIDGET_ID[widgetId];
  if (htmlKey && BUILT_IN_WIDGET_HTML[htmlKey]) {
    return BUILT_IN_WIDGET_HTML[htmlKey];
  }
  // Fallback for unresolved widgets — renders a live connected placeholder.
  // Accepting an invite IS installing: no separate install step needed.
  const name = widgetId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-family:var(--sn-font-family,system-ui);color:var(--sn-text,#333);background:var(--sn-surface,#f8f8f8);gap:8px;padding:16px;text-align:center;">
    <style>
      @keyframes connPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
      .conn-dot { width:8px;height:8px;border-radius:50%;background:var(--sn-accent,#7c9a92);animation:connPulse 2s ease-in-out infinite; }
    </style>
    <div class="conn-dot"></div>
    <div style="font-weight:600;font-size:14px;">${name}</div>
    <div style="font-size:11px;opacity:0.5;line-height:1.4;">Connected widget<br>Waiting for data from sender</div>
    <script>
      (function() {
        if (window.StickerNest) {
          StickerNest.register({ name: '${widgetId}', version: '0.0.0', events: { emits: [], receives: ['data.update'] } });
          StickerNest.ready();
          StickerNest.subscribe('data.update', function(payload) {
            document.querySelector('.conn-dot').style.background = '#4caf50';
          });
        }
      })();
    </script>
  </div>`;
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Untitled canvas';
}

const appPageStyle: React.CSSProperties = {
  minHeight: '100%',
  padding: '20px',
  boxSizing: 'border-box',
  background: themeVar('--sn-bg'),
  color: themeVar('--sn-text'),
  fontFamily: themeVar('--sn-font-family'),
};

export const DashboardPage: React.FC = () => (
  <div data-testid="page-dashboard" style={{ ...appPageStyle, ...dashboardStyles.container }}>
    <h1 style={dashboardStyles.title}>Dashboard</h1>
    <div style={dashboardStyles.grid}>
      <DashboardCard
        to="/canvas"
        testId="dashboard-card-canvas"
        icon="C"
        label="Canvas"
        description="Open the infinite canvas workspace"
      />
      <DashboardCard
        to="/data"
        testId="dashboard-card-data"
        icon="D"
        label="Databases"
        description="Create, manage, and view your databases with AI tools"
      />
      <DashboardCard
        to="/marketplace"
        testId="dashboard-card-marketplace"
        icon="M"
        label="Marketplace"
        description="Discover and install widgets"
      />
      <DashboardCard
        to="/settings"
        testId="dashboard-card-settings"
        icon="S"
        label="Settings"
        description="User and workspace settings"
      />
    </div>
  </div>
);

export const LoginPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const forceLogin = new URLSearchParams(location.search).get('force') === '1';

  useEffect(() => {
    if (isAuthenticated && !forceLogin) {
      navigate('/dashboard', { replace: true });
    }
  }, [forceLogin, isAuthenticated, navigate]);

  return (
    <div data-testid="page-login" style={appPageStyle}>
      <LoginForm />
    </div>
  );
};

const galleryActionBtnStyle: React.CSSProperties = {
  border: `1px solid var(--sn-border, #ddd)`,
  background: 'transparent',
  color: 'var(--sn-text, #111)',
  borderRadius: '4px',
  padding: '4px 10px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '12px',
};

export const CanvasGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<LocalCanvasSummary[]>([]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const refreshList = useCallback(() => {
    setItems(listLocalCanvases());
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const handleCreate = useCallback(() => {
    const created = createLocalCanvas();
    navigate(`/canvas/${created.slug}`);
  }, [navigate]);

  const handleDuplicate = useCallback((slug: string) => {
    const copy = duplicateLocalCanvas(slug);
    if (copy) {
      refreshList();
      navigate(`/canvas/${copy.slug}`);
    }
  }, [navigate, refreshList]);

  const handleDelete = useCallback((slug: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This will permanently remove the canvas and all its data.`)) {
      return;
    }
    deleteLocalCanvas(slug);
    refreshList();
  }, [refreshList]);

  const startRename = useCallback((slug: string, name: string) => {
    setEditingSlug(slug);
    setEditingName(name);
    setTimeout(() => renameInputRef.current?.select(), 0);
  }, []);

  const commitRename = useCallback(() => {
    if (editingSlug && editingName.trim()) {
      renameLocalCanvas(editingSlug, editingName);
      refreshList();
    }
    setEditingSlug(null);
  }, [editingSlug, editingName, refreshList]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitRename();
    } else if (e.key === 'Escape') {
      setEditingSlug(null);
    }
  }, [commitRename]);

  return (
    <div data-testid="page-canvas-gallery" style={appPageStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h1 style={{ margin: 0 }}>Canvas Gallery</h1>
        <button
          type="button"
          onClick={handleCreate}
          data-testid="canvas-gallery-create"
          style={{
            border: `1px solid ${themeVar('--sn-border')}`,
            background: themeVar('--sn-surface'),
            color: themeVar('--sn-text'),
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          New canvas
        </button>
      </div>

      {items.length === 0 ? (
        <p>No canvases yet. Create your first canvas.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '10px' }}>
          {items.map((item) => (
            <li
              key={item.slug}
              style={{
                border: `1px solid ${themeVar('--sn-border')}`,
                borderRadius: '8px',
                padding: '12px',
                background: themeVar('--sn-surface'),
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  {editingSlug === item.slug ? (
                    <input
                      ref={renameInputRef}
                      data-testid={`canvas-rename-input-${item.slug}`}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={handleRenameKeyDown}
                      style={{
                        fontWeight: 600,
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                        border: `1px solid var(--sn-accent, #6366f1)`,
                        borderRadius: '4px',
                        padding: '2px 6px',
                        background: themeVar('--sn-bg'),
                        color: themeVar('--sn-text'),
                        outline: 'none',
                        width: '200px',
                      }}
                    />
                  ) : (
                    <div
                      style={{ fontWeight: 600, cursor: 'pointer' }}
                      onDoubleClick={() => startRename(item.slug, item.name)}
                      title="Double-click to rename"
                    >
                      {item.name}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '4px' }}>
                    /canvas/{item.slug}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <Link
                    to={`/canvas/${item.slug}`}
                    style={{ ...galleryActionBtnStyle, textDecoration: 'none' }}
                    data-testid={`canvas-open-${item.slug}`}
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    style={galleryActionBtnStyle}
                    onClick={() => startRename(item.slug, item.name)}
                    data-testid={`canvas-rename-${item.slug}`}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    style={galleryActionBtnStyle}
                    onClick={() => handleDuplicate(item.slug)}
                    data-testid={`canvas-duplicate-${item.slug}`}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    style={{ ...galleryActionBtnStyle, color: '#dc2626' }}
                    onClick={() => handleDelete(item.slug, item.name)}
                    data-testid={`canvas-delete-${item.slug}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const NewCanvasPage: React.FC = () => {
  const navigate = useNavigate();
  const createdRef = useRef(false);

  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    const created = createLocalCanvas();
    navigate(`/canvas/${created.slug}`, { replace: true });
  }, [navigate]);

  return (
    <div data-testid="page-canvas-new" style={appPageStyle}>
      <h1>Creating canvas...</h1>
    </div>
  );
};

/**
 * Full canvas page — composes ShellLayout with CanvasWorkspace, toolbar, and panels.
 */
/** Event type for sticker settings request (matches StickerRenderer) */
const STICKER_SETTINGS_REQUESTED = 'sticker.settings.requested';

function buildTextBadgeSticker(label: string): string {
  const safeLabel = label.slice(0, 24).replace(/[<>&'"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="28" fill="#111827"/><rect x="8" y="8" width="240" height="240" rx="22" fill="#1f2937"/><text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif" font-size="24" fill="#e5e7eb">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function resolveStickerSource(entity: CanvasEntity): {
  assetUrl: string;
  assetType: StickerEntity['assetType'];
  altText: string;
} {
  if (entity.type === 'sticker') {
    return {
      assetUrl: entity.assetUrl,
      assetType: entity.assetType,
      altText: entity.altText ?? entity.name ?? 'Sticker',
    };
  }

  if (entity.type === 'svg') {
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(entity.svgContent)}`;
    return {
      assetUrl: dataUrl,
      assetType: 'image',
      altText: entity.altText ?? entity.name ?? 'SVG sticker',
    };
  }

  if (entity.type === 'lottie') {
    const stickerAssetUrl = (entity as Record<string, unknown>).stickerAssetUrl;
    const previewUrl = typeof stickerAssetUrl === 'string' ? stickerAssetUrl : '';
    return {
      assetUrl: previewUrl || buildTextBadgeSticker(entity.name ?? 'Lottie'),
      assetType: 'image',
      altText: entity.altText ?? entity.name ?? 'Lottie sticker',
    };
  }

  return {
    assetUrl: buildTextBadgeSticker(entity.name ?? entity.type.toUpperCase()),
    assetType: 'image',
    altText: entity.name ?? `${entity.type} sticker`,
  };
}

export const CanvasPage: React.FC = () => {
  const { canvasSlug = '' } = useParams<{ canvasSlug: string }>();
  const setMode = useUIStore((s) => s.setCanvasInteractionMode);
  const setActiveCanvas = useCanvasStore((s) => s.setActiveCanvas);
  const user = useAuthStore((s) => s.user);
  const mode = useUIStore((s) => s.canvasInteractionMode);
  const activeTheme = useUIStore((s) => s.theme);
  const canvasPlatform = useUIStore((s) => s.canvasPlatform);
  const platformConfigs = useUIStore((s) => s.platformConfigs);
  const setPlatformConfig = useUIStore((s) => s.setPlatformConfig);
  const fullscreenPreview = useUIStore((s) => s.fullscreenPreview);
  const setFullscreenPreview = useUIStore((s) => s.setFullscreenPreview);
  const normalizedSlug = canvasSlug.trim().toLowerCase();
  const isDemo = normalizedSlug === 'demo';
  const isClaudeLab = normalizedSlug === 'claude-lab';
  const isCommerceDemo = normalizedSlug === 'alice-art-shop';
  const seededRef = useRef(false);
  const [sceneGraph, setSceneGraph] = useState<SceneGraph | null>(null);
  const [canvasSummary, setCanvasSummary] = useState<LocalCanvasSummary | null>(null);

  // Per-canvas theme override — when set, overrides global theme for this canvas
  const [canvasTheme, setCanvasTheme] = useState<ThemeName | undefined>(undefined);

  // Sticker settings modal state (works for stickers and non-sticker conversion)
  const [entityToEditAsSticker, setEntityToEditAsSticker] = useState<CanvasEntity | null>(null);

  // Canvas settings state — wired to CanvasSettingsDropdown events
  const [viewportConfig, setViewportConfig] = useState<ViewportConfig>({
    background: DEFAULT_BACKGROUND,
    sizeMode: 'infinite',
    isPreviewMode: false,
  });

  // Get viewport store for toolbar zoom controls (must be before effects that reference it)
  const { store: viewportStore } = useViewport();

  // Sync viewport size and sizeMode when platform changes; fit bounded canvases
  useEffect(() => {
    const config = platformConfigs[canvasPlatform];
    if (config) {
      // Default to 'bounded' when platform has dimensions — this is the expected
      // behavior for platform switching (e.g., mobile should show a bounded viewport)
      const nextSizeMode = config.sizeMode ?? (config.width && config.height ? 'bounded' : 'infinite');
      setViewportConfig((prev) => {
        // Bail out (return same reference) if nothing changed — prevents re-render cycle
        if (prev.width === config.width && prev.height === config.height && prev.sizeMode === nextSizeMode) {
          return prev;
        }
        return { ...prev, width: config.width, height: config.height, sizeMode: nextSizeMode };
      });
      // Auto-fit viewport to bounded canvas on platform switch
      if (nextSizeMode === 'bounded' && config.width && config.height) {
        viewportStore.fitToCanvas(config.width, config.height);
      }
    }
  }, [canvasPlatform, platformConfigs, viewportStore]);

  // Update platformConfigs in store when viewportConfig changes (if linked)
  useEffect(() => {
    if (viewportConfig.width && viewportConfig.height) {
      // Read current store value imperatively to avoid writing identical data
      // (which would create a new object reference and re-trigger the platform sync effect above)
      const current = useUIStore.getState().platformConfigs[canvasPlatform];
      if (
        current?.width === viewportConfig.width
        && current?.height === viewportConfig.height
        && current?.sizeMode === viewportConfig.sizeMode
      ) return;
      setPlatformConfig(canvasPlatform, {
        width: viewportConfig.width,
        height: viewportConfig.height,
        sizeMode: viewportConfig.sizeMode,
      });
    }
  }, [viewportConfig.width, viewportConfig.height, viewportConfig.sizeMode, canvasPlatform, setPlatformConfig]);

  const [borderRadius, setBorderRadius] = useState<number | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }>(0);
  const [canvasOpacity, setCanvasOpacity] = useState(1);
  const [canvasStroke, setCanvasStroke] = useState<{ weight: number; style: string; color: string; opacity: number; gradient?: { enabled: boolean; stops: { offset: number; color: string }[]; angle: number } }>({ weight: 0, style: 'solid', color: '#000000', opacity: 1 });
  const [workspaceBg, setWorkspaceBg] = useState<{ mode: string; imageUrl: string; imageMode: string; opacity: number; parallaxStrength: number; reactiveCode: string }>({ mode: 'none', imageUrl: '', imageMode: 'cover', opacity: 1, parallaxStrength: 0.3, reactiveCode: '' });
  const [dropShadow, setDropShadow] = useState<{ type: string; offsetX: number; offsetY: number; blur: number; spread: number; color: string; opacity: number }>({ type: 'outer', offsetX: 0, offsetY: 4, blur: 24, spread: 0, color: '#000000', opacity: 0.12 });
  const [canvasFilters, setCanvasFilters] = useState<{ brightness: number; contrast: number; saturation: number; hueRotate: number; blur: number }>({ brightness: 100, contrast: 100, saturation: 100, hueRotate: 0, blur: 0 });
  const [canvasPadding, setCanvasPadding] = useState<{ top: number; right: number; bottom: number; left: number }>({ top: 0, right: 0, bottom: 0, left: 0 });
  const [canvasPosition, setCanvasPosition] = useState<CanvasPositionConfig>({
    horizontal: 'center',
    vertical: 'center',
    topOffset: DEFAULT_CANVAS_TOP_SPACING,
  });

  const canvasKey = normalizedSlug || 'untitled';
  const canvasId = canvasSummary?.id ?? DEMO_CANVAS_ID;

  // Every local slug route is editable by default.
  useEffect(() => {
    setMode('edit');
  }, [setMode]);

  // Entering fullscreen preview forces preview mode
  useEffect(() => {
    if (fullscreenPreview) {
      setMode('preview');
    }
  }, [fullscreenPreview, setMode]);

  useEffect(() => {
    const ensured = ensureLocalCanvas({
      slug: canvasKey,
      fallbackName: titleFromSlug(canvasKey),
    });
    setCanvasSummary(ensured);
  }, [canvasKey]);

  // Keep canvas context in kernel store so integrations (e.g. checkout) can resolve canvas-scoped queries.
  useEffect(() => {
    if (!canvasSummary) return;
    setActiveCanvas(canvasSummary.id, {
      id: canvasSummary.id,
      name: canvasSummary.name,
      slug: canvasSummary.slug,
      ownerId: user?.id ?? '00000000-0000-4000-a000-000000000001',
      description: null,
      thumbnailUrl: null,
      isPublic: true,
      settings: {},
    });

    return () => {
      setActiveCanvas(null, null);
    };
  }, [canvasSummary, setActiveCanvas, user?.id]);

  // Initialize Canvas Core + Panels on canvas change.
  // Canvas sub-layers are dynamically imported to satisfy L6 boundary rules.
  useEffect(() => {
    let disposed = false;
    let cleanupTools: (() => void) | undefined;
    let cleanupPanels: (() => void) | undefined;

    const coreCtx = initCanvasCore();
    setSceneGraph(coreCtx.sceneGraph);

    // Dynamic imports for canvas sub-layers (L4A-2 tools, L4A-4 panels)
    const setup = async () => {
      const [toolsMod, panelsMod] = await Promise.all([
        import('../../canvas/tools'),
        import('../../canvas/panels/init'),
      ]);
      if (disposed) return;

      panelsMod.initCanvasPanels(() => coreCtx.sceneGraph.entityCount > 0 ? 1 : 1);
      cleanupPanels = panelsMod.teardownCanvasPanels;

      const getMode = () => useUIStore.getState().canvasInteractionMode;
      toolsMod.initCanvasTools(coreCtx.sceneGraph, getMode);
      cleanupTools = toolsMod.teardownCanvasTools;

      // Helper: check if saved canvas has a specific widget
      const savedCanvasHasWidget = (slug: string, widgetId: string): boolean => {
        try {
          const raw = localStorage.getItem(`sn:canvas:${slug}`);
          if (!raw) return false;
          const doc = JSON.parse(raw) as { entities?: Array<{ widgetId?: string }> };
          return doc.entities?.some((e) => e.widgetId === widgetId) ?? false;
        } catch { return false; }
      };

      // Seed demo entities for /canvas/demo route — skip if already seeded
      if (isDemo && !seededRef.current) {
        seededRef.current = true;
        if (!savedCanvasHasWidget('demo', 'sn.builtin.todo-list')) {
          seedDemoEntities();
          // Force immediate save so data persists even if user navigates away quickly
          setTimeout(() => bus.emit(CanvasDocumentEvents.SAVE_REQUESTED, {}), 500);
        }
      }

      // Seed Claude's Lab canvas — skip if chat widget already saved
      if (isClaudeLab && !seededRef.current) {
        seededRef.current = true;
        if (!savedCanvasHasWidget('claude-lab', 'wgt-live-chat')) {
          seedClaudeLabCanvas();
          setTimeout(() => bus.emit(CanvasDocumentEvents.SAVE_REQUESTED, {}), 500);
        }
      }
    };

    setup();

    // Seed commerce demo canvas if missing built-in commerce widgets.
    if (isCommerceDemo && !seededRef.current) {
      seededRef.current = true;
      const storageKey = `sn:canvas:${canvasKey}`;
      const raw = localStorage.getItem(storageKey);
      let hasCommerceWidgets = false;
      const isUuid = (value: unknown): value is string =>
        typeof value === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as {
            entities?: Array<{ id?: unknown; type?: string; widgetId?: string; widgetInstanceId?: unknown }>;
          };
          hasCommerceWidgets = Boolean(parsed.entities?.some((entity) =>
            entity.type === 'widget'
            && isUuid(entity.id)
            && (entity.widgetId === 'sn.builtin.shop' || entity.widgetId === 'sn.builtin.subscribe')));
          hasCommerceWidgets = hasCommerceWidgets && Boolean(
            parsed.entities?.some((entity) =>
              entity.type === 'widget'
              && (entity.widgetId === 'sn.builtin.shop' || entity.widgetId === 'sn.builtin.subscribe')
              && isUuid(entity.widgetInstanceId)),
          );
        } catch {
          hasCommerceWidgets = false;
        }
      }
      if (!hasCommerceWidgets) {
        seedCommerceCanvas();
      }
    }

    return () => {
      disposed = true;
      cleanupTools?.();
      cleanupPanels?.();
      teardownCanvasCore();
      setSceneGraph(null);
      seededRef.current = false;
    };
  }, [canvasKey, isClaudeLab, isCommerceDemo, isDemo]);

  // Subscribe to scene graph changes for sidebar panels
  const entities = useSceneGraph(sceneGraph);

  // Persistence: auto-save + manual save/load
  const viewportConfigRef = useRef(viewportConfig);
  viewportConfigRef.current = viewportConfig;
  const borderRadiusRef = useRef(typeof borderRadius === 'number' ? borderRadius : 0);
  borderRadiusRef.current = typeof borderRadius === 'number' ? borderRadius : 0;
  const canvasPositionRef = useRef(canvasPosition);
  canvasPositionRef.current = canvasPosition;
  const canvasThemeRef = useRef<string | undefined>(canvasTheme);
  canvasThemeRef.current = canvasTheme;
  const persistence = usePersistence(canvasKey, sceneGraph, canvasSummary ?? undefined, {
    viewportConfig: viewportConfigRef,
    borderRadius: borderRadiusRef,
    canvasPosition: canvasPositionRef,
    theme: canvasThemeRef,
  });

  useEffect(() => {
    if (!sceneGraph) return;
    persistence.load();
  }, [sceneGraph, canvasKey, persistence.load]);

  // Track selection for toolbar (Alignment/Grouping icons)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = bus.subscribe('shell.selection.changed', (event: { payload: { ids: string[] } }) => {
      setSelectedIds(new Set(event.payload.ids));
    });
    return unsub;
  }, []);

  // Build widgetHtmlMap from current entities — maps instanceId → HTML source
  const widgetHtmlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entity of entities) {
      if (entity.type === 'widget') {
        const wEntity = entity as { widgetInstanceId: string; widgetId: string };
        const html = resolveBuiltInWidgetHtml(wEntity.widgetId);
        map.set(wEntity.widgetInstanceId, html);
      }
    }
    return map;
  }, [entities]);

  const widgetTheme = useMemo(
    () => ({ ...THEME_TOKENS[activeTheme] }),
    [activeTheme],
  );

  const renderDockerWidget = useCallback(
    (widgetInstanceId: string) => {
      // Special case for history tool
      if (widgetInstanceId === HISTORY_WIDGET_INSTANCE_ID) {
        return <HistoryPanel />;
      }

      // Look up by widgetInstanceId first, then by entity id as fallback
      // (entities docked from canvas use entity.id as the slot key)
      let entity = entities.find(
        (item) => item.type === 'widget' && item.widgetInstanceId === widgetInstanceId,
      );
      if (!entity || entity.type !== 'widget') {
        entity = entities.find(
          (item) => item.type === 'widget' && item.id === widgetInstanceId,
        );
      }
      if (!entity || entity.type !== 'widget') {
        return null;
      }

      // Docker widgets render in a flex container that fills the slot.
      // Use a unique docker-scoped instanceId to avoid bridge conflicts with the canvas copy.
      const dockInstanceId = `dock-${widgetInstanceId}`;
      const dockW = 300;
      const dockH = 192;

      const BuiltInComponent = BUILT_IN_WIDGET_COMPONENTS[entity.widgetId];
      if (BuiltInComponent) {
        return (
          <InlineWidgetFrame
            widgetId={entity.widgetId}
            instanceId={dockInstanceId}
            Component={BuiltInComponent}
            config={entity.config}
            theme={widgetTheme}
            visible={true}
            width={dockW}
            height={dockH}
          />
        );
      }

      const widgetHtml = resolveBuiltInWidgetHtml(entity.widgetId);
      return (
        <WidgetFrame
          widgetId={entity.widgetId}
          instanceId={dockInstanceId}
          widgetHtml={widgetHtml}
          config={entity.config}
          theme={widgetTheme}
          visible={true}
          width={dockW}
          height={dockH}
        />
      );
    },
    [entities, widgetTheme],
  );

  // Toggle edit/preview mode via P key
  const toggleMode = useCallback(() => {
    setMode(mode === 'edit' ? 'preview' : 'edit');
  }, [mode, setMode]);

  const exitFullscreenPreview = useCallback(() => {
    setFullscreenPreview(false);
    setMode('edit');
  }, [setFullscreenPreview, setMode]);

  // Per-canvas theme: apply on load, restore global on unmount
  useEffect(() => {
    const unsub = bus.subscribe('canvas.document.theme.loaded', (event: { payload: { theme: ThemeName } }) => {
      setCanvasTheme(event.payload.theme);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const effectiveTheme = canvasTheme ?? activeTheme;
    applyThemeTokens(effectiveTheme);
    emitThemeChange(effectiveTheme);
  }, [canvasTheme, activeTheme]);

  // Restore global theme when leaving this canvas
  useEffect(() => {
    return () => {
      const globalTheme = useUIStore.getState().theme;
      applyThemeTokens(globalTheme);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape always exits fullscreen preview, even in input fields
      if (e.key === 'Escape' && fullscreenPreview) {
        e.preventDefault();
        exitFullscreenPreview();
        return;
      }

      // Skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        toggleMode();
      }

      // Shift+F enters fullscreen preview
      if ((e.key === 'f' || e.key === 'F') && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setFullscreenPreview(true);
        setMode('preview');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMode, fullscreenPreview, exitFullscreenPreview, setFullscreenPreview, setMode]);

  // Ghost widget placement — read URL params from invite acceptance
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ghostWidgetId = params.get('ghostWidget');
    const inviteId = params.get('inviteId');
    if (!ghostWidgetId || !inviteId) return;

    // Delay slightly so canvas tools are initialized
    const timer = setTimeout(() => {
      bus.emit(CanvasEvents.GHOST_ACTIVATED, {
        widgetId: ghostWidgetId,
        inviteId,
        mode: 'share',
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [location.search]);

  useEffect(() => {
    const dockerStore = useDockerStore.getState();
    const hasCanvasDocker = Object.values(dockerStore.dockers).some(
      (docker) => docker.name === CANVAS_DOCKER_NAME,
    );
    if (!hasCanvasDocker) {
      dockerStore.addDocker({
        name: CANVAS_DOCKER_NAME,
        dockMode: 'floating',
        visible: true,
        pinned: true,
        position: { x: window.innerWidth - 380, y: 80 },
        size: { width: 320, height: 460 },
        tabs: [
          {
            id: crypto.randomUUID(),
            name: 'Widgets',
            widgets: [{ widgetInstanceId: DEFAULT_DOCKER_WIDGET_INSTANCE_ID }],
          },
        ],
      });
    }
  }, []);

  // Ensure the default docker widget is represented in the scene graph as a widget entity.
  // Wait until persistence has loaded to avoid overwriting saved data with default widget.
  useEffect(() => {
    if (!persistence.loaded) return;

    const existingDefaultWidget = entities.find(
      (entity) => entity.type === 'widget' && entity.widgetInstanceId === DEFAULT_DOCKER_WIDGET_INSTANCE_ID,
    );
    if (!existingDefaultWidget) {
      const now = new Date().toISOString();
      bus.emit(CanvasEvents.ENTITY_CREATED, {
        id: DEFAULT_DOCKER_WIDGET_ENTITY_ID,
        type: 'widget',
        canvasId,
        transform: {
          position: { x: 120, y: 120 },
          size: { width: 280, height: 200 },
          rotation: 0,
          scale: 1,
        },
        zIndex: 1,
        visible: false,
        canvasVisibility: 'both' as const,
        locked: false,
        flipH: false,
        flipV: false,
        opacity: 1,
        borderRadius: 8,
        syncTransform2d3d: true,
        name: 'Clock',
        widgetInstanceId: DEFAULT_DOCKER_WIDGET_INSTANCE_ID,
        widgetId: DEFAULT_DOCKER_WIDGET_ID,
        config: {},
        createdAt: now,
        updatedAt: now,
        createdBy: user?.id ?? '00000000-0000-4000-a000-000000000000',
      });
      return;
    }

    const dockerStore = useDockerStore.getState();
    const dockerEntry = Object.values(dockerStore.dockers).find(
      (docker) => docker.name === CANVAS_DOCKER_NAME,
    );
    if (!dockerEntry) return;

    const alreadyDocked = dockerEntry.tabs.some((tab) =>
      tab.widgets.some((slot) => slot.widgetInstanceId === DEFAULT_DOCKER_WIDGET_INSTANCE_ID),
    );
    if (!alreadyDocked) {
      dockerStore.addWidgetToTab(
        dockerEntry.id,
        dockerEntry.activeTabIndex,
        DEFAULT_DOCKER_WIDGET_INSTANCE_ID,
        220,
      );
    }
  }, [canvasId, entities, persistence.loaded]);

  // Undocking a docker slot restores the widget to canvas visibility.
  useEffect(() => {
    const unsubscribe = bus.subscribe(
      DockerEvents.WIDGET_REMOVED,
      (event: { payload: { widgetInstanceId: string } }) => {
        const entity = entities.find(
          (item) => item.type === 'widget' && item.widgetInstanceId === event.payload.widgetInstanceId,
        );
        if (!entity || entity.type !== 'widget') return;

        bus.emit(CanvasEvents.ENTITY_UPDATED, {
          id: entity.id,
          updates: { visible: true },
        });
      },
    );
    return unsubscribe;
  }, [entities]);

  // Subscribe to sticker settings requested event
  useEffect(() => {
    const unsubscribe = bus.subscribe(
      STICKER_SETTINGS_REQUESTED,
      (event: { payload: { entityId: string; entity: CanvasEntity } }) => {
        setEntityToEditAsSticker(event.payload.entity);
      },
    );
    return unsubscribe;
  }, []);

  // Subscribe to canvas settings events from CanvasSettingsDropdown
  useEffect(() => {
    const unsubBg = bus.subscribe(
      CanvasDocumentEvents.BACKGROUND_CHANGED,
      (event: { payload: { background: BackgroundSpec } }) => {
        setViewportConfig((prev) => ({ ...prev, background: event.payload.background }));
      },
    );

    const unsubVp = bus.subscribe(
      CanvasDocumentEvents.VIEWPORT_CHANGED,
      (event: { payload: { viewport: { width?: number; height?: number; sizeMode?: 'infinite' | 'bounded' } } }) => {
        setViewportConfig((prev) => ({
          ...prev,
          width: event.payload.viewport.width,
          height: event.payload.viewport.height,
          ...(event.payload.viewport.sizeMode ? { sizeMode: event.payload.viewport.sizeMode } : {}),
        }));
      },
    );

    const unsubBr = bus.subscribe(
      CanvasDocumentEvents.BORDER_RADIUS_CHANGED,
      (event: { payload: { borderRadius: number | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number } } }) => {
        setBorderRadius(event.payload.borderRadius);
      },
    );

    const unsubOpacity = bus.subscribe(
      'canvas.document.opacity.changed',
      (event: { payload: { opacity: number } }) => {
        setCanvasOpacity(event.payload.opacity);
      },
    );

    const unsubStroke = bus.subscribe(
      'canvas.document.stroke.changed',
      (event: { payload: { stroke: any } }) => {
        setCanvasStroke(event.payload.stroke);
      },
    );

    const unsubWorkspaceBg = bus.subscribe(
      'canvas.document.workspaceBg.changed',
      (event: { payload: { workspaceBg: any } }) => {
        setWorkspaceBg(event.payload.workspaceBg);
      },
    );

    const unsubDropShadow = bus.subscribe(
      'canvas.document.dropShadow.changed',
      (event: { payload: { dropShadow: any } }) => { setDropShadow(event.payload.dropShadow); },
    );

    const unsubFilters = bus.subscribe(
      'canvas.document.filters.changed',
      (event: { payload: { filters: any } }) => { setCanvasFilters(event.payload.filters); },
    );

    const unsubPadding = bus.subscribe(
      'canvas.document.padding.changed',
      (event: { payload: { padding: any } }) => { setCanvasPadding(event.payload.padding); },
    );

    const unsubPos = bus.subscribe(
      CanvasDocumentEvents.CANVAS_POSITION_CHANGED,
      (event: { payload: { position: CanvasPositionConfig } }) => {
        const nextPosition = event.payload.position;
        setCanvasPosition({
          horizontal: nextPosition.horizontal,
          vertical: nextPosition.vertical,
          topOffset: nextPosition.topOffset ?? DEFAULT_CANVAS_TOP_SPACING,
        });
      },
    );

    // 2D↔3D sync: project entity transforms when syncTransform2d3d is enabled
    const unsubSync = bus.subscribe(
      CanvasEvents.ENTITY_MOVED,
      (event: { payload: { id: string; transform: any } }) => {
        const entity = sceneGraph?.getEntity(event.payload.id);
        if (!entity || entity.syncTransform2d3d === false) return;
        const spatialTransform = project2Dto3D(event.payload.transform ?? entity.transform);
        bus.emit(CanvasEvents.ENTITY_UPDATED, {
          id: entity.id,
          updates: { spatialTransform },
        });
      },
    );

    return () => {
      unsubBg();
      unsubVp();
      unsubBr();
      unsubOpacity();
      unsubStroke();
      unsubWorkspaceBg();
      unsubDropShadow();
      unsubFilters();
      unsubPadding();
      unsubPos();
      unsubSync();
    };
  }, []);

  // Handle sticker settings confirmation
  const handleStickerSettingsConfirm = useCallback(
    (settings: StickerSettings) => {
      if (!entityToEditAsSticker) return;

      const stickerSource = resolveStickerSource(entityToEditAsSticker);

      // Build the click action object based on settings
      let clickAction: StickerEntity['clickAction'];
      if (settings.clickActionType === 'none') {
        clickAction = { type: 'none', urlNewTab: true };
      } else if (settings.clickActionType === 'open-url') {
        clickAction = {
          type: 'open-url',
          url: settings.clickUrl,
          urlNewTab: settings.clickUrlNewTab,
        };
      } else if (settings.clickActionType === 'launch-widget') {
        clickAction = {
          type: 'launch-widget',
          widgetId: settings.clickWidgetId,
          urlNewTab: true,
        };
      } else if (settings.clickActionType === 'emit-event') {
        let parsedPayload = {};
        try {
          parsedPayload = JSON.parse(settings.clickEventPayload);
        } catch {
          // Use empty object if parsing fails
        }
        clickAction = {
          type: 'emit-event',
          eventType: settings.clickEventType,
          eventPayload: parsedPayload,
          urlNewTab: true,
        };
      }

      // Emit entity update event
      bus.emit(CanvasEvents.ENTITY_UPDATED, {
        id: entityToEditAsSticker.id,
        updates: {
          type: 'sticker',
          assetUrl: stickerSource.assetUrl,
          assetType: stickerSource.assetType,
          altText: settings.altText || stickerSource.altText,
          hoverEffect: settings.hoverEffect,
          aspectLocked: settings.aspectLocked,
          clickAction,
          name:
            entityToEditAsSticker.type === 'sticker'
              ? entityToEditAsSticker.name
              : `${entityToEditAsSticker.name ?? entityToEditAsSticker.type} Sticker`,
        },
      });

      setEntityToEditAsSticker(null);
    },
    [entityToEditAsSticker],
  );

  // Handle sticker settings modal close
  const handleStickerSettingsClose = useCallback(() => {
    setEntityToEditAsSticker(null);
  }, []);

  // Handle canvas rename from toolbar
  const handleCanvasRename = useCallback((newName: string) => {
    if (!canvasSummary) return;
    const updated = renameLocalCanvas(canvasSummary.slug, newName);
    if (updated) {
      setCanvasSummary(updated);
    }
  }, [canvasSummary]);

  return (
    <div
      data-testid="page-canvas"
      data-mode={mode}
      style={{
        width: '100%',
        height: '100%',
        background: themeVar('--sn-bg'),
        color: themeVar('--sn-text'),
        fontFamily: themeVar('--sn-font-family'),
      }}
    >
      <ShellLayout
        topbar={
          <Toolbar
            viewportStore={viewportStore}
            saveStatus={persistence.status}
            onSave={persistence.save}
            canvasName={canvasSummary?.name}
            onRename={handleCanvasRename}
            viewportConfig={viewportConfig}
            borderRadius={typeof borderRadius === 'number' ? borderRadius : borderRadius.topLeft}
            canvasPosition={canvasPosition}
            selectedIds={selectedIds}
          />
        }
        renderDockerWidget={renderDockerWidget}
        sidebarLeft={mode === 'edit' ? <AssetPanel /> : undefined}
        sidebarRight={
          mode === 'edit' ? (
            <>
              <PropertiesPanel entities={entities} viewportConfig={viewportConfig} borderRadius={borderRadius} canvasOpacity={canvasOpacity} canvasStroke={canvasStroke as any} workspaceBg={workspaceBg as any} dropShadow={dropShadow as any} canvasFilters={canvasFilters as any} canvasPadding={canvasPadding as any} />
              <LayersPanel entities={entities} />
              <TextSettingsPanel entities={entities} />
            </>
          ) : undefined
        }
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
            padding: `${canvasPosition.topOffset}px 24px 24px`,
            boxSizing: 'border-box',
            display: 'flex',
            justifyContent:
              canvasPosition.horizontal === 'left'
                ? 'flex-start'
                : canvasPosition.horizontal === 'right'
                  ? 'flex-end'
                  : 'center',
            alignItems:
              canvasPosition.vertical === 'top'
                ? 'flex-start'
                : canvasPosition.vertical === 'bottom'
                  ? 'flex-end'
                  : 'center',
            position: 'relative',
            ...(workspaceBg.mode === 'image' || workspaceBg.mode === 'parallax'
              ? {
                  backgroundImage: workspaceBg.imageUrl ? `url(${workspaceBg.imageUrl})` : undefined,
                  backgroundSize: workspaceBg.imageMode === 'tile' ? 'auto' : workspaceBg.imageMode,
                  backgroundPosition: 'center',
                  backgroundRepeat: workspaceBg.imageMode === 'tile' ? 'repeat' : 'no-repeat',
                  backgroundAttachment: workspaceBg.mode === 'parallax' ? 'fixed' : 'scroll',
                }
              : {}),
          }}
        >
          <div
            style={{
              width:
                viewportConfig.sizeMode === 'bounded' && viewportConfig.width
                  ? `${viewportConfig.width}px`
                  : '100%',
              height:
                viewportConfig.sizeMode === 'bounded' && viewportConfig.height
                  ? `${viewportConfig.height}px`
                  : '100%',
              borderRadius: typeof borderRadius === 'number'
                ? `${borderRadius}px`
                : `${borderRadius.topLeft}px ${borderRadius.topRight}px ${borderRadius.bottomRight}px ${borderRadius.bottomLeft}px`,
              overflow: 'hidden',
              flexShrink: 0,
              transition: 'width 200ms ease, height 200ms ease',
              ...(viewportConfig.sizeMode === 'bounded' ? {
                background: 'var(--sn-surface-glass, rgba(20,17,24,0.85))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              } : {}),
              border: canvasStroke.weight > 0
                ? `${canvasStroke.weight}px ${canvasStroke.style} ${canvasStroke.color}`
                : undefined,
              borderImageSource: canvasStroke.weight > 0 && canvasStroke.gradient?.enabled
                ? `linear-gradient(${canvasStroke.gradient.angle}deg, ${canvasStroke.gradient.stops.map(s => `${s.color} ${s.offset * 100}%`).join(', ')})`
                : undefined,
              borderImageSlice: canvasStroke.weight > 0 && canvasStroke.gradient?.enabled ? 1 : undefined,
              boxShadow: (() => {
                const parts: string[] = [];
                // Drop shadow from settings
                const { r: sr, g: sg, b: sb } = hexToRgb(dropShadow.color);
                parts.push(`${dropShadow.type === 'inner' ? 'inset ' : ''}${dropShadow.offsetX}px ${dropShadow.offsetY}px ${dropShadow.blur}px ${dropShadow.spread}px rgba(${sr},${sg},${sb},${dropShadow.opacity})`);
                // Default border outline when no stroke
                if (viewportConfig.sizeMode === 'bounded' && canvasStroke.weight === 0) {
                  parts.push('0 0 0 1px var(--sn-border)');
                }
                return parts.join(', ');
              })(),
              filter: (canvasFilters.brightness !== 100 || canvasFilters.contrast !== 100 || canvasFilters.saturation !== 100 || canvasFilters.hueRotate !== 0 || canvasFilters.blur !== 0)
                ? [
                    canvasFilters.brightness !== 100 ? `brightness(${canvasFilters.brightness}%)` : '',
                    canvasFilters.contrast !== 100 ? `contrast(${canvasFilters.contrast}%)` : '',
                    canvasFilters.saturation !== 100 ? `saturate(${canvasFilters.saturation}%)` : '',
                    canvasFilters.hueRotate !== 0 ? `hue-rotate(${canvasFilters.hueRotate}deg)` : '',
                    canvasFilters.blur !== 0 ? `blur(${canvasFilters.blur}px)` : '',
                  ].filter(Boolean).join(' ') || undefined
                : undefined,
              padding: (canvasPadding.top || canvasPadding.right || canvasPadding.bottom || canvasPadding.left)
                ? `${canvasPadding.top}px ${canvasPadding.right}px ${canvasPadding.bottom}px ${canvasPadding.left}px`
                : undefined,
            }}
          >
            <CanvasWorkspace
              sceneGraph={sceneGraph}
              dashboardSlug={canvasKey}
              maxArtboardsPerDashboard={DEFAULT_ARTBOARD_LIMIT_PER_DASHBOARD}
              widgetHtmlMap={widgetHtmlMap}
              background={viewportConfig.background}
              canvasOpacity={canvasOpacity}
              theme={widgetTheme}
            />
          </div>
        </div>
      </ShellLayout>

      {/* Sticker settings modal — opened when gear icon on sticker is clicked */}
      <StickerSettingsModal
        isOpen={entityToEditAsSticker !== null}
        onClose={handleStickerSettingsClose}
        onConfirm={handleStickerSettingsConfirm}
        assetUrl={
          entityToEditAsSticker ? resolveStickerSource(entityToEditAsSticker).assetUrl : undefined
        }
        assetType={
          entityToEditAsSticker ? resolveStickerSource(entityToEditAsSticker).assetType : undefined
        }
        initialSettings={
          entityToEditAsSticker && entityToEditAsSticker.type === 'sticker'
            ? {
                altText: entityToEditAsSticker.altText ?? '',
                hoverEffect: entityToEditAsSticker.hoverEffect ?? 'none',
                aspectLocked: entityToEditAsSticker.aspectLocked ?? true,
                clickActionType: entityToEditAsSticker.clickAction?.type ?? 'none',
                clickUrl:
                  entityToEditAsSticker.clickAction?.type === 'open-url'
                    ? entityToEditAsSticker.clickAction.url ?? ''
                    : '',
                clickUrlNewTab:
                  entityToEditAsSticker.clickAction?.type === 'open-url'
                    ? entityToEditAsSticker.clickAction.urlNewTab ?? true
                    : true,
                clickWidgetId:
                  entityToEditAsSticker.clickAction?.type === 'launch-widget'
                    ? entityToEditAsSticker.clickAction.widgetId ?? ''
                    : '',
                clickEventType:
                  entityToEditAsSticker.clickAction?.type === 'emit-event'
                    ? entityToEditAsSticker.clickAction.eventType ?? ''
                    : '',
                clickEventPayload:
                  entityToEditAsSticker.clickAction?.type === 'emit-event'
                    ? JSON.stringify(entityToEditAsSticker.clickAction.eventPayload ?? {})
                    : '{}',
              }
            : entityToEditAsSticker
              ? {
                  altText: resolveStickerSource(entityToEditAsSticker).altText,
                  hoverEffect: 'none',
                  aspectLocked: true,
                  clickActionType: 'none',
                  clickUrl: '',
                  clickUrlNewTab: true,
                  clickWidgetId: '',
                  clickEventType: '',
                  clickEventPayload: '{}',
                }
              : undefined
        }
      />

      {/* Ghost widget overlay for invite placement */}
      <GhostWidgetOverlay />

      {/* Fullscreen preview overlay — strips all chrome, shows canvas only */}
      {fullscreenPreview && (
        <div
          data-testid="fullscreen-preview"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: themeVar('--sn-bg'),
            overflow: 'hidden',
          }}
        >
          <CanvasWorkspace
            sceneGraph={sceneGraph}
            dashboardSlug={canvasKey}
            maxArtboardsPerDashboard={DEFAULT_ARTBOARD_LIMIT_PER_DASHBOARD}
            widgetHtmlMap={widgetHtmlMap}
            background={viewportConfig.background}
            theme={widgetTheme}
          />

          {/* Exit fullscreen button */}
          <button
            data-testid="fullscreen-exit-btn"
            onClick={exitFullscreenPreview}
            title="Exit fullscreen (Escape)"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 10000,
              width: 36,
              height: 36,
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              lineHeight: 1,
              backdropFilter: 'blur(8px)',
              transition: 'opacity 0.2s',
              opacity: 0.6,
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.6'; }}
          >
            {'\u2715'}
          </button>
        </div>
      )}
    </div>
  );
};

const MarketplacePageLazy = React.lazy(() =>
  import('../pages/MarketplacePageFull').then((m) => ({ default: m.MarketplacePageFull })),
);

export const MarketplacePage: React.FC = () => (
  <Suspense fallback={<div data-testid="page-marketplace" style={appPageStyle}>Loading marketplace...</div>}>
    <MarketplacePageLazy />
  </Suspense>
);

export const SettingsPage: React.FC = () => {
  const [tab, setTab] = React.useState<'billing' | 'integrations' | 'commerce' | 'purchases'>('billing');

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    border: 'none',
    borderBottom: active ? '2px solid var(--sn-accent, #6366f1)' : '2px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--sn-text, #1a1a2e)' : 'var(--sn-text-muted, #6b7280)',
  });

  return (
    <div data-testid="page-settings" style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 20 }}>Settings</h1>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--sn-border, #e5e7eb)', marginBottom: 24 }}>
        <button style={tabBtnStyle(tab === 'billing')} onClick={() => setTab('billing')}>Billing</button>
        <button style={tabBtnStyle(tab === 'integrations')} onClick={() => setTab('integrations')}>Integrations</button>
        <button style={tabBtnStyle(tab === 'commerce')} onClick={() => setTab('commerce')}>Creator Commerce</button>
        <button style={tabBtnStyle(tab === 'purchases')} onClick={() => setTab('purchases')}>My Purchases</button>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        {tab === 'billing' && <BillingSectionLazy />}
        {tab === 'integrations' && <IntegrationsSectionLazy />}
        {tab === 'commerce' && <CreatorCommerceSectionLazy />}
        {tab === 'purchases' && <MyPurchasesSectionLazy />}
      </Suspense>
    </div>
  );
};

const BillingSectionLazy = React.lazy(() =>
  import('../pages/settings/BillingSection').then((m) => ({ default: m.BillingSection })),
);
const IntegrationsSectionLazy = React.lazy(() =>
  import('../pages/settings/IntegrationsSection').then((m) => ({ default: m.IntegrationsSection })),
);
const CreatorCommerceSectionLazy = React.lazy(() =>
  import('../pages/settings/CreatorCommerceSection').then((m) => ({ default: m.CreatorCommerceSection })),
);
const MyPurchasesSectionLazy = React.lazy(() =>
  import('../pages/settings/MyPurchasesSection').then((m) => ({ default: m.MyPurchasesSection })),
);

export const InvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  return (
    <div data-testid="page-invite" style={appPageStyle}><h1>Accept Invite</h1><p>Token: {token}</p></div>
  );
};

export const NotFoundPage: React.FC = () => (
  <div data-testid="page-not-found" style={appPageStyle}><h1>404 — Not Found</h1></div>
);

// =============================================================================
// DashboardCard
// =============================================================================

interface DashboardCardProps {
  to: string;
  testId: string;
  icon: string;
  label: string;
  description: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  to,
  testId,
  icon,
  label,
  description,
}: DashboardCardProps) => (
  <Link to={to} data-testid={testId} style={dashboardStyles.card}>
    <div style={dashboardStyles.cardIcon}>{icon}</div>
    <div style={dashboardStyles.cardLabel}>{label}</div>
    <div style={dashboardStyles.cardDesc}>{description}</div>
  </Link>
);

const dashboardStyles: Record<string, React.CSSProperties> = {
  container: { padding: '48px 24px', maxWidth: '900px', margin: '0 auto' },
  title: { fontSize: '28px', fontWeight: 700, margin: '0 0 32px', color: 'var(--sn-text, #111)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  card: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', background: 'var(--sn-surface, #fff)', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 8px)', textDecoration: 'none', textAlign: 'center' as const, transition: 'border-color 0.15s, box-shadow 0.15s' },
  cardIcon: { width: '48px', height: '48px', borderRadius: '12px', background: 'var(--sn-accent, #2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, marginBottom: '12px' },
  cardLabel: { fontWeight: 600, fontSize: '16px', color: 'var(--sn-text, #111)', marginBottom: '6px' },
  cardDesc: { fontSize: '13px', color: 'var(--sn-text-muted, #666)', lineHeight: 1.4 },
};
