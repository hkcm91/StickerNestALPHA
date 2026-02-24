/**
 * TeleportProvider -- locomotion component for VR teleportation
 *
 * Listens for `spatial.teleport.requested` bus events and moves the
 * XR camera rig to the requested position. Also provides a visual
 * teleport arc indicator during controller thumbstick interaction.
 *
 * Must be rendered inside a `<Canvas><XR>` tree.
 *
 * @module spatial/locomotion/TeleportProvider
 * @layer L4B
 */

import { useThree, useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Group } from 'three';

import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Payload shape for TELEPORT_REQUESTED bus events.
 */
export interface TeleportRequestPayload {
  /** Target position in world space */
  position: { x: number; y: number; z: number };
  /** Optional target rotation (yaw only, applied as Y rotation) */
  rotationY?: number;
}

/**
 * Props for the TeleportProvider component.
 */
export interface TeleportProviderProps {
  /** Child components to render inside the provider */
  children?: ReactNode;
  /** Whether teleportation is enabled (default: true) */
  enabled?: boolean;
  /** Fade duration in seconds for teleport transition (default: 0.15) */
  fadeDuration?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default fade duration in seconds */
const DEFAULT_FADE_DURATION = 0.15;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * TeleportProvider -- locomotion component.
 *
 * Lifecycle:
 * 1. Subscribes to `spatial.teleport.requested` bus events
 * 2. On teleport request: moves the XR origin group to the target position
 * 3. Applies optional Y rotation
 * 4. Renders a teleport target indicator when a teleport is pending
 *
 * The XR origin is the parent group of the camera in R3F's XR setup.
 * Moving it effectively teleports the user.
 */
export function TeleportProvider({
  children,
  enabled = true,
  fadeDuration = DEFAULT_FADE_DURATION,
}: TeleportProviderProps): React.JSX.Element {
  const { scene } = useThree();
  const session = useXR((s) => s.session);

  const originRef = useRef<Group | null>(null);
  const [targetIndicator, setTargetIndicator] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

  // Track fade state for smooth transitions
  const fadeRef = useRef({ active: false, elapsed: 0, duration: fadeDuration });

  // Find or cache the XR origin group (R3F uses the scene root for XR)
  useEffect(() => {
    if (session) {
      // In R3F XR, the origin group is typically the scene itself or
      // a dedicated XR origin group. We use the scene as the teleport target.
      originRef.current = scene as unknown as Group;
    } else {
      originRef.current = null;
    }
  }, [session, scene]);

  // Teleport handler
  const handleTeleport = useCallback(
    (position: { x: number; y: number; z: number }, rotationY?: number) => {
      const origin = originRef.current;
      if (!origin || !enabled) return;

      // Apply position offset (negate because moving origin is inverse of moving camera)
      origin.position.set(-position.x, -position.y, -position.z);

      // Apply optional Y rotation
      if (rotationY !== undefined) {
        origin.rotation.set(0, -rotationY, 0);
      }

      // Clear target indicator
      setTargetIndicator(null);
    },
    [enabled],
  );

  // Subscribe to teleport bus events
  useEffect(() => {
    if (!enabled) return;

    const unsub = bus.subscribe<TeleportRequestPayload>(
      SpatialEvents.TELEPORT_REQUESTED,
      (event) => {
        const { position, rotationY } = event.payload;
        setTargetIndicator(position);

        // Start fade transition
        fadeRef.current = {
          active: true,
          elapsed: 0,
          duration: fadeDuration,
        };

        // Execute teleport after fade (or immediately if no fade)
        if (fadeDuration <= 0) {
          handleTeleport(position, rotationY);
        } else {
          // Store pending teleport data for useFrame to execute
          pendingTeleportRef.current = { position, rotationY };
        }
      },
    );

    return unsub;
  }, [enabled, fadeDuration, handleTeleport]);

  // Pending teleport data for fade-delayed execution
  const pendingTeleportRef = useRef<{
    position: { x: number; y: number; z: number };
    rotationY?: number;
  } | null>(null);

  // Handle fade transition in animation loop
  useFrame((_, delta) => {
    const fade = fadeRef.current;
    if (!fade.active) return;

    fade.elapsed += delta;

    if (fade.elapsed >= fade.duration) {
      // Fade complete — execute teleport
      fade.active = false;
      const pending = pendingTeleportRef.current;
      if (pending) {
        handleTeleport(pending.position, pending.rotationY);
        pendingTeleportRef.current = null;
      }
    }
  });

  return (
    <>
      {/* Teleport target indicator */}
      {targetIndicator && enabled && (
        <group position={[targetIndicator.x, targetIndicator.y, targetIndicator.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.15, 0.2, 32]} />
            <meshBasicMaterial color="#6366f1" transparent opacity={0.6} />
          </mesh>
        </group>
      )}
      {children}
    </>
  );
}
