/**
 * Properties Panel — entity properties when selected, canvas background when not.
 * Wraps the headless PropertiesController from L4A-4.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CanvasEvents, CanvasDocumentEvents, DEFAULT_BACKGROUND } from '@sn/types';
import type {
  CanvasEntity,
  Point2D,
  Size2D,
  BackgroundSpec,
  GradientStop,
  GradientType,
  ViewportConfig,
} from '@sn/types';

import { bus } from '../../../kernel/bus';

// Local type mirrors to avoid L6 → L4A-4 cross-layer import
type PropertyValue<T> = T | 'mixed';

interface EntityProperties {
  position: PropertyValue<Point2D>;
  size: PropertyValue<Size2D>;
  rotation: PropertyValue<number>;
  visible: PropertyValue<boolean>;
  locked: PropertyValue<boolean>;
  name: PropertyValue<string | undefined>;
}
import { useDockerStore } from '../../../kernel/stores/docker';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { useSelection } from '../hooks';

type BackgroundType = 'solid' | 'gradient' | 'image';

const DEFAULT_GRADIENT_STOPS: GradientStop[] = [
  { offset: 0, color: '#ffffff' },
  { offset: 1, color: '#3E7D94' },
];

export interface PerCornerRadius {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export interface CanvasStrokeConfig {
  weight: number;
  style: StrokeStyle;
  color: string;
  opacity: number;
  gradient?: { enabled: boolean; stops: GradientStop[]; angle: number };
}

export type WorkspaceBgMode = 'none' | 'image' | 'parallax' | 'reactive';

export interface WorkspaceBgConfig {
  mode: WorkspaceBgMode;
  imageUrl: string;
  imageMode: 'cover' | 'contain' | 'tile';
  opacity: number;
  parallaxStrength: number;
  reactiveCode: string;
}

export type ShadowType = 'outer' | 'inner';

export interface CanvasDropShadowConfig {
  type: ShadowType;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

export interface CanvasFiltersConfig {
  brightness: number;
  contrast: number;
  saturation: number;
  hueRotate: number;
  blur: number;
}

export interface CanvasPaddingConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PropertiesPanelProps {
  /** All current entities (from scene graph) */
  entities: CanvasEntity[];
  /** Current viewport config (for canvas-level background settings) */
  viewportConfig?: ViewportConfig;
  /** Current canvas border radius */
  borderRadius?: number | PerCornerRadius;
  /** Current canvas opacity */
  canvasOpacity?: number;
  /** Current canvas stroke */
  canvasStroke?: CanvasStrokeConfig;
  /** Current workspace background */
  workspaceBg?: WorkspaceBgConfig;
  /** Current drop shadow */
  dropShadow?: CanvasDropShadowConfig;
  /** Current canvas filters */
  canvasFilters?: CanvasFiltersConfig;
  /** Current inner padding */
  canvasPadding?: CanvasPaddingConfig;
}

/** Resolve properties for selected entities using the same logic as PropertiesController. */
function resolveProperties(entities: CanvasEntity[]): EntityProperties {
  if (entities.length === 0) {
    return {
      position: 'mixed',
      size: 'mixed',
      rotation: 'mixed',
      visible: 'mixed',
      locked: 'mixed',
      name: 'mixed',
    };
  }

  function resolve<T>(values: T[]): PropertyValue<T> {
    if (values.length === 0) return 'mixed';
    const first = values[0];
    if (typeof first === 'object' && first !== null) {
      const firstStr = JSON.stringify(first);
      return values.every((v) => JSON.stringify(v) === firstStr) ? first : 'mixed';
    }
    return values.every((v) => v === first) ? first : 'mixed';
  }

  return {
    position: resolve(entities.map((e) => e.transform.position)),
    size: resolve(entities.map((e) => e.transform.size)),
    rotation: resolve(entities.map((e) => e.transform.rotation)),
    visible: resolve(entities.map((e) => e.visible)),
    locked: resolve(entities.map((e) => e.locked)),
    name: resolve(entities.map((e) => e.name)),
  };
}

/** Display a property value, showing "mixed" for multi-select differences. */
function displayValue(val: PropertyValue<unknown>): string {
  if (val === 'mixed') return 'mixed';
  if (typeof val === 'number') return String(Math.round(val * 100) / 100);
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if ('x' in obj && 'y' in obj) {
      return `${Math.round((obj.x as number) * 10) / 10}, ${Math.round((obj.y as number) * 10) / 10}`;
    }
    if ('width' in obj && 'height' in obj) {
      return `${Math.round(obj.width as number)} x ${Math.round(obj.height as number)}`;
    }
  }
  return String(val ?? '');
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--sn-text-muted, #7A7784)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const valueStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--sn-text, #E8E6ED)',
  padding: '4px 8px',
  background: 'var(--sn-bg, rgba(10,10,14,0.5))',
  border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
  borderRadius: 'var(--sn-radius, 6px)',
  fontFamily: 'var(--sn-font-family, system-ui)',
  width: '100%',
  boxSizing: 'border-box' as const,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const twoColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
};
// =============================================================================
// Background Control Styles
// =============================================================================

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--sn-text-muted, #7A7784)',
  marginBottom: '10px',
};

const bgInputStyle: React.CSSProperties = {
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

const colorSwatchStyle = (color: string): React.CSSProperties => ({
  width: '32px',
  height: '32px',
  borderRadius: 'var(--sn-radius, 4px)',
  border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
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

const gradientStopRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '6px',
};

const uploadAreaStyle: React.CSSProperties = {
  border: '2px dashed var(--sn-border, rgba(255,255,255,0.06))',
  borderRadius: 'var(--sn-radius, 6px)',
  padding: '20px',
  textAlign: 'center',
  cursor: 'pointer',
  background: 'var(--sn-bg, rgba(10,10,14,0.5))',
  transition: 'border-color 0.15s, background 0.15s',
};

const CANVAS_DOCKER_NAME = 'Canvas Docker';

// =============================================================================
// Divider
// =============================================================================

const sectionDividerStyle: React.CSSProperties = {
  borderTop: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
  margin: '4px 0',
};

// =============================================================================
// Link icon for linked/unlinked radius
// =============================================================================

const linkBtnStyle = (linked: boolean): React.CSSProperties => ({
  padding: '4px 6px',
  border: '1px solid',
  borderColor: linked ? 'var(--sn-accent, #3E7D94)' : 'var(--sn-border, rgba(255,255,255,0.06))',
  borderRadius: 'var(--sn-radius, 4px)',
  background: linked ? 'var(--sn-accent, #3E7D94)' : 'transparent',
  color: linked ? '#fff' : 'var(--sn-text-muted, #7A7784)',
  cursor: 'pointer',
  fontSize: '11px',
  fontFamily: 'inherit',
  lineHeight: 1,
});

/**
 * Canvas property settings shown when no entity is selected.
 */
const DEFAULT_STROKE: CanvasStrokeConfig = { weight: 0, style: 'solid', color: '#000000', opacity: 1 };
const DEFAULT_WORKSPACE_BG: WorkspaceBgConfig = { mode: 'none', imageUrl: '', imageMode: 'cover', opacity: 1, parallaxStrength: 0.3, reactiveCode: '' };
const DEFAULT_DROP_SHADOW: CanvasDropShadowConfig = { type: 'outer', offsetX: 0, offsetY: 4, blur: 24, spread: 0, color: '#000000', opacity: 0.12 };
const DEFAULT_FILTERS: CanvasFiltersConfig = { brightness: 100, contrast: 100, saturation: 100, hueRotate: 0, blur: 0 };
const DEFAULT_PADDING: CanvasPaddingConfig = { top: 0, right: 0, bottom: 0, left: 0 };

const CanvasPropertySettings: React.FC<{
  viewportConfig?: ViewportConfig;
  borderRadius?: number | PerCornerRadius;
  canvasOpacity?: number;
  canvasStroke?: CanvasStrokeConfig;
  workspaceBg?: WorkspaceBgConfig;
  dropShadow?: CanvasDropShadowConfig;
  canvasFilters?: CanvasFiltersConfig;
  canvasPadding?: CanvasPaddingConfig;
}> = ({
  viewportConfig,
  borderRadius: initialRadius = 0,
  canvasOpacity: initialCanvasOpacity = 1,
  canvasStroke: initialStroke = DEFAULT_STROKE,
  workspaceBg: initialWorkspaceBg = DEFAULT_WORKSPACE_BG,
  dropShadow: initialShadow = DEFAULT_DROP_SHADOW,
  canvasFilters: initialFilters = DEFAULT_FILTERS,
  canvasPadding: initialPadding = DEFAULT_PADDING,
}) => {
  const isSyncingRef = useRef(false);
  const background = viewportConfig?.background ?? DEFAULT_BACKGROUND;

  const [bgType, setBgType] = useState<BackgroundType>(background.type);
  const [solidColor, setSolidColor] = useState(
    background.type === 'solid' ? background.color : '#ffffff',
  );
  const [gradientType, setGradientType] = useState<GradientType>(
    background.type === 'gradient' ? (background.gradientType ?? 'linear') : 'linear',
  );
  const [gradientAngle, setGradientAngle] = useState(
    background.type === 'gradient' ? background.angle : 0,
  );
  const [gradientStops, setGradientStops] = useState<GradientStop[]>(
    background.type === 'gradient' ? background.stops : DEFAULT_GRADIENT_STOPS,
  );
  const [imageUrl, setImageUrl] = useState(
    background.type === 'image' ? background.url : '',
  );
  const [imageMode, setImageMode] = useState<'cover' | 'contain' | 'tile'>(
    background.type === 'image' ? background.mode : 'cover',
  );
  const [opacity, setOpacity] = useState(background.opacity);

  // ─── Size State ────────────────────────────────────────────────────────────
  const [canvasWidth, setCanvasWidth] = useState<number | undefined>(viewportConfig?.width);
  const [canvasHeight, setCanvasHeight] = useState<number | undefined>(viewportConfig?.height);

  // ─── Canvas Opacity State ──────────────────────────────────────────────────
  const [canvasOpacity, setCanvasOpacity] = useState(initialCanvasOpacity);

  // ─── Border Radius State ───────────────────────────────────────────────────
  const [radiusLinked, setRadiusLinked] = useState(typeof initialRadius === 'number');
  const [radiusTL, setRadiusTL] = useState(typeof initialRadius === 'number' ? initialRadius : initialRadius.topLeft);
  const [radiusTR, setRadiusTR] = useState(typeof initialRadius === 'number' ? initialRadius : initialRadius.topRight);
  const [radiusBR, setRadiusBR] = useState(typeof initialRadius === 'number' ? initialRadius : initialRadius.bottomRight);
  const [radiusBL, setRadiusBL] = useState(typeof initialRadius === 'number' ? initialRadius : initialRadius.bottomLeft);

  const setAllRadius = (v: number) => { setRadiusTL(v); setRadiusTR(v); setRadiusBR(v); setRadiusBL(v); };

  // ─── Stroke State ──────────────────────────────────────────────────────────
  const [strokeWeight, setStrokeWeight] = useState(initialStroke.weight);
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>(initialStroke.style);
  const [strokeColor, setStrokeColor] = useState(initialStroke.color);
  const [strokeOpacity, setStrokeOpacity] = useState(initialStroke.opacity);
  const [strokeGradientEnabled, setStrokeGradientEnabled] = useState(initialStroke.gradient?.enabled ?? false);
  const [strokeGradientStops, setStrokeGradientStops] = useState<GradientStop[]>(
    initialStroke.gradient?.stops ?? [{ offset: 0, color: '#3E7D94' }, { offset: 1, color: '#ec4899' }],
  );
  const [strokeGradientAngle, setStrokeGradientAngle] = useState(initialStroke.gradient?.angle ?? 0);

  // ─── Workspace Background State ────────────────────────────────────────────
  const [wsBgMode, setWsBgMode] = useState<WorkspaceBgMode>(initialWorkspaceBg.mode);
  const [wsBgImageUrl, setWsBgImageUrl] = useState(initialWorkspaceBg.imageUrl);
  const [wsBgImageMode, setWsBgImageMode] = useState<'cover' | 'contain' | 'tile'>(initialWorkspaceBg.imageMode);
  const [wsBgOpacity, setWsBgOpacity] = useState(initialWorkspaceBg.opacity);
  const [wsBgParallax, setWsBgParallax] = useState(initialWorkspaceBg.parallaxStrength);
  const [wsBgReactiveCode, setWsBgReactiveCode] = useState(initialWorkspaceBg.reactiveCode);

  // ─── Drop Shadow State ─────────────────────────────────────────────────────
  const [shadowType, setShadowType] = useState<ShadowType>(initialShadow.type);
  const [shadowX, setShadowX] = useState(initialShadow.offsetX);
  const [shadowY, setShadowY] = useState(initialShadow.offsetY);
  const [shadowBlur, setShadowBlur] = useState(initialShadow.blur);
  const [shadowSpread, setShadowSpread] = useState(initialShadow.spread);
  const [shadowColor, setShadowColor] = useState(initialShadow.color);
  const [shadowOpacity, setShadowOpacity] = useState(initialShadow.opacity);

  // ─── Canvas Filters State ──────────────────────────────────────────────────
  const [filterBrightness, setFilterBrightness] = useState(initialFilters.brightness);
  const [filterContrast, setFilterContrast] = useState(initialFilters.contrast);
  const [filterSaturation, setFilterSaturation] = useState(initialFilters.saturation);
  const [filterHueRotate, setFilterHueRotate] = useState(initialFilters.hueRotate);
  const [filterBlur, setFilterBlur] = useState(initialFilters.blur);

  // ─── Inner Padding State ───────────────────────────────────────────────────
  const [paddingLinked, setPaddingLinked] = useState(
    initialPadding.top === initialPadding.right &&
    initialPadding.right === initialPadding.bottom &&
    initialPadding.bottom === initialPadding.left,
  );
  const [padTop, setPadTop] = useState(initialPadding.top);
  const [padRight, setPadRight] = useState(initialPadding.right);
  const [padBottom, setPadBottom] = useState(initialPadding.bottom);
  const [padLeft, setPadLeft] = useState(initialPadding.left);
  const setAllPadding = (v: number) => { setPadTop(v); setPadRight(v); setPadBottom(v); setPadLeft(v); };

  // Sync from parent viewportConfig
  useEffect(() => {
    if (!viewportConfig) return;
    isSyncingRef.current = true;
    const bg = viewportConfig.background ?? DEFAULT_BACKGROUND;
    setBgType(bg.type);
    setOpacity(bg.opacity);
    if (bg.type === 'solid') setSolidColor(bg.color);
    else if (bg.type === 'gradient') {
      setGradientType(bg.gradientType ?? 'linear');
      setGradientAngle(bg.angle);
      setGradientStops(bg.stops);
    } else if (bg.type === 'image') {
      setImageUrl(bg.url);
      setImageMode(bg.mode);
    }
    setCanvasWidth(viewportConfig.width);
    setCanvasHeight(viewportConfig.height);
    requestAnimationFrame(() => { isSyncingRef.current = false; });
  }, [viewportConfig]);

  // Sync radius from parent
  useEffect(() => {
    if (typeof initialRadius === 'number') {
      setRadiusLinked(true);
      setAllRadius(initialRadius);
    } else {
      setRadiusLinked(false);
      setRadiusTL(initialRadius.topLeft);
      setRadiusTR(initialRadius.topRight);
      setRadiusBR(initialRadius.bottomRight);
      setRadiusBL(initialRadius.bottomLeft);
    }
  }, [initialRadius]);

  // Sync canvas opacity from parent
  useEffect(() => {
    isSyncingRef.current = true;
    setCanvasOpacity(initialCanvasOpacity);
    requestAnimationFrame(() => { isSyncingRef.current = false; });
  }, [initialCanvasOpacity]);

  const buildBackground = useCallback((): BackgroundSpec => {
    switch (bgType) {
      case 'solid':
        return { type: 'solid', color: solidColor, opacity };
      case 'gradient':
        return { type: 'gradient', gradientType, stops: gradientStops, angle: gradientAngle, opacity };
      case 'image':
        return { type: 'image', url: imageUrl, mode: imageMode, opacity };
    }
  }, [bgType, solidColor, gradientType, gradientAngle, gradientStops, imageUrl, imageMode, opacity]);

  // Emit changes
  useEffect(() => {
    if (isSyncingRef.current) return;
    bus.emit(CanvasDocumentEvents.BACKGROUND_CHANGED, {
      canvasId: '',
      background: buildBackground(),
    });
  }, [buildBackground]);

  // Emit size changes
  const emitViewportChange = useCallback(
    (width: number | undefined, height: number | undefined, sizeMode?: 'infinite' | 'bounded') => {
      bus.emit(CanvasDocumentEvents.VIEWPORT_CHANGED, {
        canvasId: '',
        viewport: { width, height, ...(sizeMode !== undefined ? { sizeMode } : {}) },
      });
    }, [],
  );

  // Emit border radius changes
  const emitRadiusChange = useCallback(() => {
    if (isSyncingRef.current) return;
    const value = radiusLinked
      ? radiusTL
      : { topLeft: radiusTL, topRight: radiusTR, bottomRight: radiusBR, bottomLeft: radiusBL };
    bus.emit(CanvasDocumentEvents.BORDER_RADIUS_CHANGED, {
      canvasId: '',
      borderRadius: value,
    });
  }, [radiusLinked, radiusTL, radiusTR, radiusBR, radiusBL]);

  useEffect(() => { emitRadiusChange(); }, [emitRadiusChange]);

  // Emit canvas opacity changes
  useEffect(() => {
    if (isSyncingRef.current) return;
    bus.emit('canvas.document.opacity.changed', {
      canvasId: '',
      opacity: canvasOpacity,
    });
  }, [canvasOpacity]);

  // Emit stroke changes
  const buildStroke = useCallback((): CanvasStrokeConfig => ({
    weight: strokeWeight,
    style: strokeStyle,
    color: strokeColor,
    opacity: strokeOpacity,
    gradient: strokeGradientEnabled
      ? { enabled: true, stops: strokeGradientStops, angle: strokeGradientAngle }
      : undefined,
  }), [strokeWeight, strokeStyle, strokeColor, strokeOpacity, strokeGradientEnabled, strokeGradientStops, strokeGradientAngle]);

  useEffect(() => {
    if (isSyncingRef.current) return;
    bus.emit('canvas.document.stroke.changed', { canvasId: '', stroke: buildStroke() });
  }, [buildStroke]);

  // Emit workspace background changes
  const buildWorkspaceBg = useCallback((): WorkspaceBgConfig => ({
    mode: wsBgMode,
    imageUrl: wsBgImageUrl,
    imageMode: wsBgImageMode,
    opacity: wsBgOpacity,
    parallaxStrength: wsBgParallax,
    reactiveCode: wsBgReactiveCode,
  }), [wsBgMode, wsBgImageUrl, wsBgImageMode, wsBgOpacity, wsBgParallax, wsBgReactiveCode]);

  useEffect(() => {
    if (isSyncingRef.current) return;
    bus.emit('canvas.document.workspaceBg.changed', { canvasId: '', workspaceBg: buildWorkspaceBg() });
  }, [buildWorkspaceBg]);

  // Emit drop shadow changes
  const buildShadow = useCallback((): CanvasDropShadowConfig => ({
    type: shadowType, offsetX: shadowX, offsetY: shadowY, blur: shadowBlur, spread: shadowSpread, color: shadowColor, opacity: shadowOpacity,
  }), [shadowType, shadowX, shadowY, shadowBlur, shadowSpread, shadowColor, shadowOpacity]);

  useEffect(() => {
    if (isSyncingRef.current) return;
    bus.emit('canvas.document.dropShadow.changed', { canvasId: '', dropShadow: buildShadow() });
  }, [buildShadow]);

  // Emit filter changes
  const buildFilters = useCallback((): CanvasFiltersConfig => ({
    brightness: filterBrightness, contrast: filterContrast, saturation: filterSaturation, hueRotate: filterHueRotate, blur: filterBlur,
  }), [filterBrightness, filterContrast, filterSaturation, filterHueRotate, filterBlur]);

  useEffect(() => {
    if (isSyncingRef.current) return;
    bus.emit('canvas.document.filters.changed', { canvasId: '', filters: buildFilters() });
  }, [buildFilters]);

  // Emit padding changes
  const buildPadding = useCallback((): CanvasPaddingConfig => ({
    top: padTop, right: padRight, bottom: padBottom, left: padLeft,
  }), [padTop, padRight, padBottom, padLeft]);

  useEffect(() => {
    if (isSyncingRef.current) return;
    bus.emit('canvas.document.padding.changed', { canvasId: '', padding: buildPadding() });
  }, [buildPadding]);

  const bgLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: 'var(--sn-text, #E8E6ED)',
    marginBottom: '4px',
  };

  return (
    <div
      data-testid="properties-panel"
      style={{
        padding: '12px',
        fontFamily: 'var(--sn-font-family, system-ui)',
        fontSize: '13px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={sectionTitleStyle}>Canvas Background</div>

      {/* Background Type Selector */}
      <div style={buttonGroupStyle}>
        <button data-testid="bg-type-solid" style={toggleBtnStyle(bgType === 'solid')} onClick={() => setBgType('solid')}>Solid</button>
        <button data-testid="bg-type-gradient" style={toggleBtnStyle(bgType === 'gradient')} onClick={() => setBgType('gradient')}>Gradient</button>
        <button data-testid="bg-type-image" style={toggleBtnStyle(bgType === 'image')} onClick={() => setBgType('image')}>Image</button>
      </div>

      {/* Solid Color Controls */}
      {bgType === 'solid' && (
        <div>
          <label style={bgLabelStyle}>Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={colorSwatchStyle(solidColor)}
              onClick={() => document.getElementById('bg-solid-color-picker')?.click()}
            />
            <input
              id="bg-solid-color-picker"
              data-testid="bg-solid-color"
              type="color"
              value={solidColor}
              onChange={(e) => setSolidColor(e.target.value)}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={solidColor}
              onChange={(e) => setSolidColor(e.target.value)}
              placeholder="#ffffff"
              style={{ ...bgInputStyle, flex: 1 }}
            />
          </div>
        </div>
      )}

      {/* Gradient Controls */}
      {bgType === 'gradient' && (
        <>
          <div>
            <label style={bgLabelStyle}>Type</label>
            <div style={buttonGroupStyle}>
              <button style={toggleBtnStyle(gradientType === 'linear')} onClick={() => setGradientType('linear')}>Linear</button>
              <button style={toggleBtnStyle(gradientType === 'radial')} onClick={() => setGradientType('radial')}>Radial</button>
            </div>
          </div>

          {gradientType === 'linear' && (
            <div>
              <label style={bgLabelStyle}>Angle: {gradientAngle}°</label>
              <div style={rangeContainerStyle}>
                <input type="range" min="0" max="360" value={gradientAngle} onChange={(e) => setGradientAngle(parseInt(e.target.value, 10))} style={rangeStyle} />
                <input type="number" min="0" max="360" value={gradientAngle} onChange={(e) => setGradientAngle(parseInt(e.target.value, 10) || 0)} style={{ ...bgInputStyle, width: '60px' }} />
              </div>
            </div>
          )}

          <div>
            <label style={bgLabelStyle}>Color Stops</label>
            {gradientStops.map((stop, index) => (
              <div key={index} style={gradientStopRowStyle}>
                <div
                  style={colorSwatchStyle(stop.color)}
                  onClick={() => document.getElementById(`bg-gradient-stop-${index}`)?.click()}
                />
                <input
                  id={`bg-gradient-stop-${index}`}
                  type="color"
                  value={stop.color}
                  onChange={(e) => {
                    setGradientStops((prev) => {
                      const updated = [...prev];
                      updated[index] = { ...updated[index], color: e.target.value };
                      return updated;
                    });
                  }}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                />
                <input
                  type="text"
                  value={stop.color}
                  onChange={(e) => {
                    setGradientStops((prev) => {
                      const updated = [...prev];
                      updated[index] = { ...updated[index], color: e.target.value };
                      return updated;
                    });
                  }}
                  style={{ ...bgInputStyle, flex: 1 }}
                />
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={stop.offset}
                  onChange={(e) => {
                    setGradientStops((prev) => {
                      const updated = [...prev];
                      updated[index] = { ...updated[index], offset: parseFloat(e.target.value) || 0 };
                      return updated;
                    });
                  }}
                  style={{ ...bgInputStyle, width: '60px' }}
                  title="Position (0-1)"
                />
                {gradientStops.length > 2 && (
                  <button
                    style={{ padding: '4px 8px', border: 'none', background: 'transparent', color: 'var(--sn-text-muted, #7A7784)', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
                    onClick={() => setGradientStops((prev) => prev.filter((_, i) => i !== index))}
                    title="Remove stop"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              data-testid="bg-add-stop"
              style={{
                padding: '6px 12px',
                border: '1px dashed var(--sn-border, rgba(255,255,255,0.06))',
                borderRadius: 'var(--sn-radius, 4px)',
                background: 'transparent',
                color: 'var(--sn-text-muted, #7A7784)',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'inherit',
                width: '100%',
                marginTop: '4px',
              }}
              onClick={() => {
                setGradientStops((prev) => {
                  const newOffset = prev.length > 1
                    ? (prev[prev.length - 2].offset + prev[prev.length - 1].offset) / 2
                    : 0.5;
                  return [...prev.slice(0, -1), { offset: newOffset, color: '#888888' }, prev[prev.length - 1]];
                });
              }}
            >
              + Add Color Stop
            </button>
          </div>
        </>
      )}

      {/* Image Controls */}
      {bgType === 'image' && (
        <>
          <div>
            <label style={bgLabelStyle}>Image</label>
            {!imageUrl ? (
              <label style={uploadAreaStyle}>
                <input
                  type="file"
                  accept="image/*"
                  data-testid="bg-image-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImageUrl(URL.createObjectURL(file));
                  }}
                  style={{ display: 'none' }}
                />
                <div style={{ color: 'var(--sn-text-muted, #7A7784)' }}>
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
                    border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
                    marginBottom: '8px',
                  }}
                />
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Image URL"
                  style={bgInputStyle}
                />
              </div>
            )}
          </div>

          {imageUrl && (
            <div>
              <label style={bgLabelStyle}>Display Mode</label>
              <div style={buttonGroupStyle}>
                <button style={toggleBtnStyle(imageMode === 'cover')} onClick={() => setImageMode('cover')}>Cover</button>
                <button style={toggleBtnStyle(imageMode === 'contain')} onClick={() => setImageMode('contain')}>Contain</button>
                <button style={toggleBtnStyle(imageMode === 'tile')} onClick={() => setImageMode('tile')}>Tile</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Background Opacity */}
      <div>
        <label style={bgLabelStyle}>Opacity: {Math.round(opacity * 100)}%</label>
        <div style={rangeContainerStyle}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            data-testid="bg-opacity"
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            style={rangeStyle}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity((parseInt(e.target.value, 10) || 0) / 100)}
            style={{ ...bgInputStyle, width: '60px' }}
          />
        </div>
      </div>

      {/* ═══════════════════════ SIZE ═══════════════════════ */}
      <div style={sectionDividerStyle} />
      <div style={sectionTitleStyle}>Size</div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
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

      {viewportConfig?.sizeMode === 'bounded' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={bgLabelStyle}>Width</label>
            <input
              type="number"
              min="1"
              value={canvasWidth ?? ''}
              onChange={(e) => {
                const w = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                const val = isNaN(w as number) ? undefined : w;
                setCanvasWidth(val);
                emitViewportChange(val, canvasHeight);
              }}
              placeholder="1920"
              style={bgInputStyle}
            />
          </div>
          <div>
            <label style={bgLabelStyle}>Height</label>
            <input
              type="number"
              min="1"
              value={canvasHeight ?? ''}
              onChange={(e) => {
                const h = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                const val = isNaN(h as number) ? undefined : h;
                setCanvasHeight(val);
                emitViewportChange(canvasWidth, val);
              }}
              placeholder="1080"
              style={bgInputStyle}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════ CANVAS OPACITY ═══════════════════════ */}
      <div style={sectionDividerStyle} />
      <div style={sectionTitleStyle}>Canvas Opacity</div>
      <div style={rangeContainerStyle}>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={canvasOpacity}
          data-testid="canvas-opacity"
          onChange={(e) => setCanvasOpacity(parseFloat(e.target.value))}
          style={rangeStyle}
        />
        <input
          type="number"
          min="0"
          max="100"
          value={Math.round(canvasOpacity * 100)}
          onChange={(e) => setCanvasOpacity((parseInt(e.target.value, 10) || 0) / 100)}
          style={{ ...bgInputStyle, width: '60px' }}
        />
      </div>

      {/* ═══════════════════════ BORDER RADIUS ═══════════════════════ */}
      <div style={sectionDividerStyle} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={sectionTitleStyle}>Border Radius</div>
        <button
          data-testid="radius-link-toggle"
          style={linkBtnStyle(radiusLinked)}
          title={radiusLinked ? 'Unlink corners' : 'Link all corners'}
          onClick={() => {
            if (!radiusLinked) setAllRadius(radiusTL);
            setRadiusLinked(!radiusLinked);
          }}
        >
          {radiusLinked ? 'Linked' : 'Per-corner'}
        </button>
      </div>

      {radiusLinked ? (
        <div style={rangeContainerStyle}>
          <input
            type="range"
            min="0"
            max="100"
            value={radiusTL}
            data-testid="radius-all"
            onChange={(e) => setAllRadius(parseInt(e.target.value, 10))}
            style={rangeStyle}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={radiusTL}
            onChange={(e) => setAllRadius(parseInt(e.target.value, 10) || 0)}
            style={{ ...bgInputStyle, width: '60px' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--sn-text-muted, #7A7784)' }}>px</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {([
            ['TL', radiusTL, setRadiusTL],
            ['TR', radiusTR, setRadiusTR],
            ['BL', radiusBL, setRadiusBL],
            ['BR', radiusBR, setRadiusBR],
          ] as const).map(([label, val, setter]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--sn-text-muted, #7A7784)', width: '18px' }}>{label}</span>
              <input
                type="number"
                min="0"
                max="100"
                value={val}
                data-testid={`radius-${label.toLowerCase()}`}
                onChange={(e) => setter(parseInt(e.target.value, 10) || 0)}
                style={{ ...bgInputStyle, flex: 1 }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════ CANVAS STROKE ═══════════════════════ */}
      <div style={sectionDividerStyle} />
      <div style={sectionTitleStyle}>Canvas Stroke</div>

      {/* Weight */}
      <div style={{ marginBottom: '8px' }}>
        <label style={bgLabelStyle}>Weight: {strokeWeight}px</label>
        <div style={rangeContainerStyle}>
          <input type="range" min="0" max="20" value={strokeWeight} onChange={(e) => setStrokeWeight(parseInt(e.target.value, 10))} style={rangeStyle} />
          <input type="number" min="0" max="20" value={strokeWeight} onChange={(e) => setStrokeWeight(parseInt(e.target.value, 10) || 0)} style={{ ...bgInputStyle, width: '60px' }} />
        </div>
      </div>

      {strokeWeight > 0 && (
        <>
          {/* Style */}
          <div style={{ marginBottom: '8px' }}>
            <label style={bgLabelStyle}>Style</label>
            <div style={buttonGroupStyle}>
              {(['solid', 'dashed', 'dotted'] as StrokeStyle[]).map((s) => (
                <button key={s} style={toggleBtnStyle(strokeStyle === s)} onClick={() => setStrokeStyle(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ ...bgLabelStyle, marginBottom: 0 }}>Color</label>
              <button
                style={linkBtnStyle(strokeGradientEnabled)}
                onClick={() => setStrokeGradientEnabled(!strokeGradientEnabled)}
              >
                {strokeGradientEnabled ? 'Gradient' : 'Solid'}
              </button>
            </div>

            {!strokeGradientEnabled ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={colorSwatchStyle(strokeColor)}
                  onClick={() => document.getElementById('stroke-color-picker')?.click()}
                />
                <input
                  id="stroke-color-picker"
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                />
                <input
                  type="text"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  placeholder="#000000"
                  style={{ ...bgInputStyle, flex: 1 }}
                />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '6px' }}>
                  <label style={bgLabelStyle}>Angle: {strokeGradientAngle}°</label>
                  <div style={rangeContainerStyle}>
                    <input type="range" min="0" max="360" value={strokeGradientAngle} onChange={(e) => setStrokeGradientAngle(parseInt(e.target.value, 10))} style={rangeStyle} />
                    <input type="number" min="0" max="360" value={strokeGradientAngle} onChange={(e) => setStrokeGradientAngle(parseInt(e.target.value, 10) || 0)} style={{ ...bgInputStyle, width: '60px' }} />
                  </div>
                </div>
                {strokeGradientStops.map((stop, index) => (
                  <div key={index} style={gradientStopRowStyle}>
                    <div style={colorSwatchStyle(stop.color)} onClick={() => document.getElementById(`stroke-grad-${index}`)?.click()} />
                    <input id={`stroke-grad-${index}`} type="color" value={stop.color} onChange={(e) => {
                      setStrokeGradientStops(prev => { const u = [...prev]; u[index] = { ...u[index], color: e.target.value }; return u; });
                    }} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                    <input type="text" value={stop.color} onChange={(e) => {
                      setStrokeGradientStops(prev => { const u = [...prev]; u[index] = { ...u[index], color: e.target.value }; return u; });
                    }} style={{ ...bgInputStyle, flex: 1 }} />
                    <input type="number" min="0" max="1" step="0.01" value={stop.offset} onChange={(e) => {
                      setStrokeGradientStops(prev => { const u = [...prev]; u[index] = { ...u[index], offset: parseFloat(e.target.value) || 0 }; return u; });
                    }} style={{ ...bgInputStyle, width: '50px' }} />
                    {strokeGradientStops.length > 2 && (
                      <button style={{ padding: '4px 8px', border: 'none', background: 'transparent', color: 'var(--sn-text-muted)', cursor: 'pointer', fontSize: '14px' }}
                        onClick={() => setStrokeGradientStops(prev => prev.filter((_, i) => i !== index))}>×</button>
                    )}
                  </div>
                ))}
                <button style={{ padding: '4px 10px', border: '1px dashed var(--sn-border, rgba(255,255,255,0.06))', borderRadius: 'var(--sn-radius, 4px)', background: 'transparent', color: 'var(--sn-text-muted)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', width: '100%', marginTop: '2px' }}
                  onClick={() => setStrokeGradientStops(prev => [...prev.slice(0, -1), { offset: 0.5, color: '#888888' }, prev[prev.length - 1]])}>
                  + Add Stop
                </button>
              </>
            )}
          </div>

          {/* Stroke Opacity */}
          <div>
            <label style={bgLabelStyle}>Opacity: {Math.round(strokeOpacity * 100)}%</label>
            <div style={rangeContainerStyle}>
              <input type="range" min="0" max="1" step="0.01" value={strokeOpacity} onChange={(e) => setStrokeOpacity(parseFloat(e.target.value))} style={rangeStyle} />
              <input type="number" min="0" max="100" value={Math.round(strokeOpacity * 100)} onChange={(e) => setStrokeOpacity((parseInt(e.target.value, 10) || 0) / 100)} style={{ ...bgInputStyle, width: '60px' }} />
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════ WORKSPACE BACKGROUND ═══════════════════════ */}
      <div style={sectionDividerStyle} />
      <div style={sectionTitleStyle}>Workspace Background</div>

      {/* Mode selector */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {(['none', 'image', 'parallax', 'reactive'] as WorkspaceBgMode[]).map((m) => (
            <button key={m} style={toggleBtnStyle(wsBgMode === m)} onClick={() => setWsBgMode(m)}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Image upload — for image and parallax modes */}
      {(wsBgMode === 'image' || wsBgMode === 'parallax') && (
        <>
          <div style={{ marginBottom: '8px' }}>
            <label style={bgLabelStyle}>Image</label>
            {!wsBgImageUrl ? (
              <label style={uploadAreaStyle}>
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setWsBgImageUrl(URL.createObjectURL(file));
                }} style={{ display: 'none' }} />
                <div style={{ color: 'var(--sn-text-muted, #7A7784)' }}>Click to upload image</div>
              </label>
            ) : (
              <div>
                <div style={{ width: '100%', height: '60px', borderRadius: 'var(--sn-radius, 4px)', background: `url(${wsBgImageUrl}) center/cover no-repeat`, border: '1px solid var(--sn-border, rgba(255,255,255,0.06))', marginBottom: '6px' }} />
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="text" value={wsBgImageUrl} onChange={(e) => setWsBgImageUrl(e.target.value)} placeholder="Image URL" style={{ ...bgInputStyle, flex: 1 }} />
                  <button style={{ ...bgInputStyle, width: 'auto', padding: '4px 8px', cursor: 'pointer' }} onClick={() => setWsBgImageUrl('')}>×</button>
                </div>
              </div>
            )}
          </div>

          {/* Display mode */}
          {wsBgImageUrl && (
            <div style={{ marginBottom: '8px' }}>
              <label style={bgLabelStyle}>Display</label>
              <div style={buttonGroupStyle}>
                {(['cover', 'contain', 'tile'] as const).map((m) => (
                  <button key={m} style={toggleBtnStyle(wsBgImageMode === m)} onClick={() => setWsBgImageMode(m)}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Parallax strength */}
      {wsBgMode === 'parallax' && (
        <div style={{ marginBottom: '8px' }}>
          <label style={bgLabelStyle}>Parallax Strength: {Math.round(wsBgParallax * 100)}%</label>
          <div style={rangeContainerStyle}>
            <input type="range" min="0" max="1" step="0.01" value={wsBgParallax} onChange={(e) => setWsBgParallax(parseFloat(e.target.value))} style={rangeStyle} />
            <input type="number" min="0" max="100" value={Math.round(wsBgParallax * 100)} onChange={(e) => setWsBgParallax((parseInt(e.target.value, 10) || 0) / 100)} style={{ ...bgInputStyle, width: '60px' }} />
          </div>
        </div>
      )}

      {/* Reactive code */}
      {wsBgMode === 'reactive' && (
        <div style={{ marginBottom: '8px' }}>
          <label style={bgLabelStyle}>Code (CSS / JS)</label>
          <textarea
            value={wsBgReactiveCode}
            onChange={(e) => setWsBgReactiveCode(e.target.value)}
            placeholder={'/* CSS gradient, animation, or JS */\nbackground: linear-gradient(...);\n/* or custom shader code */'}
            style={{ ...bgInputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'monospace', fontSize: '11px' }}
          />
        </div>
      )}

      {/* Workspace BG opacity — for all non-none modes */}
      {wsBgMode !== 'none' && (
        <div>
          <label style={bgLabelStyle}>Opacity: {Math.round(wsBgOpacity * 100)}%</label>
          <div style={rangeContainerStyle}>
            <input type="range" min="0" max="1" step="0.01" value={wsBgOpacity} onChange={(e) => setWsBgOpacity(parseFloat(e.target.value))} style={rangeStyle} />
            <input type="number" min="0" max="100" value={Math.round(wsBgOpacity * 100)} onChange={(e) => setWsBgOpacity((parseInt(e.target.value, 10) || 0) / 100)} style={{ ...bgInputStyle, width: '60px' }} />
          </div>
        </div>
      )}

      {/* ═══════════════════════ DROP SHADOW ═══════════════════════ */}
      <div style={sectionDividerStyle} />
      <div style={sectionTitleStyle}>Drop Shadow</div>

      <div style={{ marginBottom: '8px' }}>
        <div style={buttonGroupStyle}>
          <button style={toggleBtnStyle(shadowType === 'outer')} onClick={() => setShadowType('outer')}>Outer</button>
          <button style={toggleBtnStyle(shadowType === 'inner')} onClick={() => setShadowType('inner')}>Inner</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
        <div>
          <label style={bgLabelStyle}>X Offset</label>
          <input type="number" min="-50" max="50" value={shadowX} onChange={(e) => setShadowX(parseInt(e.target.value, 10) || 0)} style={bgInputStyle} />
        </div>
        <div>
          <label style={bgLabelStyle}>Y Offset</label>
          <input type="number" min="-50" max="50" value={shadowY} onChange={(e) => setShadowY(parseInt(e.target.value, 10) || 0)} style={bgInputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={bgLabelStyle}>Blur: {shadowBlur}px</label>
        <div style={rangeContainerStyle}>
          <input type="range" min="0" max="100" value={shadowBlur} onChange={(e) => setShadowBlur(parseInt(e.target.value, 10))} style={rangeStyle} />
          <input type="number" min="0" max="100" value={shadowBlur} onChange={(e) => setShadowBlur(parseInt(e.target.value, 10) || 0)} style={{ ...bgInputStyle, width: '60px' }} />
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={bgLabelStyle}>Spread: {shadowSpread}px</label>
        <div style={rangeContainerStyle}>
          <input type="range" min="0" max="50" value={shadowSpread} onChange={(e) => setShadowSpread(parseInt(e.target.value, 10))} style={rangeStyle} />
          <input type="number" min="0" max="50" value={shadowSpread} onChange={(e) => setShadowSpread(parseInt(e.target.value, 10) || 0)} style={{ ...bgInputStyle, width: '60px' }} />
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={bgLabelStyle}>Color</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={colorSwatchStyle(shadowColor)} onClick={() => document.getElementById('shadow-color-picker')?.click()} />
          <input id="shadow-color-picker" type="color" value={shadowColor} onChange={(e) => setShadowColor(e.target.value)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
          <input type="text" value={shadowColor} onChange={(e) => setShadowColor(e.target.value)} style={{ ...bgInputStyle, flex: 1 }} />
        </div>
      </div>

      <div>
        <label style={bgLabelStyle}>Opacity: {Math.round(shadowOpacity * 100)}%</label>
        <div style={rangeContainerStyle}>
          <input type="range" min="0" max="1" step="0.01" value={shadowOpacity} onChange={(e) => setShadowOpacity(parseFloat(e.target.value))} style={rangeStyle} />
          <input type="number" min="0" max="100" value={Math.round(shadowOpacity * 100)} onChange={(e) => setShadowOpacity((parseInt(e.target.value, 10) || 0) / 100)} style={{ ...bgInputStyle, width: '60px' }} />
        </div>
      </div>

      {/* ═══════════════════════ CANVAS FILTERS ═══════════════════════ */}
      <div style={sectionDividerStyle} />
      <div style={sectionTitleStyle}>Canvas Filters</div>

      {([
        ['Brightness', filterBrightness, setFilterBrightness, 0, 200, '%'],
        ['Contrast', filterContrast, setFilterContrast, 0, 200, '%'],
        ['Saturation', filterSaturation, setFilterSaturation, 0, 200, '%'],
        ['Hue Rotate', filterHueRotate, setFilterHueRotate, 0, 360, '°'],
        ['Blur', filterBlur, setFilterBlur, 0, 20, 'px'],
      ] as [string, number, (v: number) => void, number, number, string][]).map(([label, val, setter, min, max, unit]) => (
        <div key={label} style={{ marginBottom: '6px' }}>
          <label style={bgLabelStyle}>{label}: {val}{unit}</label>
          <div style={rangeContainerStyle}>
            <input type="range" min={min} max={max} value={val} onChange={(e) => setter(parseFloat(e.target.value))} style={rangeStyle} />
            <input type="number" min={min} max={max} value={val} onChange={(e) => setter(parseFloat(e.target.value) || 0)} style={{ ...bgInputStyle, width: '60px' }} />
          </div>
        </div>
      ))}

      {/* ═══════════════════════ INNER PADDING ═══════════════════════ */}
      <div style={sectionDividerStyle} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={sectionTitleStyle}>Inner Padding</div>
        <button
          style={linkBtnStyle(paddingLinked)}
          onClick={() => {
            if (!paddingLinked) setAllPadding(padTop);
            setPaddingLinked(!paddingLinked);
          }}
        >
          {paddingLinked ? 'Linked' : 'Per-side'}
        </button>
      </div>

      {paddingLinked ? (
        <div style={rangeContainerStyle}>
          <input type="range" min="0" max="100" value={padTop} onChange={(e) => setAllPadding(parseInt(e.target.value, 10))} style={rangeStyle} />
          <input type="number" min="0" max="100" value={padTop} onChange={(e) => setAllPadding(parseInt(e.target.value, 10) || 0)} style={{ ...bgInputStyle, width: '60px' }} />
          <span style={{ fontSize: '11px', color: 'var(--sn-text-muted, #7A7784)' }}>px</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {([
            ['Top', padTop, setPadTop],
            ['Right', padRight, setPadRight],
            ['Bottom', padBottom, setPadBottom],
            ['Left', padLeft, setPadLeft],
          ] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--sn-text-muted, #7A7784)', width: '32px' }}>{label}</span>
              <input type="number" min="0" max="100" value={val} onChange={(e) => setter(parseInt(e.target.value, 10) || 0)} style={{ ...bgInputStyle, flex: 1 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Properties Panel — shows entity properties for the current selection.
 * When nothing is selected, shows canvas background settings.
 * Hidden in preview mode.
 */
export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ entities, viewportConfig, borderRadius, canvasOpacity, canvasStroke, workspaceBg, dropShadow, canvasFilters, canvasPadding }) => {
  const mode = useUIStore((s) => s.canvasInteractionMode);
  const { selectedIds } = useSelection();

  const selectedEntities = useMemo(
    () => entities.filter((e) => selectedIds.has(e.id)),
    [entities, selectedIds],
  );

  const properties = useMemo(
    () => resolveProperties(selectedEntities),
    [selectedEntities],
  );
  const selectedWidget = useMemo(
    () =>
      selectedEntities.length === 1 && selectedEntities[0].type === 'widget'
        ? selectedEntities[0]
        : null,
    [selectedEntities],
  );

  const handleDockSelectedWidget = useCallback(() => {
    if (!selectedWidget || selectedWidget.type !== 'widget') return;

    const dockerStore = useDockerStore.getState();
    let dockerEntry =
      Object.values(dockerStore.dockers).find((docker) => docker.name === CANVAS_DOCKER_NAME) ??
      Object.values(dockerStore.dockers)[0];

    if (!dockerEntry) {
      const dockerId = dockerStore.addDocker({
        name: CANVAS_DOCKER_NAME,
        dockMode: 'docked-right',
        visible: true,
        pinned: true,
        size: { width: 320, height: 460 },
        tabs: [{ id: crypto.randomUUID(), name: 'Widgets', widgets: [] }],
      });
      dockerEntry = useDockerStore.getState().dockers[dockerId];
    }

    const alreadyDocked = dockerEntry.tabs.some((tab) =>
      tab.widgets.some((slot) => slot.widgetInstanceId === selectedWidget.widgetInstanceId),
    );
    if (!alreadyDocked) {
      dockerStore.addWidgetToTab(
        dockerEntry.id,
        dockerEntry.activeTabIndex,
        selectedWidget.widgetInstanceId,
        220,
      );
    }
    dockerStore.setVisible(dockerEntry.id, true);
    dockerStore.bringToFront(dockerEntry.id);

    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: selectedWidget.id,
      updates: { visible: false },
    });
  }, [selectedWidget]);

  // Hidden in preview mode
  if (mode !== 'edit') return null;

  // Nothing selected — show canvas property settings
  if (selectedIds.size === 0) {
    return <CanvasPropertySettings viewportConfig={viewportConfig} borderRadius={borderRadius} canvasOpacity={canvasOpacity} canvasStroke={canvasStroke} workspaceBg={workspaceBg} dropShadow={dropShadow} canvasFilters={canvasFilters} canvasPadding={canvasPadding} />;
  }

  const selectionLabel =
    selectedEntities.length === 1
      ? selectedEntities[0].name ?? `${selectedEntities[0].type}`
      : `${selectedEntities.length} entities selected`;

  return (
    <div
      data-testid="properties-panel"
      style={{
        padding: '12px',
        fontFamily: 'var(--sn-font-family, system-ui)',
        fontSize: '13px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontWeight: 600,
          fontSize: '14px',
          color: 'var(--sn-text, #E8E6ED)',
          borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
          paddingBottom: '8px',
        }}
      >
        {selectionLabel}
      </div>

      {/* Position */}
      <div style={twoColStyle}>
        <div style={rowStyle}>
          <label style={labelStyle}>X</label>
          <input
            data-testid="prop-x"
            readOnly
            value={properties.position === 'mixed' ? 'mixed' : String(Math.round((properties.position as { x: number }).x))}
            style={valueStyle}
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Y</label>
          <input
            data-testid="prop-y"
            readOnly
            value={properties.position === 'mixed' ? 'mixed' : String(Math.round((properties.position as { y: number }).y))}
            style={valueStyle}
          />
        </div>
      </div>

      {/* Size */}
      <div style={twoColStyle}>
        <div style={rowStyle}>
          <label style={labelStyle}>W</label>
          <input
            data-testid="prop-w"
            readOnly
            value={properties.size === 'mixed' ? 'mixed' : String(Math.round((properties.size as { width: number }).width))}
            style={valueStyle}
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>H</label>
          <input
            data-testid="prop-h"
            readOnly
            value={properties.size === 'mixed' ? 'mixed' : String(Math.round((properties.size as { height: number }).height))}
            style={valueStyle}
          />
        </div>
      </div>

      {/* Rotation */}
      <div style={rowStyle}>
        <label style={labelStyle}>Rotation</label>
        <input
          data-testid="prop-rotation"
          readOnly
          value={displayValue(properties.rotation)}
          style={valueStyle}
        />
      </div>

      {/* Visibility & Lock */}
      <div style={twoColStyle}>
        <div style={rowStyle}>
          <label style={labelStyle}>Visible</label>
          <div
            data-testid="prop-visible"
            style={{
              ...valueStyle,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            {displayValue(properties.visible)}
          </div>
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Locked</label>
          <div
            data-testid="prop-locked"
            style={{
              ...valueStyle,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            {displayValue(properties.locked)}
          </div>
        </div>
      </div>

      {selectedWidget ? (
        <div style={rowStyle}>
          <label style={labelStyle}>Widget</label>
          <button
            type="button"
            data-testid="prop-dock-widget"
            onClick={handleDockSelectedWidget}
            style={{
              ...valueStyle,
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--sn-surface, #fff)',
            }}
          >
            Dock To Docker
          </button>
        </div>
      ) : null}
    </div>
  );
};
