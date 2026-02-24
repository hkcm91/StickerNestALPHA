/**
 * WidgetInSpace — renders a widget inside 3D space using drei's `<Html>` component.
 *
 * Embeds a `<WidgetFrame>` (from the Runtime layer) inside a Three.js scene
 * via `@react-three/drei`'s `<Html transform occlude>`. Supports spatial positioning
 * through the entity's `spatialTransform` or a derived default from the 2D transform.
 *
 * @module spatial/entities/WidgetInSpace
 * @layer L4B
 */

import { Html } from '@react-three/drei';
import React, { useMemo } from 'react';

import type { Transform3D, WidgetContainerEntity } from '@sn/types';

import type { ThemeTokens } from '../../runtime/bridge/message-types';
import { WidgetFrame } from '../../runtime/WidgetFrame';

/** Scale factor to convert canvas units to meters */
const CANVAS_TO_METERS = 0.01;

/**
 * Props for the WidgetInSpace component.
 */
export interface WidgetInSpaceProps {
  /** The widget container entity */
  entity: WidgetContainerEntity;
  /** Widget HTML source */
  widgetHtml: string;
  /** Widget configuration */
  config: Record<string, unknown>;
  /** Theme tokens to inject into the widget */
  theme: ThemeTokens;
  /** Whether this entity is currently selected */
  selected?: boolean;
  /** Callback fired when the entity is clicked */
  onSelect?: (entityId: string) => void;
}

/**
 * Derives a default position from the 2D transform.
 */
function deriveDefaultPosition(entity: WidgetContainerEntity): [number, number, number] {
  const pos = entity.transform.position;
  return [pos.x * CANVAS_TO_METERS, pos.y * CANVAS_TO_METERS, 0];
}

/**
 * Extracts position tuple from a Transform3D.
 */
function extractPosition(t: Transform3D): [number, number, number] {
  return [t.position.x, t.position.y, t.position.z];
}

/**
 * Extracts quaternion tuple from a Transform3D.
 */
function extractRotation(t: Transform3D): [number, number, number, number] {
  return [t.rotation.x, t.rotation.y, t.rotation.z, t.rotation.w];
}

/**
 * Extracts scale tuple from a Transform3D.
 */
function extractScale(t: Transform3D): [number, number, number] {
  return [t.scale.x, t.scale.y, t.scale.z];
}

/**
 * Renders a widget entity in 3D space via an embedded `<Html>` wrapper from drei.
 *
 * - Uses the entity's `spatialTransform` when present, or derives position from 2D transform.
 * - Wraps the `<WidgetFrame>` in a sized `<div>` inside the `<Html>` component.
 * - Applies a subtle border when `selected` is true.
 * - Returns `null` when `entity.visible` is `false`.
 */
export const WidgetInSpace = React.memo<WidgetInSpaceProps>(
  function WidgetInSpace({
    entity,
    widgetHtml,
    config,
    theme,
    selected = false,
    onSelect,
  }) {
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

    const containerStyle = useMemo(
      () => ({
        width: entity.transform.size.width,
        height: entity.transform.size.height,
        overflow: 'hidden' as const,
        border: selected ? '2px solid #6366f1' : 'none',
        borderRadius: '4px',
      }),
      [entity.transform.size.width, entity.transform.size.height, selected],
    );

    return (
      <group
        position={position}
        quaternion={rotation}
        scale={scale}
        onClick={handleClick}
      >
        <Html transform occlude>
          <div style={containerStyle}>
            <WidgetFrame
              widgetId={entity.widgetId}
              instanceId={entity.widgetInstanceId}
              widgetHtml={widgetHtml}
              config={config}
              theme={theme}
              visible={entity.visible}
              width={entity.transform.size.width}
              height={entity.transform.size.height}
            />
          </div>
        </Html>
      </group>
    );
  },
);
