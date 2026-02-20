import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { createSceneGraph, DRAG_THRESHOLD } from '../../core';
import type { CanvasPointerEvent } from '../registry';

import { createMoveTool } from './move-tool';

function makeEntity(id: string, x: number, y: number): CanvasEntity {
  return {
    id,
    type: 'shape',
    canvasId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    transform: { position: { x, y }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 },
    zIndex: 0,
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

function makeEvent(x: number, y: number, entityId: string | null = null): CanvasPointerEvent {
  return {
    canvasPosition: { x, y },
    screenPosition: { x, y },
    entityId,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
  };
}

describe('MoveTool', () => {
  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => bus.unsubscribeAll());

  it('emits ENTITY_MOVED on drag completion', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 100, 100));
    const tool = createMoveTool(scene, () => 'edit');
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_MOVED, handler);

    tool.onPointerDown(makeEvent(110, 110, 'e1'));
    tool.onPointerMove(makeEvent(110 + DRAG_THRESHOLD + 10, 110 + 20));
    tool.onPointerUp(makeEvent(110 + DRAG_THRESHOLD + 10, 110 + 20));

    expect(handler).toHaveBeenCalledTimes(1);
    const payload = handler.mock.calls[0][0].payload;
    expect(payload.id).toBe('e1');
  });

  it('no-op in preview mode', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 100, 100));
    const tool = createMoveTool(scene, () => 'preview');
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_MOVED, handler);

    tool.onPointerDown(makeEvent(110, 110, 'e1'));
    tool.onPointerMove(makeEvent(150, 150));
    tool.onPointerUp(makeEvent(150, 150));

    expect(handler).not.toHaveBeenCalled();
  });

  it('applies grid snap when enabled', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 100, 100));
    const tool = createMoveTool(scene, () => 'edit', { gridSnap: true, gridSize: 50 });
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_MOVED, handler);

    tool.onPointerDown(makeEvent(110, 110, 'e1'));
    tool.onPointerMove(makeEvent(130, 130));
    tool.onPointerUp(makeEvent(130, 130));

    expect(handler).toHaveBeenCalledTimes(1);
    const pos = handler.mock.calls[0][0].payload.position;
    expect(pos.x % 50).toBe(0);
    expect(pos.y % 50).toBe(0);
  });
});
