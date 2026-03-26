/**
 * SpatialCanvasLayer — Three.js / WebXR canvas for 3D and VR modes.
 *
 * Composes R3F Canvas, XR session, spatial bridges (controller, hand,
 * session), MR features (plane/mesh detection, anchors, hit test),
 * teleportation, and entity rendering into a single layer that replaces
 * the 2D canvas when `spatialMode !== '2d'`.
 *
 * @module shell/canvas/SpatialCanvasLayer
 * @layer L6
 */

import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { XR } from "@react-three/xr";
import React, { useCallback, useEffect, useState } from "react";

import type { CanvasEntity, SpatialMode } from "@sn/types";

import type { ThemeTokens } from "../../runtime/bridge/message-types";
import { SpatialScene } from "../../spatial/components";
import { SpatialEntity, WidgetInSpace } from "../../spatial/entities";
import { ControllerBridge, HandBridge, Pointer } from "../../spatial/input";
import { TeleportProvider } from "../../spatial/locomotion";
import {
  RATKProvider,
  PlaneDetection,
  MeshDetection,
  Anchors,
  HitTest,
} from "../../spatial/mr";
import { xrStore, SessionBridge, enterXR } from "../../spatial/session";

export interface SpatialCanvasLayerProps {
  entities: CanvasEntity[];
  selectedIds: Set<string>;
  widgetHtmlMap?: Map<string, string>;
  theme?: Record<string, string>;
  spatialMode: SpatialMode;
  setSpatialMode: (mode: SpatialMode) => void;
  onSelect?: (id: string) => void;
}

export const SpatialCanvasLayer: React.FC<SpatialCanvasLayerProps> = ({
  entities,
  selectedIds,
  widgetHtmlMap,
  theme,
  spatialMode,
  setSpatialMode,
  onSelect,
}) => {
  const isMRMode = spatialMode === "vr" || spatialMode === "ar";
  const [vrSupported, setVrSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.xr?.isSessionSupported("immersive-vr").then((supported) => {
      if (!cancelled) setVrSupported(supported);
    });
    return () => { cancelled = true; };
  }, []);

  const handleEnterVR = useCallback(() => {
    setSpatialMode("vr");
    enterXR("immersive-vr");
  }, [setSpatialMode]);

  return (
    <div
      data-testid="spatial-canvas-layer"
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
          <HandBridge />
          <Pointer hand="right" />

          <TeleportProvider>
            {/* Navigation Controls (disabled in immersive XR — camera is headset) */}
            {!isMRMode && (
              <>
                <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
                <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                  <GizmoViewport
                    axisColors={["#ff4422", "#22ff44", "#2288ff"]}
                    labelColor="white"
                  />
                </GizmoHelper>
              </>
            )}

            {/* Ground grid + axes */}
            <gridHelper
              args={[100, 100, "#444455", "#222233"]}
              position={[0, -0.01, 0]}
            />
            <axesHelper args={[5]} />

            {/* MR features — only in VR/AR mode */}
            {isMRMode && (
              <RATKProvider>
                <PlaneDetection />
                <MeshDetection />
                <Anchors />
                <HitTest />
              </RATKProvider>
            )}

            {/* Entity rendering */}
            {entities
              .filter(
                (entity) =>
                  entity.canvasVisibility === "3d" ||
                  entity.canvasVisibility === "both",
              )
              .map((entity) => {
                if (entity.type === "widget") {
                  const html =
                    widgetHtmlMap?.get(
                      (entity as CanvasEntity & { widgetInstanceId: string })
                        .widgetInstanceId,
                    ) || "";
                  return (
                    <WidgetInSpace
                      key={entity.id}
                      entity={entity as any}
                      widgetHtml={html}
                      config={(entity as any).config ?? {}}
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
          </TeleportProvider>
        </XR>
      </Canvas>

      {/* Enter VR overlay button — visible in 3D mode when WebXR is supported */}
      {spatialMode === "3d" && vrSupported && (
        <button
          data-testid="enter-vr-button"
          onClick={handleEnterVR}
          title="Enter VR (Shift+V)"
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: "rgba(99, 102, 241, 0.9)",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            backdropFilter: "blur(8px)",
            zIndex: 10,
          }}
        >
          <VRHeadsetIcon />
          Enter VR
        </button>
      )}
    </div>
  );
};

/** Simple VR headset SVG icon */
function VRHeadsetIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4l-2-2h-4l-2 2H4a2 2 0 0 1-2-2V8z" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="12" r="2" />
    </svg>
  );
}
