/**
 * Lab feedback components — adapted from UI Swatches gallery for L2.
 *
 * Toast, PhosphorProgress, SkeletonLine, Badge, StatusDot.
 * Feedback through light, not motion. Warm ember, not red alert.
 *
 * @module lab/components/shared
 * @layer L2
 */

import React from 'react';

import { labPalette, SPRING, hexToRgb } from './palette';

// ═══════════════════════════════════════════════════════════════════
// Toast
// ═══════════════════════════════════════════════════════════════════

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

const TOAST_COLORS: Record<ToastVariant, { bg: string; border: string; accent: string; icon: string }> = {
  success: { bg: 'rgba(90,168,120,0.08)', border: 'rgba(90,168,120,0.2)', accent: labPalette.moss, icon: '✓' },
  warning: { bg: 'rgba(212,160,76,0.08)', border: 'rgba(212,160,76,0.2)', accent: labPalette.warning, icon: '⚠' },
  error: { bg: 'rgba(200,88,88,0.08)', border: 'rgba(200,88,88,0.2)', accent: labPalette.error, icon: '✕' },
  info: { bg: 'rgba(78,123,142,0.08)', border: 'rgba(78,123,142,0.2)', accent: labPalette.storm, icon: 'ℹ' },
};

export const Toast: React.FC<{
  variant: ToastVariant;
  message: string;
  onDismiss?: () => void;
}> = ({ variant, message, onDismiss }) => {
  const c = TOAST_COLORS[variant];
  return (
    <div
      role="alert"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 12,
        background: c.bg, border: `1px solid ${c.border}`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        animation: `sn-toast-in 500ms ${SPRING}`,
      }}
    >
      <span style={{ fontSize: 14, color: c.accent, flexShrink: 0 }}>{c.icon}</span>
      <span style={{ fontSize: 12, color: labPalette.text, fontFamily: 'var(--sn-font-family)', flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: 'none', border: 'none', color: labPalette.textMuted,
            cursor: 'pointer', fontSize: 14, padding: 4, lineHeight: 1,
          }}
        >✕</button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Phosphor Progress Bar
// ═══════════════════════════════════════════════════════════════════

export const PhosphorProgress: React.FC<{
  value: number;
  color?: string;
}> = ({ value, color = labPalette.storm }) => (
  <div
    role="progressbar"
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={100}
    style={{
      height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.04)',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
      overflow: 'hidden',
    }}
  >
    <div style={{
      height: '100%', width: `${Math.min(100, Math.max(0, value))}%`, borderRadius: 3,
      background: `linear-gradient(90deg, ${color}, ${color}cc)`,
      boxShadow: `0 0 12px ${color}44`,
      transition: `width 600ms ${SPRING}`,
      animation: 'sn-phosphor 3s ease-in-out infinite',
    }} />
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// Skeleton Line
// ═══════════════════════════════════════════════════════════════════

export const SkeletonLine: React.FC<{
  width?: string;
  height?: number;
}> = ({ width = '100%', height = 12 }) => (
  <div
    aria-hidden
    style={{
      width, height, borderRadius: height / 2,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
      backgroundSize: '200% 100%',
      animation: 'sn-skeleton-wave 2s ease-in-out infinite',
    }}
  />
);

// ═══════════════════════════════════════════════════════════════════
// Badge
// ═══════════════════════════════════════════════════════════════════

export const Badge: React.FC<{
  label: string;
  color: string;
}> = ({ label, color }) => {
  const [r, g, b] = hexToRgb(color);
  return (
    <span style={{
      padding: '3px 10px', fontSize: 10, fontWeight: 600,
      fontFamily: 'var(--sn-font-family)',
      color, borderRadius: 6,
      background: `rgba(${r},${g},${b},0.1)`,
      border: `1px solid rgba(${r},${g},${b},0.2)`,
    }}>{label}</span>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Status Dot
// ═══════════════════════════════════════════════════════════════════

export const StatusDot: React.FC<{
  label: string;
  color: string;
  pulse?: boolean;
}> = ({ label, color, pulse }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div
      aria-hidden
      style={{
        width: 8, height: 8, borderRadius: '50%', background: color,
        boxShadow: `0 0 3px ${color}44, 0 0 8px ${color}18`,
        animation: pulse ? 'sn-breathe 3s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }}
    />
    <span style={{ fontSize: 11, color: labPalette.textSoft }}>{label}</span>
  </div>
);
