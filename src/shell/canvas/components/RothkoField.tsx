/**
 * RothkoField — P11/P13/P17/P19/P21: The Rothko background layer.
 *
 * Three vertical color bands (ember, violet, storm) drift on slow sine waves.
 * A warm glow bleeds up from below. Subtle grain texture overlays everything.
 * The canvas is a painting, not a surface.
 *
 * Turrell: color inhabits the space, not the walls (P14).
 * Slow cycling: the background drifts imperceptibly (P15).
 *
 * Performance: uses CSS transforms and opacity only — GPU-composited,
 * no layout or paint triggers. The grain is an inline SVG data URI
 * so there's no extra network request.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React, { useEffect, useRef, useState } from "react";

export interface RothkoFieldProps {
  /** Whether the Rothko field is visible (disable for performance in tests) */
  enabled?: boolean;
  /** Vertical scroll offset — shifts bands slightly for parallax feel */
  scrollY?: number;
}

/**
 * Ambient background layer with slowly drifting color fields.
 * Mount behind all canvas content with position: fixed or absolute.
 */
export const RothkoField: React.FC<RothkoFieldProps> = ({
  enabled = true,
  scrollY = 0,
}) => {
  const [tick, setTick] = useState(0);
  const rafRef = useRef(0);

  // Slow tick — updates ~8fps for imperceptible drift.
  // This is intentionally slow; the background should never feel animated.
  useEffect(() => {
    if (!enabled) return;

    let running = true;
    let lastTime = 0;
    const INTERVAL = 120; // ms between updates (~8fps)

    const step = (time: number) => {
      if (!running) return;
      if (time - lastTime >= INTERVAL) {
        setTick((t) => t + 1);
        lastTime = time;
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  const phase = tick * 0.008;

  return (
    <div
      data-testid="rothko-field"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Base ground — dark warm gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(160deg, #1A1218 0%, var(--sn-bg-ground, #110E14) 50%, #171318 100%)",
        }}
      />

      {/* Band 1: Ember (left) — warm presence beneath */}
      <div
        style={{
          position: "absolute",
          left: "-8%",
          top: "-20%",
          width: "45%",
          height: "140%",
          background: `linear-gradient(180deg,
            color-mix(in srgb, var(--sn-ember, #E8806C) 4%, transparent) 0%,
            color-mix(in srgb, var(--sn-ember, #E8806C) 8%, transparent) 35%,
            color-mix(in srgb, var(--sn-ember-light, #F09A88) 3%, transparent) 70%,
            transparent 100%)`,
          filter: "blur(100px)",
          transform: `translateX(${Math.sin(phase) * 20}px) translateY(${scrollY * -0.05}px)`,
          willChange: "transform",
        }}
      />

      {/* Band 2: Violet (center) */}
      <div
        style={{
          position: "absolute",
          left: "22%",
          top: "-10%",
          width: "40%",
          height: "130%",
          background: `linear-gradient(180deg,
            color-mix(in srgb, var(--sn-violet, #B8A0D8) 3%, transparent) 0%,
            color-mix(in srgb, var(--sn-violet, #B8A0D8) 6%, transparent) 45%,
            color-mix(in srgb, var(--sn-storm, #3E7D94) 3%, transparent) 100%)`,
          filter: "blur(110px)",
          transform: `translateX(${Math.cos(phase * 0.7) * 14}px)`,
          willChange: "transform",
        }}
      />

      {/* Band 3: Storm/Opal (right) */}
      <div
        style={{
          position: "absolute",
          right: "-8%",
          top: "-15%",
          width: "42%",
          height: "135%",
          background: `linear-gradient(180deg,
            color-mix(in srgb, var(--sn-storm, #3E7D94) 4%, transparent) 0%,
            color-mix(in srgb, var(--sn-opal, #B0D0D8) 5%, transparent) 50%,
            color-mix(in srgb, var(--sn-storm, #3E7D94) 2%, transparent) 100%)`,
          filter: "blur(95px)",
          transform: `translateX(${Math.sin(phase * 0.5 + 1.5) * 16}px)`,
          willChange: "transform",
        }}
      />

      {/* P17: Bioluminescent center glow — warm heart beating beneath */}
      <div
        style={{
          position: "absolute",
          left: "25%",
          top: "30%",
          width: "50%",
          height: "40%",
          background: `radial-gradient(ellipse,
            color-mix(in srgb, var(--sn-ember, #E8806C) 3%, transparent) 0%,
            transparent 70%)`,
          filter: "blur(70px)",
          opacity: 0.4 + Math.sin(phase * 1.2) * 0.25,
          willChange: "opacity",
        }}
      />

      {/* P18/P21: Grain texture — physical texture beneath digital surfaces */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.3,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
};
