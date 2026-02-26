/**
 * CanvasSettingsDropdown — Canvas background, size, and appearance settings.
 *
 * Provides controls for:
 * - Background type (solid, gradient, image)
 * - Color picker for solid backgrounds
 * - Gradient editor (linear/radial, angle, stops)
 * - Image upload for background
 * - Opacity control
 * - Canvas size with presets
 * - Border radius
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { BackgroundSpec, GradientStop, GradientType, ViewportConfig } from '@sn/types';
import { CanvasDocumentEvents, DEFAULT_BACKGROUND } from '@sn/types';

import { bus } from '../../../kernel/bus';

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
}

type BackgroundType = 'solid' | 'gradient' | 'image';
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
  { label: 'Infinite', width: undefined, height: undefined },
  { label: 'Desktop (1920×1080)', width: 1920, height: 1080 },
  { label: 'Tablet (1024×768)', width: 1024, height: 768 },
  { label: 'Mobile (390×844)', width: 390, height: 844 },
  { label: 'Square (1080×1080)', width: 1080, height: 1080 },
  { label: 'HD (1280×720)', width: 1280, height: 720 },
  { label: '4K (3840×2160)', width: 3840, height: 2160 },
  { label: 'A4 (2480×3508)', width: 2480, height: 3508 },
  { label: 'Letter (2550×3300)', width: 2550, height: 3300 },
];

const DEFAULT_GRADIENT_STOPS: GradientStop[] = [
  { offset: 0, color: '#ffffff' },
  { offset: 1, color: '#6366f1' },
];

// =============================================================================
// Styles
// =============================================================================

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '4px',
  zIndex: 1000,
  background: 'var(--sn-surface, #ffffff)',
  border: '1px solid var(--sn-border, #e5e7eb)',
  borderRadius: 'var(--sn-radius, 8px)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
  minWidth: '320px',
  maxHeight: '480px',
  overflowY: 'auto',
  fontFamily: 'var(--sn-font-family, system-ui)',
  fontSize: '13px',
};

const sectionStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--sn-border, #e5e7eb)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--sn-text-muted, #6b7280)',
  marginBottom: '10px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: 'var(--sn-text, #1a1a2e)',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid var(--sn-border, #e5e7eb)',
  borderRadius: 'var(--sn-radius, 4px)',
  background: 'var(--sn-bg, #f9fafb)',
  color: 'var(--sn-text, #1a1a2e)',
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
  borderColor: active ? 'var(--sn-accent, #6366f1)' : 'var(--sn-border, #e5e7eb)',
  borderRadius: 'var(--sn-radius, 4px)',
  background: active ? 'var(--sn-accent, #6366f1)' : 'transparent',
  color: active ? '#fff' : 'var(--sn-text, #1a1a2e)',
  cursor: 'pointer',
  fontSize: '11px',
  fontFamily: 'inherit',
  fontWeight: 500,
});

const colorInputContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const colorSwatchStyle = (color: string): React.CSSProperties => ({
  width: '32px',
  height: '32px',
  borderRadius: 'var(--sn-radius, 4px)',
  border: '1px solid var(--sn-border, #e5e7eb)',
  background: color,
  cursor: 'pointer',
  flexShrink: 0,
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

const uploadAreaStyle: React.CSSProperties = {
  border: '2px dashed var(--sn-border, #e5e7eb)',
  borderRadius: 'var(--sn-radius, 6px)',
  padding: '20px',
  textAlign: 'center',
  cursor: 'pointer',
  background: 'var(--sn-bg, #f9fafb)',
  transition: 'border-color 0.15s, background 0.15s',
};

const gradientStopRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '6px',
};

const removeStopBtnStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: 'none',
  background: 'transparent',
  color: 'var(--sn-text-muted, #6b7280)',
  cursor: 'pointer',
  fontSize: '14px',
  lineHeight: 1,
};

const addStopBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px dashed var(--sn-border, #e5e7eb)',
  borderRadius: 'var(--sn-radius, 4px)',
  background: 'transparent',
  color: 'var(--sn-text-muted, #6b7280)',
  cursor: 'pointer',
  fontSize: '11px',
  fontFamily: 'inherit',
  width: '100%',
  marginTop: '4px',
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
  canvasPosition: initialCanvasPosition = { horizontal: 'center', vertical: 'center', topOffset: 40 },
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Background State ───────────────────────────────────────────────────────
  const background = viewportConfig?.background ?? DEFAULT_BACKGROUND;
  const [bgType, setBgType] = useState<BackgroundType>(background.type);
  const [solidColor, setSolidColor] = useState(
    background.type === 'solid' ? background.color : '#ffffff'
  );
  const [gradientType, setGradientType] = useState<GradientType>(
    background.type === 'gradient' ? (background.gradientType ?? 'linear') : 'linear'
  );
  const [gradientAngle, setGradientAngle] = useState(
    background.type === 'gradient' ? background.angle : 0
  );
  const [gradientStops, setGradientStops] = useState<GradientStop[]>(
    background.type === 'gradient' ? background.stops : DEFAULT_GRADIENT_STOPS
  );
  const [imageUrl, setImageUrl] = useState(
    background.type === 'image' ? background.url : ''
  );
  const [imageMode, setImageMode] = useState<'cover' | 'contain' | 'tile'>(
    background.type === 'image' ? background.mode : 'cover'
  );
  const [opacity, setOpacity] = useState(background.opacity);

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
    const bg = viewportConfig.background ?? DEFAULT_BACKGROUND;
    setBgType(bg.type);
    setOpacity(bg.opacity);

    if (bg.type === 'solid') {
      setSolidColor(bg.color);
    } else if (bg.type === 'gradient') {
      setGradientType(bg.gradientType ?? 'linear');
      setGradientAngle(bg.angle);
      setGradientStops(bg.stops);
    } else if (bg.type === 'image') {
      setImageUrl(bg.url);
      setImageMode(bg.mode);
    }

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

  // ─── Build and emit background spec ─────────────────────────────────────────
  const emitBackgroundChange = useCallback(
    (spec: BackgroundSpec) => {
      bus.emit(CanvasDocumentEvents.BACKGROUND_CHANGED, {
        canvasId: '',
        background: spec,
      });
    },
    []
  );

  const buildCurrentBackground = useCallback((): BackgroundSpec => {
    switch (bgType) {
      case 'solid':
        return { type: 'solid', color: solidColor, opacity };
      case 'gradient':
        return {
          type: 'gradient',
          gradientType: gradientType,
          stops: gradientStops,
          angle: gradientAngle,
          opacity,
        };
      case 'image':
        return { type: 'image', url: imageUrl, mode: imageMode, opacity };
    }
  }, [bgType, solidColor, gradientType, gradientAngle, gradientStops, imageUrl, imageMode, opacity]);

  // Emit on background state changes
  useEffect(() => {
    if (!isOpen) return;
    emitBackgroundChange(buildCurrentBackground());
  }, [isOpen, buildCurrentBackground, emitBackgroundChange]);

  // ─── Emit viewport size changes ─────────────────────────────────────────────
  const emitViewportChange = useCallback(
    (width: number | undefined, height: number | undefined) => {
      bus.emit(CanvasDocumentEvents.VIEWPORT_CHANGED, {
        canvasId: '',
        viewport: { width, height },
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
  const handleBgTypeChange = (type: BackgroundType) => {
    setBgType(type);
  };

  const handleSolidColorChange = (color: string) => {
    setSolidColor(color);
  };

  const handleGradientTypeChange = (type: GradientType) => {
    setGradientType(type);
  };

  const handleGradientAngleChange = (angle: number) => {
    setGradientAngle(angle);
  };

  const handleGradientStopChange = (index: number, field: 'color' | 'offset', value: string | number) => {
    setGradientStops((prev) => {
      const updated = [...prev];
      if (field === 'color') {
        updated[index] = { ...updated[index], color: value as string };
      } else {
        updated[index] = { ...updated[index], offset: value as number };
      }
      return updated;
    });
  };

  const handleAddGradientStop = () => {
    setGradientStops((prev) => {
      // Insert at midpoint
      const newOffset = prev.length > 1
        ? (prev[prev.length - 2].offset + prev[prev.length - 1].offset) / 2
        : 0.5;
      return [...prev.slice(0, -1), { offset: newOffset, color: '#888888' }, prev[prev.length - 1]];
    });
  };

  const handleRemoveGradientStop = (index: number) => {
    if (gradientStops.length <= 2) return; // Need at least 2 stops
    setGradientStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpacityChange = (value: number) => {
    setOpacity(value);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, create a local URL. In production, this would upload to storage.
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  const handleImageUrlChange = (url: string) => {
    setImageUrl(url);
  };

  const handleImageModeChange = (mode: 'cover' | 'contain' | 'tile') => {
    setImageMode(mode);
  };

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
      data-testid="canvas-settings-dropdown"
      style={dropdownStyle}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          BACKGROUND SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Background</div>

        {/* Background Type Selector */}
        <div style={{ marginBottom: '12px' }}>
          <div style={buttonGroupStyle}>
            <button
              style={toggleBtnStyle(bgType === 'solid')}
              onClick={() => handleBgTypeChange('solid')}
            >
              Solid
            </button>
            <button
              style={toggleBtnStyle(bgType === 'gradient')}
              onClick={() => handleBgTypeChange('gradient')}
            >
              Gradient
            </button>
            <button
              style={toggleBtnStyle(bgType === 'image')}
              onClick={() => handleBgTypeChange('image')}
            >
              Image
            </button>
          </div>
        </div>

        {/* Solid Color Controls */}
        {bgType === 'solid' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Color</label>
            <div style={colorInputContainerStyle}>
              <div
                style={colorSwatchStyle(solidColor)}
                onClick={() => {
                  // Trigger the hidden color input
                  const input = document.getElementById('solid-color-picker');
                  input?.click();
                }}
              />
              <input
                id="solid-color-picker"
                type="color"
                value={solidColor}
                onChange={(e) => handleSolidColorChange(e.target.value)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              />
              <input
                type="text"
                value={solidColor}
                onChange={(e) => handleSolidColorChange(e.target.value)}
                placeholder="#ffffff"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </div>
        )}

        {/* Gradient Controls */}
        {bgType === 'gradient' && (
          <>
            {/* Gradient Type */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Type</label>
              <div style={buttonGroupStyle}>
                <button
                  style={toggleBtnStyle(gradientType === 'linear')}
                  onClick={() => handleGradientTypeChange('linear')}
                >
                  Linear
                </button>
                <button
                  style={toggleBtnStyle(gradientType === 'radial')}
                  onClick={() => handleGradientTypeChange('radial')}
                >
                  Radial
                </button>
              </div>
            </div>

            {/* Gradient Angle (only for linear) */}
            {gradientType === 'linear' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Angle: {gradientAngle}°</label>
                <div style={rangeContainerStyle}>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={gradientAngle}
                    onChange={(e) => handleGradientAngleChange(parseInt(e.target.value, 10))}
                    style={rangeStyle}
                  />
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={gradientAngle}
                    onChange={(e) => handleGradientAngleChange(parseInt(e.target.value, 10) || 0)}
                    style={{ ...inputStyle, width: '60px' }}
                  />
                </div>
              </div>
            )}

            {/* Gradient Stops */}
            <div style={{ marginBottom: '8px' }}>
              <label style={labelStyle}>Color Stops</label>
              {gradientStops.map((stop, index) => (
                <div key={index} style={gradientStopRowStyle}>
                  <div
                    style={colorSwatchStyle(stop.color)}
                    onClick={() => {
                      const input = document.getElementById(`gradient-stop-${index}`);
                      input?.click();
                    }}
                  />
                  <input
                    id={`gradient-stop-${index}`}
                    type="color"
                    value={stop.color}
                    onChange={(e) => handleGradientStopChange(index, 'color', e.target.value)}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    value={stop.color}
                    onChange={(e) => handleGradientStopChange(index, 'color', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={stop.offset}
                    onChange={(e) => handleGradientStopChange(index, 'offset', parseFloat(e.target.value) || 0)}
                    style={{ ...inputStyle, width: '60px' }}
                    title="Position (0-1)"
                  />
                  {gradientStops.length > 2 && (
                    <button
                      style={removeStopBtnStyle}
                      onClick={() => handleRemoveGradientStop(index)}
                      title="Remove stop"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button style={addStopBtnStyle} onClick={handleAddGradientStop}>
                + Add Color Stop
              </button>
            </div>
          </>
        )}

        {/* Image Controls */}
        {bgType === 'image' && (
          <>
            {/* Image Upload / URL */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Image</label>
              {!imageUrl ? (
                <label style={uploadAreaStyle}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <div style={{ color: 'var(--sn-text-muted, #6b7280)' }}>
                    Click to upload or drag image
                  </div>
                </label>
              ) : (
                <div>
                  <div
                    style={{
                      width: '100%',
                      height: '80px',
                      borderRadius: 'var(--sn-radius, 4px)',
                      background: `url(${imageUrl}) center/cover no-repeat`,
                      border: '1px solid var(--sn-border, #e5e7eb)',
                      marginBottom: '8px',
                    }}
                  />
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    placeholder="Image URL"
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            {/* Image Mode */}
            {imageUrl && (
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Display Mode</label>
                <div style={buttonGroupStyle}>
                  <button
                    style={toggleBtnStyle(imageMode === 'cover')}
                    onClick={() => handleImageModeChange('cover')}
                  >
                    Cover
                  </button>
                  <button
                    style={toggleBtnStyle(imageMode === 'contain')}
                    onClick={() => handleImageModeChange('contain')}
                  >
                    Contain
                  </button>
                  <button
                    style={toggleBtnStyle(imageMode === 'tile')}
                    onClick={() => handleImageModeChange('tile')}
                  >
                    Tile
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Opacity */}
        <div>
          <label style={labelStyle}>Opacity: {Math.round(opacity * 100)}%</label>
          <div style={rangeContainerStyle}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={opacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              style={rangeStyle}
            />
            <input
              type="number"
              min="0"
              max="100"
              value={Math.round(opacity * 100)}
              onChange={(e) => handleOpacityChange((parseInt(e.target.value, 10) || 0) / 100)}
              style={{ ...inputStyle, width: '60px' }}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CANVAS SIZE SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Canvas Size</div>

        {/* Presets */}
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
              if (preset) handlePresetSelect(preset);
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
              placeholder="Infinite"
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
              placeholder="Infinite"
              style={inputStyle}
            />
          </div>
        </div>
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
      <div style={{ ...sectionStyle, borderBottom: 'none' }}>
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
          <span style={{ fontSize: '11px', color: 'var(--sn-text-muted, #6b7280)' }}>px</span>
        </div>
      </div>
    </div>
  );
};

export default CanvasSettingsDropdown;

