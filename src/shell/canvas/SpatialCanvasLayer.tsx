import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { XR } from "@react-three/xr";
import React from "react";

import type { CanvasEntity } from "@sn/types";

import type { ThemeTokens } from "../../runtime/bridge/message-types";
import { SpatialScene } from "../../spatial/components";
import { SpatialEntity, WidgetInSpace } from "../../spatial/entities";
import { ControllerBridge, Pointer } from "../../spatial/input";
import { xrStore, SessionBridge } from "../../spatial/session";

export interface SpatialCanvasLayerProps {
  entities: CanvasEntity[];
  selectedIds: Set<string>;
  widgetHtmlMap?: Map<string, string>;
  theme?: Record<string, string>;
  onSelect?: (id: string) => void;
}

export const SpatialCanvasLayer: React.FC<SpatialCanvasLayerProps> = ({
  entities,
  selectedIds,
  widgetHtmlMap,
  theme,
  onSelect,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        background: "#11111b",
      }}
    >
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <XR store={xrStore}>
          <SpatialScene />
          <SessionBridge />
          <ControllerBridge />
          <Pointer hand="right" />

          {/* Navigation Controls */}
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

          {/* Blender-style Axis Indicator */}
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport
              axisColors={["#ff4422", "#22ff44", "#2288ff"]}
              labelColor="white"
            />
          </GizmoHelper>

          {/* Map Layer in 3D (Grid) */}
          <gridHelper
            args={[100, 100, "#444455", "#222233"]}
            position={[0, -0.01, 0]}
          />
          <axesHelper args={[5]} />

          {entities
            .filter(
              (entity) =>
                entity.canvasVisibility === "3d" ||
                entity.canvasVisibility === "both",
            )
            .map((entity) => {
              if (entity.type === "widget") {
              const html = widgetHtmlMap?.get(entity.widgetInstanceId) || "";
              return (
                <WidgetInSpace
                  key={entity.id}
                  entity={entity as any}
                  widgetHtml={html}
                  config={entity.config}
                  theme={(theme as unknown as ThemeTokens) || {}}
                  selected={selectedIds.has(entity.id)}
                  onSelect={onSelect}
                />
              );
            }
            return (
              <SpatialEntity
                key={entity.id}
                entity={entity}
                selected={selectedIds.has(entity.id)}
                onSelect={onSelect}
              />
            );
          })}
        </XR>
      </Canvas>
    </div>
  );
};
