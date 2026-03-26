/**
 * cropHandler — unit tests
 *
 * @module shell/canvas/handlers
 * @layer L6
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

import {
  initCropHandler,
  CropEvents,
  getCropModeIds,
  subscribeCropMode,
} from './cropHandler';

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

function mockSceneGraph(entities: CanvasEntity[] = []) {
  const map = new Map(entities.map((e) => [e.id, e]));
  return {
    getEntity: (id: string) => map.get(id),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cropHandler', () => {
  let teardown: () => void;
  let emitted: Array<{ type: string; payload: any }>;
  let unsubEmit: () => void;

  beforeEach(() => {
    emitted = [];
    unsubEmit = bus.subscribe(CanvasEvents.ENTITY_UPDATED, (e: any) => {
      emitted.push({ type: CanvasEvents.ENTITY_UPDATED, payload: e.payload });
    });
  });

  afterEach(() => {
    teardown?.();
    unsubEmit?.();
  });

  it('toggles crop mode on for a single entity', () => {
    teardown = initCropHandler(() => mockSceneGraph() as any);

    bus.emit(CropEvents.TOGGLE, { entityIds: ['ent-1'] });

    expect(getCropModeIds().has('ent-1')).toBe(true);
  });

  it('toggles crop mode off when toggled again', () => {
    teardown = initCropHandler(() => mockSceneGraph() as any);

    bus.emit(CropEvents.TOGGLE, { entityIds: ['ent-1'] });
    expect(getCropModeIds().has('ent-1')).toBe(true);

    bus.emit(CropEvents.TOGGLE, { entityIds: ['ent-1'] });
    expect(getCropModeIds().has('ent-1')).toBe(false);
  });

  it('apply emits ENTITY_UPDATED with cropRect and exits crop mode', () => {
    const entity = makeEntity('ent-1');
    teardown = initCropHandler(() => mockSceneGraph([entity]) as any);

    bus.emit(CropEvents.TOGGLE, { entityIds: ['ent-1'] });
    expect(getCropModeIds().has('ent-1')).toBe(true);

    const cropRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
    bus.emit(CropEvents.APPLY, { entityId: 'ent-1', cropRect });

    const updated = emitted.find(
      (e) => e.type === CanvasEvents.ENTITY_UPDATED && e.payload?.id === 'ent-1',
    );
    expect(updated).toBeDefined();
    expect(updated!.payload.updates.cropRect).toEqual(cropRect);
    expect(getCropModeIds().has('ent-1')).toBe(false);
  });

  it('reset emits ENTITY_UPDATED with cropRect undefined and exits crop mode', () => {
    const entity = makeEntity('ent-2');
    teardown = initCropHandler(() => mockSceneGraph([entity]) as any);

    bus.emit(CropEvents.TOGGLE, { entityIds: ['ent-2'] });
    bus.emit(CropEvents.RESET, { entityId: 'ent-2' });

    const updated = emitted.find(
      (e) => e.type === CanvasEvents.ENTITY_UPDATED && e.payload?.id === 'ent-2',
    );
    expect(updated).toBeDefined();
    expect(updated!.payload.updates.cropRect).toBeUndefined();
    expect(getCropModeIds().has('ent-2')).toBe(false);
  });

  it('subscribeCropMode notifies listeners on state change', () => {
    teardown = initCropHandler(() => mockSceneGraph() as any);
    const listener = vi.fn();
    const unsub = subscribeCropMode(listener);

    bus.emit(CropEvents.TOGGLE, { entityIds: ['ent-1'] });
    expect(listener).toHaveBeenCalled();

    unsub();
  });

  it('teardown clears crop mode state', () => {
    teardown = initCropHandler(() => mockSceneGraph() as any);

    bus.emit(CropEvents.TOGGLE, { entityIds: ['ent-1'] });
    expect(getCropModeIds().size).toBe(1);

    teardown();
    expect(getCropModeIds().size).toBe(0);
    // Prevent double teardown
    teardown = undefined as any;
  });
});
