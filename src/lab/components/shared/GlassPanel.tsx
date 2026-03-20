/**
 * GlassPanel — Frosted glass container with proximity-based glow.
 *
 * Matches the GlassCard surface from the UI Swatches gallery:
 * - Top-shine gradient overlay
 * - 3-layer bioluminescent box-shadow that intensifies with cursor proximity
 * - Structural shadows for depth
 * - Inset top highlight
 *
 * @module lab/components/shared
 * @layer L2
 */

import React, { useCallback, useRef, useState } from 'react';

import { SPRING, HEX, hexToRgb } from './palette';

export interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Glow color hex (defaults to storm #4E7B8E) */
  glowColor?: string;
  /** Disable proximity glow tracking (static surface) */
  static?: boolean;
  /** Aria role for accessibility */
  role?: string;
  /** Aria label */
  'aria-label'?: string;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className,
  style,
  glowColor,
  static: isStatic = false,
  role,
  'aria-label': ariaLabel,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [proximity, setProximity] = useState(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isStatic) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      const maxDist = Math.max(rect.width, rect.height) * 1.2;
      setProximity(Math.max(0, 1 - dist / maxDist));
    },
    [isStatic],
  );

  const handleMouseLeave = useCallback(() => {
    if (!isStatic) setProximity(0);
  }, [isStatic]);

  const gc = glowColor ?? HEX.storm;
  const [r, g, b] = hexToRgb(gc);

  const panelStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: 14,
    background: `
      linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%),
      var(--sn-surface-glass, rgba(20,17,24,0.75))
    `,
    backdropFilter: 'blur(20px) saturate(1.35)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.35)',
    border: `1px solid rgba(${r},${g},${b},${(0.06 + proximity * 0.12).toFixed(2)})`,
    boxShadow: [
      // Bioluminescent layered glow — tight, medium, wide
      `0 0 ${Math.round(2 + proximity * 4)}px rgba(${r},${g},${b},${(proximity * 0.16).toFixed(2)})`,
      `0 0 ${Math.round(5 + proximity * 8)}px rgba(${r},${g},${b},${(proximity * 0.08).toFixed(2)})`,
      `0 0 ${Math.round(10 + proximity * 14)}px rgba(${r},${g},${b},${(proximity * 0.03).toFixed(2)})`,
      // Structural shadows
      '0 2px 8px rgba(0,0,0,0.2)',
      '0 8px 32px rgba(0,0,0,0.1)',
      // Inset top highlight
      `inset 0 1px 0 rgba(255,255,255,${(0.04 + proximity * 0.02).toFixed(2)})`,
    ].join(', '),
    transition: `all 400ms ${SPRING}`,
    overflow: 'hidden',
    ...style,
  };

  return (
    <div
      ref={ref}
      className={className}
      style={panelStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};
