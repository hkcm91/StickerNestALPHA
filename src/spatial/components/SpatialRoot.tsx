/**
 * SpatialRoot -- top-level R3F + XR composition component
 *
 * Wraps `<Canvas>` and `<XR>` from React Three Fiber / @react-three/xr,
 * and composes all spatial sub-modules (session, input, entities, MR,
 * locomotion) into a single mount point.
 *
 * This component is the entry point for the entire 3D/VR/MR experience.
 * Mount it at the shell level alongside the 2D canvas.
 *
 * @module spatial/components/SpatialRoot
 * @layer L4B
 */

import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import React from 'react';
import type { ReactNode } from 'react';

import { EntityManager } from '../entities';
import { ControllerBridge, HandBridge, Pointer } from '../input';
import { TeleportProvider } from '../locomotion';
import {
  RATKProvider,
  PlaneDetection,
  MeshDetection,
  Anchors,
  HitTest,
} from '../mr';
import { xrStore, SessionBridge } from '../session';

import { SpatialScene } from './SpatialScene';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the SpatialRoot component.
 */
export interface SpatialRootProps {
  /** Whether MR features (plane/mesh detection, anchors, hit test) are enabled */
  enableMR?: boolean;
  /** Whether teleport locomotion is enabled */
  enableTeleport?: boolean;
  /** Whether hand tracking bridges are enabled */
  enableHands?: boolean;
  /** Additional children to render inside the XR tree */
  children?: ReactNode;
  /** CSS class for the canvas container */
  className?: string;
  /** CSS style for the canvas container */
  style?: React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SpatialRoot -- the top-level mount point for the 3D/VR/MR experience.
 *
 * Composition tree:
 * ```
 * <Canvas>
 *   <XR store={xrStore}>
 *     <SpatialScene />
 *     <SessionBridge />
 *     <ControllerBridge />
 *     <HandBridge />         (optional)
 *     <Pointer />
 *     <EntityManager />
 *     <TeleportProvider />   (optional)
 *     <RATKProvider>          (optional, MR only)
 *       <PlaneDetection />
 *       <MeshDetection />
 *       <Anchors />
 *       <HitTest />
 *     </RATKProvider>
 *     {children}
 *   </XR>
 * </Canvas>
 * ```
 *
 * All sub-modules are renderless bridge components that emit bus events.
 * The visual output comes from EntityManager, PlaneDetection, etc.
 */
export function SpatialRoot({
  enableMR = false,
  enableTeleport = true,
  enableHands = true,
  children,
  className,
  style,
}: SpatialRootProps): React.JSX.Element {
  return (
    <Canvas
      className={className}
      style={style}
    >
      <XR store={xrStore}>
        {/* Scene environment */}
        <SpatialScene />

        {/* Session lifecycle bridge */}
        <SessionBridge />

        {/* Input bridges */}
        <ControllerBridge />
        {enableHands && <HandBridge />}
        <Pointer hand="right" />

        {/* Entity rendering */}
        <EntityManager />

        {/* Locomotion */}
        {enableTeleport && <TeleportProvider />}

        {/* MR features (gated) */}
        {enableMR && (
          <RATKProvider>
            <PlaneDetection />
            <MeshDetection />
            <Anchors />
            <HitTest />
          </RATKProvider>
        )}

        {/* App-specific children */}
        {children}
      </XR>
    </Canvas>
  );
}
