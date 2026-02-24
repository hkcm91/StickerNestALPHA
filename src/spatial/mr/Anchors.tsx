/**
 * Anchors -- spatial anchor management component
 *
 * Manages XR spatial anchors by subscribing to bus events for anchor
 * creation/deletion and rendering visual indicators at anchor positions.
 *
 * Must be rendered as a child of `<RATKProvider>`.
 *
 * @module spatial/mr/Anchors
 * @layer L4B
 */

import { useFrame } from '@react-three/fiber';
import type { Anchor } from 'ratk';
import React, { useEffect, useRef, useState } from 'react';
import type { Group as ThreeGroup } from 'three';


import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import type { Unsubscribe } from '../../kernel/bus';

import { useRATK } from './RATKProvider';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Radius of the anchor indicator sphere in meters. */
const ANCHOR_SPHERE_RADIUS = 0.02;

/** Color of the anchor indicator sphere. */
const ANCHOR_SPHERE_COLOR = '#ff6b6b';

/** Number of segments for the anchor sphere geometry. */
const ANCHOR_SPHERE_SEGMENTS = 16;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Internal representation of a managed anchor.
 */
interface ManagedAnchor {
  id: string;
  anchor: Anchor;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
}

/**
 * Payload shape for ANCHOR_CREATED bus events (request to create).
 */
interface AnchorCreateRequest {
  id?: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  persistent?: boolean;
}

/**
 * Payload shape for ANCHOR_DELETED bus events.
 */
interface AnchorDeleteRequest {
  id: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the Anchors component.
 */
export interface AnchorsProps {
  /** Whether to show anchor indicator spheres. Defaults to true. */
  visible?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Anchors -- manages spatial anchors via the event bus.
 *
 * Subscribes to:
 * - `spatial.anchor.created` -- creates a new anchor via RATK
 * - `spatial.anchor.deleted` -- removes an existing anchor via RATK
 *
 * Renders small sphere indicators at each anchor position.
 */
export function Anchors({
  visible = true,
}: AnchorsProps = {}): React.JSX.Element | null {
  const ratk = useRATK();
  const groupRef = useRef<ThreeGroup>(null);
  const [anchors, setAnchors] = useState<ManagedAnchor[]>([]);

  // Map to look up anchors by ID for deletion
  const anchorMapRef = useRef<Map<string, Anchor>>(new Map());

  // Subscribe to anchor bus events
  useEffect(() => {
    const unsubs: Unsubscribe[] = [];

    const unsubCreate = bus.subscribe<AnchorCreateRequest>(
      SpatialEvents.ANCHOR_CREATED,
      (event) => {
        if (!ratk) return;

        const { position, rotation, persistent } = event.payload;

        // Convert to Three.js types for RATK
        const pos = { x: position.x, y: position.y, z: position.z };
        const quat = { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w };

        ratk
          .createAnchor(
            pos as unknown as import('three').Vector3,
            quat as unknown as import('three').Quaternion,
            persistent ?? false,
          )
          .then((anchor) => {
            const id = event.payload.id ?? anchor.anchorID ?? crypto.randomUUID();

            anchorMapRef.current.set(id, anchor);

            const managed: ManagedAnchor = {
              id,
              anchor,
              position: {
                x: anchor.position.x,
                y: anchor.position.y,
                z: anchor.position.z,
              },
              rotation: {
                x: anchor.quaternion.x,
                y: anchor.quaternion.y,
                z: anchor.quaternion.z,
                w: anchor.quaternion.w,
              },
            };

            setAnchors((prev) => [...prev, managed]);
          })
          .catch((err) => {
            console.error('[Anchors] Failed to create anchor:', err);
          });
      },
    );
    unsubs.push(unsubCreate);

    const unsubDelete = bus.subscribe<AnchorDeleteRequest>(
      SpatialEvents.ANCHOR_DELETED,
      (event) => {
        if (!ratk) return;

        const { id } = event.payload;
        const anchor = anchorMapRef.current.get(id);

        if (anchor) {
          ratk.deleteAnchor(anchor).catch((err) => {
            console.error('[Anchors] Failed to delete anchor:', err);
          });

          anchorMapRef.current.delete(id);
          setAnchors((prev) => prev.filter((a) => a.id !== id));
        }
      },
    );
    unsubs.push(unsubDelete);

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [ratk]);

  // Update anchor positions each frame (anchors can drift as tracking refines)
  useFrame(() => {
    if (!ratk) return;

    let changed = false;
    const updated = anchors.map((managed) => {
      const { anchor } = managed;
      const pos = anchor.position;
      const quat = anchor.quaternion;

      if (
        pos.x !== managed.position.x ||
        pos.y !== managed.position.y ||
        pos.z !== managed.position.z
      ) {
        changed = true;
        return {
          ...managed,
          position: { x: pos.x, y: pos.y, z: pos.z },
          rotation: { x: quat.x, y: quat.y, z: quat.z, w: quat.w },
        };
      }
      return managed;
    });

    if (changed) {
      setAnchors(updated);
    }
  });

  if (!ratk || !visible) return null;

  return (
    <group ref={groupRef}>
      {anchors.map((managed) => (
        <mesh
          key={managed.id}
          position={[managed.position.x, managed.position.y, managed.position.z]}
        >
          <sphereGeometry args={[ANCHOR_SPHERE_RADIUS, ANCHOR_SPHERE_SEGMENTS, ANCHOR_SPHERE_SEGMENTS]} />
          <meshBasicMaterial color={ANCHOR_SPHERE_COLOR} />
        </mesh>
      ))}
    </group>
  );
}
