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
import React, { useCallback, useEffect, useRef, useState } from "react";

import type { CanvasEntity, SpatialMode } from "@sn/types";
import { ShellEvents, SpatialEvents } from "@sn/types";

import { bus } from "../../kernel/bus";
import type { ThemeTokens } from "../../runtime/bridge/message-types";
import { SpatialScene } from "../../spatial/components";
import { Entity2DInSpace, SpatialCanvas2DPanel, SpatialEntity, WidgetInSpace } from "../../spatial/entities";
import { ControllerBridge, GrabHandler, HandBridge, Pointer } from "../../spatial/input";
import { TeleportProvider } from "../../spatial/locomotion";
import {
  RATKProvider,
  PlaneDetection,
  MeshDetection,
  Anchors,
  HitTest,
} from "../../spatial/mr";
import { xrStore, SessionBridge, enterXR } from "../../spatial/session";

import {
  AudioRenderer,
  DrawingRenderer,
  GroupRenderer,
  LottieRenderer,
  PathRenderer,
  ShapeRenderer,
  StickerRenderer,
  SvgRenderer,
  TextRenderer,
} from "./renderers";

/**
 * Maps a 2D entity to its DOM renderer for embedding in 3D space.
 * Returns null for entity types handled by dedicated 3D components (widget, object3d).
 */
function render2DEntity(entity: CanvasEntity, isSelected: boolean): React.ReactNode {
  switch (entity.type) {
    case "sticker":
      return <StickerRenderer entity={entity as any} isSelected={isSelected} interactionMode="preview" />;
    case "text":
      return <TextRenderer entity={entity as any} isSelected={isSelected} />;
    case "shape":
      return <ShapeRenderer entity={entity as any} isSelected={isSelected} />;
    case "drawing":
      return <DrawingRenderer entity={entity as any} isSelected={isSelected} />;
    case "path":
      return <PathRenderer entity={entity as any} isSelected={isSelected} />;
    case "svg":
      return <SvgRenderer entity={entity as any} isSelected={isSelected} />;
    case "lottie":
      return <LottieRenderer entity={entity as any} isSelected={isSelected} />;
    case "audio":
      return <AudioRenderer entity={entity as any} isSelected={isSelected} />;
    case "group":
      return <GroupRenderer entity={entity as any} isSelected={isSelected} />;
    default:
      return null;
  }
}

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

  // Subscribe to bus events so toolbar/registry shortcuts can trigger VR/AR entry
  useEffect(() => {
    const unsubVR = bus.subscribe(ShellEvents.SPATIAL_ENTER_VR, () => {
      setSpatialMode("vr");
      enterXR("immersive-vr");
    });
    const unsubAR = bus.subscribe(ShellEvents.SPATIAL_ENTER_AR, () => {
      setSpatialMode("ar");
      enterXR("immersive-ar");
    });
    return () => {
      unsubVR();
      unsubAR();
    };
  }, [setSpatialMode]);

  // --- 2D Canvas Panels in 3D space ---
  const [canvasPanels, setCanvasPanels] = useState<string[]>([]);
  const panelCounter = useRef(0);

  const handleSpawnCanvasPanel = useCallback(() => {
    panelCounter.current += 1;
    const id = `canvas-panel-${panelCounter.current}`;
    setCanvasPanels((prev) => [...prev, id]);
    bus.emit(SpatialEvents.PANEL_SPAWNED, { panelId: id });
  }, []);

  // Listen for panel close events
  useEffect(() => {
    const unsub = bus.subscribe(SpatialEvents.PANEL_CLOSED, (event: any) => {
      const { panelId } = event.payload ?? {};
      if (panelId) {
        setCanvasPanels((prev) => prev.filter((id) => id !== panelId));
      }
    });
    return unsub;
  }, []);

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
          <GrabHandler />

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

            {/* Entity rendering — routes each type to the right 3D renderer */}
            {entities
              .filter(
                (entity) =>
                  entity.canvasVisibility === "3d" ||
                  entity.canvasVisibility === "both",
              )
              .map((entity) => {
                const isSelected = selectedIds.has(entity.id);

                // Widgets — rendered with WidgetFrame in 3D via Html + depth backing
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
                      selected={isSelected}
                      onSelect={onSelect}
                    />
                  );
                }

                // Object3D — native Three.js geometry (box, sphere, cylinder, plane)
                if (entity.type === "object3d") {
                  return (
                    <SpatialEntity
                      key={entity.id}
                      entity={entity}
                      selected={isSelected}
                      onSelect={onSelect}
                    />
                  );
                }

                // All other 2D entity types — rendered via their DOM renderer in 3D
                const renderer = render2DEntity(entity, isSelected);
                if (!renderer) return null;

                return (
                  <Entity2DInSpace
                    key={entity.id}
                    entity={entity}
                    selected={isSelected}
                    onSelect={onSelect}
                  >
                    {renderer}
                  </Entity2DInSpace>
                );
              })}

            {/* 2D Canvas Panels — full 2D canvases floating in 3D space */}
            {canvasPanels.map((panelId, idx) => (
              <SpatialCanvas2DPanel
                key={panelId}
                panelId={panelId}
                label={`Canvas ${idx + 1}`}
                initialTransform={{
                  position: { x: -0.5 + idx * 1.5, y: 1.4, z: -0.8 },
                  rotation: { x: 0, y: 0, z: 0, w: 1 },
                  scale: { x: 1, y: 1, z: 1 },
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontSize: 14,
                    fontFamily: 'system-ui, sans-serif',
                    background: '#11111b',
                  }}
                >
                  <span>2D Canvas — Pan, zoom, and interact here</span>
                </div>
              </SpatialCanvas2DPanel>
            ))}
          </TeleportProvider>
        </XR>
      </Canvas>

      {/* Bottom overlay buttons */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 12,
          zIndex: 10,
        }}
      >
        {/* Spawn 2D Canvas Panel button */}
        <button
          data-testid="spawn-canvas-panel-button"
          onClick={handleSpawnCanvasPanel}
          title="Open a 2D canvas panel in 3D space"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: "rgba(55, 65, 81, 0.9)",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            backdropFilter: "blur(8px)",
          }}
        >
          <CanvasPanelIcon />
          2D Canvas Panel
        </button>

        {/* Enter VR button — visible in 3D mode when WebXR is supported */}
        {spatialMode === "3d" && vrSupported && (
          <button
            data-testid="enter-vr-button"
            onClick={handleEnterVR}
            title="Enter VR (Shift+V)"
            style={{
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
            }}
          >
            <VRHeadsetIcon />
            Enter VR
          </button>
        )}
      </div>
    </div>
  );
};

/** Canvas panel icon (layered rectangles) */
function CanvasPanelIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="14" rx="2" />
      <path d="M7 21h10" />
      <path d="M12 17v4" />
    </svg>
  );
}

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
