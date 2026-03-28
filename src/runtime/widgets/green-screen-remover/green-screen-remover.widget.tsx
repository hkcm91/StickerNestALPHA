/**
 * Green Screen Remover Widget
 *
 * Removes green-screen (chroma key) backgrounds from image entities on the canvas.
 * Select any image/sticker entity, adjust tolerance, and apply — the green pixels
 * are made transparent and the entity is updated in-place.
 *
 * @module runtime/widgets/green-screen-remover
 * @layer L3
 */

import React, { useState, useCallback, useRef } from 'react';

import type { WidgetManifest } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { useEmit, useSubscribe, useWidgetState } from '../../hooks';

import type { GreenScreenRemoverConfig } from './green-screen-remover.schema';

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS: GreenScreenRemoverConfig = {
  hueCenterDeg: 120,
  hueRangeDeg: 40,
  minSaturation: 0.15,
  minLightness: 0.10,
  maxLightness: 0.90,
  edgeSoftness: 1,
};

// ─── Chroma-key helpers (pure functions — easy to unit-test) ─────────────────

/** Convert an RGB pixel (0–255 each) to HSL (h: 0–360, s/l: 0–1). */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l]; // achromatic

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;

  return [h, s, l];
}

/**
 * Compute the "green-ness" score of a pixel (0 = not green, 1 = fully green).
 * Returns a value in [0, 1] that can be used directly as an alpha mask.
 */
export function greenScore(
  r: number,
  g: number,
  b: number,
  config: GreenScreenRemoverConfig,
): number {
  const [h, s, l] = rgbToHsl(r, g, b);

  // Check saturation & lightness bounds
  if (s < config.minSaturation) return 0;
  if (l < config.minLightness || l > config.maxLightness) return 0;

  // Hue distance (wrapping around 360°)
  let hueDist = Math.abs(h - config.hueCenterDeg);
  if (hueDist > 180) hueDist = 360 - hueDist;

  if (hueDist > config.hueRangeDeg) return 0;

  // Smooth falloff near the edge of hue range
  const ratio = hueDist / config.hueRangeDeg;
  return 1 - ratio * ratio; // quadratic falloff
}

/**
 * Process an ImageData buffer in-place, setting alpha of green pixels to 0.
 * Returns the mutated ImageData for convenience.
 */
export function removeGreenFromImageData(
  imageData: ImageData,
  config: GreenScreenRemoverConfig,
): ImageData {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const score = greenScore(data[i], data[i + 1], data[i + 2], config);
    if (score > 0) {
      // Reduce alpha proportionally to green-ness
      data[i + 3] = Math.round(data[i + 3] * (1 - score));
    }
  }
  return imageData;
}

// ─── Manifest ────────────────────────────────────────────────────────────────

export const greenScreenRemoverManifest: WidgetManifest = {
  id: 'sn.builtin.green-screen-remover',
  name: 'Green Screen Remover',
  version: '1.0.0',
  description: 'Remove green-screen backgrounds from any image entity on the canvas',
  author: { name: 'StickerNest', url: 'https://stickernest.com' },
  category: 'media',
  tags: ['chroma-key', 'green-screen', 'image', 'background-removal', 'media'],
  permissions: ['canvas-write'],
  size: {
    defaultWidth: 320,
    defaultHeight: 520,
    minWidth: 280,
    minHeight: 420,
    aspectLocked: false,
  },
  license: 'MIT',
  config: { fields: [] },
  spatialSupport: false,
  entry: 'inline',
  crossCanvasChannels: [],
  events: {
    emits: [
      { name: 'widget.green-screen-remover.ready' },
      { name: 'widget.green-screen-remover.processing.started' },
      { name: 'widget.green-screen-remover.processing.completed' },
      { name: 'widget.green-screen-remover.processing.failed' },
    ],
    subscribes: [
      { name: 'canvas.entity.selected' },
      { name: 'canvas.selection.cleared' },
    ],
  },
};

// ─── Widget Component ────────────────────────────────────────────────────────

export const GreenScreenRemoverWidget: React.FC<{ instanceId: string }> = ({ instanceId }) => {
  const emit = useEmit();
  const [state, setWidgetState] = useWidgetState(instanceId);

  // Config sliders
  const [hueRange, setHueRange] = useState<number>(state.hueRange ?? DEFAULTS.hueRangeDeg);
  const [minSat, setMinSat] = useState<number>(state.minSat ?? DEFAULTS.minSaturation);
  const [softness, setSoftness] = useState<number>(state.edgeSoftness ?? DEFAULTS.edgeSoftness);

  // UI state
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Listen for entity selection ──────────────────────────────────────────

  useSubscribe('widget.canvas.entity.selected', (payload: any) => {
    const entities = payload.entities || [];
    if (entities.length === 1) {
      const entity = entities[0];
      if (entity.type === 'sticker' || entity.assetUrl) {
        setSelectedEntity(entity);
        setPreviewUrl(null);
        setError(null);
      } else {
        setSelectedEntity(null);
        setError('Select an image entity (sticker) to remove its green screen.');
      }
    } else {
      setSelectedEntity(null);
    }
  });

  useSubscribe('widget.canvas.selection.cleared', () => {
    setSelectedEntity(null);
    setPreviewUrl(null);
    setError(null);
  });

  // ── Process the image ────────────────────────────────────────────────────

  const processImage = useCallback(async () => {
    if (!selectedEntity?.assetUrl) return;

    setIsProcessing(true);
    setError(null);

    const start = performance.now();

    emit('widget.green-screen-remover.processing.started', {
      instanceId,
      entityId: selectedEntity.id,
      timestamp: Date.now(),
    });

    try {
      // Load the image onto a temporary canvas
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = selectedEntity.assetUrl;
      });

      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Apply green screen removal
      const config: GreenScreenRemoverConfig = {
        ...DEFAULTS,
        hueRangeDeg: hueRange,
        minSaturation: minSat,
        edgeSoftness: softness,
      };

      removeGreenFromImageData(imageData, config);
      ctx.putImageData(imageData, 0, 0);

      // Create preview
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewUrl(dataUrl);

      // Save state
      setWidgetState('hueRange', hueRange);
      setWidgetState('minSat', minSat);
      setWidgetState('edgeSoftness', softness);

      const duration = performance.now() - start;
      emit('widget.green-screen-remover.processing.completed', {
        instanceId,
        entityId: selectedEntity.id,
        duration,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      const message = err.message || 'Processing failed';
      setError(message);
      emit('widget.green-screen-remover.processing.failed', {
        instanceId,
        error: message,
        timestamp: Date.now(),
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedEntity, hueRange, minSat, softness, emit, instanceId, setWidgetState]);

  // ── Apply result to the entity ───────────────────────────────────────────

  const applyToEntity = useCallback(() => {
    if (!previewUrl || !selectedEntity) return;

    emit(CanvasEvents.ENTITY_UPDATED, {
      id: selectedEntity.id,
      updates: {
        assetUrl: previewUrl,
        name: `${selectedEntity.name || 'Image'} (BG removed)`,
      },
    });
  }, [previewUrl, selectedEntity, emit]);

  // ── Render ───────────────────────────────────────────────────────────────

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--sn-text-muted, #666)',
    marginBottom: '2px',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: 'var(--sn-accent, #3b82f6)',
  };

  return (
    <div style={{
      padding: '16px',
      height: '100%',
      background: 'var(--sn-surface, #fff)',
      color: 'var(--sn-text, #333)',
      fontFamily: 'var(--sn-font-family, sans-serif)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      <div style={{ fontWeight: 700, fontSize: '15px' }}>
        Green Screen Remover
      </div>

      {!selectedEntity && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          background: 'var(--sn-bg, #f9f9f9)',
          border: '1px dashed var(--sn-border, #e5e5e5)',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--sn-text-muted, #888)',
        }}>
          Select an image entity on the canvas to get started.
        </div>
      )}

      {selectedEntity && (
        <>
          <div style={{
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'var(--sn-bg, #f9f9f9)',
            fontSize: '13px',
          }}>
            Selected: <strong>{selectedEntity.name || 'Untitled'}</strong>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={labelStyle}>Hue Range (tolerance): {hueRange}°</div>
              <input
                type="range"
                min={5}
                max={90}
                value={hueRange}
                onChange={(e) => setHueRange(Number(e.target.value))}
                style={sliderStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Min Saturation: {(minSat * 100).toFixed(0)}%</div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(minSat * 100)}
                onChange={(e) => setMinSat(Number(e.target.value) / 100)}
                style={sliderStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Edge Softness: {softness}</div>
              <input
                type="range"
                min={0}
                max={10}
                value={softness}
                onChange={(e) => setSoftness(Number(e.target.value))}
                style={sliderStyle}
              />
            </div>
          </div>

          {/* Preview / Process */}
          <button
            onClick={processImage}
            disabled={isProcessing}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: 'var(--sn-accent, #3b82f6)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1,
            }}
          >
            {isProcessing ? 'Processing...' : 'Preview Removal'}
          </button>

          {previewUrl && (
            <>
              <div style={{
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid var(--sn-border, #e5e5e5)',
                background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 16px 16px',
              }}>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{ width: '100%', display: 'block' }}
                />
              </div>

              <button
                onClick={applyToEntity}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#22c55e',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Apply to Entity
              </button>
            </>
          )}
        </>
      )}

      {error && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          background: '#fef2f2',
          color: '#ef4444',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Hidden canvas for pixel processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
