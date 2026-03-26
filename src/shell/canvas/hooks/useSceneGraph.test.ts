/**
 * useSceneGraph — unit tests
 *
 * @module shell/canvas/hooks
 * @layer L6
 * @vitest-environment happy-dom
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CanvasEvents, CanvasDocumentEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

import { useSceneGraph } from './useSceneGraph';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(id: string, zIndex = 0) {
  return {
    id,
    type: 'sticker' as const,
    canvasId: 'canvas-1',
    name: `Entity ${id}`,
    transform: {
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      rotation: 0,
      scale: 1,
    },
    zIndex,
    visible: true,
    canvasVisibility: 'both' as const,
    locked: false,
    flipH: false,
    flipV: false,
    opacity: 1,
    borderRadius: 0,
    syncTransform2d3d: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    createdBy: 'user-1',
  };
}

function mockSceneGraph(entities = [makeEntity('a', 1), makeEntity('b', 2)]) {
  return {
    getEntitiesByZOrder: vi.fn().mockReturnValue(entities),
    getAllEntities: vi.fn().mockReturnValue(entities),
    getEntity: vi.fn((id: string) => entities.find((e) => e.id === id)),
    addEntity: vi.fn(),
    removeEntity: vi.fn(),
    updateEntity: vi.fn(),
    bringToFront: vi.fn(),
    sendToBack: vi.fn(),
    bringForward: vi.fn(),
    sendBackward: vi.fn(),
    getChildren: vi.fn().mockReturnValue([]),
    getParent: vi.fn(),
    getDescendants: vi.fn().mockReturnValue([]),
    queryRegion: vi.fn().mockReturnValue([]),
    queryPoint: vi.fn().mockReturnValue([]),
    clear: vi.fn(),
    entityCount: entities.length,
    spatialIndex: {} as any,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSceneGraph', () => {
  it('returns empty array when sceneGraph is null', () => {
    const { result } = renderHook(() => useSceneGraph(null));
    expect(result.current).toEqual([]);
  });

  it('returns entities sorted by z-order from the scene graph', () => {
    const entities = [makeEntity('a', 1), makeEntity('b', 2)];
    const sg = mockSceneGraph(entities);
    const { result } = renderHook(() => useSceneGraph(sg as any));
    expect(result.current).toEqual(entities);
    expect(sg.getEntitiesByZOrder).toHaveBeenCalled();
  });

  it('re-renders when ENTITY_CREATED bus event fires', () => {
    const entitiesBefore = [makeEntity('a', 1)];
    const entitiesAfter = [makeEntity('a', 1), makeEntity('b', 2)];
    const sg = mockSceneGraph(entitiesBefore);

    const { result } = renderHook(() => useSceneGraph(sg as any));
    expect(result.current).toEqual(entitiesBefore);

    // Update mock return for next render
    sg.getEntitiesByZOrder.mockReturnValue(entitiesAfter);

    act(() => {
      bus.emit(CanvasEvents.ENTITY_CREATED, makeEntity('b', 2));
    });

    expect(result.current).toEqual(entitiesAfter);
  });

  it('re-renders when ENTITY_UPDATED bus event fires', () => {
    const sg = mockSceneGraph();
    const { result } = renderHook(() => useSceneGraph(sg as any));
    const callsBefore = sg.getEntitiesByZOrder.mock.calls.length;

    act(() => {
      bus.emit(CanvasEvents.ENTITY_UPDATED, { id: 'a', updates: {} });
    });

    expect(sg.getEntitiesByZOrder.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('re-renders when ENTITY_DELETED bus event fires', () => {
    const sg = mockSceneGraph();
    renderHook(() => useSceneGraph(sg as any));
    const callsBefore = sg.getEntitiesByZOrder.mock.calls.length;

    act(() => {
      bus.emit(CanvasEvents.ENTITY_DELETED, { id: 'a' });
    });

    expect(sg.getEntitiesByZOrder.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('re-renders when LOADED bus event fires', () => {
    const sg = mockSceneGraph();
    renderHook(() => useSceneGraph(sg as any));
    const callsBefore = sg.getEntitiesByZOrder.mock.calls.length;

    act(() => {
      bus.emit(CanvasDocumentEvents.LOADED, { canvasId: 'c1' });
    });

    expect(sg.getEntitiesByZOrder.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
