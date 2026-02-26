/**
 * Background Renderer Tests
 * @module canvas/core/background
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { BackgroundSpec } from '@sn/types';
import { DEFAULT_BACKGROUND } from '@sn/types';

import type { ViewportState } from '../viewport';

import {
  createBackgroundRenderer,
  parseColor,
  rgbaToString,
  backgroundSpecToCSS,
  getBackgroundCSSProperties,
} from './index';

// Mock viewport
const createViewport = (): ViewportState => ({
  offset: { x: 0, y: 0 },
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 10,
  viewportWidth: 1920,
  viewportHeight: 1080,
});

// Mock canvas context
function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createPattern: vi.fn(() => ({} as CanvasPattern)),
    globalAlpha: 1,
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D;
}

describe('BackgroundRenderer', () => {
  describe('createBackgroundRenderer', () => {
    it('should create renderer with default background', () => {
      const renderer = createBackgroundRenderer();

      expect(renderer.getBackground()).toEqual(DEFAULT_BACKGROUND);
    });

    it('should create renderer with custom initial background', () => {
      const spec: BackgroundSpec = {
        type: 'solid',
        color: '#ff0000',
        opacity: 0.5,
      };
      const renderer = createBackgroundRenderer(spec);

      expect(renderer.getBackground()).toEqual(spec);
    });
  });

  describe('setBackground', () => {
    it('should update background specification', () => {
      const renderer = createBackgroundRenderer();
      const newSpec: BackgroundSpec = {
        type: 'gradient',
        gradientType: 'linear',
        stops: [
          { offset: 0, color: '#ff0000' },
          { offset: 1, color: '#0000ff' },
        ],
        angle: 45,
        opacity: 1,
      };

      renderer.setBackground(newSpec);

      expect(renderer.getBackground()).toEqual(newSpec);
    });

    it('should mark renderer as dirty', () => {
      const renderer = createBackgroundRenderer();
      const viewport = createViewport();
      const ctx = createMockContext();

      renderer.setViewport(viewport);
      renderer.render(ctx);
      expect(renderer.isDirty()).toBe(false);

      renderer.setBackground({ type: 'solid', color: '#000', opacity: 1 });
      expect(renderer.isDirty()).toBe(true);
    });
  });

  describe('setViewport', () => {
    it('should update viewport', () => {
      const renderer = createBackgroundRenderer();
      const viewport = createViewport();

      renderer.setViewport(viewport);
      expect(renderer.isDirty()).toBe(true);
    });

    it('should mark dirty when viewport size changes', () => {
      const renderer = createBackgroundRenderer();
      const viewport = createViewport();
      const ctx = createMockContext();

      renderer.setViewport(viewport);
      renderer.render(ctx);
      expect(renderer.isDirty()).toBe(false);

      const newViewport = { ...viewport, viewportWidth: 1280 };
      renderer.setViewport(newViewport);
      expect(renderer.isDirty()).toBe(true);
    });
  });

  describe('render', () => {
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
      ctx = createMockContext();
    });

    it('should render solid background', () => {
      const renderer = createBackgroundRenderer({
        type: 'solid',
        color: '#ff0000',
        opacity: 1,
      });
      const viewport = createViewport();

      renderer.setViewport(viewport);
      renderer.render(ctx);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('should render gradient background', () => {
      const renderer = createBackgroundRenderer({
        type: 'gradient',
        gradientType: 'linear',
        stops: [
          { offset: 0, color: '#ff0000' },
          { offset: 1, color: '#0000ff' },
        ],
        angle: 90,
        opacity: 1,
      });
      const viewport = createViewport();

      renderer.setViewport(viewport);
      renderer.render(ctx);

      expect(ctx.createLinearGradient).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
    });

    it('should render placeholder for unloaded image', () => {
      const renderer = createBackgroundRenderer({
        type: 'image',
        url: 'https://example.com/bg.jpg',
        mode: 'cover',
        opacity: 1,
      });
      const viewport = createViewport();

      renderer.setViewport(viewport);
      renderer.render(ctx);

      // Should render a placeholder solid color
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('should not render without viewport', () => {
      const renderer = createBackgroundRenderer();

      renderer.render(ctx);

      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('should mark as not dirty after render', () => {
      const renderer = createBackgroundRenderer();
      const viewport = createViewport();

      renderer.setViewport(viewport);
      expect(renderer.isDirty()).toBe(true);

      renderer.render(ctx);
      expect(renderer.isDirty()).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should mark renderer as dirty', () => {
      const renderer = createBackgroundRenderer();
      const viewport = createViewport();
      const ctx = createMockContext();

      renderer.setViewport(viewport);
      renderer.render(ctx);
      expect(renderer.isDirty()).toBe(false);

      renderer.invalidate();
      expect(renderer.isDirty()).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      const renderer = createBackgroundRenderer();
      const viewport = createViewport();

      renderer.setViewport(viewport);
      renderer.dispose();

      // Should be able to call render without errors
      const ctx = createMockContext();
      renderer.render(ctx);

      // Should not render since viewport is cleared
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });
  });
});

describe('parseColor', () => {
  it('should parse 3-digit hex colors', () => {
    const result = parseColor('#f00');

    expect(result).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('should parse 6-digit hex colors', () => {
    const result = parseColor('#ff0000');

    expect(result).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('should parse 8-digit hex colors', () => {
    const result = parseColor('#ff000080');

    expect(result).toEqual({ r: 255, g: 0, b: 0, a: expect.closeTo(0.5, 1) });
  });

  it('should parse rgb colors', () => {
    const result = parseColor('rgb(255, 128, 0)');

    expect(result).toEqual({ r: 255, g: 128, b: 0, a: 1 });
  });

  it('should parse rgba colors', () => {
    const result = parseColor('rgba(255, 128, 0, 0.5)');

    expect(result).toEqual({ r: 255, g: 128, b: 0, a: 0.5 });
  });

  it('should return null for invalid colors', () => {
    expect(parseColor('invalid')).toBeNull();
    expect(parseColor('')).toBeNull();
  });
});

describe('rgbaToString', () => {
  it('should format rgb for opaque colors', () => {
    const result = rgbaToString(255, 128, 0);

    expect(result).toBe('rgb(255, 128, 0)');
  });

  it('should format rgba for semi-transparent colors', () => {
    const result = rgbaToString(255, 128, 0, 0.5);

    expect(result).toBe('rgba(255, 128, 0, 0.5)');
  });
});

describe('backgroundSpecToCSS', () => {
  it('should convert solid to CSS', () => {
    const spec: BackgroundSpec = { type: 'solid', color: '#ff0000', opacity: 1 };

    expect(backgroundSpecToCSS(spec)).toBe('#ff0000');
  });

  it('should convert gradient to CSS', () => {
    const spec: BackgroundSpec = {
      type: 'gradient',
      gradientType: 'linear',
      stops: [
        { offset: 0, color: '#ff0000' },
        { offset: 1, color: '#0000ff' },
      ],
      angle: 90,
      opacity: 1,
    };

    expect(backgroundSpecToCSS(spec)).toBe('linear-gradient(90deg, #ff0000 0%, #0000ff 100%)');
  });

  it('should convert image to CSS', () => {
    const spec: BackgroundSpec = {
      type: 'image',
      url: 'https://example.com/bg.jpg',
      mode: 'cover',
      opacity: 1,
    };

    expect(backgroundSpecToCSS(spec)).toBe('url(https://example.com/bg.jpg)');
  });
});

describe('getBackgroundCSSProperties', () => {
  it('should return properties for solid', () => {
    const spec: BackgroundSpec = { type: 'solid', color: '#ff0000', opacity: 1 };
    const props = getBackgroundCSSProperties(spec);

    expect(props.background).toBe('#ff0000');
    expect(props.opacity).toBeUndefined();
  });

  it('should return properties for image cover', () => {
    const spec: BackgroundSpec = {
      type: 'image',
      url: 'https://example.com/bg.jpg',
      mode: 'cover',
      opacity: 1,
    };
    const props = getBackgroundCSSProperties(spec);

    expect(props.backgroundSize).toBe('cover');
    expect(props.backgroundPosition).toBe('center');
  });

  it('should return properties for image contain', () => {
    const spec: BackgroundSpec = {
      type: 'image',
      url: 'https://example.com/bg.jpg',
      mode: 'contain',
      opacity: 1,
    };
    const props = getBackgroundCSSProperties(spec);

    expect(props.backgroundSize).toBe('contain');
    expect(props.backgroundRepeat).toBe('no-repeat');
  });

  it('should return properties for image tile', () => {
    const spec: BackgroundSpec = {
      type: 'image',
      url: 'https://example.com/bg.jpg',
      mode: 'tile',
      opacity: 1,
    };
    const props = getBackgroundCSSProperties(spec);

    expect(props.backgroundRepeat).toBe('repeat');
  });

  it('should include opacity when not 1', () => {
    const spec: BackgroundSpec = { type: 'solid', color: '#ff0000', opacity: 0.5 };
    const props = getBackgroundCSSProperties(spec);

    expect(props.opacity).toBe(0.5);
  });
});
