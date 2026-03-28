/**
 * CursorGlow — P7: The canvas responds to your presence.
 *
 * A soft ambient glow follows the cursor with deliberate lag.
 * The canvas acknowledges your attention without demanding it.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React, { useCallback, useRef, useState } from "react";

export interface CursorGlowProps {
  /** Whether the glow is enabled (disable in preview mode, VR, etc.) */
  enabled?: boolean;
  /** Callback with normalized mouse position (0-1) for parallax */
  onMouseNormalized?: (nx: number, ny: number) => void;
}

/**
 * Renders an ambient glow that follows the mouse cursor on the canvas.
 * Uses CSS transitions for deliberate lag — not requestAnimationFrame.
 * Positioned absolutely; mount inside the canvas workspace container.
 */
export const CursorGlow: React.FC<CursorGlowProps> = ({ enabled = true, onMouseNormalized }) => {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      setPos({ x: nx * 100, y: ny * 100 });
      if (!visible) setVisible(true);
      onMouseNormalized?.(nx, ny);
    },
    [enabled, visible, onMouseNormalized],
  );

  const handleMouseLeave = useCallback(() => {
    setVisible(false);
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
      data-testid="cursor-glow-layer"
    >
      {/* Outer ambient glow — large, faint, follows with heavy lag */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, var(--sn-glow, rgba(232,128,108,0.08)), transparent 70%)",
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: "translate(-50%, -50%)",
          transition:
            "left 1.2s cubic-bezier(0.16, 1, 0.3, 1), top 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease",
          filter: "blur(60px)",
          opacity: visible ? 0.7 : 0,
        }}
      />
      {/* Inner focused glow — tighter, warmer, slightly less lag */}
      <div
        style={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, var(--sn-glow, rgba(232,128,108,0.08)), transparent 65%)",
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: "translate(-50%, -50%)",
          transition:
            "left 0.9s cubic-bezier(0.16, 1, 0.3, 1), top 0.9s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease",
          filter: "blur(40px)",
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
};
