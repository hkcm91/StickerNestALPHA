/**
 * Entity2DInSpace — renders any 2D canvas entity in 3D space via drei's `<Html>`.
 *
 * Uses the existing per-type renderers from the shell canvas layer, embedded in
 * a Three.js group via `@react-three/drei`'s `<Html transform occlude>`.
 * Supports spatial positioning through the entity's `spatialTransform` or a
 * derived default from the 2D transform.
 *
 * This component renders sticker, text, shape, drawing, path, svg, lottie, audio,
 * group, and docker entities — all entity types that are NOT `widget` or `object3d`.
 * Widgets use `WidgetInSpace` (separate Runtime integration). Object3D entities use
 * `SpatialEntity` (native Three.js geometry).
 *
 * @module spatial/entities/Entity2DInSpace
 * @layer L4B
 */

import { Html } from '@react-three/drei';
import React, { useMemo } from 'react';

import type { CanvasEntityBase, Transform3D } from '@sn/types';

/** Scale factor to convert canvas units to meters */
const CANVAS_TO_METERS = 0.01;

/** Thin panel depth behind the 2D content for visual backing */
const PANEL_DEPTH = 0.005;

/**
 * Props for the Entity2DInSpace component.
 */
export interface Entity2DInSpaceProps {
  /** The canvas entity to render */
  entity: CanvasEntityBase;
  /** React element for the entity's 2D content (rendered by the appropriate renderer) */
  children: React.ReactNode;
  /** Whether this entity is currently selected */
  selected?: boolean;
  /** Callback fired when the entity is clicked */
  onSelect?: (entityId: string) => void;
}

function deriveDefaultPosition(entity: CanvasEntityBase): [number, number, number] {
  const pos = entity.transform.position;
  return [pos.x * CANVAS_TO_METERS, pos.y * CANVAS_TO_METERS, 0];
}

function extractPosition(t: Transform3D): [number, number, number] {
  return [t.position.x, t.position.y, t.position.z];
}

function extractRotation(t: Transform3D): [number, number, number, number] {
  return [t.rotation.x, t.rotation.y, t.rotation.z, t.rotation.w];
}

function extractScale(t: Transform3D): [number, number, number] {
  return [t.scale.x, t.scale.y, t.scale.z];
}

/**
 * Renders any 2D entity in 3D space by wrapping its DOM renderer in drei's `<Html>`.
 *
 * - Uses the entity's `spatialTransform` when present, or derives position from 2D transform.
 * - Renders a subtle backing mesh behind the HTML content for depth.
 * - Applies a highlight border when `selected` is true.
 * - Returns `null` when `entity.visible` is `false`.
 */
export const Entity2DInSpace = React.memo<Entity2DInSpaceProps>(
  function Entity2DInSpace({ entity, children, selected = false, onSelect }) {
    if (!entity.visible) return null;

    const position = useMemo(
      () =>
        entity.spatialTransform
          ? extractPosition(entity.spatialTransform)
          : deriveDefaultPosition(entity),
      [entity.spatialTransform, entity.transform.position.x, entity.transform.position.y],
    );

    const rotation = useMemo(
      () =>
        entity.spatialTransform
          ? extractRotation(entity.spatialTransform)
          : ([0, 0, 0, 1] as [number, number, number, number]),
      [entity.spatialTransform],
    );

    const scale = useMemo(
      () =>
        entity.spatialTransform
          ? extractScale(entity.spatialTransform)
          : ([1, 1, 1] as [number, number, number]),
      [entity.spatialTransform],
    );

    const handleClick = useMemo(() => {
      if (!onSelect) return undefined;
      return (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        onSelect(entity.id);
      };
    }, [onSelect, entity.id]);

    const w = entity.transform.size.width;
    const h = entity.transform.size.height;

    // Backing panel geometry (slightly behind the HTML content)
    const panelW = w * CANVAS_TO_METERS;
    const panelH = h * CANVAS_TO_METERS;

    const containerStyle = useMemo(
      () => ({
        width: w,
        height: h,
        overflow: 'hidden' as const,
        border: selected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: entity.borderRadius > 0 ? entity.borderRadius : 4,
        background: 'rgba(17, 17, 27, 0.95)',
        pointerEvents: 'auto' as const,
      }),
      [w, h, selected, entity.borderRadius],
    );

    return (
      <group
        position={position}
        quaternion={rotation}
        scale={scale}
        onClick={handleClick}
      >
        {/* Backing panel mesh — gives depth to the 2D content */}
        <mesh position={[0, 0, -PANEL_DEPTH / 2]}>
          <boxGeometry args={[panelW, panelH, PANEL_DEPTH]} />
          <meshStandardMaterial
            color={selected ? '#312e81' : '#1e1b4b'}
            transparent
            opacity={0.9}
            emissive={selected ? '#6366f1' : '#000000'}
            emissiveIntensity={selected ? 0.3 : 0}
          />
        </mesh>

        {/* 2D DOM content rendered in 3D space */}
        <Html transform occlude>
          <div style={containerStyle}>
            {children}
          </div>
        </Html>
      </group>
    );
  },
);
