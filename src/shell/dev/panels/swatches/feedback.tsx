/**
 * Feedback & status specimens — toasts, progress bars, skeletons,
 * badges, status dots, radial ripple loader, interactive tooltip.
 *
 * @module shell/dev/swatches
 * @layer L6
 */

import React, { useState, useRef, useCallback } from 'react';

import { palette } from '../../../theme/theme-vars';

import { SPRING } from './constants';
import { hexToRgb } from './hooks';

// ═══════════════════════════════════════════════════════════════════
// Toast
// ═══════════════════════════════════════════════════════════════════

export const ToastDemo: React.FC<{ variant: 'success' | 'warning' | 'error' | 'info'; message: string }> = ({ variant, message }) => {
  const colors = {
    success: { bg: 'rgba(90,168,120,0.08)', border: 'rgba(90,168,120,0.2)', accent: 'var(--sn-moss)', icon: '✓' },
    warning: { bg: 'rgba(212,160,76,0.08)', border: 'rgba(212,160,76,0.2)', accent: 'var(--sn-warning)', icon: '⚠' },
    error: { bg: 'rgba(200,88,88,0.08)', border: 'rgba(200,88,88,0.2)', accent: 'var(--sn-error)', icon: '✕' },
    info: { bg: 'rgba(78,123,142,0.08)', border: 'rgba(78,123,142,0.2)', accent: 'var(--sn-storm)', icon: 'ℹ' },
  };
  const c = colors[variant];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 12,
      background: c.bg, border: `1px solid ${c.border}`,
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      animation: `sn-toast-in 500ms ${SPRING}`,
    }}>
      <span style={{ fontSize: 14, color: c.accent, flexShrink: 0 }}>{c.icon}</span>
      <span style={{ fontSize: 12, color: palette.text, fontFamily: 'var(--sn-font-family)' }}>{message}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Phosphor Progress Bar
// ═══════════════════════════════════════════════════════════════════

export const PhosphorProgress: React.FC<{ value: number; color?: string }> = ({ value, color = 'var(--sn-storm)' }) => (
  <div style={{
    height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.04)',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
    overflow: 'hidden', position: 'relative',
  }}>
    <div style={{
      height: '100%', width: `${value}%`, borderRadius: 3,
      background: `linear-gradient(90deg, ${color}, ${color}cc)`,
      boxShadow: `0 0 12px ${color}44`,
      transition: `width 600ms ${SPRING}`,
      animation: 'sn-phosphor 3s ease-in-out infinite',
    }} />
    {value >= 100 && (
      <div style={{
        position: 'absolute', right: 0, top: '50%',
        width: 12, height: 12, borderRadius: '50%',
        background: color, opacity: 0.6,
        transform: 'translate(50%, -50%)',
        animation: `sn-completion-burst 800ms ${SPRING} forwards`,
        pointerEvents: 'none',
      }} />
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// Skeleton Line
// ═══════════════════════════════════════════════════════════════════

export const SkeletonLine: React.FC<{ width?: string; height?: number }> = ({ width = '100%', height = 12 }) => (
  <div style={{
    width, height, borderRadius: height / 2,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
    backgroundSize: '200% 100%',
    animation: 'sn-skeleton-wave 2s ease-in-out infinite',
  }} />
);

// ═══════════════════════════════════════════════════════════════════
// Badge
// ═══════════════════════════════════════════════════════════════════

export const Badge: React.FC<{ label: string; color: string }> = ({ label, color }) => {
  const [r, g, b] = hexToRgb(color);
  return (
    <span style={{
      padding: '3px 10px', fontSize: 10, fontWeight: 600,
      fontFamily: 'var(--sn-font-family)',
      color, borderRadius: 6,
      background: `rgba(${r},${g},${b},0.1)`,
      border: `1px solid rgba(${r},${g},${b},0.2)`,
      transition: `all 300ms ${SPRING}`, cursor: 'default',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `rgba(${r},${g},${b},0.18)`;
        e.currentTarget.style.boxShadow = `0 0 6px rgba(${r},${g},${b},0.15)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = `rgba(${r},${g},${b},0.1)`;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >{label}</span>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Status Dot
// ═══════════════════════════════════════════════════════════════════

export const StatusDot: React.FC<{ label: string; color: string; pulse?: boolean }> = ({ label, color, pulse }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{
      width: 8, height: 8, borderRadius: '50%', background: color,
      boxShadow: `0 0 3px ${color}44, 0 0 8px ${color}18`,
      animation: pulse ? 'sn-breathe 3s ease-in-out infinite' : 'none',
    }} />
    <span style={{ fontSize: 11, color: palette.textSoft }}>{label}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// Radial Ripple Skeleton — organic loading (stone in water)
// ═══════════════════════════════════════════════════════════════════

export const RadialRippleSkeleton: React.FC<{ size?: number; color?: string }> = ({
  size = 80, color = 'rgba(78,123,142,0.15)',
}) => (
  <div style={{
    position: 'relative', width: size, height: size,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        position: 'absolute',
        width: size * 0.4, height: size * 0.4, borderRadius: '50%',
        border: `1.5px solid ${color}`,
        animation: `sn-ripple-radial 2.4s ease-out ${i * 0.8}s infinite`,
        left: '50%', top: '50%',
      }} />
    ))}
    <div style={{
      width: 6, height: 6, borderRadius: '50%',
      background: color, boxShadow: `0 0 8px ${color}`,
    }} />
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// Interactive Tooltip — hover-triggered with spring entrance
// ═══════════════════════════════════════════════════════════════════

export const InteractiveTooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleEnter = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ x: rect.width / 2, y: 0 });
    setShow(true);
  }, []);

  return (
    <div ref={triggerRef} style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{
          position: 'absolute', bottom: '100%', left: pos.x,
          transform: 'translateX(-50%)', marginBottom: 8,
          pointerEvents: 'none', zIndex: 10,
          animation: `sn-tooltip-in 300ms ${SPRING}`,
        }}>
          <div style={{
            padding: '7px 14px', fontSize: 11, color: palette.text,
            fontFamily: 'var(--sn-font-family)', whiteSpace: 'nowrap',
            background: 'var(--sn-surface-raised, rgba(26,26,31,0.95))',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 8,
            border: '1px solid rgba(78,123,142,0.15)',
            boxShadow: [
              '0 0 1px rgba(78,123,142,0.25)',
              '0 0 8px rgba(78,123,142,0.12)',
              '0 0 24px rgba(78,123,142,0.06)',
              '0 4px 16px rgba(0,0,0,0.3)',
            ].join(', '),
          }}>
            {text}
          </div>
          {/* Glowing arrow */}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', marginLeft: -5,
            width: 10, height: 10,
            background: 'var(--sn-surface-raised, rgba(26,26,31,0.95))',
            border: '1px solid rgba(78,123,142,0.15)',
            borderTop: 'none', borderLeft: 'none',
            transform: 'rotate(45deg) translateX(-50%)',
            boxShadow: '0 0 6px rgba(78,123,142,0.1)',
          }} />
        </div>
      )}
    </div>
  );
};
