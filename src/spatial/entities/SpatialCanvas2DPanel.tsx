/**
 * SpatialCanvas2DPanel — a draggable, pinnable 2D canvas surface in 3D/VR space.
 *
 * Renders the full 2D canvas (with entities, pan/zoom, tools) inside a floating
 * panel in 3D space, similar to VR system menus. Users can:
 * - Grab and drag the panel by its handle bar (grip button in VR, mouse drag in 3D)
 * - Pin the panel at a fixed position
 * - Unpin and move it freely
 * - Interact with the 2D canvas normally through the panel surface
 *
 * The panel has a title bar/handle for grab interactions and a subtle 3D frame.
 *
 * @module spatial/entities/SpatialCanvas2DPanel
 * @layer L4B
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { SpatialEvents } from '@sn/types';
import type { Transform3D } from '@sn/types';

import { bus } from '../../kernel/bus';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default panel width in meters */
const DEFAULT_WIDTH_M = 1.2;
/** Default panel height in meters */
const DEFAULT_HEIGHT_M = 0.9;
/** Handle bar height in meters */
const HANDLE_HEIGHT_M = 0.04;
/** Frame depth in meters */
const FRAME_DEPTH = 0.012;
/** Panel border radius for the DOM content */
const BORDER_RADIUS = 8;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpatialCanvas2DPanelProps {
  /** Unique panel identifier */
  panelId: string;
  /** Initial 3D transform (position, rotation, scale) */
  initialTransform?: Transform3D;
  /** Width of the 2D canvas content in CSS pixels */
  canvasWidth?: number;
  /** Height of the 2D canvas content in CSS pixels */
  canvasHeight?: number;
  /** Whether the panel starts pinned */
  pinned?: boolean;
  /** Label shown on the handle bar */
  label?: string;
  /** Content to render inside the panel (the 2D canvas) */
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractPosition(t: Transform3D): THREE.Vector3 {
  return new THREE.Vector3(t.position.x, t.position.y, t.position.z);
}

function extractQuaternion(t: Transform3D): THREE.Quaternion {
  return new THREE.Quaternion(t.rotation.x, t.rotation.y, t.rotation.z, t.rotation.w);
}

const DEFAULT_TRANSFORM: Transform3D = {
  position: { x: 0, y: 1.4, z: -0.8 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  scale: { x: 1, y: 1, z: 1 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a floating 2D canvas panel in 3D/VR space.
 *
 * Architecture:
 * - Outer `<group>` positions the panel in 3D space
 * - A Three.js box mesh provides the physical frame/backing
 * - A handle bar mesh at the top serves as the grab target
 * - drei's `<Html>` embeds the 2D canvas DOM inside the panel
 * - Grab state is tracked via bus events (PANEL_GRABBED / PANEL_RELEASED)
 * - Position updates are emitted as ENTITY_TRANSFORMED events
 */
export const SpatialCanvas2DPanel = React.memo<SpatialCanvas2DPanelProps>(
  function SpatialCanvas2DPanel({
    panelId,
    initialTransform = DEFAULT_TRANSFORM,
    canvasWidth = 1200,
    canvasHeight = 900,
    pinned: initialPinned = false,
    label = 'Canvas',
    children,
  }) {
    const groupRef = useRef<THREE.Group>(null);
    const [isPinned, setIsPinned] = useState(initialPinned);
    const [isGrabbed, setIsGrabbed] = useState(false);
    const grabOffset = useRef<THREE.Vector3>(new THREE.Vector3());
    const grabControllerRef = useRef<THREE.Object3D | null>(null);

    // Panel dimensions in meters
    const widthM = DEFAULT_WIDTH_M;
    const heightM = DEFAULT_HEIGHT_M;
    const totalHeight = heightM + HANDLE_HEIGHT_M;

    // Initialize position from transform
    useEffect(() => {
      if (groupRef.current?.position?.copy) {
        const pos = extractPosition(initialTransform);
        const rot = extractQuaternion(initialTransform);
        groupRef.current.position.copy(pos);
        groupRef.current.quaternion.copy(rot);
      }
    }, [initialTransform]);

    // Listen for grab/release events targeting this panel
    useEffect(() => {
      const unsubGrab = bus.subscribe(SpatialEvents.PANEL_GRABBED, (event: any) => {
        if (event.payload?.panelId !== panelId) return;
        if (isPinned) return; // Pinned panels can't be grabbed
        setIsGrabbed(true);

        // Store the controller reference and offset for smooth tracking
        if (event.payload.controllerObject && groupRef.current) {
          grabControllerRef.current = event.payload.controllerObject;
          const panelPos = groupRef.current.position.clone();
          const controllerPos = new THREE.Vector3();
          event.payload.controllerObject.getWorldPosition(controllerPos);
          grabOffset.current.copy(panelPos).sub(controllerPos);
        }
      });

      const unsubRelease = bus.subscribe(SpatialEvents.PANEL_RELEASED, (event: any) => {
        if (event.payload?.panelId !== panelId) return;
        setIsGrabbed(false);
        grabControllerRef.current = null;

        // Emit final position
        if (groupRef.current) {
          const pos = groupRef.current.position;
          const rot = groupRef.current.quaternion;
          bus.emit(SpatialEvents.ENTITY_TRANSFORMED, {
            entityId: panelId,
            spatialTransform: {
              position: { x: pos.x, y: pos.y, z: pos.z },
              rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
              scale: { x: 1, y: 1, z: 1 },
            },
          });
        }
      });

      const unsubPin = bus.subscribe(SpatialEvents.PANEL_PINNED, (event: any) => {
        if (event.payload?.panelId !== panelId) return;
        setIsPinned(true);
        setIsGrabbed(false);
        grabControllerRef.current = null;
      });

      const unsubUnpin = bus.subscribe(SpatialEvents.PANEL_UNPINNED, (event: any) => {
        if (event.payload?.panelId !== panelId) return;
        setIsPinned(false);
      });

      return () => {
        unsubGrab();
        unsubRelease();
        unsubPin();
        unsubUnpin();
      };
    }, [panelId, isPinned]);

    // Track controller position while grabbed
    useFrame(() => {
      if (!isGrabbed || !grabControllerRef.current || !groupRef.current) return;
      const controllerPos = new THREE.Vector3();
      grabControllerRef.current.getWorldPosition(controllerPos);
      groupRef.current.position.copy(controllerPos.add(grabOffset.current));
    });

    // Handle grab via pointer (mouse/ray in 3D mode)
    const handlePointerDown = useCallback(
      (e: any) => {
        if (isPinned) return;
        e.stopPropagation();
        bus.emit(SpatialEvents.PANEL_GRABBED, { panelId });
      },
      [panelId, isPinned],
    );

    const handlePointerUp = useCallback(
      (e: any) => {
        if (!isGrabbed) return;
        e.stopPropagation();
        bus.emit(SpatialEvents.PANEL_RELEASED, { panelId });
      },
      [panelId, isGrabbed],
    );

    // Toggle pin
    const handleTogglePin = useCallback(() => {
      if (isPinned) {
        bus.emit(SpatialEvents.PANEL_UNPINNED, { panelId });
      } else {
        bus.emit(SpatialEvents.PANEL_PINNED, { panelId });
      }
    }, [panelId, isPinned]);

    // Handle bar color
    const handleColor = isGrabbed ? '#6366f1' : isPinned ? '#22c55e' : '#374151';

    const containerStyle = useMemo(
      () => ({
        width: canvasWidth,
        height: canvasHeight,
        overflow: 'hidden' as const,
        borderRadius: `0 0 ${BORDER_RADIUS}px ${BORDER_RADIUS}px`,
        background: '#11111b',
        pointerEvents: 'auto' as const,
      }),
      [canvasWidth, canvasHeight],
    );

    const handleBarStyle = useMemo(
      () => ({
        width: canvasWidth,
        height: 36,
        background: handleColor,
        borderRadius: `${BORDER_RADIUS}px ${BORDER_RADIUS}px 0 0`,
        display: 'flex' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        padding: '0 12px',
        cursor: isPinned ? 'default' : 'grab',
        userSelect: 'none' as const,
        transition: 'background 0.15s',
      }),
      [canvasWidth, handleColor, isPinned],
    );

    return (
      <group ref={groupRef}>
        {/* Backing frame — gives the panel physical presence */}
        <mesh position={[0, 0, -FRAME_DEPTH / 2]}>
          <boxGeometry args={[widthM, totalHeight, FRAME_DEPTH]} />
          <meshStandardMaterial
            color={isGrabbed ? '#1e1b4b' : '#0f0f1a'}
            transparent
            opacity={0.95}
            emissive={isGrabbed ? '#4338ca' : '#000000'}
            emissiveIntensity={isGrabbed ? 0.2 : 0}
          />
        </mesh>

        {/* Handle bar — grab target in VR */}
        <mesh
          position={[0, heightM / 2 + HANDLE_HEIGHT_M / 2, 0.001]}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <boxGeometry args={[widthM, HANDLE_HEIGHT_M, 0.003]} />
          <meshStandardMaterial
            color={handleColor}
            emissive={isGrabbed ? '#818cf8' : '#000000'}
            emissiveIntensity={isGrabbed ? 0.5 : 0}
          />
        </mesh>

        {/* DOM content: handle bar label + 2D canvas */}
        <Html transform occlude position={[0, HANDLE_HEIGHT_M / 2, 0.002]}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Handle bar overlay with label and pin button */}
            <div
              style={handleBarStyle}
              onPointerDown={(e) => {
                if (isPinned) return;
                e.stopPropagation();
                bus.emit(SpatialEvents.PANEL_GRABBED, { panelId });
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                bus.emit(SpatialEvents.PANEL_RELEASED, { panelId });
              }}
            >
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em' }}>
                {isPinned ? '📌 ' : ''}
                {label}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={handleTogglePin}
                  title={isPinned ? 'Unpin panel' : 'Pin panel'}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: 4,
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: '2px 8px',
                  }}
                >
                  {isPinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  onClick={() => bus.emit(SpatialEvents.PANEL_CLOSED, { panelId })}
                  title="Close panel"
                  style={{
                    background: 'rgba(239,68,68,0.7)',
                    border: 'none',
                    borderRadius: 4,
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: '2px 8px',
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* 2D canvas content */}
            <div style={containerStyle}>
              {children}
            </div>
          </div>
        </Html>
      </group>
    );
  },
);
