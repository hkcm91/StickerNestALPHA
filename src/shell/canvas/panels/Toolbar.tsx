/**
 * Toolbar — tool selector, zoom controls, grid controls, mode toggle.
 * Wraps the headless ToolbarController from L4A-4.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CanvasPlatform, GridConfig, GridLineStyle, GridProjectionMode, ViewportConfig } from '@sn/types';
import { CanvasDocumentEvents, GridEvents } from '@sn/types';

import { DEFAULT_GRID_CONFIG } from '../../../canvas/core';
import { bus } from '../../../kernel/bus';
import { useDockerStore } from '../../../kernel/stores/docker';
import { useHistoryStore, selectCanUndo, selectCanRedo } from '../../../kernel/stores/history/history.store';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { enterXR } from '../../../spatial';
import type { SaveStatus } from '../hooks/usePersistence';
import type { ViewportStore } from '../hooks/useViewport';

import { CanvasSettingsDropdown } from './CanvasSettingsDropdown';
import type { CanvasPositionConfig } from './CanvasSettingsDropdown';

// ── Canvas Size Presets (by platform) ──────────────────────────────
interface CanvasSizePreset {
  label: string;
  width: number;
  height: number;
}

const PLATFORM_PRESETS: Record<CanvasPlatform, CanvasSizePreset[]> = {
  web: [
    { label: 'Desktop HD (1920×1080)', width: 1920, height: 1080 },
    { label: 'Desktop (1440×900)', width: 1440, height: 900 },
    { label: 'MacBook Pro 14" (1512×982)', width: 1512, height: 982 },
    { label: 'MacBook Air 13" (1280×800)', width: 1280, height: 800 },
    { label: 'HD (1280×720)', width: 1280, height: 720 },
    { label: '4K (3840×2160)', width: 3840, height: 2160 },
  ],
  mobile: [
    { label: 'iPhone 15 Pro (393×852)', width: 393, height: 852 },
    { label: 'iPhone 15 Pro Max (430×932)', width: 430, height: 932 },
    { label: 'iPhone SE (375×667)', width: 375, height: 667 },
    { label: 'Pixel 8 (412×915)', width: 412, height: 915 },
    { label: 'Samsung Galaxy S24 (360×780)', width: 360, height: 780 },
    { label: 'iPad (820×1180)', width: 820, height: 1180 },
    { label: 'iPad Mini (744×1133)', width: 744, height: 1133 },
    { label: 'iPad Pro 12.9" (1024×1366)', width: 1024, height: 1366 },
    { label: 'Android Tablet (800×1280)', width: 800, height: 1280 },
  ],
  desktop: [
    { label: 'Full HD (1920×1080)', width: 1920, height: 1080 },
    { label: 'QHD (2560×1440)', width: 2560, height: 1440 },
    { label: '4K UHD (3840×2160)', width: 3840, height: 2160 },
    { label: 'Ultrawide (2560×1080)', width: 2560, height: 1080 },
    { label: 'MacBook Pro 16" (1728×1117)', width: 1728, height: 1117 },
    { label: 'iMac 24" (4480×2520)', width: 4480, height: 2520 },
  ],
};

export interface ToolbarProps {
  viewportStore: ViewportStore;
  /** Save status indicator (from usePersistence) */
  saveStatus?: SaveStatus;
  /** Callback for manual save */
  onSave?: () => void;
  /** Current canvas name */
  canvasName?: string;
  /** Callback for renaming the canvas */
  onRename?: (newName: string) => void;
  /** Current viewport configuration */
  viewportConfig?: ViewportConfig;
  /** Current canvas border radius */
  borderRadius?: number;
  /** Current canvas position in workspace */
  canvasPosition?: CanvasPositionConfig;
  /** Currently selected entity IDs */
  selectedIds?: Set<string>;
}

const DOCKER_LIBRARY_NAME = 'Docker Library';
const HISTORY_WIDGET_INSTANCE_ID = '44444444-4444-4444-4444-444444444444';

// ── Icons ────────────────────────────────────────────────────────

const SelectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    <path d="M13 13l6 6" />
  </svg>
);

const PanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

const ArtboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);

const PenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l5 5" />
    <path d="M11 11l1 1" />
  </svg>
);

const TextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

const RectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
);

const PathfinderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M2 12h20" />
  </svg>
);

const UndoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const RedoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const AlignLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="2" x2="4" y2="22" />
    <rect x="8" y="6" width="12" height="4" rx="1" />
    <rect x="8" y="14" width="8" height="4" rx="1" />
  </svg>
);

const AlignCenterHIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22" />
    <rect x="5" y="6" width="14" height="4" rx="1" />
    <rect x="7" y="14" width="10" height="4" rx="1" />
  </svg>
);

const AlignRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="20" y1="2" x2="20" y2="22" />
    <rect x="4" y="6" width="12" height="4" rx="1" />
    <rect x="8" y="14" width="8" height="4" rx="1" />
  </svg>
);

const AlignTopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="4" x2="22" y2="4" />
    <rect x="6" y="8" width="4" height="12" rx="1" />
    <rect x="14" y="8" width="4" height="8" rx="1" />
  </svg>
);

const AlignCenterVIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="12" x2="22" y2="12" />
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="7" width="4" height="10" rx="1" />
  </svg>
);

const AlignBottomIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="20" x2="22" y2="20" />
    <rect x="6" y="4" width="4" height="12" rx="1" />
    <rect x="14" y="8" width="4" height="8" rx="1" />
  </svg>
);

const XRGogglesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-3.5a2 2 0 0 1-1.7-1l-1.6-2.6a2 2 0 0 0-3.4 0L8.2 15a2 2 0 0 1-1.7 1H4a2 2 0 0 1-2-2v-4z" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const LibraryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const FullscreenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

/** XR icon — reserved for future spatial toolbar button */
export const XRIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="7" cy="12" r="2" />
    <circle cx="17" cy="12" r="2" />
    <path d="M12 15v3" />
  </svg>
);

interface ToolDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
}

/** Primary tools — always visible in the main toolbar */
const PRIMARY_TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select', icon: <SelectIcon />, shortcut: 'V' },
  { id: 'pan', label: 'Pan', icon: <PanIcon />, shortcut: 'H' },
  { id: 'pen', label: 'Pen', icon: <PenIcon />, shortcut: 'D' },
  { id: 'text', label: 'Text', icon: <TextIcon />, shortcut: 'T' },
  { id: 'rect', label: 'Shape', icon: <RectIcon />, shortcut: 'R' },
];

/** Extra tools — shown in the pull-down tray */
const TRAY_TOOLS: ToolDef[] = [
  { id: 'artboard', label: 'Artboard', icon: <ArtboardIcon />, shortcut: 'A' },
  { id: 'pathfinder', label: 'Shape Builder', icon: <PathfinderIcon />, shortcut: 'Shift+M' },
];

/** All tools combined — exported for keyboard shortcut handling in canvas shortcuts */
export const TOOLS: ToolDef[] = [...PRIMARY_TOOLS, ...TRAY_TOOLS];

/** Spring easing — Principle 4 */
const TOOLBAR_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** Shared button style for small toggle/icon buttons */
const smallBtnBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px',
  minWidth: '32px',
  height: '32px',
  border: '1px solid var(--sn-border, #e0e0e0)',
  borderRadius: 'var(--sn-radius, 6px)',
  background: 'transparent',
  color: 'var(--sn-text, #1a1a2e)',
  cursor: 'pointer',
  fontSize: '12px',
  fontFamily: 'inherit',
  lineHeight: 1,
  transition: `all 0.15s ${TOOLBAR_SPRING}`,
};

const smallBtnActive: React.CSSProperties = {
  ...smallBtnBase,
  borderColor: 'var(--sn-accent, #6366f1)',
  background: 'var(--sn-accent, #6366f1)',
  color: '#fff',
};

/** Labeled tool button — icon + text label side by side */
const LabeledToolBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  title: string;
  testId: string;
}> = ({ icon, label, active, onClick, title, testId }) => (
  <button
    data-testid={testId}
    onClick={onClick}
    title={title}
    style={{
      ...smallBtnBase,
      gap: '4px',
      padding: '0 8px',
      minWidth: 'auto',
      borderColor: active ? 'var(--sn-accent, #6366f1)' : 'var(--sn-border, #e0e0e0)',
      background: active ? 'var(--sn-accent, #6366f1)' : 'transparent',
      color: active ? '#fff' : 'var(--sn-text, #1a1a2e)',
    }}
  >
    {icon}
    <span style={{ fontSize: '11px', fontWeight: 500 }}>{label}</span>
  </button>
);

/** Tray section label */
const TrayLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--sn-text-muted, #888)',
    marginRight: '6px',
    whiteSpace: 'nowrap',
  }}>
    {children}
  </span>
);

/** Vertical divider line */
const Divider: React.FC = () => (
  <div style={{ width: '1px', height: '24px', background: 'var(--sn-border, #e0e0e0)', margin: '0 6px' }} />
);

/** Chevron icon for More Tools toggle */
const ChevronDownIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: `transform 0.25s ${TOOLBAR_SPRING}`, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/**
 * Toolbar component — renders tool buttons, zoom controls, grid controls, and edit/preview toggle.
 * Always visible in both edit and preview modes.
 */
const SAVE_STATUS_COLORS: Record<SaveStatus, string> = {
  saved: '#22c55e',
  saving: '#eab308',
  unsaved: '#ef4444',
};

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving...',
  unsaved: 'Unsaved',
};

export const Toolbar: React.FC<ToolbarProps> = ({
  viewportStore,
  saveStatus,
  onSave,
  canvasName,
  onRename,
  viewportConfig,
  borderRadius,
  canvasPosition,
  selectedIds = new Set(),
}) => {
  const activeTool = useUIStore((s) => (s.activeTool === 'move' ? 'select' : s.activeTool));
  const mode = useUIStore((s) => s.canvasInteractionMode);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const setCanvasInteractionMode = useUIStore((s) => s.setCanvasInteractionMode);
  const spatialMode = useUIStore((s) => s.spatialMode);
  const setSpatialMode = useUIStore((s) => s.setSpatialMode);
  const canvasPlatform = useUIStore((s) => s.canvasPlatform);
  const setCanvasPlatform = useUIStore((s) => s.setCanvasPlatform);
  const setPlatformConfig = useUIStore((s) => s.setPlatformConfig);
  const platformConfigs = useUIStore((s) => s.platformConfigs);
  const artboardPreviewMode = useUIStore((s) => s.artboardPreviewMode);
  const setArtboardPreviewMode = useUIStore((s) => s.setArtboardPreviewMode);
  const setFullscreenPreview = useUIStore((s) => s.setFullscreenPreview);

  const canUndo = useHistoryStore(selectCanUndo);
  const canRedo = useHistoryStore(selectCanRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  const dockers = useDockerStore((state) => state.dockers);
  const addDocker = useDockerStore((state) => state.addDocker);
  const setDockerVisible = useDockerStore((state) => state.setVisible);
  const bringDockerToFront = useDockerStore((state) => state.bringToFront);

  // Grid config state — kept in sync via bus events
  const [gridConfig, setGridConfig] = useState<GridConfig>({ ...DEFAULT_GRID_CONFIG });

  // Canvas rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Canvas settings dropdown state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // Subscribe to grid config changes from other sources (e.g., grid-layer)
  useEffect(() => {
    const unsub = bus.subscribe(GridEvents.CONFIG_CHANGED, (event: { payload: { config: Partial<GridConfig> } }) => {
      setGridConfig((prev) => ({ ...prev, ...event.payload.config }));
    });

    const unsubToggle = bus.subscribe(GridEvents.TOGGLED, (event: { payload: { enabled: boolean } }) => {
      setGridConfig((prev) => ({ ...prev, enabled: event.payload.enabled }));
    });

    return () => {
      unsub();
      unsubToggle();
    };
  }, []);

  const zoom = viewportStore.getState().zoom;
  const zoomPercent = useMemo(() => Math.round(zoom * 100), [zoom]);

  const handleToolClick = useCallback(
    (toolId: string) => {
      setActiveTool(toolId);
    },
    [setActiveTool],
  );

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  const handleZoomIn = useCallback(() => {
    const vp = viewportStore.getState();
    const newZoom = Math.min(vp.zoom * 1.25, 10);
    viewportStore.zoom(newZoom, {
      x: vp.viewportWidth / 2,
      y: vp.viewportHeight / 2,
    });
  }, [viewportStore]);

  const handleZoomOut = useCallback(() => {
    const vp = viewportStore.getState();
    const newZoom = Math.max(vp.zoom / 1.25, 0.1);
    viewportStore.zoom(newZoom, {
      x: vp.viewportWidth / 2,
      y: vp.viewportHeight / 2,
    });
  }, [viewportStore]);

  const handleZoomReset = useCallback(() => {
    viewportStore.reset();
  }, [viewportStore]);

  const handleModeToggle = useCallback(() => {
    const next = mode === 'edit' ? 'preview' : 'edit';
    setCanvasInteractionMode(next);
  }, [mode, setCanvasInteractionMode]);

  const handleDockerClick = useCallback(() => {
    const existing = Object.values(dockers).find((docker) => docker.name === DOCKER_LIBRARY_NAME);
    if (existing) {
      setDockerVisible(existing.id, true);
      bringDockerToFront(existing.id);
    } else {
      const dockerId = addDocker({
        name: DOCKER_LIBRARY_NAME,
        dockMode: 'floating',
        visible: true,
        pinned: false,
        position: { x: 96, y: 96 },
        size: { width: 360, height: 460 },
        tabs: [{ id: crypto.randomUUID(), name: 'Library', widgets: [] }],
      });
      bringDockerToFront(dockerId);
    }
  }, [dockers, addDocker, setDockerVisible, bringDockerToFront]);

  const handleHistoryClick = useCallback(() => {
    const HISTORY_DOCKER_NAME = 'History';
    const existing = Object.values(dockers).find((docker) => docker.name === HISTORY_DOCKER_NAME);
    if (existing) {
      setDockerVisible(existing.id, true);
      bringDockerToFront(existing.id);
    } else {
      const dockerId = addDocker({
        name: HISTORY_DOCKER_NAME,
        dockMode: 'floating',
        visible: true,
        pinned: false,
        position: { x: 400, y: 96 },
        size: { width: 300, height: 400 },
        tabs: [
          {
            id: crypto.randomUUID(),
            name: 'History',
            widgets: [{ widgetInstanceId: HISTORY_WIDGET_INSTANCE_ID }],
          },
        ],
      });
      bringDockerToFront(dockerId);
    }
  }, [dockers, addDocker, setDockerVisible, bringDockerToFront]);

  const handleSpatialModeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSpatialMode(e.target.value as any);
  }, [setSpatialMode]);

  const handlePlatformChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const platform = e.target.value as CanvasPlatform;
    setCanvasPlatform(platform);
  }, [setCanvasPlatform]);

  const handlePresetChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetLabel = e.target.value;
    if (presetLabel === '__current__') return;
    const presets = PLATFORM_PRESETS[canvasPlatform];
    const preset = presets.find((p) => p.label === presetLabel);
    if (preset) {
      setPlatformConfig(canvasPlatform, {
        width: preset.width,
        height: preset.height,
        sizeMode: 'bounded',
      });
      bus.emit(CanvasDocumentEvents.VIEWPORT_CHANGED, {
        canvasId: '',
        viewport: { width: preset.width, height: preset.height, sizeMode: 'bounded' },
      });
    }
  }, [canvasPlatform, setPlatformConfig]);

  const handleArtboardPreviewToggle = useCallback(() => {
    setArtboardPreviewMode(!artboardPreviewMode);
  }, [artboardPreviewMode, setArtboardPreviewMode]);

  const handleEnterXR = useCallback(() => {
    enterXR('immersive-vr');
  }, []);

  const handleFullscreenPreview = useCallback(() => {
    setFullscreenPreview(true);
  }, [setFullscreenPreview]);

  // ── Alignment / Grouping ───────────────────────────────────────

  const handleAlign = useCallback(
    (type: string) => {
      if (selectedIds.size < 2) return;
      bus.emit(`canvas.align.${type}`, { entityIds: Array.from(selectedIds) });
    },
    [selectedIds],
  );

  const handleGroup = useCallback(() => {
    if (selectedIds.size < 2) return;
    bus.emit('canvas.entity.group', { entityIds: Array.from(selectedIds) });
  }, [selectedIds]);

  const handleUngroup = useCallback(() => {
    if (selectedIds.size === 0) return;
    bus.emit('canvas.entity.ungroup', { entityIds: Array.from(selectedIds) });
  }, [selectedIds]);

  // ── Grid controls ──────────────────────────────────────────────

  const handleGridToggle = useCallback(() => {
    const newEnabled = !gridConfig.enabled;
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { enabled: newEnabled } });
    bus.emit(GridEvents.TOGGLED, { canvasId: '', enabled: newEnabled });
  }, [gridConfig.enabled]);

  const handleSnapModeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { snapMode: e.target.value } });
  }, []);

  const handleGridLinesToggle = useCallback(() => {
    const newShow = !gridConfig.showGridLines;
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { showGridLines: newShow } });
  }, [gridConfig.showGridLines]);

  const handleProjectionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const projection = e.target.value as GridProjectionMode;
      bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { projection } });
    },
    [],
  );

  // ── More Tools tray ────────────────────────────────────────────
  const [trayOpen, setTrayOpen] = useState(false);
  const trayRef = useRef<HTMLDivElement>(null);

  // Dismiss tray on outside click
  useEffect(() => {
    if (!trayOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (trayRef.current && !trayRef.current.contains(e.target as Node)) {
        setTrayOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [trayOpen]);

  // ── Grid customizer popover ─────────────────────────────────────
  const [gridCustomizerOpen, setGridCustomizerOpen] = useState(false);
  const gridCustomizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridCustomizerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (gridCustomizerRef.current && !gridCustomizerRef.current.contains(e.target as Node)) {
        setGridCustomizerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [gridCustomizerOpen]);

  const handleGridStyleChange = useCallback((style: GridLineStyle) => {
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { gridLineStyle: style } });
  }, []);

  const handleGridColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { gridLineColor: e.target.value } });
  }, []);

  const handleGridOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { gridLineOpacity: Number(e.target.value) } });
  }, []);

  const handleGridWeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { gridLineWidth: Number(e.target.value) } });
  }, []);

  const handleGridDotSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { dotSize: Number(e.target.value) } });
  }, []);

  const isEditMode = mode === 'edit';

  // Select style for tray dropdowns
  const traySelectStyle: React.CSSProperties = {
    height: '32px',
    padding: '0 6px',
    border: '1px solid var(--sn-border, #e0e0e0)',
    borderRadius: 'var(--sn-radius, 6px)',
    background: 'var(--sn-surface, #fff)',
    color: 'var(--sn-text, #1a1a2e)',
    cursor: 'pointer',
    fontSize: '11px',
    fontFamily: 'inherit',
  };

  return (
    <div ref={trayRef} data-testid="canvas-toolbar" style={{ position: 'relative' }}>
      {/* ═══ PRIMARY TOOLBAR ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0 12px',
          background: 'var(--sn-surface-glass, rgba(255,255,255,0.75))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--sn-border, #e0e0e0)',
          height: '48px',
          fontFamily: 'var(--sn-font-family, system-ui)',
          fontSize: '13px',
          userSelect: 'none',
        }}
      >
        {/* Canvas name + Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {canvasName !== undefined && (
            isRenaming ? (
              <input
                ref={renameInputRef}
                data-testid="canvas-name-input"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={() => {
                  if (renameDraft.trim() && onRename) onRename(renameDraft.trim());
                  setIsRenaming(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (renameDraft.trim() && onRename) onRename(renameDraft.trim());
                    setIsRenaming(false);
                  } else if (e.key === 'Escape') {
                    setIsRenaming(false);
                  }
                }}
                style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  border: '1px solid var(--sn-accent, #6366f1)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  background: 'var(--sn-bg, #fff)',
                  color: 'var(--sn-text, #1a1a2e)',
                  outline: 'none',
                  width: '160px',
                  height: '28px',
                }}
              />
            ) : (
              <div
                data-testid="canvas-name"
                onDoubleClick={() => {
                  setRenameDraft(canvasName);
                  setIsRenaming(true);
                  setTimeout(() => renameInputRef.current?.select(), 0);
                }}
                title="Double-click to rename"
                style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  maxWidth: '180px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {canvasName}
              </div>
            )
          )}

          {saveStatus && (
            <>
              <button
                data-testid="save-btn"
                onClick={onSave}
                title="Save (Ctrl+S)"
                style={{ ...smallBtnBase, padding: '0 10px', width: 'auto', fontSize: '12px', fontWeight: 600 }}
              >
                Save
              </button>
              <div
                data-testid="save-status"
                title={SAVE_STATUS_LABELS[saveStatus]}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--sn-text-muted, #6b7280)' }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: SAVE_STATUS_COLORS[saveStatus], display: 'inline-block' }} />
                {SAVE_STATUS_LABELS[saveStatus]}
              </div>
            </>
          )}
          <Divider />
        </div>

        {/* Primary tool buttons — labeled, edit mode only */}
        {isEditMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} data-testid="toolbar-tools">
            <div style={{ display: 'flex', gap: '2px' }}>
              {PRIMARY_TOOLS.map((tool) => (
                <LabeledToolBtn
                  key={tool.id}
                  testId={`tool-${tool.id}`}
                  icon={tool.icon}
                  label={tool.label}
                  active={activeTool === tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                />
              ))}
            </div>

            <Divider />

            <div style={{ display: 'flex', gap: '2px' }}>
              <button onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" style={{ ...smallBtnBase, opacity: canUndo ? 1 : 0.4 }}>
                <UndoIcon />
              </button>
              <button onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" style={{ ...smallBtnBase, opacity: canRedo ? 1 : 0.4 }}>
                <RedoIcon />
              </button>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} data-testid="toolbar-zoom">
          <button data-testid="zoom-out" onClick={handleZoomOut} title="Zoom out" style={smallBtnBase}>-</button>
          <button
            data-testid="zoom-reset"
            onClick={handleZoomReset}
            title="Reset zoom"
            style={{ ...smallBtnBase, border: 'none', minWidth: '44px', color: 'var(--sn-text-muted, #6b7280)' }}
          >
            {zoomPercent}%
          </button>
          <button data-testid="zoom-in" onClick={handleZoomIn} title="Zoom in" style={smallBtnBase}>+</button>
        </div>

        <Divider />

        {/* Mode toggle + Fullscreen */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            data-testid="mode-toggle"
            onClick={handleModeToggle}
            title={isEditMode ? 'Switch to Preview (P)' : 'Switch to Edit (P)'}
            style={{
              height: '32px',
              padding: '0 16px',
              border: '1px solid var(--sn-border, #e0e0e0)',
              borderRadius: 'var(--sn-radius, 6px)',
              background: isEditMode ? 'transparent' : 'var(--sn-accent, #6366f1)',
              color: isEditMode ? 'var(--sn-text, #1a1a2e)' : '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'inherit',
              fontWeight: 600,
              transition: `all 0.15s ${TOOLBAR_SPRING}`,
            }}
          >
            {isEditMode ? 'Run' : 'Edit'}
          </button>
          <button
            data-testid="fullscreen-preview-btn"
            onClick={handleFullscreenPreview}
            title="Fullscreen Preview (Shift+F)"
            style={{ ...smallBtnBase, height: '32px' }}
          >
            <FullscreenIcon />
          </button>
        </div>

        {/* More Tools toggle */}
        {isEditMode && (
          <>
            <Divider />
            <button
              data-testid="more-tools-toggle"
              onClick={() => setTrayOpen((p) => !p)}
              title={trayOpen ? 'Hide tools' : 'More tools'}
              style={{
                ...smallBtnBase,
                gap: '4px',
                padding: '0 10px',
                minWidth: 'auto',
                background: trayOpen ? 'var(--sn-surface-raised, #1E1E24)' : 'transparent',
                fontSize: '11px',
                fontWeight: 500,
              }}
            >
              MORE TOOLS
              <ChevronDownIcon open={trayOpen} />
            </button>
          </>
        )}
      </div>

      {/* ═══ PULL-DOWN TRAY ═══ */}
      {isEditMode && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 40, overflow: 'hidden', pointerEvents: trayOpen ? 'auto' : 'none' }}>
          <div
            data-testid="toolbar-tray"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'var(--sn-surface-glass, rgba(255,255,255,0.75))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid var(--sn-border, #e0e0e0)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              fontFamily: 'var(--sn-font-family, system-ui)',
              fontSize: '12px',
              userSelect: 'none',
              transform: trayOpen ? 'translateY(0)' : 'translateY(-100%)',
              transition: `transform 0.35s ${TOOLBAR_SPRING}`,
            }}
          >
            {/* Extra Tools */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrayLabel>Tools</TrayLabel>
              {TRAY_TOOLS.map((tool) => (
                <LabeledToolBtn
                  key={tool.id}
                  testId={`tool-${tool.id}`}
                  icon={tool.icon}
                  label={tool.label}
                  active={activeTool === tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                />
              ))}
            </div>

            <Divider />

            {/* Grid */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} data-testid="toolbar-grid">
              <TrayLabel>Grid</TrayLabel>
              <button data-testid="grid-toggle" onClick={handleGridToggle} title={gridConfig.enabled ? 'Hide grid (G)' : 'Show grid (G)'} style={{ ...(gridConfig.enabled ? smallBtnActive : smallBtnBase), padding: '0 8px', width: 'auto' }}>Grid</button>
              {gridConfig.enabled && <button data-testid="grid-lines-toggle" onClick={handleGridLinesToggle} title={gridConfig.showGridLines ? 'Hide grid lines' : 'Show grid lines'} style={{ ...(gridConfig.showGridLines ? smallBtnActive : smallBtnBase), padding: '0 8px', width: 'auto' }}>Lines</button>}
              <select data-testid="snap-mode" value={gridConfig.snapMode ?? 'none'} onChange={handleSnapModeChange} title="Snap mode" style={traySelectStyle}>
                <option value="none">No Snap</option>
                <option value="center">Center</option>
                <option value="corner">Corner</option>
                <option value="edge">Edge</option>
              </select>
              {gridConfig.enabled && (
                <select data-testid="grid-projection" value={gridConfig.projection} onChange={handleProjectionChange} title="Grid projection" style={traySelectStyle}>
                  <option value="orthogonal">Square</option>
                  <option value="isometric">Isometric</option>
                  <option value="triangular">Triangular</option>
                  <option value="hexagonal">Hexagonal</option>
                </select>
              )}
              {gridConfig.enabled && (
                <div ref={gridCustomizerRef} style={{ position: 'relative' }}>
                  <button data-testid="grid-customizer-toggle" onClick={() => setGridCustomizerOpen(!gridCustomizerOpen)} title="Grid appearance" style={{ ...(gridCustomizerOpen ? smallBtnActive : smallBtnBase), padding: '0 6px', width: 'auto', fontSize: '11px' }}>{'\u2699'}</button>
                  {gridCustomizerOpen && (
                    <div data-testid="grid-customizer-popover" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, padding: '10px 12px', background: 'var(--sn-surface, #fff)', border: '1px solid var(--sn-border, #e0e0e0)', borderRadius: 'var(--sn-radius, 6px)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '11px', fontFamily: 'inherit', color: 'var(--sn-text, #1a1a2e)' }}>
                      <div>
                        <div style={{ marginBottom: 4, fontWeight: 600 }}>Style</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(['line', 'dot', 'cross'] as GridLineStyle[]).map((style) => (
                            <button key={style} data-testid={`grid-style-${style}`} onClick={() => handleGridStyleChange(style)} style={{ ...(gridConfig.gridLineStyle === style || (!gridConfig.gridLineStyle && style === 'line') ? smallBtnActive : smallBtnBase), padding: '2px 8px', fontSize: '11px', textTransform: 'capitalize' }}>{style}</button>
                          ))}
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Color</span>
                        <input data-testid="grid-color-picker" type="color" value={gridConfig.gridLineColor?.startsWith('#') ? gridConfig.gridLineColor : '#ffffff'} onChange={handleGridColorChange} style={{ width: 28, height: 22, padding: 0, border: '1px solid var(--sn-border, #e0e0e0)', borderRadius: 3, cursor: 'pointer' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Opacity</span><span style={{ color: 'var(--sn-text-muted, #888)' }}>{((gridConfig.gridLineOpacity ?? 0.1) * 100).toFixed(0)}%</span></div>
                        <input data-testid="grid-opacity-slider" type="range" min="0" max="1" step="0.05" value={gridConfig.gridLineOpacity ?? 0.1} onChange={handleGridOpacityChange} style={{ width: '100%', cursor: 'pointer' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Weight</span><span style={{ color: 'var(--sn-text-muted, #888)' }}>{gridConfig.gridLineWidth ?? 1}px</span></div>
                        <input data-testid="grid-weight-slider" type="range" min="0.5" max="4" step="0.5" value={gridConfig.gridLineWidth ?? 1} onChange={handleGridWeightChange} style={{ width: '100%', cursor: 'pointer' }} />
                      </label>
                      {gridConfig.gridLineStyle === 'dot' && (
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Dot Size</span><span style={{ color: 'var(--sn-text-muted, #888)' }}>{gridConfig.dotSize ?? 1.5}px</span></div>
                          <input data-testid="grid-dot-size-slider" type="range" min="0.5" max="6" step="0.5" value={gridConfig.dotSize ?? 1.5} onChange={handleGridDotSizeChange} style={{ width: '100%', cursor: 'pointer' }} />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Divider />

            {/* Alignment */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrayLabel>Align</TrayLabel>
              <button onClick={() => handleAlign('left')} disabled={selectedIds.size < 2} title="Align Left" style={{ ...smallBtnBase, opacity: selectedIds.size < 2 ? 0.4 : 1 }}><AlignLeftIcon /></button>
              <button onClick={() => handleAlign('centerH')} disabled={selectedIds.size < 2} title="Center H" style={{ ...smallBtnBase, opacity: selectedIds.size < 2 ? 0.4 : 1 }}><AlignCenterHIcon /></button>
              <button onClick={() => handleAlign('right')} disabled={selectedIds.size < 2} title="Align Right" style={{ ...smallBtnBase, opacity: selectedIds.size < 2 ? 0.4 : 1 }}><AlignRightIcon /></button>
              <button onClick={() => handleAlign('top')} disabled={selectedIds.size < 2} title="Align Top" style={{ ...smallBtnBase, opacity: selectedIds.size < 2 ? 0.4 : 1 }}><AlignTopIcon /></button>
              <button onClick={() => handleAlign('centerV')} disabled={selectedIds.size < 2} title="Center V" style={{ ...smallBtnBase, opacity: selectedIds.size < 2 ? 0.4 : 1 }}><AlignCenterVIcon /></button>
              <button onClick={() => handleAlign('bottom')} disabled={selectedIds.size < 2} title="Align Bottom" style={{ ...smallBtnBase, opacity: selectedIds.size < 2 ? 0.4 : 1 }}><AlignBottomIcon /></button>
            </div>

            <Divider />

            {/* Grouping */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrayLabel>Group</TrayLabel>
              <button onClick={handleGroup} disabled={selectedIds.size < 2} title="Group (Ctrl+G)" style={{ ...smallBtnBase, padding: '0 8px', width: 'auto', opacity: selectedIds.size < 2 ? 0.4 : 1 }}>Group</button>
              <button onClick={handleUngroup} disabled={selectedIds.size === 0} title="Ungroup (Ctrl+Shift+G)" style={{ ...smallBtnBase, padding: '0 8px', width: 'auto', opacity: selectedIds.size === 0 ? 0.4 : 1 }}>Ungroup</button>
            </div>

            <Divider />

            {/* Canvas settings */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrayLabel>Canvas</TrayLabel>
              <select data-testid="platform-select" value={canvasPlatform} onChange={handlePlatformChange} title="Platform" style={traySelectStyle}>
                <option value="web">Web</option>
                <option value="mobile">Mobile</option>
                <option value="desktop">Desktop</option>
              </select>
              <select data-testid="canvas-size-preset" value={PLATFORM_PRESETS[canvasPlatform].find((p) => p.width === (platformConfigs[canvasPlatform]?.width ?? viewportConfig?.width) && p.height === (platformConfigs[canvasPlatform]?.height ?? viewportConfig?.height))?.label ?? '__current__'} onChange={handlePresetChange} title="Canvas size" style={{ ...traySelectStyle, maxWidth: '180px' }}>
                {!PLATFORM_PRESETS[canvasPlatform].find((p) => p.width === (platformConfigs[canvasPlatform]?.width ?? viewportConfig?.width) && p.height === (platformConfigs[canvasPlatform]?.height ?? viewportConfig?.height)) && (
                  <option value="__current__">{viewportConfig?.width && viewportConfig?.height ? `Custom (${viewportConfig.width}\u00D7${viewportConfig.height})` : 'Custom'}</option>
                )}
                {PLATFORM_PRESETS[canvasPlatform].map((preset) => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
              </select>
              <select data-testid="spatial-mode-select" value={spatialMode} onChange={handleSpatialModeChange} title="Spatial Mode" style={traySelectStyle}>
                <option value="2d">2D</option>
                <option value="3d">3D</option>
                <option value="vr">VR</option>
                <option value="ar">AR</option>
              </select>
              {(spatialMode === 'vr' || spatialMode === 'ar') && <button onClick={handleEnterXR} title={`Enter WebXR (${spatialMode.toUpperCase()})`} style={smallBtnBase}><XRGogglesIcon /></button>}
              <button onClick={handleArtboardPreviewToggle} title={artboardPreviewMode ? 'Exit Artboard Preview' : 'Artboard Preview'} style={{ ...(artboardPreviewMode ? smallBtnActive : smallBtnBase), padding: '0 8px', width: 'auto', fontSize: '11px' }}>Artboard</button>
            </div>

            <Divider />

            {/* Docker + History + Settings */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button onClick={handleDockerClick} title="Docker Library" style={{ ...smallBtnBase, gap: '4px', padding: '0 8px', minWidth: 'auto' }}><LibraryIcon /><span style={{ fontSize: '11px' }}>Library</span></button>
              <button onClick={handleHistoryClick} title="History" style={{ ...smallBtnBase, gap: '4px', padding: '0 8px', minWidth: 'auto' }}><HistoryIcon /><span style={{ fontSize: '11px' }}>History</span></button>
              <div style={{ position: 'relative' }}>
                <button ref={settingsButtonRef} data-testid="canvas-settings-btn" onClick={() => setSettingsOpen(!settingsOpen)} title="Canvas Settings" style={{ ...smallBtnBase, padding: '0 8px', width: 'auto', borderColor: settingsOpen ? 'var(--sn-accent, #6366f1)' : undefined, background: settingsOpen ? 'var(--sn-accent, #6366f1)' : undefined, color: settingsOpen ? '#fff' : undefined }}>Settings</button>
                <CanvasSettingsDropdown isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} anchorRef={settingsButtonRef} viewportConfig={viewportConfig} borderRadius={borderRadius} canvasPosition={canvasPosition} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
