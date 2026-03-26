/**
 * Canvas Document schema tests
 * @module @sn/types/canvas-document.test
 */

import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect } from 'vitest';

import {
  BackgroundSpecSchema,
  SolidBackgroundSchema,
  GradientBackgroundSchema,
  ImageBackgroundSchema,
  ViewportConfigSchema,
  LayoutModeSchema,
  CanvasDocumentMetaSchema,
  CanvasDocumentSchema,
  CreateCanvasDocumentInputSchema,
  UpdateCanvasDocumentInputSchema,
  DEFAULT_BACKGROUND,
  CANVAS_DOCUMENT_VERSION,
  type BackgroundSpec,
  type CanvasDocument,
} from './canvas-document';

describe('BackgroundSpec schemas', () => {
  describe('SolidBackgroundSchema', () => {
    it('should validate a minimal solid background', () => {
      const bg = { type: 'solid' as const };
      const result = SolidBackgroundSchema.parse(bg);
      expect(result.type).toBe('solid');
      expect(result.color).toBe('#ffffff');
      expect(result.opacity).toBe(1);
    });

    it('should validate a complete solid background', () => {
      const bg = {
        type: 'solid' as const,
        color: '#ff0000',
        opacity: 0.5,
      };
      const result = SolidBackgroundSchema.parse(bg);
      expect(result).toEqual(bg);
    });

    it('should reject invalid opacity', () => {
      const bg = { type: 'solid' as const, opacity: 2 };
      expect(() => SolidBackgroundSchema.parse(bg)).toThrow();
    });
  });

  describe('GradientBackgroundSchema', () => {
    it('should validate a gradient background', () => {
      const bg = {
        type: 'gradient' as const,
        stops: [
          { offset: 0, color: '#ff0000' },
          { offset: 1, color: '#0000ff' },
        ],
        angle: 45,
        opacity: 0.8,
      };
      const result = GradientBackgroundSchema.parse(bg);
      expect(result).toEqual({ ...bg, gradientType: 'linear' });
    });

    it('should reject gradients with less than 2 stops', () => {
      const bg = {
        type: 'gradient' as const,
        stops: [{ offset: 0, color: '#ff0000' }],
      };
      expect(() => GradientBackgroundSchema.parse(bg)).toThrow();
    });

    it('should reject invalid offset values', () => {
      const bg = {
        type: 'gradient' as const,
        stops: [
          { offset: -0.5, color: '#ff0000' },
          { offset: 1, color: '#0000ff' },
        ],
      };
      expect(() => GradientBackgroundSchema.parse(bg)).toThrow();
    });
  });

  describe('ImageBackgroundSchema', () => {
    it('should validate an image background', () => {
      const bg = {
        type: 'image' as const,
        url: 'https://example.com/bg.jpg',
        mode: 'cover' as const,
        opacity: 1,
      };
      const result = ImageBackgroundSchema.parse(bg);
      expect(result).toEqual(bg);
    });

    it('should apply default mode', () => {
      const bg = {
        type: 'image' as const,
        url: 'https://example.com/bg.jpg',
      };
      const result = ImageBackgroundSchema.parse(bg);
      expect(result.mode).toBe('cover');
    });

    it('should reject invalid URLs', () => {
      const bg = {
        type: 'image' as const,
        url: 'not-a-url',
      };
      expect(() => ImageBackgroundSchema.parse(bg)).toThrow();
    });
  });

  describe('BackgroundSpecSchema (discriminated union)', () => {
    it('should parse solid backgrounds', () => {
      const bg: BackgroundSpec = { type: 'solid', color: '#000', opacity: 1 };
      const result = BackgroundSpecSchema.parse(bg);
      expect(result.type).toBe('solid');
    });

    it('should parse gradient backgrounds', () => {
      const bg: BackgroundSpec = {
        type: 'gradient',
        gradientType: 'linear',
        stops: [
          { offset: 0, color: '#fff' },
          { offset: 1, color: '#000' },
        ],
        angle: 90,
        opacity: 1,
      };
      const result = BackgroundSpecSchema.parse(bg);
      expect(result.type).toBe('gradient');
    });

    it('should parse image backgrounds', () => {
      const bg: BackgroundSpec = {
        type: 'image',
        url: 'https://example.com/bg.png',
        mode: 'tile',
        opacity: 0.5,
      };
      const result = BackgroundSpecSchema.parse(bg);
      expect(result.type).toBe('image');
    });

    it('should reject unknown types', () => {
      const bg = { type: 'unknown' };
      expect(() => BackgroundSpecSchema.parse(bg)).toThrow();
    });
  });
});

describe('ViewportConfigSchema', () => {
  it('should validate with defaults', () => {
    const config = {};
    const result = ViewportConfigSchema.parse(config);
    expect(result.background).toEqual(DEFAULT_BACKGROUND);
    expect(result.width).toBeUndefined();
    expect(result.height).toBeUndefined();
  });

  it('should validate fixed dimensions', () => {
    const config = {
      width: 1920,
      height: 1080,
      background: { type: 'solid' as const, color: '#000', opacity: 1 },
    };
    const result = ViewportConfigSchema.parse(config);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
  });

  it('should reject negative dimensions', () => {
    const config = { width: -100 };
    expect(() => ViewportConfigSchema.parse(config)).toThrow();
  });
});

describe('LayoutModeSchema', () => {
  it('should accept freeform', () => {
    expect(LayoutModeSchema.parse('freeform')).toBe('freeform');
  });

  it('should accept bento', () => {
    expect(LayoutModeSchema.parse('bento')).toBe('bento');
  });

  it('should accept desktop', () => {
    expect(LayoutModeSchema.parse('desktop')).toBe('desktop');
  });

  it('should reject invalid modes', () => {
    expect(() => LayoutModeSchema.parse('invalid')).toThrow();
  });
});

describe('CanvasDocumentMetaSchema', () => {
  it('should validate complete metadata', () => {
    const now = new Date().toISOString();
    const meta = {
      id: uuidv4(),
      name: 'My Canvas',
      createdAt: now,
      updatedAt: now,
      description: 'A test canvas',
      thumbnailUrl: 'https://example.com/thumb.png',
    };
    const result = CanvasDocumentMetaSchema.parse(meta);
    expect(result).toEqual(meta);
  });

  it('should validate minimal metadata', () => {
    const now = new Date().toISOString();
    const meta = {
      id: uuidv4(),
      name: 'My Canvas',
      createdAt: now,
      updatedAt: now,
    };
    const result = CanvasDocumentMetaSchema.parse(meta);
    expect(result.description).toBeUndefined();
    expect(result.thumbnailUrl).toBeUndefined();
  });

  it('should reject empty name', () => {
    const meta = {
      id: uuidv4(),
      name: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => CanvasDocumentMetaSchema.parse(meta)).toThrow();
  });
});

describe('CanvasDocumentSchema', () => {
  const createValidMeta = () => {
    const now = new Date().toISOString();
    return {
      id: uuidv4(),
      name: 'Test Canvas',
      createdAt: now,
      updatedAt: now,
    };
  };

  it('should validate a minimal document', () => {
    const doc = {
      meta: createValidMeta(),
    };
    const result = CanvasDocumentSchema.parse(doc);
    expect(result.version).toBe(CANVAS_DOCUMENT_VERSION);
    expect(result.entities).toEqual([]);
    expect(result.layoutMode).toBe('freeform');
    expect(result.viewport.background).toEqual(DEFAULT_BACKGROUND);
  });

  it('should validate a complete document', () => {
    const doc: CanvasDocument = {
      version: 1,
      meta: createValidMeta(),
      viewport: {
        width: 1920,
        height: 1080,
        background: { type: 'solid', color: '#f0f0f0', opacity: 1 },
        isPreviewMode: false,
        sizeMode: 'infinite',
      },
      entities: [],
      layoutMode: 'bento',
      platform: 'web',
      spatialMode: '2d',
    };
    const result = CanvasDocumentSchema.parse(doc);
    expect(result).toEqual(doc);
  });

  it('should preserve entities', () => {
    const now = new Date().toISOString();
    const entityId = uuidv4();
    const canvasId = uuidv4();
    const userId = uuidv4();

    const doc = {
      meta: createValidMeta(),
      entities: [
        {
          id: entityId,
          type: 'text' as const,
          canvasId,
          transform: {
            position: { x: 100, y: 100 },
            size: { width: 200, height: 50 },
            rotation: 0,
            scale: 1,
          },
          zIndex: 1,
          visible: true,
          locked: false,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          content: 'Hello World',
          fontFamily: 'system-ui',
          fontSize: 16,
          fontWeight: 400,
          color: '#000000',
          textAlign: 'left' as const,
        },
      ],
    };
    const result = CanvasDocumentSchema.parse(doc);
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].id).toBe(entityId);
  });
});

describe('CreateCanvasDocumentInputSchema', () => {
  it('should validate minimal input', () => {
    const input = { name: 'New Canvas' };
    const result = CreateCanvasDocumentInputSchema.parse(input);
    expect(result.name).toBe('New Canvas');
  });

  it('should validate complete input', () => {
    const input = {
      name: 'New Canvas',
      description: 'A new canvas',
      viewport: {
        width: 800,
        height: 600,
        background: { type: 'solid' as const, color: '#fff', opacity: 1 },
        sizeMode: 'infinite' as const,
      },
      layoutMode: 'desktop' as const,
    };
    const result = CreateCanvasDocumentInputSchema.parse(input);
    expect(result).toEqual(input);
  });
});

describe('UpdateCanvasDocumentInputSchema', () => {
  it('should validate empty update (all optional)', () => {
    const input = {};
    const result = UpdateCanvasDocumentInputSchema.parse(input);
    expect(result).toEqual({});
  });

  it('should validate partial update', () => {
    const input = { name: 'Renamed Canvas' };
    const result = UpdateCanvasDocumentInputSchema.parse(input);
    expect(result.name).toBe('Renamed Canvas');
  });

  it('should validate partial viewport update', () => {
    const input = {
      viewport: { width: 1024 },
    };
    const result = UpdateCanvasDocumentInputSchema.parse(input);
    expect(result.viewport?.width).toBe(1024);
  });
});

describe('DEFAULT_BACKGROUND', () => {
  it('should be a valid solid white background', () => {
    expect(DEFAULT_BACKGROUND.type).toBe('solid');
    if (DEFAULT_BACKGROUND.type === 'solid') {
      expect(DEFAULT_BACKGROUND.color).toBe('#ffffff');
      expect(DEFAULT_BACKGROUND.opacity).toBe(1);
    }
  });
});

describe('CANVAS_DOCUMENT_VERSION', () => {
  it('should be version 1', () => {
    expect(CANVAS_DOCUMENT_VERSION).toBe(1);
  });
});
