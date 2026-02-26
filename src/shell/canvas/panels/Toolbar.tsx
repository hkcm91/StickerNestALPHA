/**
 * Toolbar — tool selector, zoom controls, grid controls, mode toggle.
 * Wraps the headless ToolbarController from L4A-4.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { GridConfig, GridProjectionMode, ViewportConfig } from '@sn/types';
import { GridEvents } from '@sn/types';

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

export interface ToolbarProps {
  viewportStore: ViewportStore;
  /** Save status indicator (from usePersistence) */
  saveStatus?: SaveStatus;
  /** Callback for manual save */
  onSave?: () => void;
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

const XRIcon = () => (
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

const TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select', icon: <SelectIcon />, shortcut: 'V' },
  { id: 'pan', label: 'Pan', icon: <PanIcon />, shortcut: 'H' },
  { id: 'artboard', label: 'Artboard', icon: <ArtboardIcon />, shortcut: 'A' },
  { id: 'pen', label: 'Pen', icon: <PenIcon />, shortcut: 'D' },
  { id: 'text', label: 'Text', icon: <TextIcon />, shortcut: 'T' },
  { id: 'rect', label: 'Shape', icon: <RectIcon />, shortcut: 'R' },
  { id: 'pathfinder', label: 'Shape Builder', icon: <PathfinderIcon />, shortcut: 'Shift+M' },
];

/** Shared button style for small toggle/icon buttons */
const smallBtnBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px',
  minWidth: '28px',
  height: '28px',
  border: '1px solid var(--sn-border, #e0e0e0)',
  borderRadius: 'var(--sn-radius, 6px)',
  background: 'transparent',
  color: 'var(--sn-text, #1a1a2e)',
  cursor: 'pointer',
  fontSize: '12px',
  fontFamily: 'inherit',
  lineHeight: 1,
  transition: 'all 0.1s ease',
};

const smallBtnActive: React.CSSProperties = {
  ...smallBtnBase,
  borderColor: 'var(--sn-accent, #6366f1)',
  background: 'var(--sn-accent, #6366f1)',
  color: '#fff',
};

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
  const artboardPreviewMode = useUIStore((s) => s.artboardPreviewMode);
  const setArtboardPreviewMode = useUIStore((s) => s.setArtboardPreviewMode);

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
    setCanvasPlatform(e.target.value as any);
  }, [setCanvasPlatform]);

  const handleArtboardPreviewToggle = useCallback(() => {
    setArtboardPreviewMode(!artboardPreviewMode);
  }, [artboardPreviewMode, setArtboardPreviewMode]);

  const handleEnterXR = useCallback(() => {
    enterXR('immersive-vr');
  }, []);

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

  const handleSnapToggle = useCallback(() => {
    const nextSnap = gridConfig.snapMode === 'none' ? 'center' : 'none';
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { snapMode: nextSnap } });
  }, [gridConfig.snapMode]);

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

  const isEditMode = mode === 'edit';

  return (
    <div
      data-testid="canvas-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '0 12px',
        background: 'var(--sn-surface, #fff)',
        borderBottom: '1px solid var(--sn-border, #e0e0e0)',
        height: '44px',
        fontFamily: 'var(--sn-font-family, system-ui)',
        fontSize: '13px',
        userSelect: 'none',
      }}
    >
      {/* Tool buttons — only shown in edit mode */}
      {isEditMode && (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          data-testid="toolbar-tools"
        >
          <div style={{ display: 'flex', gap: '2px' }}>
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                data-testid={`tool-${tool.id}`}
                onClick={() => handleToolClick(tool.id)}
                title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                style={{
                  ...smallBtnBase,
                  minWidth: '32px',
                  borderColor: activeTool === tool.id ? 'var(--sn-accent, #6366f1)' : 'var(--sn-border, #e0e0e0)',
                  background: activeTool === tool.id ? 'var(--sn-accent, #6366f1)' : 'transparent',
                  color: activeTool === tool.id ? '#fff' : 'var(--sn-text, #1a1a2e)',
                }}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          <div
            style={{
              width: '1px',
              height: '24px',
              background: 'var(--sn-border, #e0e0e0)',
              margin: '0 4px',
            }}
          />

          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              style={{ ...smallBtnBase, opacity: canUndo ? 1 : 0.4 }}
            >
              <UndoIcon />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              style={{ ...smallBtnBase, opacity: canRedo ? 1 : 0.4 }}
            >
              <RedoIcon />
            </button>
            <button
              onClick={handleHistoryClick}
              title="History"
              style={smallBtnBase}
            >
              <HistoryIcon />
            </button>
          </div>

          <div
            style={{
              width: '1px',
              height: '24px',
              background: 'var(--sn-border, #e0e0e0)',
              margin: '0 4px',
            }}
          />

          <button
            onClick={handleDockerClick}
            title="Docker Library"
            style={smallBtnBase}
          >
            <LibraryIcon />
          </button>
        </div>
      )}

      {/* Grouping and Alignment — shown in edit mode when something is selected */}
      {isEditMode && (
        <>
          <div
            style={{
              width: '1px',
              height: '24px',
              background: 'var(--sn-border, #e0e0e0)',
              margin: '0 4px',
            }}
          />
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            <button
              onClick={handleGroup}
              disabled={selectedIds.size < 2}
              title="Group (Ctrl+G)"
              style={{ ...smallBtnBase, padding: '0 8px', width: 'auto', opacity: selectedIds.size < 2 ? 0.4 : 1 }}
            >
              Group
            </button>
            <button
              onClick={handleUngroup}
              disabled={selectedIds.size === 0}
              title="Ungroup (Ctrl+Shift+G)"
              style={{ ...smallBtnBase, padding: '0 8px', width: 'auto', opacity: selectedIds.size === 0 ? 0.4 : 1 }}
            >
              Ungroup
            </button>
          </div>

          <div
            style={{
              width: '1px',
              height: '24px',
              background: 'var(--sn-border, #e0e0e0)',
              margin: '0 4px',
            }}
          />
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            <button onClick={() => handleAlign('left')} disabled={selectedIds.size < 2} title="Align Left" style={{ ...smallBtnBase, opacity: selectedIds.size < 2 ? 0.4 : 1 }}>⇤</button>
            <button onClick={() => handleAlign('centerH')} disabled={selectedIds.size < 2} title="Align Horizontal Center" style={{ ...smallBtnBase, opacity: selectedIds.size < 2 ? 0.4 : 1 }}>↔️</button>
            <button onClick={() => handleAlign('right')} disabled={selectedIds.size < 2} title="Align Right" style={{ ...smallBtnBase, opacity: selectedIds.size < 2 ? 0.4 : 1 }}>⇥</button>
            <div style={{ width: '2px' }} />
            <button onClick={() => handleAlign('top')} disabled={selectedIds.size < 2} title="Align Top" style={{ ...smallBtnBase, opacity: selectedIds.size < 2 ? 0.4 : 1 }}>⤒</button>
            <button onClick={() => handleAlign('centerV')} disabled={selectedIds.size < 2} title="Align Vertical Center" style={{ ...smallBtnBase, opacity: selectedIds.size < 2 ? 0.4 : 1 }}>↕️</button>
            <button onClick={() => handleAlign('bottom')} disabled={selectedIds.size < 2} title="Align Bottom" style={{ ...smallBtnBase, opacity: selectedIds.size < 2 ? 0.4 : 1 }}>⤓</button>
          </div>
        </>
      )}

      {/* Grid controls — shown in edit mode */}
      {isEditMode && (
        <>
          <div
            style={{
              width: '1px',
              height: '24px',
              background: 'var(--sn-border, #e0e0e0)',
              margin: '0 4px',
            }}
          />

          <div
            style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
            data-testid="toolbar-grid"
          >
            <button
              data-testid="grid-toggle"
              onClick={handleGridToggle}
              title={gridConfig.enabled ? 'Hide grid (G)' : 'Show grid (G)'}
              style={{ ... (gridConfig.enabled ? smallBtnActive : smallBtnBase), padding: '0 6px', width: 'auto' }}
            >
              Grid
            </button>

            {gridConfig.enabled && (
              <button
                data-testid="grid-lines-toggle"
                onClick={handleGridLinesToggle}
                title={gridConfig.showGridLines ? 'Hide grid lines' : 'Show grid lines'}
                style={{ ... (gridConfig.showGridLines ? smallBtnActive : smallBtnBase), padding: '0 6px', width: 'auto' }}
              >
                Lines
              </button>
            )}

            <button
              data-testid="snap-toggle"
              onClick={handleSnapToggle}
              title={gridConfig.snapMode !== 'none' ? 'Disable snap (Shift+G)' : 'Enable snap (Shift+G)'}
              style={{ ... (gridConfig.snapMode !== 'none' ? smallBtnActive : smallBtnBase), padding: '0 6px', width: 'auto' }}
            >
              Snap
            </button>

            {gridConfig.enabled && (
              <select
                data-testid="grid-projection"
                value={gridConfig.projection}
                onChange={handleProjectionChange}
                title="Grid projection type"
                style={{
                  height: '28px',
                  padding: '0 4px',
                  border: '1px solid var(--sn-border, #e0e0e0)',
                  borderRadius: 'var(--sn-radius, 6px)',
                  background: 'var(--sn-surface, #fff)',
                  color: 'var(--sn-text, #1a1a2e)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'inherit',
                }}
              >
                <option value="orthogonal">Square</option>
                <option value="isometric">Isometric</option>
                <option value="triangular">Triangular</option>
                <option value="hexagonal">Hexagonal</option>
              </select>
            )}
          </div>
        </>
      )}

      {/* Canvas Settings (edit mode only) */}
      {isEditMode && (
        <>
          <div
            style={{
              width: '1px',
              height: '24px',
              background: 'var(--sn-border, #e0e0e0)',
              margin: '0 4px',
            }}
          />
          <div style={{ position: 'relative' }}>
            <button
              ref={settingsButtonRef}
              data-testid="canvas-settings-btn"
              onClick={() => setSettingsOpen(!settingsOpen)}
              title="Canvas Settings"
              style={{
                ...smallBtnBase,
                padding: '0 8px',
                width: 'auto',
                borderColor: settingsOpen ? 'var(--sn-accent, #6366f1)' : undefined,
                background: settingsOpen ? 'var(--sn-accent, #6366f1)' : undefined,
                color: settingsOpen ? '#fff' : undefined,
              }}
            >
              Settings
            </button>
            <CanvasSettingsDropdown
              isOpen={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              anchorRef={settingsButtonRef}
              viewportConfig={viewportConfig}
              borderRadius={borderRadius}
              canvasPosition={canvasPosition}
            />
          </div>
        </>
      )}

      {/* Save status indicator */}
      {saveStatus && (
        <div
          data-testid="save-status"
          onClick={onSave}
          title={`${SAVE_STATUS_LABELS[saveStatus]} (Ctrl+S to save)`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: '8px',
            cursor: onSave ? 'pointer' : 'default',
            fontSize: '11px',
            color: 'var(--sn-text-muted, #6b7280)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: SAVE_STATUS_COLORS[saveStatus],
              display: 'inline-block',
            }}
          />
          {SAVE_STATUS_LABELS[saveStatus]}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Zoom controls */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
        data-testid="toolbar-zoom"
      >
        <button
          data-testid="zoom-out"
          onClick={handleZoomOut}
          title="Zoom out"
          style={smallBtnBase}
        >
          -
        </button>

        <button
          data-testid="zoom-reset"
          onClick={handleZoomReset}
          title="Reset zoom"
          style={{
            ...smallBtnBase,
            border: 'none',
            minWidth: '44px',
            color: 'var(--sn-text-muted, #6b7280)',
          }}
        >
          {zoomPercent}%
        </button>

        <button
          data-testid="zoom-in"
          onClick={handleZoomIn}
          title="Zoom in"
          style={smallBtnBase}
        >
          +
        </button>
      </div>

      <div
        style={{
          width: '1px',
          height: '24px',
          background: 'var(--sn-border, #e0e0e0)',
          margin: '0 8px',
        }}
      />

      {/* Platform and Spatial Mode */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <select
          data-testid="platform-select"
          value={canvasPlatform}
          onChange={handlePlatformChange}
          title="Target Platform"
          style={{
            height: '28px',
            padding: '0 4px',
            border: '1px solid var(--sn-border, #e0e0e0)',
            borderRadius: 'var(--sn-radius, 6px)',
            background: 'var(--sn-surface, #fff)',
            color: 'var(--sn-text, #1a1a2e)',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: 'inherit',
          }}
        >
          <option value="web">Web</option>
          <option value="mobile">Mobile</option>
          <option value="desktop">Desktop</option>
        </select>
        <select
          data-testid="spatial-mode-select"
          value={spatialMode}
          onChange={handleSpatialModeChange}
          title="Spatial Mode"
          style={{
            height: '28px',
            padding: '0 4px',
            border: '1px solid var(--sn-border, #e0e0e0)',
            borderRadius: 'var(--sn-radius, 6px)',
            background: 'var(--sn-surface, #fff)',
            color: 'var(--sn-text, #1a1a2e)',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: 'inherit',
          }}
        >
          <option value="2d">2D</option>
          <option value="3d">3D</option>
          <option value="vr">VR</option>
          <option value="ar">AR</option>
        </select>
        {(spatialMode === 'vr' || spatialMode === 'ar') && (
          <button
            onClick={handleEnterXR}
            title={`Enter WebXR (${spatialMode.toUpperCase()})`}
            style={{ ...smallBtnBase, fontSize: '16px' }}
          >
            🥽
          </button>
        )}
        <button
          onClick={handleArtboardPreviewToggle}
          title={artboardPreviewMode ? 'Exit Artboard Preview' : 'Enter Artboard Preview'}
          style={{
            ...(artboardPreviewMode ? smallBtnActive : smallBtnBase),
            padding: '0 8px',
            width: 'auto',
            fontSize: '11px',
          }}
        >
          Artboard
        </button>
      </div>

      <div
        style={{
          width: '1px',
          height: '24px',
          background: 'var(--sn-border, #e0e0e0)',
          margin: '0 8px',
        }}
      />

      {/* Mode toggle */}
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
          transition: 'all 0.1s ease',
        }}
      >
        {isEditMode ? 'Run' : 'Edit'}
      </button>
    </div>
  );
};
