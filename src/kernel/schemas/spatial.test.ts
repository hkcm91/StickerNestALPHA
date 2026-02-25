/**
 * Spatial schema tests
 * @module @sn/types/spatial.test
 */

import { describe, it, expect } from 'vitest';

import {
  Vector3Schema,
  QuaternionSchema,
  Point2DSchema,
  Size2DSchema,
  BoundingBox2DSchema,
  SpatialContextSchema,
  XRSessionModeSchema,
  DetectedPlaneSchema,
  DetectedMeshSchema,
  SpatialAnchorSchema,
  HandJointSchema,
  Vector3JSONSchema,
  QuaternionJSONSchema,
  Point2DJSONSchema,
  Size2DJSONSchema,
  BoundingBox2DJSONSchema,
  SpatialContextJSONSchema,
  DetectedPlaneJSONSchema,
  DetectedMeshJSONSchema,
  SpatialAnchorJSONSchema,
  HandJointJSONSchema,
  XRSessionModeJSONSchema,
  type SpatialContext,
} from './spatial';

describe('Spatial Schemas', () => {
  describe('Vector3Schema', () => {
    it('should parse valid 3D vector', () => {
      const input = { x: 1, y: 2, z: 3 };
      const result = Vector3Schema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ x: 1, y: 2, z: 3 });
      }
    });

    it('should accept zero values', () => {
      const input = { x: 0, y: 0, z: 0 };
      const result = Vector3Schema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept negative values', () => {
      const input = { x: -1, y: -2.5, z: -3.14159 };
      const result = Vector3Schema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject missing components', () => {
      const input = { x: 1, y: 2 };
      const result = Vector3Schema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject non-numeric values', () => {
      const input = { x: 'one', y: 2, z: 3 };
      const result = Vector3Schema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('QuaternionSchema', () => {
    it('should parse valid quaternion', () => {
      const input = { x: 0, y: 0, z: 0, w: 1 };
      const result = QuaternionSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ x: 0, y: 0, z: 0, w: 1 });
      }
    });

    it('should accept unit quaternion', () => {
      // 45 degree rotation around Y axis
      const input = { x: 0, y: 0.3826834, z: 0, w: 0.9238795 };
      const result = QuaternionSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject missing w component', () => {
      const input = { x: 0, y: 0, z: 0 };
      const result = QuaternionSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('Point2DSchema', () => {
    it('should parse valid 2D point', () => {
      const input = { x: 100, y: 200 };
      const result = Point2DSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ x: 100, y: 200 });
      }
    });

    it('should accept negative coordinates', () => {
      const input = { x: -50, y: -100 };
      const result = Point2DSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept floating point coordinates', () => {
      const input = { x: 100.5, y: 200.75 };
      const result = Point2DSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('Size2DSchema', () => {
    it('should parse valid size', () => {
      const input = { width: 100, height: 200 };
      const result = Size2DSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ width: 100, height: 200 });
      }
    });

    it('should accept zero dimensions', () => {
      const input = { width: 0, height: 0 };
      const result = Size2DSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject negative dimensions', () => {
      const input = { width: -100, height: 200 };
      const result = Size2DSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('BoundingBox2DSchema', () => {
    it('should parse valid bounding box', () => {
      const input = { min: { x: 10, y: 20 }, max: { x: 110, y: 70 } };
      const result = BoundingBox2DSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ min: { x: 10, y: 20 }, max: { x: 110, y: 70 } });
      }
    });

    it('should accept negative coordinates', () => {
      const input = { min: { x: -10, y: -20 }, max: { x: 90, y: 30 } };
      const result = BoundingBox2DSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject missing min or max', () => {
      const input = { min: { x: 10, y: 20 } };
      const result = BoundingBox2DSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('SpatialContextSchema', () => {
    it('should parse valid spatial context', () => {
      const input: SpatialContext = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        normal: { x: 0, y: 1, z: 0 },
      };
      const result = SpatialContextSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position).toEqual({ x: 1, y: 2, z: 3 });
        expect(result.data.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
        expect(result.data.normal).toEqual({ x: 0, y: 1, z: 0 });
      }
    });

    it('should reject missing fields', () => {
      const input = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        // missing normal
      };
      const result = SpatialContextSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('JSON Schema exports', () => {
    it('should export Vector3 JSON schema', () => {
      expect(Vector3JSONSchema).toBeDefined();
      expect(typeof Vector3JSONSchema).toBe('object');
    });

    it('should export Quaternion JSON schema', () => {
      expect(QuaternionJSONSchema).toBeDefined();
      expect(typeof QuaternionJSONSchema).toBe('object');
    });

    it('should export Point2D JSON schema', () => {
      expect(Point2DJSONSchema).toBeDefined();
      expect(typeof Point2DJSONSchema).toBe('object');
    });

    it('should export Size2D JSON schema', () => {
      expect(Size2DJSONSchema).toBeDefined();
      expect(typeof Size2DJSONSchema).toBe('object');
    });

    it('should export BoundingBox2D JSON schema', () => {
      expect(BoundingBox2DJSONSchema).toBeDefined();
      expect(typeof BoundingBox2DJSONSchema).toBe('object');
    });

    it('should export SpatialContext JSON schema', () => {
      expect(SpatialContextJSONSchema).toBeDefined();
      expect(typeof SpatialContextJSONSchema).toBe('object');
    });

    it('should export MR JSON schemas', () => {
      expect(DetectedPlaneJSONSchema).toBeDefined();
      expect(DetectedMeshJSONSchema).toBeDefined();
      expect(SpatialAnchorJSONSchema).toBeDefined();
      expect(HandJointJSONSchema).toBeDefined();
      expect(XRSessionModeJSONSchema).toBeDefined();
    });
  });

  describe('XRSessionModeSchema', () => {
    it('should accept immersive-vr', () => {
      expect(XRSessionModeSchema.safeParse('immersive-vr').success).toBe(true);
    });

    it('should accept immersive-ar', () => {
      expect(XRSessionModeSchema.safeParse('immersive-ar').success).toBe(true);
    });

    it('should accept inline', () => {
      expect(XRSessionModeSchema.safeParse('inline').success).toBe(true);
    });

    it('should reject unknown mode', () => {
      expect(XRSessionModeSchema.safeParse('immersive-mr').success).toBe(false);
    });
  });

  describe('DetectedPlaneSchema', () => {
    it('should parse valid plane with semantic label', () => {
      const result = DetectedPlaneSchema.safeParse({
        id: 'plane-1',
        semanticLabel: 'floor',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        polygon: [{ x: -1, y: 0, z: -1 }, { x: 1, y: 0, z: -1 }, { x: 1, y: 0, z: 1 }],
      });
      expect(result.success).toBe(true);
    });

    it('should accept plane without semantic label', () => {
      const result = DetectedPlaneSchema.safeParse({
        id: 'plane-2',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        polygon: [],
      });
      expect(result.success).toBe(true);
    });

    it('should reject plane without polygon', () => {
      const result = DetectedPlaneSchema.safeParse({
        id: 'plane-3',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DetectedMeshSchema', () => {
    it('should parse valid mesh with semantic label', () => {
      const result = DetectedMeshSchema.safeParse({
        id: 'mesh-1',
        semanticLabel: 'table',
        position: { x: 1, y: 0.5, z: -2 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      });
      expect(result.success).toBe(true);
    });

    it('should accept mesh without semantic label', () => {
      const result = DetectedMeshSchema.safeParse({
        id: 'mesh-2',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      });
      expect(result.success).toBe(true);
    });

    it('should reject mesh without id', () => {
      const result = DetectedMeshSchema.safeParse({
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SpatialAnchorSchema', () => {
    it('should parse valid persistent anchor', () => {
      const result = SpatialAnchorSchema.safeParse({
        id: 'anchor-1',
        position: { x: 1, y: 1, z: -1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        persistent: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.persistent).toBe(true);
      }
    });

    it('should parse valid non-persistent anchor', () => {
      const result = SpatialAnchorSchema.safeParse({
        id: 'anchor-2',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        persistent: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject anchor without persistent flag', () => {
      const result = SpatialAnchorSchema.safeParse({
        id: 'anchor-3',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('HandJointSchema', () => {
    it('should parse valid left hand joint', () => {
      const result = HandJointSchema.safeParse({
        hand: 'left',
        joint: 'index-finger-tip',
        position: { x: 0.1, y: 1.2, z: -0.3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        radius: 0.008,
      });
      expect(result.success).toBe(true);
    });

    it('should parse valid right hand joint', () => {
      const result = HandJointSchema.safeParse({
        hand: 'right',
        joint: 'wrist',
        position: { x: -0.1, y: 1.0, z: -0.4 },
        rotation: { x: 0, y: 0.3826834, z: 0, w: 0.9238795 },
        radius: 0.025,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid hand value', () => {
      const result = HandJointSchema.safeParse({
        hand: 'center',
        joint: 'wrist',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        radius: 0.01,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing radius', () => {
      const result = HandJointSchema.safeParse({
        hand: 'left',
        joint: 'thumb-tip',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      });
      expect(result.success).toBe(false);
    });
  });
});
