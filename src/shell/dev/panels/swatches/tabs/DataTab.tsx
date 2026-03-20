/**
 * Data display tab — tables, stat cards, key-value lists,
 * avatar stacks, timelines, tag clouds.
 *
 * @module shell/dev/swatches/tabs
 * @layer L6
 */

import React, { useState, useRef, useCallback } from 'react';

import { palette } from '../../../../theme/theme-vars';
import { SPRING } from '../constants';
import { Badge } from '../feedback';
import type { FavoritesHook } from '../hooks';
import { useStaggerReveal } from '../hooks';
import { GlassCard, SectionTitle, GroupLabel } from '../primitives';

// ═══════════════════════════════════════════════════════════════════
// Avatar Constellation — lines appear between avatars on hover
// ═══════════════════════════════════════════════════════════════════

const AVATAR_COLORS = ['#E8806C', '#4E7B8E', '#5AA878', '#B8A0D8', '#B0D0D8'];
const AVATAR_LABELS = ['K', 'J', 'M', 'A', 'S'];

const AvatarConstellation: React.FC = () => {
  const [hovered, setHovered] = useState(false);
  // Avatar positions: first at 0, then each offset by 24 (32 - 8 overlap)
  const positions = AVATAR_COLORS.map((_, i) => ({ x: i * 24 + 16, y: 16 }));

  return (
    <div style={{ position: 'relative', marginBottom: 8 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* SVG constellation lines */}
      <svg style={{
        position: 'absolute', inset: 0, width: '100%', height: 32,
        pointerEvents: 'none', opacity: hovered ? 0.3 : 0,
        transition: 'opacity 400ms ease-out',
      }}>
        {positions.map((a, i) => i < positions.length - 1 ? (
          <line key={i}
            x1={a.x} y1={a.y} x2={positions[i + 1].x} y2={positions[i + 1].y}
            stroke="rgba(78,123,142,0.6)" strokeWidth={1}
            strokeDasharray="2 4"
            style={{ animation: 'sn-traveling-light 1s linear infinite' }}
          />
        ) : null)}
      </svg>
      <div style={{ display: 'flex' }}>
        {AVATAR_COLORS.map((color, i) => (
          <div key={i} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: color, border: '2px solid var(--sn-bg, #0A0A0E)',
            marginLeft: i > 0 ? -8 : 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color: '#fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            transition: `all 300ms ${SPRING}`, cursor: 'pointer',
            position: 'relative', zIndex: 5 - i,
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${color}44`;
              e.currentTarget.style.zIndex = '10';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
              e.currentTarget.style.zIndex = String(5 - i);
            }}
          >{AVATAR_LABELS[i]}</div>
        ))}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          border: '2px solid var(--sn-bg, #0A0A0E)',
          marginLeft: -8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: palette.textMuted,
        }}>+3</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Magnetic Tag Cloud — tags pull toward cursor
// ═══════════════════════════════════════════════════════════════════

const TAGS = ['productivity', 'canvas', 'widget', 'pipeline', 'social', 'media', 'utility', 'game', 'data', 'spatial', 'VR', 'collaboration'];

const MagneticTagCloud: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [offsets, setOffsets] = useState<{ x: number; y: number }[]>(() => TAGS.map(() => ({ x: 0, y: 0 })));
  const lastUpdate = useRef(0);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    if (now - lastUpdate.current < 33) return;
    lastUpdate.current = now;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setOffsets(tagRefs.current.map(el => {
      if (!el) return { x: 0, y: 0 };
      const tr = el.getBoundingClientRect();
      const tcx = tr.left + tr.width / 2 - rect.left;
      const tcy = tr.top + tr.height / 2 - rect.top;
      const dist = Math.hypot(mx - tcx, my - tcy);
      if (dist > 80) return { x: 0, y: 0 };
      const strength = (1 - dist / 80) * 3;
      return { x: (mx - tcx) * strength * 0.05, y: (my - tcy) * strength * 0.05 };
    }));
  }, []);

  return (
    <div ref={containerRef} onMouseMove={handleMove}
      onMouseLeave={() => setOffsets(TAGS.map(() => ({ x: 0, y: 0 })))}
      style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {TAGS.map((tag, i) => (
        <span key={tag} ref={el => { tagRefs.current[i] = el; }} style={{
          padding: '4px 12px', fontSize: 11, borderRadius: 8,
          color: palette.textSoft,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
          cursor: 'pointer',
          transition: `transform 300ms ${SPRING}, border-color 200ms ${SPRING}, background 200ms ${SPRING}, color 200ms ${SPRING}`,
          transform: `translate(${offsets[i]?.x ?? 0}px, ${offsets[i]?.y ?? 0}px)`,
        }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(78,123,142,0.3)';
            e.currentTarget.style.background = 'rgba(78,123,142,0.06)';
            e.currentTarget.style.color = palette.text;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.color = palette.textSoft;
          }}
        >{tag}</span>
      ))}
    </div>
  );
};

export const DataTab: React.FC<{ fav: FavoritesHook }> = ({ fav }) => {
  const revealed = useStaggerReveal(6, 'data');

  return (
    <>
      <SectionTitle sub="Machine-readable precision underneath, human-felt softness on top.">Data Display</SectionTitle>

      {/* Table */}
      <GlassCard id="data-table" favorites={fav} revealed={revealed[0]} index={0} wide>
        <GroupLabel>Table</GroupLabel>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--sn-font-family)' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
                {['Widget', 'Status', 'Installs', 'Rating', 'Updated'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Sticky Note', status: 'Published', installs: '12.4k', rating: '4.8', updated: '2 days ago', statusColor: '#5AA878' },
                { name: 'Timer Pro', status: 'Draft', installs: '—', rating: '—', updated: 'Just now', statusColor: '#D4A04C' },
                { name: 'Kanban Board', status: 'Published', installs: '8.2k', rating: '4.6', updated: '1 week ago', statusColor: '#5AA878' },
                { name: 'Color Picker', status: 'Deprecated', installs: '3.1k', rating: '3.9', updated: '3 months ago', statusColor: '#C85858' },
              ].map((row, i) => (
                <tr key={i} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                  borderLeft: '2px solid transparent',
                  transition: `all 200ms ${SPRING}`,
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderLeftColor = 'var(--sn-storm)';
                    e.currentTarget.style.boxShadow = 'inset 4px 0 8px rgba(78,123,142,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <td style={{ padding: '10px 12px', color: palette.text, fontWeight: 500 }}>{row.name}</td>
                  <td style={{ padding: '10px 12px' }}><Badge label={row.status} color={row.statusColor} /></td>
                  <td style={{ padding: '10px 12px', color: palette.textSoft, fontFamily: 'var(--sn-font-mono)', fontSize: 11 }}>{row.installs}</td>
                  <td style={{ padding: '10px 12px', color: palette.textSoft }}>{row.rating}</td>
                  <td style={{ padding: '10px 12px', color: palette.textMuted, fontSize: 11 }}>{row.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        {/* Stat Cards */}
        <GlassCard id="data-stats" favorites={fav} revealed={revealed[1]} index={1}>
          <GroupLabel>Stat Cards</GroupLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Widgets', value: '24', change: '+3', color: '#4E7B8E' },
              { label: 'Installs', value: '41.2k', change: '+12%', color: '#5AA878' },
              { label: 'Active Users', value: '892', change: '+5%', color: '#B8A0D8' },
              { label: 'Avg Rating', value: '4.6', change: '—', color: '#E8806C' },
            ].map(s => (
              <div key={s.label} style={{
                padding: 12, borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                transition: `all 300ms ${SPRING}`, cursor: 'default',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${s.color}33`;
                  e.currentTarget.style.boxShadow = `0 0 8px ${s.color}18`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: 9, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: palette.text, fontFamily: 'var(--sn-font-family)', marginTop: 4 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: s.color, marginTop: 2 }}>{s.change}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Key-Value */}
        <GlassCard id="data-kv" favorites={fav} revealed={revealed[2]} index={2}>
          <GroupLabel>Key-Value List</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { k: 'Widget ID', v: 'wgt-a8f3c' },
              { k: 'Version', v: '2.1.0' },
              { k: 'Author', v: 'Kimber' },
              { k: 'License', v: 'MIT' },
              { k: 'Size', v: '12.4 KB' },
              { k: 'Canvas Scope', v: 'Shared' },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: palette.textMuted }}>{k}</span>
                <span style={{ color: palette.text, fontFamily: 'var(--sn-font-mono)', fontSize: 11 }}>{v}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Avatar Stack with constellation lines */}
        <GlassCard id="data-avatars" favorites={fav} revealed={revealed[3]} index={3}>
          <GroupLabel>Avatar Stack</GroupLabel>
          <AvatarConstellation />
          <div style={{ fontSize: 11, color: palette.textSoft }}>8 collaborators</div>
        </GlassCard>

        {/* Timeline */}
        <GlassCard id="data-timeline" favorites={fav} revealed={revealed[4]} index={4}>
          <GroupLabel>Timeline / Activity</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 12 }}>
            {[
              { time: '2m ago', text: 'Widget published', color: '#5AA878' },
              { time: '15m ago', text: 'Version 2.1 uploaded', color: '#4E7B8E' },
              { time: '1h ago', text: 'Manifest updated', color: '#B8A0D8' },
              { time: '3h ago', text: 'Draft created', color: '#D4A04C' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 14, position: 'relative' }}>
                {i < 3 && <div style={{
                  position: 'absolute', left: -8, top: 12, bottom: -2,
                  width: 1, background: 'rgba(255,255,255,0.06)',
                }} />}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: item.color, flexShrink: 0, marginTop: 4, marginLeft: -16,
                  boxShadow: `0 0 6px ${item.color}44`,
                }} />
                <div>
                  <div style={{ fontSize: 11, color: palette.text }}>{item.text}</div>
                  <div style={{ fontSize: 9, color: palette.textFaint, marginTop: 2 }}>{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Magnetic Tags */}
        <GlassCard id="data-tags" favorites={fav} revealed={revealed[5]} index={5} wide>
          <GroupLabel>Magnetic Tag Cloud</GroupLabel>
          <MagneticTagCloud />
        </GlassCard>
      </div>
    </>
  );
};
