/**
 * PlaneDetection -- visual rendering of detected real-world planes
 *
 * Renders each detected XR plane as a semi-transparent colored mesh,
 * color-coded by semantic label. Emits `spatial.plane.updated` bus events
 * when plane geometry changes.
 *
 * Must be rendered as a child of `<RATKProvider>`.
 *
 * @module spatial/mr/PlaneDetection
 * @layer L4B
 */

import { useFrame } from '@react-three/fiber';
import type { Plane as RATKPlane } from 'ratk';
import React, { useRef } from 'react';
import { DoubleSide } from 'three';
import type { Group as ThreeGroup } from 'three';


import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

import { useRATK } from './RATKProvider';

// ---------------------------------------------------------------------------
// Semantic label color map
// ---------------------------------------------------------------------------

/**
 * Color map for plane semantic labels.
 * floor=green, wall=blue, ceiling=yellow, table=orange, other=gray.
 */
const LABEL_COLORS: Record<string, string> = {
  floor: '#22c55e',
  wall: '#3b82f6',
  ceiling: '#eab308',
  table: '#f97316',
};

/** Default color for planes without a recognized semantic label. */
const DEFAULT_PLANE_COLOR = '#9ca3af';

/**
 * Get the display color for a plane based on its semantic label.
 */
function getPlaneColor(semanticLabel: string | undefined): string {
  if (!semanticLabel) return DEFAULT_PLANE_COLOR;
  return LABEL_COLORS[semanticLabel.toLowerCase()] ?? DEFAULT_PLANE_COLOR;
}

// ---------------------------------------------------------------------------
// ID tracking for update events
// ---------------------------------------------------------------------------

/** WeakMap to retrieve stable IDs for planes (mirrors RATKProvider's tracking). */
const planeIds = new WeakMap<XRPlane, string>();

/**
 * Get or create a stable UUID for an XRPlane.
 * This mirrors the logic in RATKProvider to ensure consistent IDs.
 */
function getPlaneId(xrPlane: XRPlane): string {
  let id = planeIds.get(xrPlane);
  if (!id) {
    id = crypto.randomUUID();
    planeIds.set(xrPlane, id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the PlaneDetection component.
 */
export interface PlaneDetectionProps {
  /** Material opacity for plane meshes. Defaults to 0.3. */
  opacity?: number;
  /** Whether to show plane visualizations. Defaults to true. */
  visible?: boolean;
}

// ---------------------------------------------------------------------------
// Single plane renderer
// ---------------------------------------------------------------------------

/**
 * Props for an individual plane mesh.
 */
interface PlaneVisualProps {
  plane: RATKPlane;
  opacity: number;
}

/**
 * Renders a single detected plane as a semi-transparent mesh.
 *
 * Uses the plane's `planeMesh` geometry if available from RATK,
 * otherwise falls back to a simple `planeGeometry` sized to the
 * plane's bounding rectangle dimensions.
 */
function PlaneVisual({ plane, opacity }: PlaneVisualProps): React.JSX.Element {
  const color = getPlaneColor(plane.semanticLabel as string | undefined);

  // If RATK provides a pre-built mesh geometry, use it
  if (plane.planeMesh?.geometry) {
    return (
      <mesh geometry={plane.planeMesh.geometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    );
  }

  // Fallback: flat plane sized to bounding rectangle
  const width = plane.boundingRectangleWidth || 1;
  const height = plane.boundingRectangleHeight || 1;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PlaneDetection -- renders all detected XR planes.
 *
 * Iterates over the RATK planes set each frame, emitting
 * `spatial.plane.updated` bus events for any plane that has changed.
 * Renders each plane as a semi-transparent mesh color-coded by
 * semantic label.
 */
export function PlaneDetection({
  opacity = 0.3,
  visible = true,
}: PlaneDetectionProps = {}): React.JSX.Element | null {
  const ratk = useRATK();
  const groupRef = useRef<ThreeGroup>(null);

  // Emit update events for planes that have changed
  useFrame(() => {
    if (!ratk) return;

    for (const plane of ratk.planes) {
      // RATK TransformObject sets needsUpdate when transform changes
      if ((plane as unknown as { needsUpdate?: boolean }).needsUpdate) {
        const id = getPlaneId(plane.xrPlane);
        const polygon: Array<{ x: number; y: number; z: number }> = [];
        if (plane.xrPlane.polygon) {
          for (const point of plane.xrPlane.polygon) {
            polygon.push({ x: point.x, y: point.y, z: point.z });
          }
        }

        bus.emit(SpatialEvents.PLANE_UPDATED, {
          id,
          semanticLabel: plane.semanticLabel ?? undefined,
          position: {
            x: plane.position.x,
            y: plane.position.y,
            z: plane.position.z,
          },
          rotation: {
            x: plane.quaternion.x,
            y: plane.quaternion.y,
            z: plane.quaternion.z,
            w: plane.quaternion.w,
          },
          polygon,
        });
      }
    }
  });

  if (!ratk || !visible) return null;

  // Render plane visuals as children of RATK plane groups.
  // RATK Plane objects are Three.js Groups and already have the correct
  // transform applied, so we create portals or attach to their groups.
  const planeElements: React.JSX.Element[] = [];
  let index = 0;
  for (const plane of ratk.planes) {
    planeElements.push(
      <group
        key={`plane-${index}`}
        position={[plane.position.x, plane.position.y, plane.position.z]}
        quaternion={[plane.quaternion.x, plane.quaternion.y, plane.quaternion.z, plane.quaternion.w]}
      >
        <PlaneVisual plane={plane} opacity={opacity} />
      </group>,
    );
    index++;
  }

  return (
    <group ref={groupRef}>
      {planeElements}
    </group>
  );
}
