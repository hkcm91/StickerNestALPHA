/**
 * ControllerBridge -- renderless component bridging XR controller events to the bus
 *
 * Uses @react-three/xr v6 hooks to detect controller interactions and
 * emits spatial.controller.* bus events with SpatialContext populated.
 * Returns null -- no visual output.
 *
 * Must be rendered inside a `<Canvas><XR>` tree so that XR hooks resolve.
 *
 * @module spatial/input/ControllerBridge
 * @layer L4B
 */

import { useXRInputSourceState } from '@react-three/xr';
import { useEffect, useRef } from 'react';

import { SpatialEvents } from '@sn/types';
import type { SpatialContext } from '@sn/types';

import { bus } from '../../kernel/bus';

/**
 * Payload shape for controller bus events.
 */
export interface ControllerEventPayload {
  hand: 'left' | 'right';
  entityId: string | null;
}

/**
 * Extract a SpatialContext from an XRInputSource's grip or target ray space.
 *
 * Reads the controller's position and orientation from the input source state
 * and constructs a SpatialContext. Returns undefined if the input source is
 * not available or lacks pose data.
 */
export function buildSpatialContextFromInputSource(
  inputSource: XRInputSource | undefined | null,
  frame: XRFrame | undefined | null,
  referenceSpace: XRReferenceSpace | undefined | null,
): SpatialContext | undefined {
  if (!inputSource || !frame || !referenceSpace) return undefined;

  const space = inputSource.gripSpace ?? inputSource.targetRaySpace;
  const pose = frame.getPose(space, referenceSpace);
  if (!pose) return undefined;

  const { position, orientation } = pose.transform;

  return {
    position: { x: position.x, y: position.y, z: position.z },
    rotation: {
      x: orientation.x,
      y: orientation.y,
      z: orientation.z,
      w: orientation.w,
    },
    // Default normal to controller forward direction (negative Z in controller space)
    normal: { x: 0, y: 0, z: -1 },
  };
}

/**
 * Core bridge logic extracted for testability.
 *
 * Given current and previous gamepad button states, detects transitions
 * and emits the corresponding bus events.
 */
export function processControllerButtons(
  hand: 'left' | 'right',
  selectPressed: boolean,
  squeezePressed: boolean,
  prevSelectPressed: boolean,
  prevSqueezePressed: boolean,
  spatial: SpatialContext | undefined,
): void {
  const payload: ControllerEventPayload = { hand, entityId: null };

  // Select button: trigger
  if (selectPressed && !prevSelectPressed) {
    bus.emit(SpatialEvents.CONTROLLER_SELECT, payload, spatial);
  }

  // Squeeze button: grip
  if (squeezePressed && !prevSqueezePressed) {
    bus.emit(SpatialEvents.CONTROLLER_GRAB, payload, spatial);
  }
  if (!squeezePressed && prevSqueezePressed) {
    bus.emit(SpatialEvents.CONTROLLER_RELEASE, payload, spatial);
  }
}

/**
 * Internal hook that bridges a single controller hand to the bus.
 */
function useControllerHand(hand: 'left' | 'right'): void {
  const controllerState = useXRInputSourceState('controller', hand);

  const prevSelectRef = useRef(false);
  const prevSqueezeRef = useRef(false);

  useEffect(() => {
    if (!controllerState) {
      // Controller disconnected -- reset state
      prevSelectRef.current = false;
      prevSqueezeRef.current = false;
      return;
    }

    const gamepad = controllerState.gamepad;
    if (!gamepad) return;

    // Standard mapping: button 0 = select (trigger), button 1 = squeeze (grip)
    const selectPressed = gamepad.buttons.length > 0 && gamepad.buttons[0].pressed;
    const squeezePressed = gamepad.buttons.length > 1 && gamepad.buttons[1].pressed;

    const prevSelect = prevSelectRef.current;
    const prevSqueeze = prevSqueezeRef.current;

    prevSelectRef.current = selectPressed;
    prevSqueezeRef.current = squeezePressed;

    // Build spatial context from the controller input source
    const inputSource = controllerState.inputSource;
    let spatial: SpatialContext | undefined;
    if (inputSource) {
      // In a real XR session, frame and referenceSpace would come from the XR session.
      // The hook-based approach gets pose data from the controller state's object matrix.
      // For the bridge component, we construct a SpatialContext from available data.
      const object = controllerState.object;
      if (object) {
        const pos = object.position;
        const quat = object.quaternion;
        spatial = {
          position: { x: pos.x, y: pos.y, z: pos.z },
          rotation: { x: quat.x, y: quat.y, z: quat.z, w: quat.w },
          normal: { x: 0, y: 0, z: -1 },
        };
      }
    }

    processControllerButtons(
      hand,
      selectPressed,
      squeezePressed,
      prevSelect,
      prevSqueeze,
      spatial,
    );
  });
}

/**
 * ControllerBridge -- renderless component.
 *
 * Bridges XR controller select and squeeze events from both hands
 * to the StickerNest event bus as `spatial.controller.*` events.
 *
 * Events emitted:
 * - `spatial.controller.select` -- trigger pressed (selectstart)
 * - `spatial.controller.grab` -- grip pressed (squeezestart)
 * - `spatial.controller.release` -- grip released (squeezeend)
 */
export function ControllerBridge(): null {
  useControllerHand('left');
  useControllerHand('right');
  return null;
}
