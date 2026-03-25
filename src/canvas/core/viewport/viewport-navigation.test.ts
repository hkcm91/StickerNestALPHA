import { describe, it, expect } from 'vitest';

import type { BoundingBox2D } from '@sn/types';

import { canvasToScreen } from './viewport';
import {
  computeZoomToFit,
  computeCenterOnEntity,
  computeCenterOnSelection,
  computeCenterOnPoint,
} from './viewport-navigation';

const W = 1920;
const H = 1080;

describe('viewport-navigation', () => {
  // -----------------------------------------------------------------------
  // computeZoomToFit
  // -----------------------------------------------------------------------

  describe('computeZoomToFit', () => {
    it('returns default viewport when no entities', () => {
      const vp = computeZoomToFit([], W, H);
      expect(vp.offset).toEqual({ x: 0, y: 0 });
      expect(vp.zoom).toBe(1);
    });

    it('frames a single entity with padding', () => {
      const entity: BoundingBox2D = {
        min: { x: 100, y: 100 },
        max: { x: 300, y: 300 },
      };
      const vp = computeZoomToFit([entity], W, H, 48);

      // The entity center (200, 200) should map to the screen center
      const entityCenter = { x: 200, y: 200 };
      const screenPos = canvasToScreen(entityCenter, vp);
      expect(screenPos.x).toBeCloseTo(W / 2, 0);
      expect(screenPos.y).toBeCloseTo(H / 2, 0);
    });

    it('frames multiple scattered entities', () => {
      const entities: BoundingBox2D[] = [
        { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } },
        { min: { x: 900, y: 900 }, max: { x: 1000, y: 1000 } },
      ];
      const vp = computeZoomToFit(entities, W, H, 48);

      // Combined bounds center = (500, 500)
      const center = { x: 500, y: 500 };
      const screenPos = canvasToScreen(center, vp);
      expect(screenPos.x).toBeCloseTo(W / 2, 0);
      expect(screenPos.y).toBeCloseTo(H / 2, 0);

      // All entities should be visible (within viewport)
      const topLeft = canvasToScreen(entities[0].min, vp);
      const bottomRight = canvasToScreen(entities[1].max, vp);
      expect(topLeft.x).toBeGreaterThanOrEqual(0);
      expect(topLeft.y).toBeGreaterThanOrEqual(0);
      expect(bottomRight.x).toBeLessThanOrEqual(W);
      expect(bottomRight.y).toBeLessThanOrEqual(H);
    });

    it('clamps zoom to maxZoom for tiny content', () => {
      const tiny: BoundingBox2D = {
        min: { x: 0, y: 0 },
        max: { x: 1, y: 1 },
      };
      const vp = computeZoomToFit([tiny], W, H);
      expect(vp.zoom).toBeLessThanOrEqual(10);
    });

    it('clamps zoom to minZoom for huge content', () => {
      const huge: BoundingBox2D = {
        min: { x: 0, y: 0 },
        max: { x: 100000, y: 100000 },
      };
      const vp = computeZoomToFit([huge], W, H);
      expect(vp.zoom).toBeGreaterThanOrEqual(0.1);
    });
  });

  // -----------------------------------------------------------------------
  // computeCenterOnEntity
  // -----------------------------------------------------------------------

  describe('computeCenterOnEntity', () => {
    it('centers viewport on entity', () => {
      const entity: BoundingBox2D = {
        min: { x: 400, y: 300 },
        max: { x: 600, y: 500 },
      };
      const vp = computeCenterOnEntity(entity, W, H, 1);

      // Entity center (500, 400) should map to screen center
      const screenPos = canvasToScreen({ x: 500, y: 400 }, vp);
      expect(screenPos.x).toBeCloseTo(W / 2, 0);
      expect(screenPos.y).toBeCloseTo(H / 2, 0);
    });

    it('respects custom zoom', () => {
      const entity: BoundingBox2D = {
        min: { x: 0, y: 0 },
        max: { x: 100, y: 100 },
      };
      const vp = computeCenterOnEntity(entity, W, H, 2);
      expect(vp.zoom).toBe(2);

      const screenPos = canvasToScreen({ x: 50, y: 50 }, vp);
      expect(screenPos.x).toBeCloseTo(W / 2, 0);
      expect(screenPos.y).toBeCloseTo(H / 2, 0);
    });
  });

  // -----------------------------------------------------------------------
  // computeCenterOnSelection
  // -----------------------------------------------------------------------

  describe('computeCenterOnSelection', () => {
    it('returns default viewport for empty selection', () => {
      const vp = computeCenterOnSelection([], W, H);
      expect(vp.offset).toEqual({ x: 0, y: 0 });
      expect(vp.zoom).toBe(1);
    });

    it('frames multiple selected entities', () => {
      const selection: BoundingBox2D[] = [
        { min: { x: 100, y: 100 }, max: { x: 200, y: 200 } },
        { min: { x: 300, y: 300 }, max: { x: 400, y: 400 } },
      ];
      const vp = computeCenterOnSelection(selection, W, H, 48);

      // Combined center = (250, 250)
      const screenPos = canvasToScreen({ x: 250, y: 250 }, vp);
      expect(screenPos.x).toBeCloseTo(W / 2, 0);
      expect(screenPos.y).toBeCloseTo(H / 2, 0);
    });
  });

  // -----------------------------------------------------------------------
  // computeCenterOnPoint
  // -----------------------------------------------------------------------

  describe('computeCenterOnPoint', () => {
    it('centers viewport on a point at zoom 1', () => {
      const vp = computeCenterOnPoint({ x: 500, y: 300 }, W, H, 1);

      const screenPos = canvasToScreen({ x: 500, y: 300 }, vp);
      expect(screenPos.x).toBeCloseTo(W / 2, 0);
      expect(screenPos.y).toBeCloseTo(H / 2, 0);
    });

    it('centers viewport on origin', () => {
      const vp = computeCenterOnPoint({ x: 0, y: 0 }, W, H, 1);

      const screenPos = canvasToScreen({ x: 0, y: 0 }, vp);
      expect(screenPos.x).toBeCloseTo(W / 2, 0);
      expect(screenPos.y).toBeCloseTo(H / 2, 0);
    });

    it('centers with custom zoom', () => {
      const vp = computeCenterOnPoint({ x: 100, y: 100 }, W, H, 3);
      expect(vp.zoom).toBe(3);

      const screenPos = canvasToScreen({ x: 100, y: 100 }, vp);
      expect(screenPos.x).toBeCloseTo(W / 2, 0);
      expect(screenPos.y).toBeCloseTo(H / 2, 0);
    });

    it('clamps zoom to valid range', () => {
      const vp = computeCenterOnPoint({ x: 0, y: 0 }, W, H, 100);
      expect(vp.zoom).toBe(10);

      const vp2 = computeCenterOnPoint({ x: 0, y: 0 }, W, H, 0.001);
      expect(vp2.zoom).toBe(0.1);
    });
  });
});
