/**
 * Path entity schema tests
 * @module @sn/types/path.test
 */

import { describe, it, expect } from 'vitest';

import {
  PathEntitySchema,
  PathEntityJSONSchema,
  type PathEntity,
} from './canvas-entity';
import {
  AnchorPointTypeSchema,
  AnchorPointSchema,
  PathFillRuleSchema,
  AnchorPointJSONSchema,
  type AnchorPoint,
} from './path';

const BASE_ENTITY = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  canvasId: '550e8400-e29b-41d4-a716-446655440001',
  transform: {
    position: { x: 0, y: 0 },
    size: { width: 200, height: 150 },
    rotation: 0,
    scale: 1,
  },
  zIndex: 1,
  visible: true,
  canvasVisibility: 'both' as const,
  locked: false,
  flipH: false,
  flipV: false,
  opacity: 1,
  borderRadius: 0,
  syncTransform2d3d: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: '550e8400-e29b-41d4-a716-446655440002',
};

describe('Path Entity Schemas', () => {
  describe('AnchorPointTypeSchema', () => {
    it('should accept valid point types', () => {
      expect(AnchorPointTypeSchema.safeParse('corner').success).toBe(true);
      expect(AnchorPointTypeSchema.safeParse('smooth').success).toBe(true);
      expect(AnchorPointTypeSchema.safeParse('symmetric').success).toBe(true);
    });

    it('should reject invalid point types', () => {
      expect(AnchorPointTypeSchema.safeParse('cusp').success).toBe(false);
      expect(AnchorPointTypeSchema.safeParse('').success).toBe(false);
    });
  });

  describe('AnchorPointSchema', () => {
    it('should parse corner point with no handles', () => {
      const input = {
        position: { x: 10, y: 20 },
        pointType: 'corner',
      };
      const result = AnchorPointSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position).toEqual({ x: 10, y: 20 });
        expect(result.data.handleIn).toBeUndefined();
        expect(result.data.handleOut).toBeUndefined();
        expect(result.data.pointType).toBe('corner');
      }
    });

    it('should parse smooth point with both handles', () => {
      const input: AnchorPoint = {
        position: { x: 50, y: 50 },
        handleIn: { x: -20, y: 0 },
        handleOut: { x: 20, y: 0 },
        pointType: 'smooth',
      };
      const result = AnchorPointSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.handleIn).toEqual({ x: -20, y: 0 });
        expect(result.data.handleOut).toEqual({ x: 20, y: 0 });
        expect(result.data.pointType).toBe('smooth');
      }
    });

    it('should parse symmetric point', () => {
      const input = {
        position: { x: 100, y: 100 },
        handleIn: { x: -15, y: -15 },
        handleOut: { x: 15, y: 15 },
        pointType: 'symmetric',
      };
      const result = AnchorPointSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should default pointType to corner', () => {
      const input = { position: { x: 0, y: 0 } };
      const result = AnchorPointSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pointType).toBe('corner');
      }
    });

    it('should allow one handle without the other', () => {
      const input = {
        position: { x: 0, y: 0 },
        handleOut: { x: 30, y: 0 },
      };
      const result = AnchorPointSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.handleIn).toBeUndefined();
        expect(result.data.handleOut).toEqual({ x: 30, y: 0 });
      }
    });

    it('should reject missing position', () => {
      const input = { handleIn: { x: 0, y: 0 } };
      const result = AnchorPointSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('PathFillRuleSchema', () => {
    it('should accept nonzero and evenodd', () => {
      expect(PathFillRuleSchema.safeParse('nonzero').success).toBe(true);
      expect(PathFillRuleSchema.safeParse('evenodd').success).toBe(true);
    });

    it('should reject invalid rules', () => {
      expect(PathFillRuleSchema.safeParse('winding').success).toBe(false);
    });
  });

  describe('PathEntitySchema', () => {
    it('should parse a minimal open path', () => {
      const input = {
        ...BASE_ENTITY,
        type: 'path',
        anchors: [
          { position: { x: 0, y: 0 } },
          { position: { x: 100, y: 50 } },
        ],
      };
      const result = PathEntitySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('path');
        expect(result.data.anchors).toHaveLength(2);
        expect(result.data.closed).toBe(false);
        expect(result.data.fill).toBeNull();
        expect(result.data.stroke).toBe('#000000');
        expect(result.data.strokeWidth).toBe(2);
        expect(result.data.fillRule).toBe('nonzero');
        expect(result.data.strokeLinecap).toBe('round');
        expect(result.data.strokeLinejoin).toBe('round');
      }
    });

    it('should parse a closed path with fill', () => {
      const input = {
        ...BASE_ENTITY,
        type: 'path',
        anchors: [
          { position: { x: 0, y: 0 }, handleOut: { x: 30, y: 0 }, pointType: 'smooth' },
          { position: { x: 100, y: 0 }, handleIn: { x: -30, y: 0 }, handleOut: { x: 30, y: 30 }, pointType: 'smooth' },
          { position: { x: 50, y: 80 }, handleIn: { x: 20, y: -10 }, pointType: 'corner' },
        ],
        closed: true,
        fill: '#ff6b6b',
        fillRule: 'evenodd',
        stroke: '#333333',
        strokeWidth: 3,
      };
      const result = PathEntitySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.closed).toBe(true);
        expect(result.data.fill).toBe('#ff6b6b');
        expect(result.data.fillRule).toBe('evenodd');
        expect(result.data.anchors[0].pointType).toBe('smooth');
        expect(result.data.anchors[2].pointType).toBe('corner');
      }
    });

    it('should parse a path with dashed stroke', () => {
      const input = {
        ...BASE_ENTITY,
        type: 'path',
        anchors: [{ position: { x: 0, y: 0 } }, { position: { x: 100, y: 0 } }],
        strokeDasharray: '5 3',
        strokeLinecap: 'butt',
        strokeLinejoin: 'miter',
      };
      const result = PathEntitySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.strokeDasharray).toBe('5 3');
        expect(result.data.strokeLinecap).toBe('butt');
        expect(result.data.strokeLinejoin).toBe('miter');
      }
    });

    it('should reject path with no anchors', () => {
      const input = {
        ...BASE_ENTITY,
        type: 'path',
        anchors: [],
      };
      const result = PathEntitySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept path with single anchor', () => {
      const input = {
        ...BASE_ENTITY,
        type: 'path',
        anchors: [{ position: { x: 50, y: 50 } }],
      };
      const result = PathEntitySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject negative strokeWidth', () => {
      const input = {
        ...BASE_ENTITY,
        type: 'path',
        anchors: [{ position: { x: 0, y: 0 } }],
        strokeWidth: -1,
      };
      const result = PathEntitySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept zero strokeWidth (invisible stroke)', () => {
      const input = {
        ...BASE_ENTITY,
        type: 'path',
        anchors: [{ position: { x: 0, y: 0 } }],
        strokeWidth: 0,
      };
      const result = PathEntitySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('JSON Schema exports', () => {
    it('should export valid AnchorPoint JSON schema', () => {
      expect(AnchorPointJSONSchema).toBeDefined();
      expect(typeof AnchorPointJSONSchema).toBe('object');
    });

    it('should export valid PathEntity JSON schema', () => {
      expect(PathEntityJSONSchema).toBeDefined();
      expect(typeof PathEntityJSONSchema).toBe('object');
    });
  });

  describe('Type inference', () => {
    it('should allow typed PathEntity', () => {
      const entity: PathEntity = {
        ...BASE_ENTITY,
        type: 'path',
        anchors: [
          { position: { x: 0, y: 0 }, pointType: 'corner' },
          {
            position: { x: 100, y: 50 },
            handleIn: { x: -20, y: 0 },
            handleOut: { x: 20, y: 0 },
            pointType: 'smooth',
          },
        ],
        closed: false,
        fill: null,
        fillRule: 'nonzero',
        stroke: '#000000',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      };
      expect(entity.type).toBe('path');
      expect(entity.anchors).toHaveLength(2);
    });
  });
});
