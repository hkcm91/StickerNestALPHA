/**
 * SpatialScene -- lighting and environment setup for the 3D spatial scene
 *
 * Provides default ambient + directional lighting and optional environment
 * configuration. This is a declarative replacement for the imperative
 * `createSpatialScene()` in the legacy scene module.
 *
 * Must be rendered inside a `<Canvas>` tree.
 *
 * @module spatial/components/SpatialScene
 * @layer L4B
 */

import React from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the SpatialScene component.
 */
export interface SpatialSceneProps {
  /** Ambient light intensity (default: 0.6) */
  ambientIntensity?: number;
  /** Directional light intensity (default: 0.8) */
  directionalIntensity?: number;
  /** Directional light position [x, y, z] (default: [5, 10, 5]) */
  directionalPosition?: [number, number, number];
  /** Background color (default: transparent for MR passthrough) */
  backgroundColor?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_AMBIENT_INTENSITY = 0.6;
const DEFAULT_DIRECTIONAL_INTENSITY = 0.8;
const DEFAULT_DIRECTIONAL_POSITION: [number, number, number] = [5, 10, 5];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SpatialScene -- scene environment setup.
 *
 * Sets up:
 * 1. Ambient light for base illumination
 * 2. Directional light for shadows and depth cues
 * 3. Optional background color (defaults to transparent for MR passthrough)
 *
 * This component renders only lighting primitives and is intended to be
 * placed inside the `<Canvas><XR>` tree.
 */
export function SpatialScene({
  ambientIntensity = DEFAULT_AMBIENT_INTENSITY,
  directionalIntensity = DEFAULT_DIRECTIONAL_INTENSITY,
  directionalPosition = DEFAULT_DIRECTIONAL_POSITION,
}: SpatialSceneProps): React.JSX.Element {
  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        intensity={directionalIntensity}
        position={directionalPosition}
        castShadow
      />
    </>
  );
}
