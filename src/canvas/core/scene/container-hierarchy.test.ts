/**
 * Container hierarchy tests — parent-child relationships between entities and widgets
 *
 * Tests GroupEntity and DockerEntity behavior in the scene graph:
 * grouping, nesting, z-order, hit-testing, and widget containment.
 *
 * @module canvas/core/scene
 * @layer L4A-1
 */

import { describe, it, expect } from 'vitest';

import type { CanvasEntity, GroupEntity, DockerEntity } from '@sn/types';

import { createSceneGraph } from './scene-graph';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const CANVAS_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
let idCounter = 0;

function nextId(): string {
  idCounter++;
  const hex = idCounter.toString(16).padStart(12, '0');
  return `550e8400-e29b-41d4-a716-${hex}`;
}

function makeBase(id: string, x: number, y: number, w: number, h: number, zIndex: number) {
  return {
    id,
    canvasId: CANVAS_ID,
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
    createdBy: USER_ID,
  };
}

function makeShape(id: string, x: number, y: number, w: number, h: number, zIndex: number): CanvasEntity {
  return {
    ...makeBase(id, x, y, w, h, zIndex),
    type: 'shape',
    shapeType: 'rectangle',
    fill: '#ff66cc',
    stroke: '#000000',
    strokeWidth: 1,
    cornerRadius: 0,
  } as CanvasEntity;
}

function makeWidget(id: string, instanceId: string, x: number, y: number, zIndex: number): CanvasEntity {
  return {
    ...makeBase(id, x, y, 100, 100, zIndex),
    type: 'widget',
    widgetInstanceId: instanceId,
    widgetId: 'test-widget',
    config: {},
  } as CanvasEntity;
}

function makeGroup(id: string, children: string[], x: number, y: number, w: number, h: number, zIndex: number): CanvasEntity {
  return {
    ...makeBase(id, x, y, w, h, zIndex),
    type: 'group',
    children,
  } as CanvasEntity;
}

function makeDocker(id: string, children: string[], layout: 'free' | 'stack' | 'grid', x: number, y: number, w: number, h: number, zIndex: number): CanvasEntity {
  return {
    ...makeBase(id, x, y, w, h, zIndex),
    type: 'docker',
    children,
    layout,
  } as CanvasEntity;
}

// ---------------------------------------------------------------------------
// GroupEntity in SceneGraph
// ---------------------------------------------------------------------------

describe('GroupEntity in SceneGraph', () => {
  it('adds group with children — all are retrievable', () => {
    const scene = createSceneGraph();
    const childA = makeShape(nextId(), 10, 10, 50, 50, 1);
    const childB = makeShape(nextId(), 70, 10, 50, 50, 2);
    const group = makeGroup(nextId(), [childA.id, childB.id], 0, 0, 200, 200, 3);

    scene.addEntity(childA);
    scene.addEntity(childB);
    scene.addEntity(group);

    expect(scene.entityCount).toBe(3);
    expect(scene.getEntity(childA.id)).toBeDefined();
    expect(scene.getEntity(childB.id)).toBeDefined();
    expect(scene.getEntity(group.id)).toBeDefined();
  });

  it('group children array references existing entity IDs', () => {
    const scene = createSceneGraph();
    const childA = makeShape(nextId(), 10, 10, 50, 50, 1);
    const childB = makeShape(nextId(), 70, 10, 50, 50, 2);
    const group = makeGroup(nextId(), [childA.id, childB.id], 0, 0, 200, 200, 3);

    scene.addEntity(childA);
    scene.addEntity(childB);
    scene.addEntity(group);

    const retrieved = scene.getEntity(group.id) as GroupEntity;
    expect(retrieved.children).toContain(childA.id);
    expect(retrieved.children).toContain(childB.id);
    // Both referenced children actually exist in the scene
    for (const cid of retrieved.children) {
      expect(scene.getEntity(cid)).toBeDefined();
    }
  });

  it('removing group leaves children intact (flat scene graph)', () => {
    const scene = createSceneGraph();
    const childA = makeShape(nextId(), 10, 10, 50, 50, 1);
    const childB = makeShape(nextId(), 70, 10, 50, 50, 2);
    const group = makeGroup(nextId(), [childA.id, childB.id], 0, 0, 200, 200, 3);

    scene.addEntity(childA);
    scene.addEntity(childB);
    scene.addEntity(group);
    scene.removeEntity(group.id);

    expect(scene.entityCount).toBe(2);
    expect(scene.getEntity(childA.id)).toBeDefined();
    expect(scene.getEntity(childB.id)).toBeDefined();
    expect(scene.getEntity(group.id)).toBeUndefined();
  });

  it('removing child does NOT update group.children (no referential integrity)', () => {
    const scene = createSceneGraph();
    const childA = makeShape(nextId(), 10, 10, 50, 50, 1);
    const childB = makeShape(nextId(), 70, 10, 50, 50, 2);
    const group = makeGroup(nextId(), [childA.id, childB.id], 0, 0, 200, 200, 3);

    scene.addEntity(childA);
    scene.addEntity(childB);
    scene.addEntity(group);
    scene.removeEntity(childA.id);

    const retrieved = scene.getEntity(group.id) as GroupEntity;
    // children array still references the removed child — scene graph is flat
    expect(retrieved.children).toContain(childA.id);
    expect(retrieved.children.length).toBe(2);
    // But the child itself is gone
    expect(scene.getEntity(childA.id)).toBeUndefined();
  });

  it('group participates in z-order like any entity', () => {
    const scene = createSceneGraph();
    const shape = makeShape(nextId(), 0, 0, 100, 100, 5);
    const group = makeGroup(nextId(), [], 0, 0, 200, 200, 10);
    const anotherShape = makeShape(nextId(), 0, 0, 100, 100, 1);

    scene.addEntity(shape);
    scene.addEntity(group);
    scene.addEntity(anotherShape);

    const ordered = scene.getEntitiesByZOrder();
    expect(ordered.map((e) => e.id)).toEqual([
      anotherShape.id,
      shape.id,
      group.id,
    ]);
  });

  it('group bounding box is hit-testable; children are independently hit-testable', () => {
    const scene = createSceneGraph();
    const child = makeShape(nextId(), 50, 50, 30, 30, 1);
    // Group covers 0,0 to 200,200
    const group = makeGroup(nextId(), [child.id], 0, 0, 200, 200, 2);

    scene.addEntity(child);
    scene.addEntity(group);

    // Point inside group but outside child
    const groupOnly = scene.queryPoint({ x: 10, y: 10 });
    expect(groupOnly.some((e) => e.id === group.id)).toBe(true);

    // Point inside both group and child
    const both = scene.queryPoint({ x: 60, y: 60 });
    expect(both.some((e) => e.id === group.id)).toBe(true);
    expect(both.some((e) => e.id === child.id)).toBe(true);
  });

  it('query region includes group based on its own transform', () => {
    const scene = createSceneGraph();
    // Group at 500,500 sized 200x200
    const group = makeGroup(nextId(), [], 500, 500, 200, 200, 1);
    scene.addEntity(group);

    // Query that overlaps with the group
    const hits = scene.queryRegion({
      min: { x: 550, y: 550 },
      max: { x: 600, y: 600 },
    });
    expect(hits.some((e) => e.id === group.id)).toBe(true);

    // Query that does NOT overlap
    const misses = scene.queryRegion({
      min: { x: 0, y: 0 },
      max: { x: 100, y: 100 },
    });
    expect(misses.some((e) => e.id === group.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DockerEntity in SceneGraph
// ---------------------------------------------------------------------------

describe('DockerEntity in SceneGraph', () => {
  it('adds docker with each layout mode', () => {
    const layouts: Array<'free' | 'stack' | 'grid'> = ['free', 'stack', 'grid'];

    for (const layout of layouts) {
      const scene = createSceneGraph();
      const docker = makeDocker(nextId(), [], layout, 0, 0, 300, 300, 1);
      scene.addEntity(docker);

      const retrieved = scene.getEntity(docker.id) as DockerEntity;
      expect(retrieved.type).toBe('docker');
      expect(retrieved.layout).toBe(layout);
    }
  });

  it('docker children are widget instance IDs', () => {
    const scene = createSceneGraph();
    const widgetInstanceA = nextId();
    const widgetInstanceB = nextId();
    const docker = makeDocker(
      nextId(),
      [widgetInstanceA, widgetInstanceB],
      'stack',
      0, 0, 300, 300, 1,
    );
    scene.addEntity(docker);

    const retrieved = scene.getEntity(docker.id) as DockerEntity;
    expect(retrieved.children).toEqual([widgetInstanceA, widgetInstanceB]);
  });

  it('docker participates in z-order ordering', () => {
    const scene = createSceneGraph();
    const shape = makeShape(nextId(), 0, 0, 100, 100, 1);
    const docker = makeDocker(nextId(), [], 'free', 0, 0, 300, 300, 5);

    scene.addEntity(shape);
    scene.addEntity(docker);

    const ordered = scene.getEntitiesByZOrder();
    expect(ordered[0].id).toBe(shape.id);
    expect(ordered[1].id).toBe(docker.id);
  });

  it('docker bounding box responds to point queries', () => {
    const scene = createSceneGraph();
    // Docker at 100,100 sized 300x300
    const docker = makeDocker(nextId(), [], 'grid', 100, 100, 300, 300, 1);
    scene.addEntity(docker);

    const inside = scene.queryPoint({ x: 200, y: 200 });
    expect(inside.some((e) => e.id === docker.id)).toBe(true);

    // Point well outside docker's grid cell (cell size = 256)
    const outside = scene.queryPoint({ x: 800, y: 800 });
    expect(outside.some((e) => e.id === docker.id)).toBe(false);
  });

  it('empty docker is valid and hit-testable', () => {
    const scene = createSceneGraph();
    const docker = makeDocker(nextId(), [], 'free', 0, 0, 200, 200, 1);
    scene.addEntity(docker);

    const retrieved = scene.getEntity(docker.id) as DockerEntity;
    expect(retrieved.children).toEqual([]);

    const hits = scene.queryPoint({ x: 100, y: 100 });
    expect(hits.some((e) => e.id === docker.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Nested Containers
// ---------------------------------------------------------------------------

describe('Nested Containers', () => {
  it('group containing another group — both exist in scene graph', () => {
    const scene = createSceneGraph();
    const innerGroup = makeGroup(nextId(), [], 50, 50, 100, 100, 1);
    const outerGroup = makeGroup(nextId(), [innerGroup.id], 0, 0, 300, 300, 2);

    scene.addEntity(innerGroup);
    scene.addEntity(outerGroup);

    expect(scene.entityCount).toBe(2);
    const outer = scene.getEntity(outerGroup.id) as GroupEntity;
    expect(outer.children).toContain(innerGroup.id);
    expect(scene.getEntity(innerGroup.id)).toBeDefined();
  });

  it('group containing docker — cross-container nesting', () => {
    const scene = createSceneGraph();
    const docker = makeDocker(nextId(), [], 'stack', 50, 50, 200, 200, 1);
    const group = makeGroup(nextId(), [docker.id], 0, 0, 400, 400, 2);

    scene.addEntity(docker);
    scene.addEntity(group);

    const retrieved = scene.getEntity(group.id) as GroupEntity;
    expect(retrieved.children).toContain(docker.id);
    expect(scene.getEntity(docker.id)!.type).toBe('docker');
  });

  it('deep nesting — 3+ levels coexist in flat scene graph', () => {
    const scene = createSceneGraph();
    const leaf = makeShape(nextId(), 10, 10, 20, 20, 1);
    const level1 = makeGroup(nextId(), [leaf.id], 0, 0, 50, 50, 2);
    const level2 = makeGroup(nextId(), [level1.id], 0, 0, 100, 100, 3);
    const level3 = makeGroup(nextId(), [level2.id], 0, 0, 200, 200, 4);

    scene.addEntity(leaf);
    scene.addEntity(level1);
    scene.addEntity(level2);
    scene.addEntity(level3);

    expect(scene.entityCount).toBe(4);

    // Traverse hierarchy manually through children references
    const top = scene.getEntity(level3.id) as GroupEntity;
    expect(top.children).toContain(level2.id);

    const mid = scene.getEntity(level2.id) as GroupEntity;
    expect(mid.children).toContain(level1.id);

    const inner = scene.getEntity(level1.id) as GroupEntity;
    expect(inner.children).toContain(leaf.id);
  });

  it('z-order is independent — parent z does not cascade to children', () => {
    const scene = createSceneGraph();
    // Child has higher z than parent
    const child = makeShape(nextId(), 10, 10, 50, 50, 100);
    const parent = makeGroup(nextId(), [child.id], 0, 0, 200, 200, 1);

    scene.addEntity(child);
    scene.addEntity(parent);

    const ordered = scene.getEntitiesByZOrder();
    // Parent (z=1) comes before child (z=100) — z is per-entity, not inherited
    expect(ordered[0].id).toBe(parent.id);
    expect(ordered[1].id).toBe(child.id);
  });
});

// ---------------------------------------------------------------------------
// Container + Widget Relationships
// ---------------------------------------------------------------------------

describe('Container + Widget Relationships', () => {
  it('docker references widget container entities in scene graph', () => {
    const scene = createSceneGraph();
    const widgetInstanceA = nextId();
    const widgetInstanceB = nextId();
    const widgetA = makeWidget(nextId(), widgetInstanceA, 10, 10, 1);
    const widgetB = makeWidget(nextId(), widgetInstanceB, 120, 10, 2);
    const docker = makeDocker(
      nextId(),
      [widgetInstanceA, widgetInstanceB],
      'stack',
      0, 0, 300, 300, 3,
    );

    scene.addEntity(widgetA);
    scene.addEntity(widgetB);
    scene.addEntity(docker);

    const retrieved = scene.getEntity(docker.id) as DockerEntity;
    // Docker children are widget instance IDs
    expect(retrieved.children.length).toBe(2);
    expect(retrieved.children).toContain(widgetInstanceA);
    expect(retrieved.children).toContain(widgetInstanceB);
  });

  it('widget entity inside a group — group.children references widget entity ID', () => {
    const scene = createSceneGraph();
    const widget = makeWidget(nextId(), nextId(), 10, 10, 1);
    const group = makeGroup(nextId(), [widget.id], 0, 0, 200, 200, 2);

    scene.addEntity(widget);
    scene.addEntity(group);

    const retrieved = scene.getEntity(group.id) as GroupEntity;
    expect(retrieved.children).toContain(widget.id);
    expect(scene.getEntity(widget.id)!.type).toBe('widget');
  });

  it('multiple widgets in docker — all retrievable from scene graph', () => {
    const scene = createSceneGraph();
    const instances = [nextId(), nextId(), nextId()];
    const widgets = instances.map((instId, i) =>
      makeWidget(nextId(), instId, i * 110, 0, i + 1),
    );
    const docker = makeDocker(nextId(), instances, 'grid', 0, 0, 400, 400, 10);

    for (const w of widgets) scene.addEntity(w);
    scene.addEntity(docker);

    expect(scene.entityCount).toBe(4);
    const retrieved = scene.getEntity(docker.id) as DockerEntity;
    expect(retrieved.children.length).toBe(3);

    // All widget entities are in the scene
    for (const w of widgets) {
      expect(scene.getEntity(w.id)).toBeDefined();
    }
  });

  it('mixed group: stickers, text, and widgets as children', () => {
    const scene = createSceneGraph();
    const sticker: CanvasEntity = {
      ...makeBase(nextId(), 10, 10, 50, 50, 1),
      type: 'sticker',
      assetUrl: 'https://example.com/sticker.png',
      assetType: 'image',
      aspectLocked: true,
      hoverEffect: 'none',
    } as CanvasEntity;

    const text: CanvasEntity = {
      ...makeBase(nextId(), 70, 10, 80, 30, 2),
      type: 'text',
      content: 'Hello',
      fontFamily: 'system-ui',
      fontSize: 16,
      fontWeight: 400,
      color: '#000000',
      textAlign: 'left',
    } as CanvasEntity;

    const widget = makeWidget(nextId(), nextId(), 160, 10, 3);

    const group = makeGroup(
      nextId(),
      [sticker.id, text.id, widget.id],
      0, 0, 300, 100, 4,
    );

    scene.addEntity(sticker);
    scene.addEntity(text);
    scene.addEntity(widget);
    scene.addEntity(group);

    expect(scene.entityCount).toBe(4);
    const retrieved = scene.getEntity(group.id) as GroupEntity;
    expect(retrieved.children.length).toBe(3);
    expect(retrieved.children).toContain(sticker.id);
    expect(retrieved.children).toContain(text.id);
    expect(retrieved.children).toContain(widget.id);
  });
});
