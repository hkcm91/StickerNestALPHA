/**
 * Frame Renderer — renders entity scene to OffscreenCanvas for video export
 *
 * @module canvas/panels/export/frame-renderer
 * @layer L4A-4
 *
 * @remarks
 * Steps through the timeline frame-by-frame and renders each frame to
 * a 2D canvas. Produces ImageBitmap or ImageData for the video encoder.
 *
 * Entity rendering uses Canvas2D — NOT React/DOM — for pixel-accurate
 * frame capture without browser chrome.
 */

import type { AnimationOverlay } from '@sn/types';

import { useAnimationOverlayStore } from '../../../kernel/stores/canvas/animation-overlay.store';
import { useTimelineStore } from '../../../kernel/stores/timeline/timeline.store';

// =============================================================================
// Types
// =============================================================================

export interface FrameRendererConfig {
  width: number;
  height: number;
  fps: number;
  startFrame: number;
  endFrame: number;
  backgroundColor: string;
}

export interface RenderedFrame {
  frameNumber: number;
  timestamp: number;
  imageData: ImageData;
}

export interface EntitySnapshot {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  overlay: AnimationOverlay | undefined;
}

// =============================================================================
// Frame Renderer
// =============================================================================

export interface IFrameRenderer {
  /** Initialize the renderer with entity data */
  init(entities: EntitySnapshot[]): void;
  /** Render a single frame and return its image data */
  renderFrame(frameNumber: number): RenderedFrame;
  /** Get total frame count */
  getTotalFrames(): number;
  /** Dispose renderer resources */
  dispose(): void;
}

export function createFrameRenderer(config: FrameRendererConfig): IFrameRenderer {
  const canvas = new OffscreenCanvas(config.width, config.height);
  const ctx = canvas.getContext('2d')!;
  let entities: EntitySnapshot[] = [];

  return {
    init(entityData: EntitySnapshot[]): void {
      entities = [...entityData].sort((a, b) => a.zIndex - b.zIndex);
    },

    renderFrame(frameNumber: number): RenderedFrame {
      const time = frameNumber / config.fps;

      // Step the timeline to this frame (updates overlay store)
      useTimelineStore.getState().setPlayheadTime(time);

      // Clear canvas
      ctx.clearRect(0, 0, config.width, config.height);
      ctx.fillStyle = config.backgroundColor;
      ctx.fillRect(0, 0, config.width, config.height);

      const overlayStore = useAnimationOverlayStore.getState();

      // Render each entity in z-order
      for (const entity of entities) {
        const overlay = overlayStore.getOverlay(entity.id);

        // Apply overlay values
        const effectiveOpacity = overlay?.opacity ?? entity.opacity;
        const posX = entity.x + (overlay?.positionX ?? 0);
        const posY = entity.y + (overlay?.positionY ?? 0);
        const scaleX = overlay?.scaleX ?? 1;
        const scaleY = overlay?.scaleY ?? 1;
        const rotation = entity.rotation + (overlay?.rotation ?? 0);
        const w = overlay?.width ?? entity.width;
        const h = overlay?.height ?? entity.height;

        if (effectiveOpacity <= 0) continue;

        ctx.save();
        ctx.globalAlpha = effectiveOpacity;

        // Transform: translate to center, rotate, scale
        const cx = posX;
        const cy = posY;
        ctx.translate(cx, cy);
        if (rotation !== 0) {
          ctx.rotate((rotation * Math.PI) / 180);
        }
        ctx.scale(scaleX, scaleY);

        // Draw entity placeholder (colored rectangle)
        // In full implementation, this would draw actual entity content
        // (images via drawImage, text via fillText, shapes via path, etc.)
        const fillColor = overlay?.fill ?? getEntityPlaceholderColor(entity.type);
        ctx.fillStyle = fillColor;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        // Draw entity type label for debugging
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(entity.type, 0, 0);

        ctx.restore();
      }

      const imageData = ctx.getImageData(0, 0, config.width, config.height);

      return {
        frameNumber,
        timestamp: time * 1_000_000, // microseconds
        imageData,
      };
    },

    getTotalFrames(): number {
      return config.endFrame - config.startFrame;
    },

    dispose(): void {
      entities = [];
    },
  };
}

function getEntityPlaceholderColor(type: string): string {
  const colors: Record<string, string> = {
    video: '#4f46e5',
    audio: '#059669',
    sticker: '#d97706',
    text: '#dc2626',
    shape: '#7c3aed',
    widget: '#0284c7',
    default: '#374151',
  };
  return colors[type] ?? colors.default;
}
