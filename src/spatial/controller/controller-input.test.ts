import { Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { SpatialEvents } from '@sn/types';
import type { SpatialContext } from '@sn/types';

import { bus } from '../../kernel/bus';

import { createControllerInput } from './controller-input';

const testSpatialContext: SpatialContext = {
  position: { x: 1, y: 2, z: 3 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  normal: { x: 0, y: 1, z: 0 },
};

describe('ControllerInput', () => {
  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => bus.unsubscribeAll());

  it('processSelectEvent emits CONTROLLER_SELECT with spatial context', () => {
    const controller = createControllerInput();
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_SELECT, handler);
    controller.processSelectEvent('right', 'e1', testSpatialContext);
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0];
    expect(event.payload).toEqual({ hand: 'right', entityId: 'e1' });
    expect(event.spatial).toEqual(testSpatialContext);
  });

  it('processGrabEvent emits CONTROLLER_GRAB with spatial context', () => {
    const controller = createControllerInput();
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_GRAB, handler);
    controller.processGrabEvent('left', 'e1', testSpatialContext);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].spatial).toBeDefined();
  });

  it('processReleaseEvent emits CONTROLLER_RELEASE', () => {
    const controller = createControllerInput();
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_RELEASE, handler);
    controller.processReleaseEvent('right', null, testSpatialContext);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.entityId).toBeNull();
  });

  it('raycast finds intersection with entity', () => {
    const controller = createControllerInput();
    const geometry = new BoxGeometry(2, 2, 2);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    mesh.position.set(0, 0, -5);
    mesh.userData.entityId = 'e1';
    // Update matrix for raycasting
    mesh.updateMatrixWorld(true);

    const result = controller.raycast(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      [mesh],
    );

    expect(result).not.toBeNull();
    expect(result!.entityId).toBe('e1');

    geometry.dispose();
    material.dispose();
  });

  it('raycast returns null for no intersection', () => {
    const controller = createControllerInput();
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    mesh.position.set(100, 100, 100);
    mesh.updateMatrixWorld(true);

    const result = controller.raycast(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      [mesh],
    );

    expect(result).toBeNull();

    geometry.dispose();
    material.dispose();
  });
});
