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
  Vector3JSONSchema,
  QuaternionJSONSchema,
  Point2DJSONSchema,
  Size2DJSONSchema,
  BoundingBox2DJSONSchema,
  SpatialContextJSONSchema,
  type Vector3,
  type Quaternion,
  type Point2D,
  type Size2D,
  type BoundingBox2D,
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
      const input = { x: 10, y: 20, width: 100, height: 50 };
      const result = BoundingBox2DSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ x: 10, y: 20, width: 100, height: 50 });
      }
    });

    it('should accept negative position', () => {
      const input = { x: -10, y: -20, width: 100, height: 50 };
      const result = BoundingBox2DSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject negative dimensions', () => {
      const input = { x: 10, y: 20, width: -100, height: 50 };
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
  });
});
