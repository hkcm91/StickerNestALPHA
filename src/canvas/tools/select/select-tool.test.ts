import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { createSceneGraph } from '../../core';
import type { CanvasPointerEvent } from '../registry';

import { createSelectTool } from './select-tool';

function makeEntity(id: string, x: number, y: number, w: number, h: number, zIndex: number): CanvasEntity {
  return {
    id,
    type: 'shape',
    canvasId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    transform: { position: { x, y }, size: { width: w, height: h }, rotation: 0, scale: 1 },
    zIndex,
    visible: true,
    locked: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    shapeType: 'rectangle',
    fill: null,
    stroke: '#000000',
    strokeWidth: 1,
    cornerRadius: 0,
  } as CanvasEntity;
}

function makeEvent(x: number, y: number, entityId: string | null = null, shiftKey = false): CanvasPointerEvent {
  return {
    canvasPosition: { x, y },
    screenPosition: { x, y },
    entityId,
    shiftKey,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
  };
}

describe('SelectTool', () => {
  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => bus.unsubscribeAll());

  it('click on entity selects it', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 0));
    const tool = createSelectTool(scene);
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_SELECTED, handler);

    tool.onPointerDown(makeEvent(50, 50, 'e1'));
    tool.onPointerUp(makeEvent(50, 50, 'e1'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(tool.getSelection().has('e1')).toBe(true);
  });

  it('click on empty deselects all', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 0));
    const tool = createSelectTool(scene);
    const clearHandler = vi.fn();
    bus.subscribe(CanvasEvents.SELECTION_CLEARED, clearHandler);

    tool.onPointerDown(makeEvent(50, 50, 'e1'));
    tool.onPointerUp(makeEvent(50, 50, 'e1'));

    tool.onPointerDown(makeEvent(500, 500));
    tool.onPointerUp(makeEvent(500, 500));
    expect(clearHandler).toHaveBeenCalledTimes(1);
    expect(tool.getSelection().size).toBe(0);
  });

  it('shift-click toggles selection', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 0));
    const tool = createSelectTool(scene);

    tool.onPointerDown(makeEvent(50, 50, 'e1'));
    tool.onPointerUp(makeEvent(50, 50, 'e1'));
    expect(tool.getSelection().has('e1')).toBe(true);

    tool.onPointerDown(makeEvent(50, 50, 'e1', true));
    tool.onPointerUp(makeEvent(50, 50, 'e1', true));
    expect(tool.getSelection().has('e1')).toBe(false);
  });

  it('marquee selects entities in region', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 10, 10, 30, 30, 0));
    scene.addEntity(makeEntity('e2', 50, 50, 30, 30, 1));
    scene.addEntity(makeEntity('e3', 500, 500, 30, 30, 2));
    const tool = createSelectTool(scene);
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_SELECTED, handler);

    tool.onPointerDown(makeEvent(0, 0));
    tool.onPointerMove(makeEvent(100, 100));
    tool.onPointerUp(makeEvent(100, 100));

    expect(tool.getSelection().size).toBe(1);
    expect(
      tool.getSelection().has('e1') || tool.getSelection().has('e2')
    ).toBe(true);
    expect(tool.getSelection().has('e3')).toBe(false);
  });

  it('shift-marquee adds multiple entities in region', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 10, 10, 30, 30, 0));
    scene.addEntity(makeEntity('e2', 50, 50, 30, 30, 1));
    const tool = createSelectTool(scene);

    tool.onPointerDown(makeEvent(0, 0));
    tool.onPointerMove(makeEvent(100, 100, null, true));
    tool.onPointerUp(makeEvent(100, 100, null, true));

    expect(tool.getSelection().has('e1')).toBe(true);
    expect(tool.getSelection().has('e2')).toBe(true);
  });

  it('marquee on empty space clears selection', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 0));
    const tool = createSelectTool(scene);

    tool.onPointerDown(makeEvent(50, 50, 'e1'));
    tool.onPointerUp(makeEvent(50, 50, 'e1'));
    expect(tool.getSelection().has('e1')).toBe(true);

    tool.onPointerDown(makeEvent(500, 500));
    tool.onPointerMove(makeEvent(520, 520));
    tool.onPointerUp(makeEvent(520, 520));

    expect(tool.getSelection().size).toBe(0);
  });

  it('delete key emits ENTITY_DELETED for selected', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 0, 0, 100, 100, 0));
    scene.addEntity(makeEntity('e2', 200, 200, 100, 100, 1));
    const tool = createSelectTool(scene);
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_DELETED, handler);

    tool.onPointerDown(makeEvent(50, 50, 'e1'));
    tool.onPointerUp(makeEvent(50, 50, 'e1'));

    tool.onKeyDown!({ key: 'Delete', shiftKey: false, ctrlKey: false, metaKey: false });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ id: 'e1' });
  });
});
