/**
 * alignHandler — unit tests
 *
 * @module shell/canvas/handlers
 * @layer L6
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

import { initAlignHandler, AlignEvents } from './alignHandler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(id: string, x: number, y: number, w: number, h: number): CanvasEntity {
  return {
    id,
    type: 'sticker',
    canvasId: 'canvas-1',
    name: `Entity ${id}`,
    transform: {
      position: { x, y },
      size: { width: w, height: h },
      rotation: 0,
      scale: 1,
    },
    zIndex: 0,
    visible: true,
    canvasVisibility: 'both',
    locked: false,
    flipH: false,
    flipV: false,
    opacity: 1,
    borderRadius: 0,
    syncTransform2d3d: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    createdBy: 'user-1',
  } as CanvasEntity;
}

function mockSceneGraph(entities: CanvasEntity[]) {
  const map = new Map(entities.map((e) => [e.id, e]));
  return {
    getEntity: (id: string) => map.get(id),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('alignHandler', () => {
  let teardown: () => void;
  let emitted: Array<{ id: string; updates: any }>;
  let unsubEmit: () => void;

  beforeEach(() => {
    emitted = [];
    unsubEmit = bus.subscribe(CanvasEvents.ENTITY_UPDATED, (e: any) => {
      emitted.push(e.payload);
    });
  });

  afterEach(() => {
    teardown?.();
    unsubEmit?.();
  });

  it('ALIGN_LEFT moves all entities to the leftmost x', () => {
    const entA = makeEntity('a', 50, 100, 80, 80);
    const entB = makeEntity('b', 200, 100, 80, 80);
    const entC = makeEntity('c', 10, 100, 80, 80);
    const sg = mockSceneGraph([entA, entB, entC]);
    teardown = initAlignHandler(() => sg as any);

    bus.emit(AlignEvents.ALIGN_LEFT, { entityIds: ['a', 'b', 'c'] });

    // entC is already at x=10 (the min), entA and entB should move to x=10
    const movedA = emitted.find((e) => e.id === 'a');
    const movedB = emitted.find((e) => e.id === 'b');
    expect(movedA).toBeDefined();
    expect(movedA!.updates.transform.position.x).toBe(10);
    expect(movedB).toBeDefined();
    expect(movedB!.updates.transform.position.x).toBe(10);
  });

  it('ALIGN_RIGHT moves all entities so right edges align', () => {
    const entA = makeEntity('a', 0, 0, 100, 50);
    const entB = makeEntity('b', 50, 0, 200, 50);
    const sg = mockSceneGraph([entA, entB]);
    teardown = initAlignHandler(() => sg as any);

    bus.emit(AlignEvents.ALIGN_RIGHT, { entityIds: ['a', 'b'] });

    // entB right edge = 50 + 200 = 250 (max right)
    // entA should move so its right edge = 250 => x = 250 - 100 = 150
    const movedA = emitted.find((e) => e.id === 'a');
    expect(movedA).toBeDefined();
    expect(movedA!.updates.transform.position.x).toBe(150);
  });

  it('ALIGN_TOP moves all entities to the topmost y', () => {
    const entA = makeEntity('a', 0, 100, 50, 50);
    const entB = makeEntity('b', 0, 20, 50, 50);
    const sg = mockSceneGraph([entA, entB]);
    teardown = initAlignHandler(() => sg as any);

    bus.emit(AlignEvents.ALIGN_TOP, { entityIds: ['a', 'b'] });

    const movedA = emitted.find((e) => e.id === 'a');
    expect(movedA).toBeDefined();
    expect(movedA!.updates.transform.position.y).toBe(20);
  });

  it('does nothing when scene graph is null', () => {
    teardown = initAlignHandler(() => null);

    bus.emit(AlignEvents.ALIGN_LEFT, { entityIds: ['a', 'b'] });

    expect(emitted.length).toBe(0);
  });

  it('does not emit update when entity position is already correct', () => {
    const entA = makeEntity('a', 10, 0, 50, 50);
    const entB = makeEntity('b', 10, 0, 50, 50);
    const sg = mockSceneGraph([entA, entB]);
    teardown = initAlignHandler(() => sg as any);

    bus.emit(AlignEvents.ALIGN_LEFT, { entityIds: ['a', 'b'] });

    // Both already at x=10, so no updates should be emitted
    expect(emitted.length).toBe(0);
  });

  it('teardown unsubscribes all listeners', () => {
    const entA = makeEntity('a', 50, 0, 50, 50);
    const entB = makeEntity('b', 100, 0, 50, 50);
    const sg = mockSceneGraph([entA, entB]);
    teardown = initAlignHandler(() => sg as any);
    teardown();

    bus.emit(AlignEvents.ALIGN_LEFT, { entityIds: ['a', 'b'] });

    // No updates after teardown
    expect(emitted.length).toBe(0);
    // Prevent double teardown
    teardown = undefined as any;
  });
});
