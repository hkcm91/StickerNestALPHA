/**
 * Pointer -- visual ray pointer for VR controllers
 *
 * Renders a thin ray line extending from the controller position
 * in the controller's forward direction. This is purely visual --
 * it does not perform raycasting or entity detection.
 *
 * Must be rendered inside a `<Canvas><XR>` tree so that XR hooks resolve.
 *
 * @module spatial/input/Pointer
 * @layer L4B
 */

import { useXRInputSourceState } from '@react-three/xr';
import React, { useMemo, useRef } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Line as ThreeLine } from 'three';

/**
 * Props for the Pointer component.
 */
export interface PointerProps {
  /** Which hand's controller to attach the ray to */
  hand: 'left' | 'right';
  /** Ray color. Defaults to '#00ccff'. */
  color?: string;
  /** Ray length in meters. Defaults to 5. */
  length?: number;
  /** Line width. Note: line width > 1 is not supported on all platforms. Defaults to 1. */
  lineWidth?: number;
}

/**
 * Default ray color -- a bright cyan.
 */
const DEFAULT_COLOR = '#00ccff';

/**
 * Default ray length in meters.
 */
const DEFAULT_LENGTH = 5;

/**
 * Pointer -- visual ray from a VR controller.
 *
 * Renders a `<line>` primitive extending from the controller origin
 * along the controller's negative-Z axis (forward direction).
 *
 * The ray is attached to the controller's object group, so it moves
 * with the controller automatically via the R3F scene graph.
 */
export function Pointer({
  hand,
  color = DEFAULT_COLOR,
  length = DEFAULT_LENGTH,
  lineWidth = 1,
}: PointerProps): React.JSX.Element | null {
  const controllerState = useXRInputSourceState('controller', hand);
  const lineRef = useRef<ThreeLine>(null);

  // Build a simple two-point line geometry: origin to -Z * length
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array([
      0, 0, 0,       // start: controller origin
      0, 0, -length,  // end: forward direction * length
    ]);
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return geo;
  }, [length]);

  // Don't render if controller is not connected
  if (!controllerState) {
    return null;
  }

  return (
    <group>
      <line ref={lineRef} geometry={geometry}>
        <lineBasicMaterial color={color} linewidth={lineWidth} />
      </line>
    </group>
  );
}
