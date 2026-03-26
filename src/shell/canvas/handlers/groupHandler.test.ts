/**
 * groupHandler — unit tests
 *
 * @module shell/canvas/handlers
 * @layer L6
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { CanvasEntity, GroupEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

import { initGroupHandler, GroupEvents } from './groupHandler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(id: string, overrides: Partial<CanvasEntity> = {}): CanvasEntity {
  return {
    id,
    type: 'sticker',
    canvasId: 'canvas-1',
    name: `Entity ${id}`,
    transform: {
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
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
    ...overrides,
  } as CanvasEntity;
}

function mockSceneGraph(entities: CanvasEntity[]) {
  const map = new Map(entities.map((e) => [e.id, e]));
  return {
    getEntity: (id: string) => map.get(id),
    getAllEntities: () => entities,
    getEntitiesByZOrder: () => [...entities].sort((a, b) => a.zIndex - b.zIndex),
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

describe('groupHandler', () => {
  let teardown: () => void;
  let emitted: Array<{ type: string; payload: any }>;
  let unsubAll: () => void;

  beforeEach(() => {
    emitted = [];
    const unsubs = [
      bus.subscribe(CanvasEvents.ENTITY_CREATED, (e: any) => emitted.push({ type: CanvasEvents.ENTITY_CREATED, payload: e.payload })),
      bus.subscribe(CanvasEvents.ENTITY_UPDATED, (e: any) => emitted.push({ type: CanvasEvents.ENTITY_UPDATED, payload: e.payload })),
      bus.subscribe(CanvasEvents.ENTITY_DELETED, (e: any) => emitted.push({ type: CanvasEvents.ENTITY_DELETED, payload: e.payload })),
      bus.subscribe(CanvasEvents.ENTITY_GROUPED, (e: any) => emitted.push({ type: CanvasEvents.ENTITY_GROUPED, payload: e.payload })),
      bus.subscribe(CanvasEvents.ENTITY_UNGROUPED, (e: any) => emitted.push({ type: CanvasEvents.ENTITY_UNGROUPED, payload: e.payload })),
    ];
    unsubAll = () => unsubs.forEach((u) => u());
  });

  afterEach(() => {
    teardown?.();
    unsubAll?.();
  });

  it('creates a GroupEntity encompassing selected entities', () => {
    const entA = makeEntity('a', { transform: { position: { x: 10, y: 20 }, size: { width: 50, height: 50 }, rotation: 0, scale: 1 }, zIndex: 1 });
    const entB = makeEntity('b', { transform: { position: { x: 100, y: 200 }, size: { width: 80, height: 60 }, rotation: 0, scale: 1 }, zIndex: 2 });
    const sg = mockSceneGraph([entA, entB]);
    teardown = initGroupHandler(() => sg as any);

    bus.emit(GroupEvents.GROUP, { entityIds: ['a', 'b'] });

    const created = emitted.find((e) => e.type === CanvasEvents.ENTITY_CREATED);
    expect(created).toBeDefined();
    expect(created!.payload.type).toBe('group');
    expect(created!.payload.transform.position.x).toBe(10);
    expect(created!.payload.transform.position.y).toBe(20);
    expect(created!.payload.transform.size.width).toBe(170); // 180 - 10
    expect(created!.payload.children).toEqual(['a', 'b']);
  });

  it('does nothing when fewer than 2 entity IDs provided', () => {
    const sg = mockSceneGraph([makeEntity('a')]);
    teardown = initGroupHandler(() => sg as any);

    bus.emit(GroupEvents.GROUP, { entityIds: ['a'] });

    const created = emitted.find((e) => e.type === CanvasEvents.ENTITY_CREATED);
    expect(created).toBeUndefined();
  });

  it('ungroups a GroupEntity and deletes it', () => {
    const childA = makeEntity('child-a', { parentId: 'group-1' });
    const childB = makeEntity('child-b', { parentId: 'group-1' });
    const group: CanvasEntity = {
      ...makeEntity('group-1'),
      type: 'group',
      children: ['child-a', 'child-b'],
    } as any;

    const sg = mockSceneGraph([group, childA, childB]);
    teardown = initGroupHandler(() => sg as any);

    bus.emit(GroupEvents.UNGROUP, { entityIds: ['group-1'] });

    const deleted = emitted.find((e) => e.type === CanvasEvents.ENTITY_DELETED);
    expect(deleted).toBeDefined();
    expect(deleted!.payload.id).toBe('group-1');

    const ungrouped = emitted.find((e) => e.type === CanvasEvents.ENTITY_UNGROUPED);
    expect(ungrouped).toBeDefined();
    expect(ungrouped!.payload.childIds).toEqual(['child-a', 'child-b']);
  });

  it('skips non-group entities during ungroup', () => {
    const sg = mockSceneGraph([makeEntity('not-a-group')]);
    teardown = initGroupHandler(() => sg as any);

    bus.emit(GroupEvents.UNGROUP, { entityIds: ['not-a-group'] });

    const deleted = emitted.find((e) => e.type === CanvasEvents.ENTITY_DELETED);
    expect(deleted).toBeUndefined();
  });

  it('does nothing when scene graph is null', () => {
    teardown = initGroupHandler(() => null);

    bus.emit(GroupEvents.GROUP, { entityIds: ['a', 'b'] });

    const created = emitted.find((e) => e.type === CanvasEvents.ENTITY_CREATED);
    expect(created).toBeUndefined();
  });
});
