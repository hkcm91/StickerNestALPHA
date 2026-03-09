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
}

/**
 * Renders an ambient glow that follows the mouse cursor on the canvas.
 * Uses CSS transitions for deliberate lag — not requestAnimationFrame.
 * Positioned absolutely; mount inside the canvas workspace container.
 */
export const CursorGlow: React.FC<CursorGlowProps> = ({ enabled = true }) => {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
      if (!visible) setVisible(true);
    },
    [enabled, visible],
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
      {/* Large ambient glow — follows with deliberate lag */}
      <div
        style={{
          position: "absolute",
          width: 280,
          height: 280,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--sn-accent, #3E7D94) 5%, transparent), transparent)",
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: "translate(-50%, -50%)",
          transition:
            "left 0.8s cubic-bezier(0.16, 1, 0.3, 1), top 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease",
          filter: "blur(40px)",
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
};
