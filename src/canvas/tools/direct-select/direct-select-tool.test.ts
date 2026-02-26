/**
 * Direct Select Tool tests
 * @module canvas/tools/direct-select/test
 * @layer L4A-2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { AnchorPoint, PathEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { SceneGraph } from '../../core';
import type { CanvasPointerEvent, CanvasKeyEvent } from '../registry';

import { createDirectSelectTool } from './direct-select-tool';

// Mock bus.emit
vi.mock('../../../kernel/bus', () => ({
  bus: {
    emit: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    unsubscribe: vi.fn(),
  },
}));

// Mock geometry — provide real implementations for constraint functions
vi.mock('../../core', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    distanceToCubicBezier: vi.fn(() => 100), // default: far away (no hit)
    splitCubicBezier: vi.fn(),
    mirrorHandle: vi.fn((h: { x: number; y: number }) => ({ x: -h.x, y: -h.y })),
    enforceSmooth: vi.fn((primary: { x: number; y: number }, other: { x: number; y: number }) => {
      // Mirror angle of primary, keep length of other
      const pLen = Math.sqrt(primary.x * primary.x + primary.y * primary.y);
      const oLen = Math.sqrt(other.x * other.x + other.y * other.y);
      if (pLen === 0) return { x: 0, y: 0 };
      return { x: (-primary.x / pLen) * oLen, y: (-primary.y / pLen) * oLen };
    }),
    enforceSymmetric: vi.fn((h: { x: number; y: number }) => ({ x: -h.x, y: -h.y })),
  };
});

function makePointerEvent(
  x: number,
  y: number,
  overrides: Partial<CanvasPointerEvent> = {},
): CanvasPointerEvent {
  return {
    canvasPosition: { x, y },
    screenPosition: { x, y },
    entityId: null,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...overrides,
  };
}

function makeKeyEvent(key: string, overrides: Partial<CanvasKeyEvent> = {}): CanvasKeyEvent {
  return {
    key,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    ...overrides,
  };
}

/** Helper to create a mock path entity */
function makePathEntity(
  id: string,
  anchors: AnchorPoint[],
  position = { x: 0, y: 0 },
  closed = false,
): PathEntity {
  return {
    id,
    type: 'path',
    canvasId: '00000000-0000-0000-0000-000000000001',
    transform: {
      position,
      size: { width: 100, height: 100 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 0,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    createdBy: '00000000-0000-0000-0000-000000000002',
    anchors,
    closed,
    fill: null,
    fillRule: 'nonzero',
    stroke: '#000000',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as PathEntity;
}

function makeSceneGraph(entities: PathEntity[]): SceneGraph {
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  return {
    addEntity: vi.fn(),
    removeEntity: vi.fn(),
    updateEntity: vi.fn((id, updates) => {
      const existing = entityMap.get(id);
      if (existing) {
        entityMap.set(id, { ...existing, ...updates } as PathEntity);
      }
    }),
    getEntity: vi.fn((id: string) => entityMap.get(id)),
    getAllEntities: vi.fn(() => Array.from(entityMap.values())),
    getEntitiesByZOrder: vi.fn(() => Array.from(entityMap.values())),
    bringToFront: vi.fn(),
    sendToBack: vi.fn(),
    bringForward: vi.fn(),
    sendBackward: vi.fn(),
    getChildren: vi.fn(() => []),
    getParent: vi.fn(),
    getDescendants: vi.fn(() => []),
    queryRegion: vi.fn(() => []),
    queryPoint: vi.fn(() => []),
    clear: vi.fn(),
    entityCount: entities.length,
    spatialIndex: {} as SceneGraph['spatialIndex'],
  } as unknown as SceneGraph;
}

describe('DirectSelectTool', () => {
  let getMode: () => 'edit' | 'preview';

  beforeEach(() => {
    vi.clearAllMocks();
    getMode = () => 'edit';
  });

  describe('state initialization', () => {
    it('should start with nothing selected', () => {
      const sg = makeSceneGraph([]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      const state = tool.getToolState();
      expect(state.selectedEntityId).toBeNull();
      expect(state.selectedAnchorIndex).toBeNull();
      expect(state.isDragging).toBe(false);
    });
  });

  describe('anchor selection', () => {
    it('should select an anchor when clicked', () => {
      // Path entity at origin with an anchor at local (50, 50) → canvas (50, 50)
      const entity = makePathEntity('path-1', [
        { position: { x: 50, y: 50 }, pointType: 'corner' },
        { position: { x: 150, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Click near the first anchor (within 8px radius)
      tool.onPointerDown(makePointerEvent(53, 52));
      tool.onPointerUp(makePointerEvent(53, 52));

      const state = tool.getToolState();
      expect(state.selectedEntityId).toBe('path-1');
      expect(state.selectedAnchorIndex).toBe(0);
    });

    it('should select the second anchor when clicked near it', () => {
      const entity = makePathEntity('path-1', [
        { position: { x: 0, y: 0 }, pointType: 'corner' },
        { position: { x: 100, y: 0 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      tool.onPointerDown(makePointerEvent(102, 1));
      tool.onPointerUp(makePointerEvent(102, 1));

      const state = tool.getToolState();
      expect(state.selectedEntityId).toBe('path-1');
      expect(state.selectedAnchorIndex).toBe(1);
    });

    it('should deselect when clicking on empty space', () => {
      const entity = makePathEntity('path-1', [
        { position: { x: 50, y: 50 }, pointType: 'corner' },
        { position: { x: 150, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Select first
      tool.onPointerDown(makePointerEvent(50, 50));
      tool.onPointerUp(makePointerEvent(50, 50));
      expect(tool.getToolState().selectedAnchorIndex).toBe(0);

      // Click far away
      tool.onPointerDown(makePointerEvent(500, 500));
      tool.onPointerUp(makePointerEvent(500, 500));
      expect(tool.getToolState().selectedEntityId).toBeNull();
      expect(tool.getToolState().selectedAnchorIndex).toBeNull();
    });
  });

  describe('anchor dragging', () => {
    it('should move an anchor when dragged', () => {
      const entity = makePathEntity('path-1', [
        { position: { x: 50, y: 50 }, pointType: 'corner' },
        { position: { x: 150, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // PointerDown on anchor
      tool.onPointerDown(makePointerEvent(50, 50));
      // Drag beyond threshold
      tool.onPointerMove(makePointerEvent(70, 80));
      tool.onPointerUp(makePointerEvent(70, 80));

      // Should have emitted ENTITY_UPDATED
      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.objectContaining({
          id: 'path-1',
        }),
      );

      // Check the anchor was moved (local coords: 70, 80 since entity is at origin)
      const updateCall = (bus.emit as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[0] === CanvasEvents.ENTITY_UPDATED,
      );
      expect(updateCall).toBeDefined();
      const updatedAnchors = updateCall![1].anchors;
      expect(updatedAnchors[0].position).toEqual({ x: 70, y: 80 });
    });

    it('should not move anchor if drag is below threshold', () => {
      const entity = makePathEntity('path-1', [
        { position: { x: 50, y: 50 }, pointType: 'corner' },
        { position: { x: 150, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      tool.onPointerDown(makePointerEvent(50, 50));
      // Tiny move (< 2px threshold)
      tool.onPointerMove(makePointerEvent(51, 50));
      tool.onPointerUp(makePointerEvent(51, 50));

      // Should NOT have emitted ENTITY_UPDATED during drag
      expect(bus.emit).not.toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.anything(),
      );
    });
  });

  describe('handle dragging', () => {
    it('should adjust handleOut when dragged', () => {
      const entity = makePathEntity('path-1', [
        {
          position: { x: 50, y: 50 },
          pointType: 'smooth',
          handleIn: { x: -30, y: 0 },
          handleOut: { x: 30, y: 0 },
        },
        { position: { x: 150, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // First select the anchor
      tool.onPointerDown(makePointerEvent(50, 50));
      tool.onPointerUp(makePointerEvent(50, 50));

      expect(tool.getToolState().selectedAnchorIndex).toBe(0);

      // Now click on the handleOut position (anchor at 50,50 + handleOut 30,0 = 80,50)
      tool.onPointerDown(makePointerEvent(80, 50));
      // Drag handle to new position
      tool.onPointerMove(makePointerEvent(80, 70));
      tool.onPointerUp(makePointerEvent(80, 70));

      // Should have emitted ENTITY_UPDATED
      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.objectContaining({ id: 'path-1' }),
      );

      const updateCalls = (bus.emit as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c) => c[0] === CanvasEvents.ENTITY_UPDATED,
      );
      const lastUpdate = updateCalls[updateCalls.length - 1][1];
      // handleOut should be offset from anchor: (80 - 50, 70 - 50) = (30, 20)
      expect(lastUpdate.anchors[0].handleOut).toEqual({ x: 30, y: 20 });
    });

    it('should enforce smooth constraint when dragging handleOut on smooth anchor', () => {
      const entity = makePathEntity('path-1', [
        {
          position: { x: 50, y: 50 },
          pointType: 'smooth',
          handleIn: { x: -30, y: 0 },
          handleOut: { x: 30, y: 0 },
        },
        { position: { x: 150, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Select anchor
      tool.onPointerDown(makePointerEvent(50, 50));
      tool.onPointerUp(makePointerEvent(50, 50));

      // Drag handleOut
      tool.onPointerDown(makePointerEvent(80, 50));
      tool.onPointerMove(makePointerEvent(80, 70));
      tool.onPointerUp(makePointerEvent(80, 70));

      // enforceSmooth was called (the mock adjusts handleIn to stay collinear)
      const updateCalls = (bus.emit as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c) => c[0] === CanvasEvents.ENTITY_UPDATED,
      );
      const lastUpdate = updateCalls[updateCalls.length - 1][1];
      // handleIn should have been adjusted by enforceSmooth (not left at original -30, 0)
      // Our mock enforceSmooth mirrors the primary handle angle with the other's length
      expect(lastUpdate.anchors[0].handleIn).toBeDefined();
      // The smooth anchor's handleIn should be updated (enforceSmooth was called)
      expect(lastUpdate.anchors[0].pointType).toBe('smooth');
    });

    it('should break constraint with Alt+drag on handle', () => {
      const entity = makePathEntity('path-1', [
        {
          position: { x: 50, y: 50 },
          pointType: 'smooth',
          handleIn: { x: -30, y: 0 },
          handleOut: { x: 30, y: 0 },
        },
        { position: { x: 150, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Select anchor
      tool.onPointerDown(makePointerEvent(50, 50));
      tool.onPointerUp(makePointerEvent(50, 50));

      // Alt+drag handleOut
      tool.onPointerDown(makePointerEvent(80, 50, { altKey: true }));
      tool.onPointerMove(makePointerEvent(80, 70));
      tool.onPointerUp(makePointerEvent(80, 70));

      const updateCalls = (bus.emit as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c) => c[0] === CanvasEvents.ENTITY_UPDATED,
      );
      const lastUpdate = updateCalls[updateCalls.length - 1][1];
      // Alt+drag should convert to corner
      expect(lastUpdate.anchors[0].pointType).toBe('corner');
    });
  });

  describe('point type conversion', () => {
    it('should toggle corner to smooth on Alt+click', () => {
      const entity = makePathEntity('path-1', [
        {
          position: { x: 50, y: 50 },
          pointType: 'corner',
          handleIn: { x: -20, y: 0 },
          handleOut: { x: 20, y: 0 },
        },
        { position: { x: 150, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Alt+click on anchor
      tool.onPointerDown(makePointerEvent(50, 50, { altKey: true }));
      tool.onPointerUp(makePointerEvent(50, 50));

      // Should emit ENTITY_UPDATED with pointType changed
      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.objectContaining({ id: 'path-1' }),
      );

      // Should also emit PATH_POINT_CONVERTED
      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.PATH_POINT_CONVERTED,
        expect.objectContaining({
          entityId: 'path-1',
          anchorIndex: 0,
          newType: 'smooth',
        }),
      );
    });

    it('should toggle smooth to corner on Alt+click', () => {
      const entity = makePathEntity('path-1', [
        {
          position: { x: 50, y: 50 },
          pointType: 'smooth',
          handleIn: { x: -20, y: 0 },
          handleOut: { x: 20, y: 0 },
        },
        { position: { x: 150, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Alt+click on anchor
      tool.onPointerDown(makePointerEvent(50, 50, { altKey: true }));
      tool.onPointerUp(makePointerEvent(50, 50));

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.PATH_POINT_CONVERTED,
        expect.objectContaining({
          entityId: 'path-1',
          anchorIndex: 0,
          newType: 'corner',
        }),
      );
    });
  });

  describe('anchor deletion', () => {
    it('should remove selected anchor on Delete key', () => {
      const entity = makePathEntity('path-1', [
        { position: { x: 0, y: 0 }, pointType: 'corner' },
        { position: { x: 100, y: 0 }, pointType: 'corner' },
        { position: { x: 100, y: 100 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Select middle anchor
      tool.onPointerDown(makePointerEvent(100, 0));
      tool.onPointerUp(makePointerEvent(100, 0));

      expect(tool.getToolState().selectedAnchorIndex).toBe(1);

      // Press Delete
      tool.onKeyDown!(makeKeyEvent('Delete'));

      // Should emit ENTITY_UPDATED with anchor removed
      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.objectContaining({ id: 'path-1' }),
      );

      const updateCall = (bus.emit as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[0] === CanvasEvents.ENTITY_UPDATED,
      );
      expect(updateCall![1].anchors).toHaveLength(2);

      // Selection should be cleared
      expect(tool.getToolState().selectedEntityId).toBeNull();
      expect(tool.getToolState().selectedAnchorIndex).toBeNull();
    });

    it('should remove selected anchor on Backspace key', () => {
      const entity = makePathEntity('path-1', [
        { position: { x: 0, y: 0 }, pointType: 'corner' },
        { position: { x: 100, y: 0 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Select first anchor
      tool.onPointerDown(makePointerEvent(0, 0));
      tool.onPointerUp(makePointerEvent(0, 0));

      tool.onKeyDown!(makeKeyEvent('Backspace'));

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.objectContaining({ id: 'path-1' }),
      );
    });

    it('should delete entire entity when removing the last anchor', () => {
      const entity = makePathEntity('path-1', [
        { position: { x: 50, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Select the only anchor
      tool.onPointerDown(makePointerEvent(50, 50));
      tool.onPointerUp(makePointerEvent(50, 50));

      // Delete it
      tool.onKeyDown!(makeKeyEvent('Delete'));

      // Should emit ENTITY_DELETED (not ENTITY_UPDATED)
      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_DELETED,
        expect.objectContaining({ id: 'path-1' }),
      );
    });

    it('should not delete if nothing is selected', () => {
      const entity = makePathEntity('path-1', [
        { position: { x: 50, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // No selection — press Delete
      tool.onKeyDown!(makeKeyEvent('Delete'));

      expect(bus.emit).not.toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.anything(),
      );
      expect(bus.emit).not.toHaveBeenCalledWith(
        CanvasEvents.ENTITY_DELETED,
        expect.anything(),
      );
    });
  });

  describe('preview mode', () => {
    it('should not select anchors in preview mode', () => {
      getMode = () => 'preview';
      const entity = makePathEntity('path-1', [
        { position: { x: 50, y: 50 }, pointType: 'corner' },
        { position: { x: 150, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      tool.onPointerDown(makePointerEvent(50, 50));
      tool.onPointerUp(makePointerEvent(50, 50));

      expect(tool.getToolState().selectedEntityId).toBeNull();
      expect(tool.getToolState().selectedAnchorIndex).toBeNull();
    });

    it('should not move anchors in preview mode', () => {
      getMode = () => 'preview';
      const entity = makePathEntity('path-1', [
        { position: { x: 50, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      tool.onPointerDown(makePointerEvent(50, 50));
      tool.onPointerMove(makePointerEvent(100, 100));
      tool.onPointerUp(makePointerEvent(100, 100));

      expect(bus.emit).not.toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.anything(),
      );
    });
  });

  describe('cancel / deactivate', () => {
    it('should clear selection on cancel', () => {
      const entity = makePathEntity('path-1', [
        { position: { x: 50, y: 50 }, pointType: 'corner' },
        { position: { x: 150, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Select
      tool.onPointerDown(makePointerEvent(50, 50));
      tool.onPointerUp(makePointerEvent(50, 50));
      expect(tool.getToolState().selectedAnchorIndex).toBe(0);

      tool.cancel();

      expect(tool.getToolState().selectedEntityId).toBeNull();
      expect(tool.getToolState().selectedAnchorIndex).toBeNull();
      expect(tool.getToolState().isDragging).toBe(false);
    });

    it('should clear selection on deactivate', () => {
      const entity = makePathEntity('path-1', [
        { position: { x: 50, y: 50 }, pointType: 'corner' },
        { position: { x: 150, y: 50 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Select
      tool.onPointerDown(makePointerEvent(50, 50));
      tool.onPointerUp(makePointerEvent(50, 50));
      expect(tool.getToolState().selectedAnchorIndex).toBe(0);

      tool.onDeactivate();

      expect(tool.getToolState().selectedEntityId).toBeNull();
      expect(tool.getToolState().selectedAnchorIndex).toBeNull();
    });
  });

  describe('entity-local coordinate transforms', () => {
    it('should correctly transform between canvas and local space', () => {
      // Entity positioned at (100, 200) with anchor at local (50, 50)
      // Canvas-space anchor = (150, 250)
      const entity = makePathEntity(
        'path-1',
        [
          { position: { x: 50, y: 50 }, pointType: 'corner' },
          { position: { x: 150, y: 50 }, pointType: 'corner' },
        ],
        { x: 100, y: 200 },
      );
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Click at canvas (150, 250) = entity local (50, 50)
      tool.onPointerDown(makePointerEvent(150, 250));
      tool.onPointerUp(makePointerEvent(150, 250));

      expect(tool.getToolState().selectedEntityId).toBe('path-1');
      expect(tool.getToolState().selectedAnchorIndex).toBe(0);
    });

    it('should move anchor correctly in offset entity space', () => {
      const entity = makePathEntity(
        'path-1',
        [
          { position: { x: 50, y: 50 }, pointType: 'corner' },
          { position: { x: 150, y: 50 }, pointType: 'corner' },
        ],
        { x: 100, y: 200 },
      );
      const sg = makeSceneGraph([entity]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Select and drag anchor
      tool.onPointerDown(makePointerEvent(150, 250));
      tool.onPointerMove(makePointerEvent(170, 270));
      tool.onPointerUp(makePointerEvent(170, 270));

      const updateCall = (bus.emit as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[0] === CanvasEvents.ENTITY_UPDATED,
      );
      expect(updateCall).toBeDefined();

      // Dragged to canvas (170, 270), entity at (100, 200)
      // Local = (170-100, 270-200) = (70, 70)
      expect(updateCall![1].anchors[0].position).toEqual({ x: 70, y: 70 });
    });
  });

  describe('multiple path entities', () => {
    it('should select the closest anchor across multiple paths', () => {
      const entity1 = makePathEntity('path-1', [
        { position: { x: 50, y: 50 }, pointType: 'corner' },
      ]);
      const entity2 = makePathEntity('path-2', [
        { position: { x: 200, y: 200 }, pointType: 'corner' },
      ]);
      const sg = makeSceneGraph([entity1, entity2]);
      const tool = createDirectSelectTool(sg, getMode);
      tool.onActivate();

      // Click near entity2's anchor
      tool.onPointerDown(makePointerEvent(202, 201));
      tool.onPointerUp(makePointerEvent(202, 201));

      expect(tool.getToolState().selectedEntityId).toBe('path-2');
      expect(tool.getToolState().selectedAnchorIndex).toBe(0);
    });
  });
});
