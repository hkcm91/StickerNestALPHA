/**
 * Foundational UI primitives for the swatches gallery.
 *
 * GlassCard (the signature surface), GlowDot (favorite toggle),
 * section headers, favorites strip, HSL picker, grain overlay.
 *
 * @module shell/dev/swatches
 * @layer L6
 */

import React, { useState, useRef, useCallback } from 'react';

import { palette } from '../../../theme/theme-vars';

import { SPRING, STAGGER_MS } from './constants';
import type { FavoritesHook } from './hooks';
import { hexToRgb } from './hooks';

// ═══════════════════════════════════════════════════════════════════
// Glow Dot (Favorite Toggle)
// ═══════════════════════════════════════════════════════════════════

export const GlowDot: React.FC<{ active: boolean; onClick: () => void }> = ({ active, onClick }) => (
  <button
    onClick={e => { e.stopPropagation(); onClick(); }}
    aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
    aria-pressed={active}
    style={{
      position: 'absolute', top: 10, right: 10,
      width: 14, height: 14, borderRadius: '50%',
      border: active ? 'none' : '1.5px solid rgba(255,255,255,0.12)',
      background: active ? 'var(--sn-ember, #E8806C)' : 'rgba(255,255,255,0.03)',
      cursor: 'pointer',
      transition: `all 400ms ${SPRING}`,
      boxShadow: active
        ? '0 0 3px rgba(232,128,108,0.5), 0 0 8px rgba(232,128,108,0.18), 0 0 14px rgba(232,128,108,0.06)'
        : 'none',
      animation: active ? 'sn-breathe 5s ease-in-out infinite' : 'none',
      zIndex: 3, padding: 0, outline: 'none',
    }}
  />
);

// ═══════════════════════════════════════════════════════════════════
// Glass Card — the foundational surface
// ═══════════════════════════════════════════════════════════════════

export interface GlassCardProps {
  id: string;
  children: React.ReactNode;
  favorites: FavoritesHook;
  revealed?: boolean;
  index?: number;
  glowColor?: string;
  wide?: boolean;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  id, children, favorites, revealed = true, index = 0, glowColor, wide, style,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [proximity, setProximity] = useState(0);
  const [mouseXY, setMouseXY] = useState({ x: 0, y: 0 });
  const isFav = favorites.isFav(id);
  const lastUpdate = useRef(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
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
  }, []);

  const gc = glowColor && glowColor.startsWith('#') ? glowColor : '#4E7B8E';
  const [r, g, b] = hexToRgb(gc);
  const blurPx = Math.round(16 + proximity * 12);
  const saturation = (1.2 + proximity * 0.15).toFixed(2);

  return (
    <div
      ref={ref}
      data-swatch-id={id}
      data-swatch-liked={isFav ? 'true' : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setProximity(0); setMouseXY({ x: 0, y: 0 }); }}
      style={{
        position: 'relative',
        borderRadius: 14,
        background: `
          linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%),
          var(--sn-surface-glass, rgba(20,17,24,0.75))
        `,
        backdropFilter: `blur(${blurPx}px) saturate(${saturation})`,
        WebkitBackdropFilter: `blur(${blurPx}px) saturate(${saturation})`,
        border: isFav
          ? '1px solid rgba(232,128,108,0.4)'
          : `1px solid rgba(${r},${g},${b},${(0.06 + proximity * 0.12).toFixed(2)})`,
        padding: '22px 24px',
        boxShadow: [
          // 4-layer bioluminescent glow — phosphorescent halos
          `0 0 ${Math.round(1 + proximity * 2)}px rgba(${r},${g},${b},${(proximity * 0.25).toFixed(2)})`,
          `0 0 ${Math.round(4 + proximity * 8)}px rgba(${r},${g},${b},${(proximity * 0.12).toFixed(2)})`,
          `0 0 ${Math.round(12 + proximity * 24)}px rgba(${r},${g},${b},${(proximity * 0.06).toFixed(2)})`,
          `0 0 ${Math.round(24 + proximity * 48)}px rgba(${r},${g},${b},${(proximity * 0.02).toFixed(2)})`,
          // Structural shadows
          '0 2px 8px rgba(0,0,0,0.2)',
          '0 8px 32px rgba(0,0,0,0.1)',
          `inset 0 1px 0 rgba(255,255,255,${(0.04 + proximity * 0.02).toFixed(2)})`,
          isFav ? '0 0 0 1px rgba(232,128,108,0.15), inset 0 0 20px rgba(232,128,108,0.03)' : '',
        ].filter(Boolean).join(', '),
        transition: `all 400ms ${SPRING}, opacity 500ms ${SPRING}`,
        animation: revealed ? `sn-drift-up 600ms ${SPRING} ${index * STAGGER_MS}ms both` : 'none',
        opacity: revealed ? undefined : 0,
        overflow: 'hidden',
        gridColumn: wide ? '1 / -1' : undefined,
        ...style,
      }}
    >
      {/* Flashlight border — cursor-tracked radial glow on the border edge */}
      {proximity > 0 && (
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
      <GlowDot active={isFav} onClick={() => favorites.toggle(id)} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Section Headers
// ═══════════════════════════════════════════════════════════════════

export const SectionTitle: React.FC<{ children: string; sub?: string }> = ({ children, sub }) => (
  <div style={{ marginBottom: 28, paddingTop: 12 }}>
    <h2 style={{
      fontSize: 28, fontWeight: 700,
      fontFamily: 'var(--sn-font-serif, Georgia, serif)',
      color: palette.text, margin: 0, letterSpacing: '-0.03em',
      lineHeight: 1.2,
    }}>
      {children}
    </h2>
    {sub && <p style={{
      fontSize: 13, color: palette.textMuted,
      fontFamily: 'var(--sn-font-serif, Georgia, serif)',
      fontStyle: 'italic', margin: '8px 0 0', lineHeight: 1.6,
      maxWidth: 520,
    }}>{sub}</p>}
  </div>
);

export const GroupLabel: React.FC<{ children: string; style?: React.CSSProperties }> = ({ children, style: s }) => (
  <div style={{
    fontSize: 9, fontWeight: 700, color: palette.textSoft,
    textTransform: 'uppercase', letterSpacing: '0.14em',
    marginBottom: 12, marginTop: 8, ...s,
  }}>{children}</div>
);

// ═══════════════════════════════════════════════════════════════════
// Favorites Strip
// ═══════════════════════════════════════════════════════════════════

export const FavoritesStrip: React.FC<{ favs: Set<string> }> = ({ favs }) => {
  if (favs.size === 0) return null;
  return (
    <div style={{
      marginBottom: 24, padding: '14px 18px',
      background: 'linear-gradient(135deg, rgba(232,128,108,0.04) 0%, rgba(232,128,108,0.01) 100%)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 14,
      border: '1px solid rgba(232,128,108,0.15)',
      boxShadow: '0 0 4px rgba(232,128,108,0.08), 0 0 10px rgba(232,128,108,0.04)',
      animation: 'sn-glow-pulse 6s ease-in-out infinite',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color: 'var(--sn-ember, #E8806C)',
        textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8,
      }}>
        Liked — {favs.size} specimen{favs.size === 1 ? '' : 's'}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[...favs].map(id => (
          <div key={id} style={{
            padding: '3px 10px', fontSize: 9,
            fontFamily: 'var(--sn-font-mono)', color: palette.textSoft,
            background: 'rgba(232,128,108,0.06)',
            borderRadius: 6, border: '1px solid rgba(232,128,108,0.12)',
          }}>{id}</div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// HSL Picker
// ═══════════════════════════════════════════════════════════════════

export const HslPicker: React.FC<{
  hsl: [number, number, number];
  onChange: (hsl: [number, number, number]) => void;
  onReset: () => void;
  isModified: boolean;
}> = ({ hsl, onChange, onReset, isModified }) => {
  const [h, s, l] = hsl;
  const track: React.CSSProperties = {
    width: '100%', height: 6, borderRadius: 3,
    WebkitAppearance: 'none', appearance: 'none' as never,
    outline: 'none', cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)',
  };
  return (
    <div style={{
      marginTop: 12, padding: '12px 14px',
      background: 'rgba(0,0,0,0.25)', borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.04)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: palette.textMuted, fontFamily: 'var(--sn-font-mono)' }}>
          H:{h} S:{s}% L:{l}%
        </span>
        {isModified && (
          <button onClick={onReset} style={{
            fontSize: 9, color: 'var(--sn-ember)', background: 'rgba(232,128,108,0.1)',
            border: '1px solid rgba(232,128,108,0.2)', cursor: 'pointer',
            padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--sn-font-family)',
          }}>Reset</button>
        )}
      </div>
      <input type="range" min={0} max={360} value={h}
        onChange={e => onChange([+e.target.value, s, l])}
        style={{ ...track, background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }} />
      <input type="range" min={0} max={100} value={s}
        onChange={e => onChange([h, +e.target.value, l])}
        style={{ ...track, background: `linear-gradient(to right, hsl(${h},0%,${l}%), hsl(${h},100%,${l}%))` }} />
      <input type="range" min={0} max={100} value={l}
        onChange={e => onChange([h, s, +e.target.value])}
        style={{ ...track, background: `linear-gradient(to right, #000, hsl(${h},${s}%,50%), #fff)` }} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Grain Overlay
// ═══════════════════════════════════════════════════════════════════

export const GrainOverlay: React.FC = () => (
  <div aria-hidden style={{
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    animation: 'sn-grain-breathe 5s ease-in-out infinite',
  }}>
    {/* Primary grain layer */}
    <div style={{
      position: 'absolute', inset: 0,
      opacity: 0.045,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: '128px 128px',
    }} />
    {/* Secondary grain — offset, slightly different frequency for organic depth */}
    <div style={{
      position: 'absolute', inset: 0,
      opacity: 0.02,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n2'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n2)'/%3E%3C/svg%3E")`,
      backgroundSize: '192px 192px',
      transform: 'translate(2px, 2px)',
    }} />
  </div>
);
