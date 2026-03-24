/**
 * Entity stress tests — validates canvas entity operations at scale
 *
 * @module canvas/core/scene
 * @layer L4A-1
 */

import { describe, it, expect, beforeEach } from 'vitest';

import type { CanvasEntity, BoundingBox2D } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { initCanvasCore, teardownCanvasCore } from '../init';

function makeStickerEntity(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  zIndex: number,
): CanvasEntity {
  return {
    id,
    type: 'sticker',
    canvasId: 'stress-test-canvas',
    transform: {
      position: { x, y },
      size: { width: w, height: h },
      rotation: 0,
      scale: 1,
    },
    zIndex,
    visible: true,
    locked: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    assetUrl: `https://example.com/sticker-${id}.png`,
    mediaType: 'image',
  } as unknown as CanvasEntity;
}

describe('Entity Stress Tests', () => {
  beforeEach(() => {
    teardownCanvasCore();
    bus.unsubscribeAll();
  });

  describe('bulk entity creation', () => {
    it.each([50, 100, 200])('creates %d sticker entities correctly', (count) => {
      const ctx = initCanvasCore();

      for (let i = 0; i < count; i++) {
        const entity = makeStickerEntity(
          `sticker-${i}`,
          (i % 20) * 100,
          Math.floor(i / 20) * 100,
          64,
          64,
          i,
        );
        bus.emit(CanvasEvents.ENTITY_CREATED, entity);
      }

      expect(ctx.sceneGraph.entityCount).toBe(count);
    });
  });

  describe('z-order operations at scale', () => {
    it('reorders z-index correctly with 100 entities', () => {
      const ctx = initCanvasCore();
      const count = 100;

      for (let i = 0; i < count; i++) {
        bus.emit(
          CanvasEvents.ENTITY_CREATED,
          makeStickerEntity(`z-${i}`, i * 10, 0, 50, 50, i),
        );
      }

      // Bring the first entity to front
      ctx.sceneGraph.bringToFront('z-0');
      const ordered = ctx.sceneGraph.getEntitiesByZOrder();
      expect(ordered[ordered.length - 1].id).toBe('z-0');

      // Send the last entity to back
      ctx.sceneGraph.sendToBack(`z-${count - 1}`);
      const reordered = ctx.sceneGraph.getEntitiesByZOrder();
      expect(reordered[0].id).toBe(`z-${count - 1}`);
    });

    it('drag-stack-layer — 10 stickers with z-reorder', () => {
      const ctx = initCanvasCore();

      for (let i = 0; i < 10; i++) {
        bus.emit(
          CanvasEvents.ENTITY_CREATED,
          makeStickerEntity(`stack-${i}`, 50, 50, 100, 100, i),
        );
      }

      // Reorder: bring bottom to top alternating
      ctx.sceneGraph.bringToFront('stack-0');
      ctx.sceneGraph.bringToFront('stack-2');
      ctx.sceneGraph.bringToFront('stack-4');

      const ordered = ctx.sceneGraph.getEntitiesByZOrder();
      const topThree = ordered.slice(-3).map((e) => e.id);
      expect(topThree).toEqual(['stack-0', 'stack-2', 'stack-4']);
    });
  });

  describe('spatial index queries', () => {
    it('hit-test point finds correct entity in 200 entities', () => {
      const ctx = initCanvasCore();
      const count = 200;

      for (let i = 0; i < count; i++) {
        bus.emit(
          CanvasEvents.ENTITY_CREATED,
          makeStickerEntity(
            `spatial-${i}`,
            (i % 20) * 100,
            Math.floor(i / 20) * 100,
            80,
            80,
            i,
          ),
        );
      }

      // Query point inside entity at position (150, 50) which should be spatial-1
      const results = ctx.sceneGraph.queryPoint({ x: 150, y: 50 });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((e) => e.id === 'spatial-1')).toBe(true);
    });

    it('region query returns all entities in bounding box', () => {
      const ctx = initCanvasCore();

      // Create a 10x10 grid of entities
      for (let i = 0; i < 100; i++) {
        bus.emit(
          CanvasEvents.ENTITY_CREATED,
          makeStickerEntity(
            `region-${i}`,
            (i % 10) * 100,
            Math.floor(i / 10) * 100,
            50,
            50,
            i,
          ),
        );
      }

      // Query a region covering the top-left 3x3 grid
      const region: BoundingBox2D = {
        min: { x: 0, y: 0 },
        max: { x: 250, y: 250 },
      };
      const results = ctx.sceneGraph.queryRegion(region);

      // Should find entities in rows 0-2, columns 0-2 = 9 entities
      expect(results.length).toBe(9);
    });
  });

  describe('entity resize at boundaries', () => {
    it('handles entities with large dimensions', () => {
      const ctx = initCanvasCore();
      bus.emit(
        CanvasEvents.ENTITY_CREATED,
        makeStickerEntity('large', 0, 0, 5000, 5000, 0),
      );
      const entity = ctx.sceneGraph.getEntity('large');
      expect(entity).toBeDefined();
      expect(entity!.transform.size.width).toBe(5000);
      expect(entity!.transform.size.height).toBe(5000);
    });

    it('handles entities with minimal dimensions', () => {
      const ctx = initCanvasCore();
      bus.emit(
        CanvasEvents.ENTITY_CREATED,
        makeStickerEntity('tiny', 0, 0, 1, 1, 0),
      );
      const entity = ctx.sceneGraph.getEntity('tiny');
      expect(entity).toBeDefined();
      expect(entity!.transform.size.width).toBe(1);
    });
  });

  describe('entity CRUD round-trip via bus at scale', () => {
    it('handles 100 creates, updates, and deletes', () => {
      const ctx = initCanvasCore();
      const count = 100;

      // Create
      for (let i = 0; i < count; i++) {
        bus.emit(
          CanvasEvents.ENTITY_CREATED,
          makeStickerEntity(`crud-${i}`, i * 10, 0, 50, 50, i),
        );
      }
      expect(ctx.sceneGraph.entityCount).toBe(count);

      // Update all positions
      for (let i = 0; i < count; i++) {
        bus.emit(CanvasEvents.ENTITY_UPDATED, {
          id: `crud-${i}`,
          updates: {
            transform: {
              position: { x: i * 20, y: 100 },
              size: { width: 50, height: 50 },
              rotation: 0,
              scale: 1,
            },
          },
        });
      }
      const moved = ctx.sceneGraph.getEntity('crud-50');
      expect(moved!.transform.position.x).toBe(1000);

      // Delete half
      for (let i = 0; i < count / 2; i++) {
        bus.emit(CanvasEvents.ENTITY_DELETED, { id: `crud-${i}` });
      }
      expect(ctx.sceneGraph.entityCount).toBe(count / 2);
    });
  });

  describe('widget-namespaced entity creation at scale', () => {
    it('handles 50 widget-emitted entity creations', () => {
      const ctx = initCanvasCore();

      for (let i = 0; i < 50; i++) {
        bus.emit(`widget.${CanvasEvents.ENTITY_CREATED}`, {
          type: 'sticker',
          transform: {
            position: { x: i * 100, y: 0 },
            size: { width: 64, height: 64 },
            rotation: 0,
            scale: 1,
          },
          zIndex: i,
          visible: true,
          locked: false,
          assetUrl: `https://example.com/generated-${i}.png`,
          mediaType: 'image',
        });
      }

      expect(ctx.sceneGraph.entityCount).toBe(50);
      // Verify all entities got IDs assigned
      const all = ctx.sceneGraph.getAllEntities();
      for (const entity of all) {
        expect(entity.id).toBeDefined();
        expect(entity.id.length).toBeGreaterThan(0);
      }
    });
  });

  describe('performance measurements', () => {
    it('entity creation completes within reasonable time for 500 entities', () => {
      const ctx = initCanvasCore();
      const start = performance.now();

      for (let i = 0; i < 500; i++) {
        ctx.sceneGraph.addEntity(
          makeStickerEntity(`perf-${i}`, i * 10, 0, 50, 50, i),
        );
      }

      const elapsed = performance.now() - start;
      expect(ctx.sceneGraph.entityCount).toBe(500);
      // Should complete in under 500ms even on slow CI
      expect(elapsed).toBeLessThan(500);
    });

    it('hit-test query completes within reasonable time with 500 entities', () => {
      const ctx = initCanvasCore();

      for (let i = 0; i < 500; i++) {
        ctx.sceneGraph.addEntity(
          makeStickerEntity(
            `ht-${i}`,
            (i % 25) * 100,
            Math.floor(i / 25) * 100,
            80,
            80,
            i,
          ),
        );
      }

      const start = performance.now();
      for (let q = 0; q < 100; q++) {
        ctx.sceneGraph.queryPoint({ x: Math.random() * 2500, y: Math.random() * 2000 });
      }
      const elapsed = performance.now() - start;

      // 100 point queries should complete in under 100ms
      expect(elapsed).toBeLessThan(100);
    });
  });
});
