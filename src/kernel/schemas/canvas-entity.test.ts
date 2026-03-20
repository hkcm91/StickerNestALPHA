/**
 * Canvas Entity schema tests
 * @module @sn/types/canvas-entity.test
 */

import { describe, it, expect } from 'vitest';

import {
  CanvasEntityTypeSchema,
  Transform2DSchema,
  Transform3DSchema,
  CanvasEntityBaseSchema,
  StickerEntitySchema,
  TextEntitySchema,
  WidgetContainerEntitySchema,
  WidgetIntrinsicSizeSchema,
  WidgetScalingModeSchema,
  WidgetCropConfigSchema,
  ShapeEntitySchema,
  DrawingEntitySchema,
  GroupEntitySchema,
  DockerEntitySchema,
  CanvasEntitySchema,
  CanvasEntityBaseJSONSchema,
  CanvasEntityJSONSchema,
  WidgetIntrinsicSizeJSONSchema,
  WidgetScalingModeJSONSchema,
  WidgetCropConfigJSONSchema,
  type CanvasEntityType,
  type Transform2D,
  type WidgetIntrinsicSize,
} from './canvas-entity';

describe('Canvas Entity Schemas', () => {
  const baseEntityData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    canvasId: '550e8400-e29b-41d4-a716-446655440001',
    transform: {
      position: { x: 100, y: 200 },
      size: { width: 300, height: 150 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 1,
    visible: true,
    locked: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: '550e8400-e29b-41d4-a716-446655440002',
  };

  describe('CanvasEntityTypeSchema', () => {
    it('should accept valid entity types', () => {
      const types: CanvasEntityType[] = [
        'sticker',
        'text',
        'widget',
        'shape',
        'drawing',
        'group',
        'docker',
      ];

      types.forEach((type) => {
        const result = CanvasEntityTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid entity type', () => {
      const result = CanvasEntityTypeSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('Transform2DSchema', () => {
    it('should parse valid transform', () => {
      const input: Transform2D = {
        position: { x: 100, y: 200 },
        size: { width: 300, height: 150 },
        rotation: 45,
        scale: 1.5,
      };
      const result = Transform2DSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position).toEqual({ x: 100, y: 200 });
        expect(result.data.rotation).toBe(45);
        expect(result.data.scale).toBe(1.5);
      }
    });

    it('should apply defaults for rotation and scale', () => {
      const input = {
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      };
      const result = Transform2DSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rotation).toBe(0);
        expect(result.data.scale).toBe(1);
      }
    });

    it('should reject negative scale', () => {
      const input = {
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        scale: -1,
      };
      const result = Transform2DSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('Transform3DSchema', () => {
    it('should parse valid 3D transform', () => {
      const input = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      };
      const result = Transform3DSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('CanvasEntityBaseSchema', () => {
    it('should parse valid base entity', () => {
      const input = {
        ...baseEntityData,
        type: 'sticker',
      };
      const result = CanvasEntityBaseSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(baseEntityData.id);
        expect(result.data.visible).toBe(true);
        expect(result.data.locked).toBe(false);
      }
    });

    it('should accept optional spatialTransform', () => {
      const input = {
        ...baseEntityData,
        type: 'sticker',
        spatialTransform: {
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 },
        },
      };
      const result = CanvasEntityBaseSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.spatialTransform).toBeDefined();
      }
    });

    it('should accept optional parentId', () => {
      const input = {
        ...baseEntityData,
        type: 'sticker',
        parentId: '550e8400-e29b-41d4-a716-446655440099',
      };
      const result = CanvasEntityBaseSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parentId).toBe('550e8400-e29b-41d4-a716-446655440099');
      }
    });

    it('should allow parentId to be undefined', () => {
      const input = {
        ...baseEntityData,
        type: 'sticker',
      };
      const result = CanvasEntityBaseSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parentId).toBeUndefined();
      }
    });

    it('should reject invalid parentId (not a UUID)', () => {
      const input = {
        ...baseEntityData,
        type: 'sticker',
        parentId: 'not-a-uuid',
      };
      const result = CanvasEntityBaseSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should accept optional platformTransforms', () => {
      const input = {
        ...baseEntityData,
        type: 'sticker',
        platformTransforms: {
          mobile: {
            position: { x: 10, y: 20 },
            size: { width: 200, height: 100 },
            rotation: 0,
            scale: 1,
          },
        },
      };
      const result = CanvasEntityBaseSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.platformTransforms?.mobile).toBeDefined();
        expect(result.data.platformTransforms?.mobile?.position).toEqual({ x: 10, y: 20 });
      }
    });

    it('should default syncTransform2d3d to true', () => {
      const input = {
        ...baseEntityData,
        type: 'sticker',
      };
      const result = CanvasEntityBaseSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.syncTransform2d3d).toBe(true);
      }
    });

    it('should accept syncTransform2d3d as false', () => {
      const input = {
        ...baseEntityData,
        type: 'sticker',
        syncTransform2d3d: false,
      };
      const result = CanvasEntityBaseSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.syncTransform2d3d).toBe(false);
      }
    });

    it('should reject invalid UUID', () => {
      const input = {
        ...baseEntityData,
        id: 'not-a-uuid',
        type: 'sticker',
      };
      const result = CanvasEntityBaseSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('StickerEntitySchema', () => {
    it('should parse valid sticker entity', () => {
      const input = {
        ...baseEntityData,
        type: 'sticker',
        assetUrl: 'https://example.com/sticker.png',
        assetType: 'image',
        altText: 'A cute sticker',
        aspectLocked: true,
      };
      const result = StickerEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('sticker');
        expect(result.data.assetType).toBe('image');
      }
    });

    it('should accept video asset type', () => {
      const input = {
        ...baseEntityData,
        type: 'sticker',
        assetUrl: 'https://example.com/sticker.mp4',
        assetType: 'video',
      };
      const result = StickerEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('TextEntitySchema', () => {
    it('should parse valid text entity', () => {
      const input = {
        ...baseEntityData,
        type: 'text',
        content: 'Hello, World!',
        fontFamily: 'Inter',
        fontSize: 24,
        fontWeight: 600,
        color: '#333333',
        textAlign: 'center',
      };
      const result = TextEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('text');
        expect(result.data.fontSize).toBe(24);
      }
    });

    it('should apply defaults', () => {
      const input = {
        ...baseEntityData,
        type: 'text',
        content: 'Test',
      };
      const result = TextEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fontFamily).toBe('system-ui');
        expect(result.data.fontSize).toBe(16);
        expect(result.data.textAlign).toBe('left');
      }
    });
  });

  describe('WidgetContainerEntitySchema', () => {
    it('should parse valid widget container', () => {
      const input = {
        ...baseEntityData,
        type: 'widget',
        widgetInstanceId: '550e8400-e29b-41d4-a716-446655440003',
        widgetId: 'com.example.clock',
        config: { timezone: 'UTC' },
      };
      const result = WidgetContainerEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('widget');
        expect(result.data.widgetId).toBe('com.example.clock');
      }
    });

    it('should accept optional intrinsicSize', () => {
      const input = {
        ...baseEntityData,
        type: 'widget',
        widgetInstanceId: '550e8400-e29b-41d4-a716-446655440003',
        widgetId: 'com.example.clock',
        intrinsicSize: { width: 400, height: 300 },
      };
      const result = WidgetContainerEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.intrinsicSize?.width).toBe(400);
        expect(result.data.intrinsicSize?.height).toBe(300);
      }
    });

    it('should accept optional scalingMode', () => {
      const input = {
        ...baseEntityData,
        type: 'widget',
        widgetInstanceId: '550e8400-e29b-41d4-a716-446655440003',
        widgetId: 'com.example.clock',
        scalingMode: 'fit',
      };
      const result = WidgetContainerEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scalingMode).toBe('fit');
      }
    });

    it('should accept optional crop configuration', () => {
      const input = {
        ...baseEntityData,
        type: 'widget',
        widgetInstanceId: '550e8400-e29b-41d4-a716-446655440003',
        widgetId: 'com.example.clock',
        crop: {
          enabled: true,
          rect: { min: { x: 10, y: 20 }, max: { x: 210, y: 170 } },
        },
      };
      const result = WidgetContainerEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.crop?.enabled).toBe(true);
        expect(result.data.crop?.rect?.max.x).toBe(210);
      }
    });

    it('should accept widget with all extension fields', () => {
      const input = {
        ...baseEntityData,
        type: 'widget',
        widgetInstanceId: '550e8400-e29b-41d4-a716-446655440003',
        widgetId: 'com.example.dashboard',
        config: { theme: 'dark' },
        intrinsicSize: { width: 800, height: 600 },
        scalingMode: 'proportional',
        crop: { enabled: false },
      };
      const result = WidgetContainerEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.intrinsicSize?.width).toBe(800);
        expect(result.data.scalingMode).toBe('proportional');
        expect(result.data.crop?.enabled).toBe(false);
      }
    });
  });

  describe('WidgetIntrinsicSizeSchema', () => {
    it('should parse valid intrinsic size', () => {
      const input: WidgetIntrinsicSize = { width: 1920, height: 1080 };
      const result = WidgetIntrinsicSizeSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.width).toBe(1920);
        expect(result.data.height).toBe(1080);
      }
    });

    it('should reject zero width', () => {
      const input = { width: 0, height: 100 };
      const result = WidgetIntrinsicSizeSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject negative dimensions', () => {
      const input = { width: -100, height: 100 };
      const result = WidgetIntrinsicSizeSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('WidgetScalingModeSchema', () => {
    it('should accept proportional mode', () => {
      const result = WidgetScalingModeSchema.safeParse('proportional');
      expect(result.success).toBe(true);
    });

    it('should accept orientation mode', () => {
      const result = WidgetScalingModeSchema.safeParse('orientation');
      expect(result.success).toBe(true);
    });

    it('should accept fit mode', () => {
      const result = WidgetScalingModeSchema.safeParse('fit');
      expect(result.success).toBe(true);
    });

    it('should reject invalid mode', () => {
      const result = WidgetScalingModeSchema.safeParse('stretch');
      expect(result.success).toBe(false);
    });
  });

  describe('WidgetCropConfigSchema', () => {
    it('should parse disabled crop', () => {
      const input = { enabled: false };
      const result = WidgetCropConfigSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(false);
        expect(result.data.rect).toBeUndefined();
      }
    });

    it('should parse enabled crop with rect', () => {
      const input = {
        enabled: true,
        rect: { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } },
      };
      const result = WidgetCropConfigSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.rect?.min.x).toBe(0);
      }
    });

    it('should default enabled to false', () => {
      const input = {};
      const result = WidgetCropConfigSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(false);
      }
    });
  });

  describe('ShapeEntitySchema', () => {
    it('should parse valid rectangle shape', () => {
      const input = {
        ...baseEntityData,
        type: 'shape',
        shapeType: 'rectangle',
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2,
        cornerRadius: 8,
      };
      const result = ShapeEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.shapeType).toBe('rectangle');
        expect(result.data.cornerRadius).toBe(8);
      }
    });

    it('should parse polygon with points', () => {
      const input = {
        ...baseEntityData,
        type: 'shape',
        shapeType: 'polygon',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 100 },
        ],
      };
      const result = ShapeEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.points?.length).toBe(3);
      }
    });
  });

  describe('DrawingEntitySchema', () => {
    it('should parse valid drawing entity', () => {
      const input = {
        ...baseEntityData,
        type: 'drawing',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
          { x: 20, y: 15 },
        ],
        stroke: '#0000ff',
        strokeWidth: 3,
        smoothing: 0.7,
      };
      const result = DrawingEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('drawing');
        expect(result.data.smoothing).toBe(0.7);
      }
    });
  });

  describe('GroupEntitySchema', () => {
    it('should parse valid group entity', () => {
      const input = {
        ...baseEntityData,
        type: 'group',
        children: [
          '550e8400-e29b-41d4-a716-446655440004',
          '550e8400-e29b-41d4-a716-446655440005',
        ],
      };
      const result = GroupEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.children.length).toBe(2);
      }
    });
  });

  describe('DockerEntitySchema', () => {
    it('should parse valid docker entity', () => {
      const input = {
        ...baseEntityData,
        type: 'docker',
        children: ['550e8400-e29b-41d4-a716-446655440006'],
        layout: 'stack',
      };
      const result = DockerEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.layout).toBe('stack');
      }
    });

    it('should default to free layout', () => {
      const input = {
        ...baseEntityData,
        type: 'docker',
        children: [],
      };
      const result = DockerEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.layout).toBe('free');
      }
    });
  });

  describe('CanvasEntitySchema (discriminated union)', () => {
    it('should parse sticker entity via discriminated union', () => {
      const input = {
        ...baseEntityData,
        type: 'sticker',
        assetUrl: 'https://example.com/sticker.png',
        assetType: 'image',
      };
      const result = CanvasEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('sticker');
      }
    });

    it('should parse text entity via discriminated union', () => {
      const input = {
        ...baseEntityData,
        type: 'text',
        content: 'Hello',
      };
      const result = CanvasEntitySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject unknown entity type', () => {
      const input = {
        ...baseEntityData,
        type: 'unknown',
      };
      const result = CanvasEntitySchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('JSON Schema exports', () => {
    it('should export CanvasEntityBase JSON schema', () => {
      expect(CanvasEntityBaseJSONSchema).toBeDefined();
      expect(typeof CanvasEntityBaseJSONSchema).toBe('object');
    });

    it('should export CanvasEntity JSON schema', () => {
      expect(CanvasEntityJSONSchema).toBeDefined();
      expect(typeof CanvasEntityJSONSchema).toBe('object');
    });

    it('should export WidgetIntrinsicSize JSON schema', () => {
      expect(WidgetIntrinsicSizeJSONSchema).toBeDefined();
      expect(typeof WidgetIntrinsicSizeJSONSchema).toBe('object');
    });

    it('should export WidgetScalingMode JSON schema', () => {
      expect(WidgetScalingModeJSONSchema).toBeDefined();
      expect(typeof WidgetScalingModeJSONSchema).toBe('object');
    });

    it('should export WidgetCropConfig JSON schema', () => {
      expect(WidgetCropConfigJSONSchema).toBeDefined();
      expect(typeof WidgetCropConfigJSONSchema).toBe('object');
    });
  });
});
