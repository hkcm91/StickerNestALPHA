import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { createSceneGraph, DRAG_THRESHOLD } from '../../core';
import type { CanvasPointerEvent } from '../registry';

import { computeResize } from './resize-handles';
import { createResizeTool } from './resize-tool';

function makeEntity(id: string, x: number, y: number, w: number, h: number): CanvasEntity {
  return {
    id,
    type: 'shape',
    canvasId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    transform: { position: { x, y }, size: { width: w, height: h }, rotation: 0, scale: 1 },
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

function makeEvent(x: number, y: number, entityId: string | null = null, shiftKey = false, altKey = false): CanvasPointerEvent {
  return {
    canvasPosition: { x, y },
    screenPosition: { x, y },
    entityId,
    shiftKey,
    altKey,
    ctrlKey: false,
    metaKey: false,
  };
}

describe('ResizeTool', () => {
  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => bus.unsubscribeAll());

  it('emits ENTITY_RESIZED on resize', () => {
    const scene = createSceneGraph();
    scene.addEntity(makeEntity('e1', 50, 50, 100, 100));
    const tool = createResizeTool(scene, () => 'edit');
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_RESIZED, handler);

    tool.onPointerDown(makeEvent(150, 150, 'e1'));
    tool.onPointerMove(makeEvent(150 + DRAG_THRESHOLD + 10, 150 + 20));
    tool.onPointerUp(makeEvent(150 + DRAG_THRESHOLD + 10, 150 + 20));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.id).toBe('e1');
  });
});

describe('computeResize', () => {
  it('resizes from bottom-right', () => {
    const bounds = { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };
    const result = computeResize('bottom-right', { x: 50, y: 30 }, bounds, { aspectLock: false, centerResize: false });
    expect(result.size.width).toBe(150);
    expect(result.size.height).toBe(130);
  });

  it('aspect lock maintains ratio', () => {
    const bounds = { min: { x: 0, y: 0 }, max: { x: 200, y: 100 } };
    const result = computeResize('bottom-right', { x: 100, y: 100 }, bounds, { aspectLock: true, centerResize: false });
    const ratio = result.size.width / result.size.height;
    expect(ratio).toBeCloseTo(2, 1);
  });

  it('center resize grows from center', () => {
    const bounds = { min: { x: 50, y: 50 }, max: { x: 150, y: 150 } };
    const result = computeResize('right', { x: 20, y: 0 }, bounds, { aspectLock: false, centerResize: true });
    expect(result.position.x).toBe(30); // moved left by delta
    expect(result.size.width).toBe(140); // grew by 2x delta
  });

  it('enforces minimum size', () => {
    const bounds = { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };
    const result = computeResize('bottom-right', { x: -200, y: -200 }, bounds, { aspectLock: false, centerResize: false });
    expect(result.size.width).toBeGreaterThanOrEqual(1);
    expect(result.size.height).toBeGreaterThanOrEqual(1);
  });
});
