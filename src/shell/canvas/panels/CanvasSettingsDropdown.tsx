/**
 * CanvasSettingsDropdown — Canvas size, position, and border radius settings.
 *
 * Background settings have moved to PropertiesPanel (shown when no entity is selected).
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { GridConfig, GridLineStyle, GridProjectionMode, ThemeName, ViewportConfig } from '@sn/types';
import { CanvasDocumentEvents, GridEvents } from '@sn/types';

import { DEFAULT_GRID_CONFIG } from '../../../canvas/core';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { applyThemeTokens, emitThemeChange } from '../../theme/theme-provider';
import { THEME_DISPLAY_NAMES, THEME_TOKENS } from '../../theme/theme-tokens';

// =============================================================================
// Types
// =============================================================================

export interface CanvasSettingsDropdownProps {
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Called when the dropdown should close */
  onClose: () => void;
  /** Position anchor element ref for positioning */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Current viewport config */
  viewportConfig?: ViewportConfig;
  /** Current border radius (canvas container) */
  borderRadius?: number;
  /** Current canvas position in workspace */
  canvasPosition?: CanvasPositionConfig;
  /** Current grid configuration */
  gridConfig?: GridConfig;
}

export type CanvasHorizontalAlign = 'left' | 'center' | 'right';
export type CanvasVerticalAlign = 'top' | 'center' | 'bottom';

export interface CanvasPositionConfig {
  horizontal: CanvasHorizontalAlign;
  vertical: CanvasVerticalAlign;
  topOffset: number;
}

interface CanvasSizePreset {
  label: string;
  width: number | undefined;
  height: number | undefined;
}

// =============================================================================
// Constants
// =============================================================================

const CANVAS_SIZE_PRESETS: CanvasSizePreset[] = [
  // Desktop
  { label: 'Desktop HD (1920×1080)', width: 1920, height: 1080 },
  { label: 'Desktop (1440×900)', width: 1440, height: 900 },
  { label: 'MacBook Pro 14" (1512×982)', width: 1512, height: 982 },
  // Tablet
  { label: 'iPad (820×1180)', width: 820, height: 1180 },
  { label: 'Tablet (1024×768)', width: 1024, height: 768 },
  // Mobile
  { label: 'iPhone 15 Pro (393×852)', width: 393, height: 852 },
  { label: 'iPhone SE (375×667)', width: 375, height: 667 },
  { label: 'Pixel 8 (412×915)', width: 412, height: 915 },
  // Standard
  { label: 'Square (1080×1080)', width: 1080, height: 1080 },
  { label: 'HD (1280×720)', width: 1280, height: 720 },
  { label: '4K (3840×2160)', width: 3840, height: 2160 },
  { label: 'A4 (2480×3508)', width: 2480, height: 3508 },
  { label: 'Letter (2550×3300)', width: 2550, height: 3300 },
];

// =============================================================================
// Styles
// =============================================================================

/** CSS classes for the dropdown: sn-glass-heavy sn-neo sn-holo-border */
const DROPDOWN_CLASSES = 'sn-glass-heavy sn-neo sn-holo-border';

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '4px',
  zIndex: 1000,
  minWidth: '320px',
  maxHeight: '480px',
  overflowY: 'auto',
  fontFamily: 'var(--sn-font-family, system-ui)',
  fontSize: '13px',
};

const sectionStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--sn-text-muted, #7A7784)',
  marginBottom: '10px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: 'var(--sn-text, #E8E6ED)',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
  borderRadius: 'var(--sn-radius, 4px)',
  background: 'var(--sn-bg, rgba(10,10,14,0.5))',
  color: 'var(--sn-text, #E8E6ED)',
  fontSize: '12px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
};

const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '6px 10px',
  border: '1px solid',
  borderColor: active ? 'var(--sn-accent, #3E7D94)' : 'var(--sn-border, rgba(255,255,255,0.06))',
  borderRadius: 'var(--sn-radius, 4px)',
  background: active ? 'var(--sn-accent, #3E7D94)' : 'transparent',
  color: active ? '#fff' : 'var(--sn-text, #E8E6ED)',
  cursor: 'pointer',
  fontSize: '11px',
  fontFamily: 'inherit',
  fontWeight: 500,
  boxShadow: active ? '0 0 8px var(--sn-accent-glow, rgba(78,123,142,0.4))' : 'none',
  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
});


const rangeContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const rangeStyle: React.CSSProperties = {
  flex: 1,
  height: '4px',
  cursor: 'pointer',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '8px',
};

const fieldStyle: React.CSSProperties = {
  flex: 1,
};


// =============================================================================
// Component
// =============================================================================

export const CanvasSettingsDropdown: React.FC<CanvasSettingsDropdownProps> = ({
  isOpen,
  onClose,
  anchorRef,
  viewportConfig,
  borderRadius: initialBorderRadius = 0,
  canvasPosition: initialCanvasPosition = { horizontal: 'center', vertical: 'center', topOffset: 24 },
  gridConfig: gridConfigProp = DEFAULT_GRID_CONFIG,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Grid State ────────────────────────────────────────────────────────────
  const [grid, setGrid] = useState<GridConfig>(gridConfigProp);

  useEffect(() => {
    setGrid(gridConfigProp);
  }, [gridConfigProp]);

  // Stay in sync with grid bus events from Toolbar toggle or other sources
  useEffect(() => {
    const unsubConfig = bus.subscribe(
      GridEvents.CONFIG_CHANGED,
      (event: { payload: { config: Partial<GridConfig> } }) => {
        setGrid((prev) => ({ ...prev, ...event.payload.config }));
      },
    );
    const unsubToggle = bus.subscribe(
      GridEvents.TOGGLED,
      (event: { payload: { enabled: boolean } }) => {
        setGrid((prev) => ({ ...prev, enabled: event.payload.enabled }));
      },
    );
    return () => { unsubConfig(); unsubToggle(); };
  }, []);

  const emitGridChange = useCallback((partial: Partial<GridConfig>) => {
    setGrid((prev) => ({ ...prev, ...partial }));
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: partial });
  }, []);

  // ─── Canvas Size State ──────────────────────────────────────────────────────
  const [canvasWidth, setCanvasWidth] = useState<number | undefined>(
    viewportConfig?.width
  );
  const [canvasHeight, setCanvasHeight] = useState<number | undefined>(
    viewportConfig?.height
  );

  // ─── Border Radius State ────────────────────────────────────────────────────
  const [borderRadius, setBorderRadius] = useState(initialBorderRadius);
  const [canvasPosition, setCanvasPosition] = useState<CanvasPositionConfig>(initialCanvasPosition);

  // ─── Sync state when viewportConfig changes ─────────────────────────────────
  useEffect(() => {
    if (!viewportConfig) return;
    setCanvasWidth(viewportConfig.width);
    setCanvasHeight(viewportConfig.height);
  }, [viewportConfig]);

  // Keep border radius input in sync when parent state changes externally
  useEffect(() => {
    setBorderRadius(initialBorderRadius);
  }, [initialBorderRadius]);

  useEffect(() => {
    setCanvasPosition(initialCanvasPosition);
  }, [initialCanvasPosition]);

  // ─── Close on click outside ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorRef]);

  // ─── Emit viewport size changes ─────────────────────────────────────────────
  const emitViewportChange = useCallback(
    (width: number | undefined, height: number | undefined, sizeMode?: 'infinite' | 'bounded') => {
      bus.emit(CanvasDocumentEvents.VIEWPORT_CHANGED, {
        canvasId: '',
        viewport: { width, height, ...(sizeMode !== undefined ? { sizeMode } : {}) },
      });
    },
    []
  );

  // ─── Emit border radius changes ─────────────────────────────────────────────
  const emitBorderRadiusChange = useCallback((radius: number) => {
    bus.emit(CanvasDocumentEvents.BORDER_RADIUS_CHANGED, {
      canvasId: '',
      borderRadius: radius,
    });
  }, []);

  const emitCanvasPositionChange = useCallback((position: CanvasPositionConfig) => {
    bus.emit(CanvasDocumentEvents.CANVAS_POSITION_CHANGED, {
      canvasId: '',
      position,
    });
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handlePresetSelect = (preset: CanvasSizePreset) => {
    setCanvasWidth(preset.width);
    setCanvasHeight(preset.height);
    emitViewportChange(preset.width, preset.height);
  };

  const handleCanvasWidthChange = (value: string) => {
    const width = value === '' ? undefined : parseInt(value, 10);
    setCanvasWidth(isNaN(width as number) ? undefined : width);
    emitViewportChange(isNaN(width as number) ? undefined : width, canvasHeight);
  };

  const handleCanvasHeightChange = (value: string) => {
    const height = value === '' ? undefined : parseInt(value, 10);
    setCanvasHeight(isNaN(height as number) ? undefined : height);
    emitViewportChange(canvasWidth, isNaN(height as number) ? undefined : height);
  };

  const handleBorderRadiusChange = (value: number) => {
    setBorderRadius(value);
    emitBorderRadiusChange(value);
  };

  const handleHorizontalPositionChange = (value: CanvasHorizontalAlign) => {
    const next = { ...canvasPosition, horizontal: value };
    setCanvasPosition(next);
    emitCanvasPositionChange(next);
  };

  const handleVerticalPositionChange = (value: CanvasVerticalAlign) => {
    const next = { ...canvasPosition, vertical: value };
    setCanvasPosition(next);
    emitCanvasPositionChange(next);
  };

  const handleTopOffsetChange = (value: number) => {
    const next = { ...canvasPosition, topOffset: Math.max(0, value) };
    setCanvasPosition(next);
    emitCanvasPositionChange(next);
  };

  if (!isOpen) return null;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={dropdownRef}
      className={DROPDOWN_CLASSES}
      data-testid="canvas-settings-dropdown"
      style={dropdownStyle}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          CANVAS SIZE SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          Canvas Size
          <span style={{ textTransform: 'none', fontWeight: 400, marginLeft: '4px', opacity: 0.7 }}>
            ({useUIStore.getState().canvasPlatform})
          </span>
        </div>

        {/* Infinite / Bounded toggle */}
        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>Canvas Mode</label>
          <div style={buttonGroupStyle}>
            <button
              type="button"
              style={toggleBtnStyle(viewportConfig?.sizeMode !== 'bounded')}
              onClick={() => {
                setCanvasWidth(undefined);
                setCanvasHeight(undefined);
                emitViewportChange(undefined, undefined, 'infinite');
              }}
            >
              Infinite
            </button>
            <button
              type="button"
              style={toggleBtnStyle(viewportConfig?.sizeMode === 'bounded')}
              onClick={() => {
                const w = canvasWidth ?? 1920;
                const h = canvasHeight ?? 1080;
                setCanvasWidth(w);
                setCanvasHeight(h);
                emitViewportChange(w, h, 'bounded');
              }}
            >
              Bounded
            </button>
          </div>
        </div>

        {/* Presets — only shown in bounded mode */}
        {viewportConfig?.sizeMode === 'bounded' && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Preset</label>
              <select
                style={selectStyle}
                value={
                  CANVAS_SIZE_PRESETS.find(
                    (p) => p.width === canvasWidth && p.height === canvasHeight
                  )?.label ?? 'Custom'
                }
                onChange={(e) => {
                  const preset = CANVAS_SIZE_PRESETS.find((p) => p.label === e.target.value);
                  if (preset) {
                    handlePresetSelect(preset);
                  }
                }}
              >
                {CANVAS_SIZE_PRESETS.map((preset) => (
                  <option key={preset.label} value={preset.label}>
                    {preset.label}
                  </option>
                ))}
                {!CANVAS_SIZE_PRESETS.find(
                  (p) => p.width === canvasWidth && p.height === canvasHeight
                ) && <option value="Custom">Custom</option>}
              </select>
            </div>

            {/* Custom Dimensions */}
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Width</label>
                <input
                  type="number"
                  min="1"
                  value={canvasWidth ?? ''}
                  onChange={(e) => handleCanvasWidthChange(e.target.value)}
                  placeholder="1920"
                  style={inputStyle}
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Height</label>
                <input
                  type="number"
                  min="1"
                  value={canvasHeight ?? ''}
                  onChange={(e) => handleCanvasHeightChange(e.target.value)}
                  placeholder="1080"
                  style={inputStyle}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Canvas Position Section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Canvas Position</div>
        <div style={rowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Horizontal</label>
            <select
              style={selectStyle}
              value={canvasPosition.horizontal}
              onChange={(e) => handleHorizontalPositionChange(e.target.value as CanvasHorizontalAlign)}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Vertical</label>
            <select
              style={selectStyle}
              value={canvasPosition.vertical}
              onChange={(e) => handleVerticalPositionChange(e.target.value as CanvasVerticalAlign)}
            >
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Top Spacing: {canvasPosition.topOffset}px</label>
          <div style={rangeContainerStyle}>
            <input
              type="range"
              min="0"
              max="120"
              value={canvasPosition.topOffset}
              onChange={(e) => handleTopOffsetChange(parseInt(e.target.value, 10))}
              style={rangeStyle}
            />
            <input
              type="number"
              min="0"
              max="120"
              value={canvasPosition.topOffset}
              onChange={(e) => handleTopOffsetChange(parseInt(e.target.value, 10) || 0)}
              style={{ ...inputStyle, width: '60px' }}
            />
          </div>
        </div>
      </div>
      {/* Border Radius Section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Border Radius</div>
        <div style={rangeContainerStyle}>
          <input
            type="range"
            min="0"
            max="48"
            value={borderRadius}
            onChange={(e) => handleBorderRadiusChange(parseInt(e.target.value, 10))}
            style={rangeStyle}
          />
          <input
            type="number"
            min="0"
            max="48"
            value={borderRadius}
            onChange={(e) => handleBorderRadiusChange(parseInt(e.target.value, 10) || 0)}
            style={{ ...inputStyle, width: '60px' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--sn-text-muted, #7A7784)' }}>px</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          GRID SETTINGS SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Grid Settings</div>

        {/* Grid Lines toggle */}
        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>Grid Lines</label>
          <div style={buttonGroupStyle}>
            <button type="button" style={toggleBtnStyle(grid.showGridLines)} onClick={() => emitGridChange({ showGridLines: true, enabled: true })}>On</button>
            <button type="button" style={toggleBtnStyle(!grid.showGridLines)} onClick={() => emitGridChange({ showGridLines: false })}>Off</button>
          </div>
        </div>

        {/* Snap Mode + Projection */}
        <div style={rowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Snap Mode</label>
            <select style={selectStyle} value={grid.snapMode} onChange={(e) => emitGridChange({ snapMode: e.target.value as GridConfig['snapMode'] })}>
              <option value="none">None</option>
              <option value="center">Center</option>
              <option value="corner">Corner</option>
              <option value="edge">Edge</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Projection</label>
            <select style={selectStyle} value={grid.projection} onChange={(e) => emitGridChange({ projection: e.target.value as GridProjectionMode })}>
              <option value="orthogonal">Square</option>
              <option value="isometric">Isometric</option>
              <option value="hexagonal">Hexagonal</option>
              <option value="triangular">Triangular</option>
            </select>
          </div>
        </div>

        {/* Cell Size + Line Style */}
        <div style={rowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Cell Size</label>
            <input type="number" min="8" max="256" value={grid.cellSize} onChange={(e) => emitGridChange({ cellSize: Math.max(8, Math.min(256, parseInt(e.target.value, 10) || 64)) })} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Line Style</label>
            <select style={selectStyle} value={grid.gridLineStyle} onChange={(e) => emitGridChange({ gridLineStyle: e.target.value as GridLineStyle })}>
              <option value="line">Line</option>
              <option value="dot">Dot</option>
              <option value="cross">Cross</option>
            </select>
          </div>
        </div>

        {/* Color */}
        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>Line Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="color"
              value={grid.gridLineColor?.startsWith('#') ? grid.gridLineColor : '#ffffff'}
              onChange={(e) => emitGridChange({ gridLineColor: e.target.value })}
              style={{ width: '32px', height: '28px', padding: 0, border: '1px solid var(--sn-border, rgba(255,255,255,0.06))', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--sn-text-muted, #7A7784)' }}>{grid.gridLineColor}</span>
          </div>
        </div>

        {/* Opacity */}
        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>Opacity: {((grid.gridLineOpacity ?? 0.1) * 100).toFixed(0)}%</label>
          <div style={rangeContainerStyle}>
            <input type="range" min="0" max="1" step="0.05" value={grid.gridLineOpacity ?? 0.1} onChange={(e) => emitGridChange({ gridLineOpacity: Number(e.target.value) })} style={rangeStyle} />
          </div>
        </div>

        {/* Weight */}
        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>Line Weight: {grid.gridLineWidth ?? 1}px</label>
          <div style={rangeContainerStyle}>
            <input type="range" min="0.5" max="4" step="0.5" value={grid.gridLineWidth ?? 1} onChange={(e) => emitGridChange({ gridLineWidth: Number(e.target.value) })} style={rangeStyle} />
          </div>
        </div>

        {/* Dot Size — only when style is 'dot' */}
        {grid.gridLineStyle === 'dot' && (
          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>Dot Size: {grid.dotSize ?? 1.5}px</label>
            <div style={rangeContainerStyle}>
              <input type="range" min="0.5" max="6" step="0.5" value={grid.dotSize ?? 1.5} onChange={(e) => emitGridChange({ dotSize: Number(e.target.value) })} style={rangeStyle} />
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          THEME SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Canvas Theme</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(Object.keys(THEME_TOKENS) as ThemeName[]).map((name) => {
            const tokens = THEME_TOKENS[name];
            const isActive = useUIStore.getState().theme === name;
            return (
              <button
                key={name}
                type="button"
                data-testid={`theme-chip-${name}`}
                onClick={() => {
                  useUIStore.getState().setTheme(name);
                  applyThemeTokens(name);
                  emitThemeChange(name);
                  bus.emit('canvas.document.theme.loaded', { theme: name });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  border: isActive ? '2px solid var(--sn-accent)' : '1px solid var(--sn-border, rgba(255,255,255,0.06))',
                  borderRadius: 'var(--sn-radius, 6px)',
                  background: isActive ? 'var(--sn-accent)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--sn-text, #E8E6ED)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'inherit',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: tokens['--sn-accent'],
                    border: '1px solid rgba(255,255,255,0.2)',
                    flexShrink: 0,
                  }}
                />
                {THEME_DISPLAY_NAMES[name]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CanvasSettingsDropdown;

