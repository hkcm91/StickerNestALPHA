/**
 * Background Renderer
 *
 * Renders canvas backgrounds (solid, gradient, image) to a canvas context.
 * Supports caching for performance.
 *
 * @module canvas/core/background
 * @layer L4A-1
 */

import type {
  BackgroundSpec,
  SolidBackground,
  GradientBackground,
  ImageBackground,
} from '@sn/types';
import { DEFAULT_BACKGROUND } from '@sn/types';

import type { ViewportState } from '../viewport';

/**
 * Background renderer interface
 */
export interface BackgroundRenderer {
  /** Set the background specification */
  setBackground(spec: BackgroundSpec): void;

  /** Get the current background specification */
  getBackground(): BackgroundSpec;

  /** Set the viewport state for rendering */
  setViewport(viewport: ViewportState): void;

  /** Render the background to the canvas context */
  render(ctx: CanvasRenderingContext2D): void;

  /** Invalidate cached resources (call when background changes) */
  invalidate(): void;

  /** Check if the renderer needs to re-render */
  isDirty(): boolean;

  /** Dispose of resources */
  dispose(): void;
}

/**
 * Background renderer state
 */
interface BackgroundRendererState {
  background: BackgroundSpec;
  viewport: ViewportState | null;
  dirty: boolean;
  cachedPattern: CanvasPattern | null;
  cachedImage: HTMLImageElement | null;
  imageLoading: boolean;
  imageError: string | null;
}

/**
 * Create a background renderer
 *
 * @param initialBackground - Initial background specification
 * @returns BackgroundRenderer instance
 */
export function createBackgroundRenderer(
  initialBackground: BackgroundSpec = DEFAULT_BACKGROUND
): BackgroundRenderer {
  const state: BackgroundRendererState = {
    background: initialBackground,
    viewport: null,
    dirty: true,
    cachedPattern: null,
    cachedImage: null,
    imageLoading: false,
    imageError: null,
  };

  /**
   * Load an image for image backgrounds
   */
  function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load background image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Render solid background
   */
  function renderSolid(
    ctx: CanvasRenderingContext2D,
    spec: SolidBackground,
    viewport: ViewportState
  ): void {
    ctx.save();
    ctx.globalAlpha = spec.opacity;
    ctx.fillStyle = spec.color;
    ctx.fillRect(0, 0, viewport.viewportWidth, viewport.viewportHeight);
    ctx.restore();
  }

  /**
   * Render gradient background (linear or radial)
   */
  function renderGradient(
    ctx: CanvasRenderingContext2D,
    spec: GradientBackground,
    viewport: ViewportState
  ): void {
    const { viewportWidth, viewportHeight } = viewport;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    let gradient: CanvasGradient;

    // Determine gradient type (default to linear for backwards compatibility)
    const gradientType = spec.gradientType ?? 'linear';

    if (gradientType === 'radial') {
      // Radial gradient from center
      const radius = Math.sqrt(viewportWidth ** 2 + viewportHeight ** 2) / 2;
      gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    } else {
      // Linear gradient based on angle
      const angleRad = (spec.angle * Math.PI) / 180;
      const length = Math.sqrt(viewportWidth ** 2 + viewportHeight ** 2) / 2;

      const x0 = centerX - Math.cos(angleRad) * length;
      const y0 = centerY - Math.sin(angleRad) * length;
      const x1 = centerX + Math.cos(angleRad) * length;
      const y1 = centerY + Math.sin(angleRad) * length;

      gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    }

    for (const stop of spec.stops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    ctx.save();
    ctx.globalAlpha = spec.opacity;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);
    ctx.restore();
  }

  /**
   * Render image background
   */
  function renderImage(
    ctx: CanvasRenderingContext2D,
    spec: ImageBackground,
    viewport: ViewportState
  ): void {
    if (!state.cachedImage) {
      // Image not loaded yet - render placeholder
      renderSolid(ctx, { type: 'solid', color: '#f0f0f0', opacity: 1 }, viewport);
      return;
    }

    const img = state.cachedImage;
    const { viewportWidth, viewportHeight } = viewport;

    ctx.save();
    ctx.globalAlpha = spec.opacity;

    switch (spec.mode) {
      case 'cover': {
        const imgAspect = img.width / img.height;
        const vpAspect = viewportWidth / viewportHeight;

        let drawWidth: number;
        let drawHeight: number;
        let drawX: number;
        let drawY: number;

        if (imgAspect > vpAspect) {
          // Image is wider - fit by height
          drawHeight = viewportHeight;
          drawWidth = drawHeight * imgAspect;
          drawX = (viewportWidth - drawWidth) / 2;
          drawY = 0;
        } else {
          // Image is taller - fit by width
          drawWidth = viewportWidth;
          drawHeight = drawWidth / imgAspect;
          drawX = 0;
          drawY = (viewportHeight - drawHeight) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        break;
      }

      case 'contain': {
        const imgAspect = img.width / img.height;
        const vpAspect = viewportWidth / viewportHeight;

        let drawWidth: number;
        let drawHeight: number;
        let drawX: number;
        let drawY: number;

        if (imgAspect > vpAspect) {
          // Image is wider - fit by width
          drawWidth = viewportWidth;
          drawHeight = drawWidth / imgAspect;
          drawX = 0;
          drawY = (viewportHeight - drawHeight) / 2;
        } else {
          // Image is taller - fit by height
          drawHeight = viewportHeight;
          drawWidth = drawHeight * imgAspect;
          drawX = (viewportWidth - drawWidth) / 2;
          drawY = 0;
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        break;
      }

      case 'tile': {
        // Create pattern if not cached
        if (!state.cachedPattern) {
          const patternCanvas = document.createElement('canvas');
          patternCanvas.width = img.width;
          patternCanvas.height = img.height;
          const patternCtx = patternCanvas.getContext('2d');
          if (patternCtx) {
            patternCtx.drawImage(img, 0, 0);
            state.cachedPattern = ctx.createPattern(patternCanvas, 'repeat');
          }
        }

        if (state.cachedPattern) {
          ctx.fillStyle = state.cachedPattern;
          ctx.fillRect(0, 0, viewportWidth, viewportHeight);
        }
        break;
      }
    }

    ctx.restore();
  }

  return {
    setBackground(spec: BackgroundSpec): void {
      const isNewImage =
        spec.type === 'image' &&
        (state.background.type !== 'image' ||
          (state.background as ImageBackground).url !== spec.url);

      state.background = spec;
      state.dirty = true;

      // Clear cached pattern when background changes
      state.cachedPattern = null;

      // Load new image if needed
      if (isNewImage && spec.type === 'image') {
        state.cachedImage = null;
        state.imageLoading = true;
        state.imageError = null;

        loadImage(spec.url)
          .then((img) => {
            state.cachedImage = img;
            state.imageLoading = false;
            state.dirty = true;
          })
          .catch((err) => {
            state.imageError = err.message;
            state.imageLoading = false;
            state.dirty = true;
          });
      }
    },

    getBackground(): BackgroundSpec {
      return state.background;
    },

    setViewport(viewport: ViewportState): void {
      // Mark dirty if viewport size changed
      if (
        !state.viewport ||
        state.viewport.viewportWidth !== viewport.viewportWidth ||
        state.viewport.viewportHeight !== viewport.viewportHeight
      ) {
        state.dirty = true;
      }
      state.viewport = viewport;
    },

    render(ctx: CanvasRenderingContext2D): void {
      if (!state.viewport) {
        return;
      }

      switch (state.background.type) {
        case 'solid':
          renderSolid(ctx, state.background, state.viewport);
          break;
        case 'gradient':
          renderGradient(ctx, state.background, state.viewport);
          break;
        case 'image':
          renderImage(ctx, state.background, state.viewport);
          break;
      }

      state.dirty = false;
    },

    invalidate(): void {
      state.dirty = true;
      state.cachedPattern = null;
    },

    isDirty(): boolean {
      return state.dirty;
    },

    dispose(): void {
      state.cachedPattern = null;
      state.cachedImage = null;
      state.viewport = null;
    },
  };
}

/**
 * Parse a color string to RGBA values
 */
export function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  // Handle hex colors
  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
        a: 1,
      };
    } else if (hex.length === 8) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
        a: parseInt(hex.substring(6, 8), 16) / 255,
      };
    }
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  return null;
}

/**
 * Convert RGBA to CSS color string
 */
export function rgbaToString(r: number, g: number, b: number, a: number = 1): string {
  if (a === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Create a CSS background string from a BackgroundSpec
 * Useful for DOM elements
 */
export function backgroundSpecToCSS(spec: BackgroundSpec): string {
  switch (spec.type) {
    case 'solid':
      return spec.color;

    case 'gradient': {
      const stops = spec.stops
        .map((s) => `${s.color} ${s.offset * 100}%`)
        .join(', ');
      const gradientType = spec.gradientType ?? 'linear';
      if (gradientType === 'radial') {
        return `radial-gradient(circle at center, ${stops})`;
      }
      return `linear-gradient(${spec.angle}deg, ${stops})`;
    }

    case 'image':
      return `url(${spec.url})`;
  }
}

/**
 * Get CSS background properties for a BackgroundSpec
 */
export function getBackgroundCSSProperties(spec: BackgroundSpec): {
  background: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  opacity?: number;
} {
  const base: {
    background: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
    opacity?: number;
  } = {
    background: backgroundSpecToCSS(spec),
  };

  if (spec.type === 'image') {
    switch (spec.mode) {
      case 'cover':
        base.backgroundSize = 'cover';
        base.backgroundPosition = 'center';
        break;
      case 'contain':
        base.backgroundSize = 'contain';
        base.backgroundPosition = 'center';
        base.backgroundRepeat = 'no-repeat';
        break;
      case 'tile':
        base.backgroundRepeat = 'repeat';
        break;
    }
  }

  if (spec.opacity !== 1) {
    base.opacity = spec.opacity;
  }

  return base;
}
