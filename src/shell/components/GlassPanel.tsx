/**
 * GlassPanel — Frosted glass container with optional flashlight border and grain overlay.
 *
 * Shell-layer version with local dark design tokens.
 * Provides a translucent, depth-rich surface that matches the dark frosted-glass
 * design language (Her / BR2049 / Severance / Westworld aesthetic).
 *
 * @module shell/components
 * @layer L6
 */

import React, { useCallback, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Local design tokens (no external palette import)
// ---------------------------------------------------------------------------
const SN_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const STORM_HEX = '#4E7B8E';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Glow color hex (defaults to storm #4E7B8E) */
  glowColor?: string;
  /** Enable flashlight border effect (cursor-tracked radial glow) */
  flashlight?: boolean;
  /** Enable grain overlay texture */
  grain?: boolean;
  /** Disable proximity glow tracking (static surface) */
  static?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className,
  style,
  glowColor,
  flashlight = false,
  grain: _grain = false,
  static: isStatic = false,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [proximity, setProximity] = useState(0);
  const [mouseXY, setMouseXY] = useState({ x: 0, y: 0 });
  const lastUpdate = useRef(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isStatic) return;
      const now = performance.now();
      if (now - lastUpdate.current < 33) return; // 30fps throttle
      lastUpdate.current = now;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      const maxDist = Math.max(rect.width, rect.height) * 1.2;
      setProximity(Math.max(0, 1 - dist / maxDist));
      setMouseXY({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [isStatic],
  );

  const handleMouseLeave = useCallback(() => {
    if (!isStatic) {
      setProximity(0);
      setMouseXY({ x: 0, y: 0 });
    }
  }, [isStatic]);

  const gc = glowColor ?? STORM_HEX;
  const [r, g, b] = hexToRgb(gc);
  const blurPx = Math.round(16 + proximity * 12);
  const saturation = (1.2 + proximity * 0.15).toFixed(2);

  const panelStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: 14,
    background: `
      linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%),
      var(--sn-surface-glass, rgba(20,17,24,0.75))
    `,
    backdropFilter: `blur(${blurPx}px) saturate(${saturation})`,
    WebkitBackdropFilter: `blur(${blurPx}px) saturate(${saturation})`,
    border: `1px solid rgba(${r},${g},${b},${(0.12 + proximity * 0.12).toFixed(2)})`,
    boxShadow: [
      `0 0 ${Math.round(1 + proximity * 2)}px rgba(${r},${g},${b},${(proximity * 0.25).toFixed(2)})`,
      `0 0 ${Math.round(4 + proximity * 8)}px rgba(${r},${g},${b},${(proximity * 0.12).toFixed(2)})`,
      `0 0 ${Math.round(12 + proximity * 24)}px rgba(${r},${g},${b},${(proximity * 0.06).toFixed(2)})`,
      `0 0 ${Math.round(24 + proximity * 48)}px rgba(${r},${g},${b},${(proximity * 0.02).toFixed(2)})`,
      '0 2px 8px rgba(0,0,0,0.2)',
      '0 8px 32px rgba(0,0,0,0.1)',
      `inset 0 1px 0 rgba(255,255,255,${(0.04 + proximity * 0.02).toFixed(2)})`,
    ].join(', '),
    transition: `all 400ms ${SN_SPRING}`,
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
      {...rest}
    >
      {/* Flashlight border — cursor-tracked radial glow on the border edge */}
      {flashlight && proximity > 0 && !isStatic && (
        <div aria-hidden style={{
          position: 'absolute',
          inset: -1,
          borderRadius: 15,
          pointerEvents: 'none',
          zIndex: 2,
          background: `radial-gradient(250px circle at ${mouseXY.x}px ${mouseXY.y}px, rgba(${r},${g},${b},${(proximity * 0.35).toFixed(2)}), transparent 50%)`,
          padding: 1,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude' as React.CSSProperties['maskComposite'],
          transition: 'opacity 200ms ease-out',
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};
