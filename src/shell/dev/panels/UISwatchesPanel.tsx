/**
 * UI Swatches Panel — living specimen gallery for the StickerNest design system.
 *
 * Slim orchestrator: tab bar, Rothko background, grain overlay.
 * All specimens, controls, and hooks live in ./swatches/.
 *
 * @module shell/dev
 * @layer L6
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

import { palette } from '../../theme/theme-vars';

import { SPRING, TABS, ensureKeyframes } from './swatches/constants';
import type { SwatchTab } from './swatches/constants';
import { useFavorites, useColorPlayground } from './swatches/hooks';
import { FavoritesStrip, GrainOverlay } from './swatches/primitives';
import { PaletteTab, ControlsTab, FeedbackTab, LayoutTab, DataTab, ThemesTab } from './swatches/tabs';

export const UISwatchesPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SwatchTab>('palette');
  const favorites = useFavorites();
  const playground = useColorPlayground();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => { ensureKeyframes(); }, []);

  // Cursor-following ambient light — throttled to ~30fps
  const lastUpdate = useRef(0);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    if (now - lastUpdate.current < 33) return;
    lastUpdate.current = now;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        minHeight: '100vh', fontFamily: 'var(--sn-font-family)', color: palette.text,
        position: 'relative', overflow: 'hidden',
        background: 'var(--sn-bg, #0A0A0E)',
      }}
    >
      {/* Aurora layers — each gradient drifts independently on prime-number cycles */}
      <div aria-hidden style={{
        position: 'fixed', inset: '-20%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 20% 50%, rgba(78,123,142,0.06) 0%, transparent 55%)',
        animation: 'sn-aurora-1 23s ease-in-out infinite',
      }} />
      <div aria-hidden style={{
        position: 'fixed', inset: '-20%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 80% 30%, rgba(232,128,108,0.04) 0%, transparent 50%)',
        animation: 'sn-aurora-2 31s ease-in-out infinite',
      }} />
      <div aria-hidden style={{
        position: 'fixed', inset: '-20%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 80%, rgba(184,160,216,0.04) 0%, transparent 55%)',
        animation: 'sn-aurora-3 17s ease-in-out infinite',
      }} />
      {/* Warm ember undercurrent — very subtle, grounds the cool gradients */}
      <div aria-hidden style={{
        position: 'fixed', inset: '-10%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 60% 60%, rgba(200,140,110,0.025) 0%, transparent 60%)',
        animation: 'sn-aurora-2 37s ease-in-out infinite reverse',
      }} />

      {/* Cursor-following ambient light */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, rgba(232,128,108,0.03) 0%, transparent 60%)`,
        transition: 'background 300ms ease-out',
      }} />

      {/* Ambient gradient orbs — slow drift on prime-number durations */}
      <div aria-hidden style={{
        position: 'fixed', top: '15%', left: '10%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(78,123,142,0.04) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
        animation: 'sn-orb-drift 41s ease-in-out infinite',
      }} />
      <div aria-hidden style={{
        position: 'fixed', bottom: '10%', right: '15%',
        width: 350, height: 350, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,128,108,0.03) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
        animation: 'sn-orb-drift 53s ease-in-out infinite reverse',
      }} />

      <GrainOverlay />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '32px 36px' }}>
        {/* Header — generous breathing room */}
        <div style={{ marginBottom: 12, paddingBottom: 4 }}>
          <div style={{
            fontFamily: 'var(--sn-font-serif)', fontSize: 36, fontWeight: 700,
            color: palette.text, letterSpacing: '-0.03em',
          }}>UI Swatches</div>
          <div style={{
            fontFamily: 'var(--sn-font-serif)', fontSize: 14,
            color: palette.textMuted, fontStyle: 'italic', marginTop: 8, lineHeight: 1.6,
            maxWidth: 440,
          }}>
            A living specimen gallery. Click the glow dots to mark what you like.
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 2, marginBottom: 28,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          paddingBottom: 0,
        }}>
          {TABS.map(tab => {
            const active = tab.id === activeTab;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = palette.textSoft; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = palette.textMuted; e.currentTarget.style.background = active ? 'rgba(255,255,255,0.03)' : 'transparent'; }}
                style={{
                  padding: '12px 20px', fontSize: 12,
                  fontFamily: 'var(--sn-font-family)', fontWeight: active ? 600 : 400,
                  color: active ? palette.text : palette.textMuted,
                  background: active ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: 'none',
                  borderBottom: active
                    ? '2px solid var(--sn-storm)'
                    : '2px solid transparent',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  transition: `all 300ms ${SPRING}`,
                  outline: 'none',
                  boxShadow: active
                    ? '0 0 8px rgba(78,123,142,0.12), 0 0 20px rgba(78,123,142,0.06)'
                    : 'none',
                }}>{tab.label}</button>
            );
          })}
        </div>

        <FavoritesStrip favs={favorites.favs} />

        {/* Tab content with crossfade */}
        <div key={activeTab} style={{
          animation: `sn-drift-up 400ms ${SPRING}`,
        }}>
          {activeTab === 'palette' && <PaletteTab fav={favorites} pg={playground} />}
          {activeTab === 'controls' && <ControlsTab fav={favorites} />}
          {activeTab === 'feedback' && <FeedbackTab fav={favorites} />}
          {activeTab === 'layout' && <LayoutTab fav={favorites} />}
          {activeTab === 'data' && <DataTab fav={favorites} />}
          {activeTab === 'themes' && <ThemesTab fav={favorites} />}
        </div>
      </div>
    </div>
  );
};
