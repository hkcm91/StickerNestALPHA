/**
 * Toolbar — tool selector, zoom controls, grid controls, mode toggle.
 * Wraps the headless ToolbarController from L4A-4.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { GridConfig, GridProjectionMode } from '@sn/types';
import { GridEvents } from '@sn/types';

import { DEFAULT_GRID_CONFIG } from '../../../canvas/core';
import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import type { SaveStatus } from '../hooks/usePersistence';
import type { ViewportStore } from '../hooks/useViewport';

export interface ToolbarProps {
  viewportStore: ViewportStore;
  /** Save status indicator (from usePersistence) */
  saveStatus?: SaveStatus;
  /** Callback for manual save */
  onSave?: () => void;
}

interface ToolDef {
  id: string;
  label: string;
  shortcut?: string;
}

const TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select', shortcut: 'V' },
  { id: 'pan', label: 'Pan', shortcut: 'H' },
  { id: 'move', label: 'Move', shortcut: 'M' },
  { id: 'pen', label: 'Pen', shortcut: 'D' },
  { id: 'text', label: 'Text', shortcut: 'T' },
  { id: 'rect', label: 'Shape', shortcut: 'R' },
];

/** Shared button style for small toggle/icon buttons */
const smallBtnBase: React.CSSProperties = {
  padding: '2px 6px',
  border: '1px solid var(--sn-border, #e0e0e0)',
  borderRadius: 'var(--sn-radius, 6px)',
  background: 'transparent',
  color: 'var(--sn-text, #1a1a2e)',
  cursor: 'pointer',
  fontSize: '12px',
  fontFamily: 'inherit',
  lineHeight: 1,
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

export const Toolbar: React.FC<ToolbarProps> = ({ viewportStore, saveStatus, onSave }) => {
  const activeTool = useUIStore((s) => s.activeTool);
  const mode = useUIStore((s) => s.canvasInteractionMode);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const setCanvasInteractionMode = useUIStore((s) => s.setCanvasInteractionMode);

  // Grid config state — kept in sync via bus events
  const [gridConfig, setGridConfig] = useState<GridConfig>({ ...DEFAULT_GRID_CONFIG });

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
        padding: '4px 8px',
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
          style={{ display: 'flex', gap: '2px', marginRight: '8px' }}
          data-testid="toolbar-tools"
        >
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              data-testid={`tool-${tool.id}`}
              onClick={() => handleToolClick(tool.id)}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              style={{
                padding: '4px 8px',
                border: '1px solid',
                borderColor:
                  activeTool === tool.id
                    ? 'var(--sn-accent, #6366f1)'
                    : 'var(--sn-border, #e0e0e0)',
                borderRadius: 'var(--sn-radius, 6px)',
                background:
                  activeTool === tool.id
                    ? 'var(--sn-accent, #6366f1)'
                    : 'transparent',
                color:
                  activeTool === tool.id
                    ? '#fff'
                    : 'var(--sn-text, #1a1a2e)',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'inherit',
                lineHeight: 1,
              }}
            >
              {tool.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid controls — shown in edit mode */}
      {isEditMode && (
        <>
          {/* Separator before grid controls */}
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
            {/* Grid visibility toggle */}
            <button
              data-testid="grid-toggle"
              onClick={handleGridToggle}
              title={gridConfig.enabled ? 'Hide grid (G)' : 'Show grid (G)'}
              style={gridConfig.enabled ? smallBtnActive : smallBtnBase}
            >
              Grid
            </button>

            {/* Grid lines toggle (only when grid is enabled) */}
            {gridConfig.enabled && (
              <button
                data-testid="grid-lines-toggle"
                onClick={handleGridLinesToggle}
                title={gridConfig.showGridLines ? 'Hide grid lines' : 'Show grid lines'}
                style={gridConfig.showGridLines ? smallBtnActive : smallBtnBase}
              >
                Lines
              </button>
            )}

            {/* Snap-to-grid toggle */}
            <button
              data-testid="snap-toggle"
              onClick={handleSnapToggle}
              title={gridConfig.snapMode !== 'none' ? 'Disable snap (Shift+G)' : 'Enable snap (Shift+G)'}
              style={gridConfig.snapMode !== 'none' ? smallBtnActive : smallBtnBase}
            >
              Snap
            </button>

            {/* Grid projection selector (only when grid is enabled) */}
            {gridConfig.enabled && (
              <select
                data-testid="grid-projection"
                value={gridConfig.projection}
                onChange={handleProjectionChange}
                title="Grid projection type"
                style={{
                  padding: '2px 4px',
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
        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        data-testid="toolbar-zoom"
      >
        <button
          data-testid="zoom-out"
          onClick={handleZoomOut}
          title="Zoom out"
          style={{
            padding: '2px 6px',
            border: '1px solid var(--sn-border, #e0e0e0)',
            borderRadius: 'var(--sn-radius, 6px)',
            background: 'transparent',
            color: 'var(--sn-text, #1a1a2e)',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'inherit',
            lineHeight: 1,
          }}
        >
          -
        </button>

        <button
          data-testid="zoom-reset"
          onClick={handleZoomReset}
          title="Reset zoom"
          style={{
            padding: '2px 8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--sn-text-muted, #6b7280)',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'inherit',
            minWidth: '48px',
            textAlign: 'center',
          }}
        >
          {zoomPercent}%
        </button>

        <button
          data-testid="zoom-in"
          onClick={handleZoomIn}
          title="Zoom in"
          style={{
            padding: '2px 6px',
            border: '1px solid var(--sn-border, #e0e0e0)',
            borderRadius: 'var(--sn-radius, 6px)',
            background: 'transparent',
            color: 'var(--sn-text, #1a1a2e)',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'inherit',
            lineHeight: 1,
          }}
        >
          +
        </button>
      </div>

      {/* Separator */}
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
          padding: '4px 12px',
          border: '1px solid var(--sn-border, #e0e0e0)',
          borderRadius: 'var(--sn-radius, 6px)',
          background: isEditMode ? 'transparent' : 'var(--sn-accent, #6366f1)',
          color: isEditMode ? 'var(--sn-text, #1a1a2e)' : '#fff',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'inherit',
          fontWeight: 500,
        }}
      >
        {isEditMode ? 'Preview' : 'Edit'}
      </button>
    </div>
  );
};
