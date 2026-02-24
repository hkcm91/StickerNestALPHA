/**
 * SpatialEntity — React Three Fiber component rendering a single canvas entity in 3D space.
 *
 * Maps a `CanvasEntityBase` to a Three.js `<group>` with a `<mesh>` inside.
 * Uses the entity's `spatialTransform` for 3D positioning when available,
 * otherwise derives a default position from the 2D `transform.position`.
 *
 * @module spatial/entities/SpatialEntity
 * @layer L4B
 */

import React, { useMemo } from 'react';

import type { CanvasEntityBase, Transform3D } from '@sn/types';

/** Thin panel depth in meters for flat canvas entities */
const PANEL_DEPTH = 0.02;

/** Scale factor to convert canvas units to meters (1 canvas unit = 0.01 meters) */
const CANVAS_TO_METERS = 0.01;

/**
 * Props for the SpatialEntity component.
 */
export interface SpatialEntityProps {
  /** The canvas entity to render */
  entity: CanvasEntityBase;
  /** Whether this entity is currently selected */
  selected?: boolean;
  /** Callback fired when the entity is clicked */
  onSelect?: (entityId: string) => void;
}

/**
 * Derives a default Transform3D from a 2D transform position.
 * Maps x/y to x/y in 3D space (scaled to meters), z = 0.
 */
function deriveDefaultTransform(entity: CanvasEntityBase): {
  position: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
} {
  const pos = entity.transform.position;
  return {
    position: [pos.x * CANVAS_TO_METERS, pos.y * CANVAS_TO_METERS, 0],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  };
}

/**
 * Extracts position/rotation/scale arrays from a Transform3D.
 */
function extractTransform3D(t: Transform3D): {
  position: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
} {
  return {
    position: [t.position.x, t.position.y, t.position.z],
    rotation: [t.rotation.x, t.rotation.y, t.rotation.z, t.rotation.w],
    scale: [t.scale.x, t.scale.y, t.scale.z],
  };
}

/**
 * Renders a single canvas entity as a 3D panel in Three.js space.
 *
 * - Uses `spatialTransform` if present on the entity, otherwise derives
 *   a default position from the 2D transform.
 * - Renders a `<boxGeometry>` sized to the entity's width/height with a
 *   thin depth (panel form factor).
 * - Applies opacity from the entity.
 * - Shows a highlight (emissive material) when `selected` is true.
 * - Returns `null` when `entity.visible` is `false`.
 */
export const SpatialEntity = React.memo<SpatialEntityProps>(
  function SpatialEntity({ entity, selected = false, onSelect }) {
    if (!entity.visible) return null;

    const transform = useMemo(
      () =>
        entity.spatialTransform
          ? extractTransform3D(entity.spatialTransform)
          : deriveDefaultTransform(entity),
      [entity.spatialTransform, entity.transform.position.x, entity.transform.position.y],
    );

    const geometry = useMemo(() => {
      const w = entity.transform.size.width * CANVAS_TO_METERS;
      const h = entity.transform.size.height * CANVAS_TO_METERS;
      return [w, h, PANEL_DEPTH] as [number, number, number];
    }, [entity.transform.size.width, entity.transform.size.height]);

    const handleClick = useMemo(() => {
      if (!onSelect) return undefined;
      return (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        onSelect(entity.id);
      };
    }, [onSelect, entity.id]);

    return (
      <group
        position={transform.position}
        quaternion={transform.rotation}
        scale={transform.scale}
      >
        <mesh onClick={handleClick}>
          <boxGeometry args={geometry} />
          <meshStandardMaterial
            color={selected ? '#8b5cf6' : '#e5e7eb'}
            transparent={entity.opacity < 1}
            opacity={entity.opacity}
            emissive={selected ? '#6366f1' : '#000000'}
            emissiveIntensity={selected ? 0.4 : 0}
          />
        </mesh>
      </group>
    );
  },
);
