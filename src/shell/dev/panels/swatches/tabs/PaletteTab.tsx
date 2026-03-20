/**
 * Palette & Typography tab — named colors with HSL playground,
 * grounds & surfaces, typography specimens, shadow gallery.
 *
 * @module shell/dev/swatches/tabs
 * @layer L6
 */

import React from 'react';

import { palette } from '../../../../theme/theme-vars';
import { SPRING, NAMED_COLORS } from '../constants';
import type { FavoritesHook, ColorPlaygroundHook } from '../hooks';
import { useStaggerReveal, hexToRgb, hslToHex } from '../hooks';
import { GlassCard, SectionTitle, GroupLabel, HslPicker } from '../primitives';

export const PaletteTab: React.FC<{
  fav: FavoritesHook;
  pg: ColorPlaygroundHook;
}> = ({ fav, pg }) => {
  const revealed = useStaggerReveal(20, 'palette');

  return (
    <>
      {/* Named Colors — Hero Section */}
      <SectionTitle sub="Click a swatch to open the HSL playground. Changes ripple everywhere.">
        Named Colors
      </SectionTitle>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 20, marginBottom: 40,
      }}>
        {NAMED_COLORS.map((color, i) => {
          const currentHex = pg.isModified(color.id) ? hslToHex(...pg.getHsl(color.id)) : color.hex;
          const [r, g, b] = hexToRgb(currentHex);
          const isOpen = pg.expandedId === color.id;
          return (
            <GlassCard key={color.id} id={`color-${color.id}`} favorites={fav}
              revealed={revealed[i]} index={i} glowColor={currentHex}>
              <div onClick={() => pg.toggleExpanded(color.id)} style={{ cursor: 'pointer' }}>
                <div style={{
                  width: '100%', height: 64, borderRadius: 10,
                  background: `var(${color.cssVar}, ${color.hex})`,
                  marginBottom: 10,
                  boxShadow: isOpen
                    ? `0 0 3px rgba(${r},${g},${b},0.25), 0 0 8px rgba(${r},${g},${b},0.1), 0 6px 18px rgba(${r},${g},${b},0.06), inset 0 -2px 6px rgba(0,0,0,0.2)`
                    : `0 0 3px rgba(${r},${g},${b},0.1), 0 0 8px rgba(${r},${g},${b},0.04), 0 4px 12px rgba(${r},${g},${b},0.03), inset 0 -1px 3px rgba(0,0,0,0.15)`,
                  transition: `box-shadow 500ms ${SPRING}`,
                  backgroundImage: `
                    linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 40%),
                    linear-gradient(0deg, rgba(0,0,0,0.15) 0%, transparent 30%)
                  `,
                  backgroundBlendMode: 'overlay',
                }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>{color.name}</div>
                <div style={{
                  fontSize: 9, fontFamily: 'var(--sn-font-mono)',
                  color: pg.isModified(color.id) ? 'var(--sn-ember)' : palette.textMuted,
                  marginTop: 3,
                }}>
                  {currentHex.toUpperCase()}{pg.isModified(color.id) && ' ✱'}
                </div>
              </div>
              {isOpen && (
                <HslPicker hsl={pg.getHsl(color.id)}
                  onChange={hsl => pg.setHsl(color.id, hsl)}
                  onReset={() => pg.reset(color.id)}
                  isModified={pg.isModified(color.id)} />
              )}
            </GlassCard>
          );
        })}
      </div>

      {/* Grounds & Surfaces */}
      <SectionTitle sub="60% of your viewport. The room, not the furniture.">Grounds & Surfaces</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20, marginBottom: 40 }}>
        {[
          { id: 'bg', label: 'Background', var: '--sn-bg', val: '#0A0A0E' },
          { id: 'ground', label: 'Ground', var: '--sn-bg-ground', val: '#110E14' },
          { id: 'surface', label: 'Surface', var: '--sn-surface', val: '#131317' },
          { id: 'raised', label: 'Raised', var: '--sn-surface-raised', val: '#1A1A1F' },
          { id: 'glass', label: 'Glass', var: '--sn-surface-glass', val: 'rgba(20,17,24,0.75)' },
          { id: 'glass-lt', label: 'Glass Light', var: '--sn-surface-glass-light', val: 'rgba(20,17,24,0.65)' },
        ].map((s, i) => (
          <GlassCard key={s.id} id={`ground-${s.id}`} favorites={fav} revealed={revealed[7 + i]} index={7 + i}>
            <div style={{
              width: '100%', height: 48, borderRadius: 8, marginBottom: 8,
              background: `var(${s.var}, ${s.val})`,
              border: '1px solid rgba(255,255,255,0.04)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.2)',
            }} />
            <div style={{ fontSize: 12, fontWeight: 500, color: palette.text }}>{s.label}</div>
            <div style={{ fontSize: 8, fontFamily: 'var(--sn-font-mono)', color: palette.textFaint, marginTop: 2 }}>{s.var}</div>
          </GlassCard>
        ))}
      </div>

      {/* Typography */}
      <SectionTitle sub="Sans for interface. Serif for moments of rest. Mono for code only.">Typography</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 40 }}>
        <GlassCard id="type-hero" favorites={fav} revealed={revealed[13]} index={13} wide>
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            <div>
              <GroupLabel>Outfit — Sans</GroupLabel>
              <div style={{ fontFamily: 'var(--sn-font-family)', fontSize: 42, fontWeight: 700, color: palette.text, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                StickerNest
              </div>
              <div style={{ fontFamily: 'var(--sn-font-family)', fontSize: 16, fontWeight: 400, color: palette.textSoft, marginTop: 6 }}>
                The canvas is the desktop. Stickers are icons.
              </div>
            </div>
            <div>
              <GroupLabel>Newsreader — Serif</GroupLabel>
              <div style={{ fontFamily: 'var(--sn-font-serif)', fontSize: 42, fontWeight: 700, color: palette.text, letterSpacing: '-0.02em', lineHeight: 1.1, fontStyle: 'italic' }}>
                StickerNest
              </div>
              <div style={{ fontFamily: 'var(--sn-font-serif)', fontSize: 16, fontWeight: 400, color: palette.textSoft, marginTop: 6, fontStyle: 'italic' }}>
                Slow down. Read this. This is for reading.
              </div>
            </div>
          </div>
        </GlassCard>
        <GlassCard id="type-mono" favorites={fav} revealed={revealed[14]} index={14}>
          <GroupLabel>DM Mono</GroupLabel>
          <div style={{ fontFamily: 'var(--sn-font-mono)', fontSize: 13, color: palette.textSoft, lineHeight: 1.8 }}>
            bus.emit('widget.mounted')<br />
            const vp = createViewport()<br />
            {'// 0123456789 !@#$%^&*'}
          </div>
        </GlassCard>
        <GlassCard id="type-glass" favorites={fav} revealed={revealed[15]} index={15}>
          <GroupLabel>On Frosted Glass</GroupLabel>
          <div style={{ fontFamily: 'var(--sn-font-serif)', fontSize: 20, fontWeight: 600, color: palette.text, marginBottom: 6 }}>
            Readability on glass
          </div>
          <div style={{ fontFamily: 'var(--sn-font-family)', fontSize: 13, color: palette.textSoft, lineHeight: 1.6 }}>
            If you can't read it here, it won't work in the app.
          </div>
        </GlassCard>
      </div>

      {/* Shadows */}
      <SectionTitle sub="Shadows carry the ambient color of the surface. Not gray voids.">Shadows As Light</SectionTitle>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 40 }}>
        {[
          { id: 'sh-whisper', label: 'Whisper', sh: '0 1px 4px rgba(0,0,0,0.15)' },
          { id: 'sh-soft', label: 'Soft', sh: '0 4px 20px rgba(0,0,0,0.25)' },
          { id: 'sh-warm', label: 'Warm Lift', sh: '0 8px 36px rgba(78,123,142,0.15)' },
          { id: 'sh-ember', label: 'Ember Glow', sh: '0 0 28px rgba(232,128,108,0.18)' },
          { id: 'sh-violet', label: 'Violet Haze', sh: '0 0 28px rgba(184,160,216,0.15)' },
        ].map((s, i) => (
          <GlassCard key={s.id} id={s.id} favorites={fav} revealed={revealed[16 + i]} index={16 + i}>
            <div style={{
              width: 90, height: 56, borderRadius: 10,
              background: palette.surfaceRaised,
              boxShadow: s.sh + ', inset 0 1px 0 rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 9, color: palette.textSoft }}>{s.label}</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </>
  );
};
