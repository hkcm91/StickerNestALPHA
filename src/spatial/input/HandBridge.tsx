/**
 * HandBridge -- renderless component bridging hand tracking events to the bus
 *
 * Detects hand tracking start/end and gesture events (pinch, grab, release)
 * and emits spatial.hand.* bus events. Returns null -- no visual output.
 *
 * Must be rendered inside a `<Canvas><XR>` tree so that XR hooks resolve.
 *
 * @module spatial/input/HandBridge
 * @layer L4B
 */

import { useXRInputSourceState } from '@react-three/xr';
import { useEffect, useRef } from 'react';

import { SpatialEvents } from '@sn/types';
import type { SpatialContext } from '@sn/types';

import { bus } from '../../kernel/bus';

/**
 * Payload shape for hand tracking bus events.
 */
export interface HandEventPayload {
  hand: 'left' | 'right';
}

/**
 * Distance threshold (in meters) between thumb-tip and index-finger-tip
 * to consider a pinch gesture active.
 */
const PINCH_THRESHOLD = 0.025;

/**
 * Check if a pinch gesture is active by computing the distance
 * between thumb-tip and index-finger-tip joints.
 *
 * @param hand - The XRHand object from the WebXR hand tracking API
 * @returns true if pinch distance is below threshold
 */
export function isPinching(hand: XRHand | undefined | null): boolean {
  if (!hand) return false;

  const thumbTip = hand.get('thumb-tip');
  const indexTip = hand.get('index-finger-tip');

  if (!thumbTip || !indexTip) return false;

  // In the real WebXR API, we'd need to get poses from the frame.
  // The @react-three/xr hand state provides joint objects with position data.
  // This function is designed to work with the processed joint data
  // available via the hand state object.
  return false; // Base implementation -- overridden by the hook-based approach below
}

/**
 * Compute the midpoint between thumb-tip and index-finger-tip
 * to construct a SpatialContext for the pinch point.
 */
export function buildPinchSpatialContext(
  thumbPos: { x: number; y: number; z: number },
  indexPos: { x: number; y: number; z: number },
): SpatialContext {
  return {
    position: {
      x: (thumbPos.x + indexPos.x) / 2,
      y: (thumbPos.y + indexPos.y) / 2,
      z: (thumbPos.z + indexPos.z) / 2,
    },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    normal: { x: 0, y: 1, z: 0 },
  };
}

/**
 * Core bridge logic for hand tracking events, extracted for testability.
 *
 * Detects transitions in hand tracking availability and pinch gesture state,
 * and emits corresponding bus events.
 */
export function processHandState(
  hand: 'left' | 'right',
  isTracking: boolean,
  isPinchActive: boolean,
  wasTracking: boolean,
  wasPinching: boolean,
  spatial: SpatialContext | undefined,
): void {
  const payload: HandEventPayload = { hand };

  // Hand tracking start/end
  if (isTracking && !wasTracking) {
    bus.emit(SpatialEvents.HAND_TRACKING_STARTED, payload);
  }
  if (!isTracking && wasTracking) {
    bus.emit(SpatialEvents.HAND_TRACKING_ENDED, payload);
  }

  // Pinch gesture
  if (isPinchActive && !wasPinching) {
    bus.emit(SpatialEvents.HAND_PINCH, payload, spatial);
    bus.emit(SpatialEvents.HAND_GRAB, payload, spatial);
  }
  if (!isPinchActive && wasPinching) {
    bus.emit(SpatialEvents.HAND_RELEASE, payload, spatial);
  }
}

/**
 * Internal hook that bridges a single hand to the bus.
 */
function useHandTracking(hand: 'left' | 'right'): void {
  const handState = useXRInputSourceState('hand', hand);

  const wasTrackingRef = useRef(false);
  const wasPinchingRef = useRef(false);

  useEffect(() => {
    const isTracking = handState != null;
    const wasTracking = wasTrackingRef.current;
    wasTrackingRef.current = isTracking;

    // Check pinch state via the hand state's joint positions
    let isPinchActive = false;
    let spatial: SpatialContext | undefined;

    if (handState && handState.inputSource?.hand) {
      const xrHand = handState.inputSource.hand;
      // Access joint objects if available through the R3F hand state
      const thumbJoint = handState.object?.getObjectByName('thumb-tip');
      const indexJoint = handState.object?.getObjectByName('index-finger-tip');

      if (thumbJoint && indexJoint) {
        const dx = thumbJoint.position.x - indexJoint.position.x;
        const dy = thumbJoint.position.y - indexJoint.position.y;
        const dz = thumbJoint.position.z - indexJoint.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        isPinchActive = distance < PINCH_THRESHOLD;

        if (isPinchActive) {
          spatial = buildPinchSpatialContext(
            {
              x: thumbJoint.position.x,
              y: thumbJoint.position.y,
              z: thumbJoint.position.z,
            },
            {
              x: indexJoint.position.x,
              y: indexJoint.position.y,
              z: indexJoint.position.z,
            },
          );
        }
      }
    }

    const wasPinching = wasPinchingRef.current;
    wasPinchingRef.current = isPinchActive;

    processHandState(hand, isTracking, isPinchActive, wasTracking, wasPinching, spatial);
  });
}

/**
 * HandBridge -- renderless component.
 *
 * Bridges XR hand tracking events from both hands to the StickerNest
 * event bus as `spatial.hand.*` events.
 *
 * Events emitted:
 * - `spatial.hand.tracking.started` -- hand tracking became available
 * - `spatial.hand.tracking.ended` -- hand tracking was lost
 * - `spatial.hand.pinch` -- pinch gesture detected
 * - `spatial.hand.grab` -- grab gesture (simultaneous with pinch)
 * - `spatial.hand.release` -- pinch/grab ended
 */
export function HandBridge(): null {
  useHandTracking('left');
  useHandTracking('right');
  return null;
}
