/**
 * MeshDetection -- visual rendering of detected real-world meshes
 *
 * Renders each detected XR mesh as a wireframe overlay. Emits
 * `spatial.mesh.updated` bus events when mesh geometry changes.
 *
 * Must be rendered as a child of `<RATKProvider>`.
 *
 * @module spatial/mr/MeshDetection
 * @layer L4B
 */

import { useFrame } from '@react-three/fiber';
import type { RMesh } from 'ratk';
import React, { useRef } from 'react';
import type { Group as ThreeGroup } from 'three';


import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

import { useRATK } from './RATKProvider';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default wireframe color for detected meshes. */
const MESH_WIREFRAME_COLOR = '#00ff88';

/** Default wireframe opacity. */
const MESH_WIREFRAME_OPACITY = 0.2;

// ---------------------------------------------------------------------------
// ID tracking for update events
// ---------------------------------------------------------------------------

/** WeakMap to retrieve stable IDs for meshes (mirrors RATKProvider's tracking). */
const meshIds = new WeakMap<XRMesh, string>();

/**
 * Get or create a stable UUID for an XRMesh.
 * This mirrors the logic in RATKProvider to ensure consistent IDs.
 */
function getMeshId(xrMesh: XRMesh): string {
  let id = meshIds.get(xrMesh);
  if (!id) {
    id = crypto.randomUUID();
    meshIds.set(xrMesh, id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the MeshDetection component.
 */
export interface MeshDetectionProps {
  /** Wireframe color. Defaults to '#00ff88'. */
  color?: string;
  /** Material opacity. Defaults to 0.2. */
  opacity?: number;
  /** Whether to show mesh visualizations. Defaults to true. */
  visible?: boolean;
}

// ---------------------------------------------------------------------------
// Single mesh renderer
// ---------------------------------------------------------------------------

/**
 * Props for an individual mesh visual.
 */
interface MeshVisualProps {
  mesh: RMesh;
  color: string;
  opacity: number;
}

/**
 * Renders a single detected mesh as a wireframe overlay.
 *
 * Uses the mesh's `meshMesh` geometry if available from RATK.
 * If no geometry is available, renders nothing (meshes without
 * geometry data cannot be visualized).
 */
function MeshVisual({ mesh, color, opacity }: MeshVisualProps): React.JSX.Element | null {
  if (!mesh.meshMesh?.geometry) return null;

  return (
    <mesh geometry={mesh.meshMesh.geometry}>
      <meshBasicMaterial
        wireframe
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * MeshDetection -- renders all detected XR meshes.
 *
 * Iterates over the RATK meshes set each frame, emitting
 * `spatial.mesh.updated` bus events for any mesh that has changed.
 * Renders each mesh as a wireframe overlay.
 */
export function MeshDetection({
  color = MESH_WIREFRAME_COLOR,
  opacity = MESH_WIREFRAME_OPACITY,
  visible = true,
}: MeshDetectionProps = {}): React.JSX.Element | null {
  const ratk = useRATK();
  const groupRef = useRef<ThreeGroup>(null);

  // Emit update events for meshes that have changed
  useFrame(() => {
    if (!ratk) return;

    for (const mesh of ratk.meshes) {
      if ((mesh as unknown as { needsUpdate?: boolean }).needsUpdate) {
        const id = getMeshId(mesh.xrMesh);

        bus.emit(SpatialEvents.MESH_UPDATED, {
          id,
          semanticLabel: mesh.semanticLabel ?? undefined,
          position: {
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z,
          },
          rotation: {
            x: mesh.quaternion.x,
            y: mesh.quaternion.y,
            z: mesh.quaternion.z,
            w: mesh.quaternion.w,
          },
        });
      }
    }
  });

  if (!ratk || !visible) return null;

  const meshElements: React.JSX.Element[] = [];
  let index = 0;
  for (const mesh of ratk.meshes) {
    meshElements.push(
      <group
        key={`mesh-${index}`}
        position={[mesh.position.x, mesh.position.y, mesh.position.z]}
        quaternion={[mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w]}
      >
        <MeshVisual mesh={mesh} color={color} opacity={opacity} />
      </group>,
    );
    index++;
  }

  return (
    <group ref={groupRef}>
      {meshElements}
    </group>
  );
}
