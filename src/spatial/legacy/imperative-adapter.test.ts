/**
 * Tests for imperative-adapter
 *
 * Verifies that legacy adapter functions correctly emit bus events,
 * bridging old imperative callers to the new event-driven architecture.
 *
 * @module spatial/legacy/imperative-adapter.test
 * @layer L4B
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

// ---------------------------------------------------------------------------
// Mock session module
// ---------------------------------------------------------------------------

const mockEnterXR = vi.fn();
const mockExitXR = vi.fn();

vi.mock('../session/xr-store', () => ({
  enterXR: (...args: unknown[]) => mockEnterXR(...args),
  exitXR: (...args: unknown[]) => mockExitXR(...args),
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import {
  legacySession,
  placeEntityInSpace,
  transformEntityInSpace,
  removeEntityFromSpace,
  simulateControllerSelect,
  requestTeleport,
} from './imperative-adapter';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('imperative-adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  // -----------------------------------------------------------------------
  // Session adapter
  // -----------------------------------------------------------------------

  describe('legacySession', () => {
    it('enterVR calls enterXR with default mode', () => {
      legacySession.enterVR();
      expect(mockEnterXR).toHaveBeenCalledWith('immersive-vr');
    });

    it('enterVR calls enterXR with custom mode', () => {
      legacySession.enterVR('immersive-ar');
      expect(mockEnterXR).toHaveBeenCalledWith('immersive-ar');
    });

    it('exitVR calls exitXR', () => {
      legacySession.exitVR();
      expect(mockExitXR).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Entity adapter
  // -----------------------------------------------------------------------

  describe('placeEntityInSpace', () => {
    it('emits ENTITY_PLACED bus event', () => {
      const handler = vi.fn();
      bus.subscribe(SpatialEvents.ENTITY_PLACED, handler);

      placeEntityInSpace('entity-1', {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SpatialEvents.ENTITY_PLACED,
          payload: expect.objectContaining({
            entity: expect.objectContaining({
              id: 'entity-1',
              spatialTransform: expect.objectContaining({
                position: { x: 1, y: 2, z: 3 },
              }),
            }),
          }),
        }),
      );
    });

    it('passes spatial context when provided', () => {
      const handler = vi.fn();
      bus.subscribe(SpatialEvents.ENTITY_PLACED, handler);

      const spatial = {
        position: { x: 0, y: 1, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        normal: { x: 0, y: 1, z: 0 },
      };

      placeEntityInSpace(
        'entity-2',
        {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 },
        },
        spatial,
      );

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          spatial,
        }),
      );
    });
  });

  describe('transformEntityInSpace', () => {
    it('emits ENTITY_TRANSFORMED bus event', () => {
      const handler = vi.fn();
      bus.subscribe(SpatialEvents.ENTITY_TRANSFORMED, handler);

      transformEntityInSpace('entity-1', {
        position: { x: 5, y: 0, z: -2 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 2, y: 2, z: 2 },
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SpatialEvents.ENTITY_TRANSFORMED,
          payload: expect.objectContaining({
            entityId: 'entity-1',
            spatialTransform: expect.objectContaining({
              position: { x: 5, y: 0, z: -2 },
            }),
          }),
        }),
      );
    });
  });

  describe('removeEntityFromSpace', () => {
    it('emits ENTITY_REMOVED bus event', () => {
      const handler = vi.fn();
      bus.subscribe(SpatialEvents.ENTITY_REMOVED, handler);

      removeEntityFromSpace('entity-1');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SpatialEvents.ENTITY_REMOVED,
          payload: expect.objectContaining({
            entityId: 'entity-1',
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Controller adapter
  // -----------------------------------------------------------------------

  describe('simulateControllerSelect', () => {
    it('emits CONTROLLER_SELECT bus event', () => {
      const handler = vi.fn();
      bus.subscribe(SpatialEvents.CONTROLLER_SELECT, handler);

      simulateControllerSelect('right', 'entity-5');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SpatialEvents.CONTROLLER_SELECT,
          payload: expect.objectContaining({
            hand: 'right',
            entityId: 'entity-5',
          }),
        }),
      );
    });

    it('defaults entityId to null', () => {
      const handler = vi.fn();
      bus.subscribe(SpatialEvents.CONTROLLER_SELECT, handler);

      simulateControllerSelect('left');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            hand: 'left',
            entityId: null,
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Teleport adapter
  // -----------------------------------------------------------------------

  describe('requestTeleport', () => {
    it('emits TELEPORT_REQUESTED bus event', () => {
      const handler = vi.fn();
      bus.subscribe(SpatialEvents.TELEPORT_REQUESTED, handler);

      requestTeleport({ x: 3, y: 0, z: -5 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SpatialEvents.TELEPORT_REQUESTED,
          payload: expect.objectContaining({
            position: { x: 3, y: 0, z: -5 },
          }),
        }),
      );
    });

    it('includes rotationY when provided', () => {
      const handler = vi.fn();
      bus.subscribe(SpatialEvents.TELEPORT_REQUESTED, handler);

      requestTeleport({ x: 0, y: 0, z: 0 }, Math.PI);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            rotationY: Math.PI,
          }),
        }),
      );
    });
  });
});
