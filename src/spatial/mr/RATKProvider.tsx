/**
 * RATKProvider -- core MR bridge component
 *
 * Instantiates the RATK (Reality Accelerator Toolkit) library and bridges
 * plane/mesh detection events to the StickerNest event bus. Provides the
 * RATK instance to child components via React context.
 *
 * Must be rendered inside a `<Canvas><XR>` tree so that `useThree()` and
 * `useXR()` resolve correctly.
 *
 * @module spatial/mr/RATKProvider
 * @layer L4B
 */

import { useThree, useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { RealityAccelerator } from 'ratk';
import type { Plane as RATKPlane, RMesh } from 'ratk';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import type { ReactNode } from 'react';


import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * React context for distributing the RATK instance to child components.
 * The value is `null` when no XR session is active.
 */
const RATKContext = createContext<RealityAccelerator | null>(null);

/**
 * Hook to access the RATK instance from context.
 *
 * @returns The RATK instance if an XR session is active and the component
 *          is a descendant of `<RATKProvider>`, or `null` otherwise.
 */
export function useRATK(): RealityAccelerator | null {
  return useContext(RATKContext);
}

// ---------------------------------------------------------------------------
// ID Management
// ---------------------------------------------------------------------------

/** WeakMap to assign stable UUIDs to XRPlane objects across callbacks. */
const planeIds = new WeakMap<XRPlane, string>();

/** WeakMap to assign stable UUIDs to XRMesh objects across callbacks. */
const meshIds = new WeakMap<XRMesh, string>();

/**
 * Get or create a stable UUID for an XRPlane.
 */
function getPlaneId(xrPlane: XRPlane): string {
  let id = planeIds.get(xrPlane);
  if (!id) {
    id = crypto.randomUUID();
    planeIds.set(xrPlane, id);
  }
  return id;
}

/**
 * Get or create a stable UUID for an XRMesh.
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
// Helper: extract transform payload from a Three.js Group
// ---------------------------------------------------------------------------

/**
 * Extract position and rotation from a RATK object (which extends Three.js Group).
 */
function extractTransform(obj: { position: { x: number; y: number; z: number }; quaternion: { x: number; y: number; z: number; w: number } }) {
  return {
    position: {
      x: obj.position.x,
      y: obj.position.y,
      z: obj.position.z,
    },
    rotation: {
      x: obj.quaternion.x,
      y: obj.quaternion.y,
      z: obj.quaternion.z,
      w: obj.quaternion.w,
    },
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the RATKProvider component.
 */
export interface RATKProviderProps {
  /** Child components that will have access to the RATK instance via useRATK(). */
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RATKProvider -- MR bridge component.
 *
 * Lifecycle:
 * 1. When an XR session starts, creates a `RealityAccelerator` instance
 * 2. Adds `ratk.root` to the Three.js scene
 * 3. Wires RATK callbacks to emit `spatial.plane.*` and `spatial.mesh.*` bus events
 * 4. Calls `ratk.update()` every frame via `useFrame`
 * 5. Cleans up when the XR session ends
 *
 * Provides the RATK instance to children via React context.
 */
export function RATKProvider({ children }: RATKProviderProps): React.JSX.Element {
  const { gl, scene } = useThree();
  const session = useXR((s) => s.session);

  const ratkRef = useRef<RealityAccelerator | null>(null);

  // Memoised plane callback
  const handlePlaneAdded = useCallback((plane: RATKPlane) => {
    const id = getPlaneId(plane.xrPlane);
    const { position, rotation } = extractTransform(plane);

    // Extract polygon from plane vertices if available
    const polygon: Array<{ x: number; y: number; z: number }> = [];
    if (plane.xrPlane.polygon) {
      for (const point of plane.xrPlane.polygon) {
        polygon.push({ x: point.x, y: point.y, z: point.z });
      }
    }

    bus.emit(SpatialEvents.PLANE_DETECTED, {
      id,
      semanticLabel: plane.semanticLabel ?? undefined,
      position,
      rotation,
      polygon,
    });
  }, []);

  const handlePlaneDeleted = useCallback((plane: RATKPlane) => {
    const id = getPlaneId(plane.xrPlane);
    bus.emit(SpatialEvents.PLANE_REMOVED, { id });
  }, []);

  const handleMeshAdded = useCallback((mesh: RMesh) => {
    const id = getMeshId(mesh.xrMesh);
    const { position, rotation } = extractTransform(mesh);

    bus.emit(SpatialEvents.MESH_DETECTED, {
      id,
      semanticLabel: mesh.semanticLabel ?? undefined,
      position,
      rotation,
    });
  }, []);

  const handleMeshDeleted = useCallback((mesh: RMesh) => {
    const id = getMeshId(mesh.xrMesh);
    bus.emit(SpatialEvents.MESH_REMOVED, { id });
  }, []);

  // Session lifecycle: create/destroy RATK
  useEffect(() => {
    if (session) {
      // Session started -- instantiate RATK
      const ratk = new RealityAccelerator(gl.xr);
      ratkRef.current = ratk;

      // Add RATK root group to the Three.js scene
      scene.add(ratk.root);

      // Wire callbacks
      ratk.onPlaneAdded = handlePlaneAdded;
      ratk.onPlaneDeleted = handlePlaneDeleted;
      ratk.onMeshAdded = handleMeshAdded;
      ratk.onMeshDeleted = handleMeshDeleted;

      return () => {
        // Clean up on session end or unmount
        ratk.onPlaneAdded = undefined;
        ratk.onPlaneDeleted = undefined;
        ratk.onMeshAdded = undefined;
        ratk.onMeshDeleted = undefined;
        scene.remove(ratk.root);
        ratkRef.current = null;
      };
    } else {
      // No session -- ensure RATK is cleaned up
      if (ratkRef.current) {
        const ratk = ratkRef.current;
        ratk.onPlaneAdded = undefined;
        ratk.onPlaneDeleted = undefined;
        ratk.onMeshAdded = undefined;
        ratk.onMeshDeleted = undefined;
        scene.remove(ratk.root);
        ratkRef.current = null;
      }
    }
  }, [session, gl.xr, scene, handlePlaneAdded, handlePlaneDeleted, handleMeshAdded, handleMeshDeleted]);

  // Per-frame update
  useFrame(() => {
    if (ratkRef.current) {
      ratkRef.current.update();
    }
  });

  return (
    <RATKContext.Provider value={ratkRef.current}>
      {children}
    </RATKContext.Provider>
  );
}
