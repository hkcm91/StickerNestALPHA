/**
 * Layout tab — card density variants, modal/dialog, accordion,
 * empty state patterns.
 *
 * @module shell/dev/swatches/tabs
 * @layer L6
 */

import React, { useState, useCallback } from 'react';

import { palette } from '../../../../theme/theme-vars';
import { SPRING } from '../constants';
import { InnerGlowButton } from '../controls';
import { Badge } from '../feedback';
import type { FavoritesHook } from '../hooks';
import { useStaggerReveal } from '../hooks';
import { GlassCard, SectionTitle, GroupLabel } from '../primitives';

export const LayoutTab: React.FC<{ fav: FavoritesHook }> = ({ fav }) => {
  const [accordionOpen, setAccordionOpen] = useState<number | null>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Set<number>>(() => new Set([0, 2]));
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const revealed = useStaggerReveal(9, 'layout');

  const toggleNode = useCallback((i: number) => {
    setSelectedNodes(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }, []);

  return (
    <>
      <SectionTitle sub="Surfaces that unfold, panels that breathe, spaces that feel inhabited.">Layout Patterns</SectionTitle>

      {/* Cards */}
      <GroupLabel>Cards — Density Variants</GroupLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
        <GlassCard id="layout-card-compact" favorites={fav} revealed={revealed[0]} index={0}>
          <div style={{ fontSize: 12, fontWeight: 600, color: palette.text }}>Compact Card</div>
          <div style={{ fontSize: 11, color: palette.textMuted, marginTop: 4 }}>Tight spacing, minimal chrome. For dense lists.</div>
        </GlassCard>
        <GlassCard id="layout-card-standard" favorites={fav} revealed={revealed[1]} index={1}
          style={{ padding: '24px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: palette.text }}>Standard Card</div>
          <div style={{ fontSize: 12, color: palette.textSoft, marginTop: 6, lineHeight: 1.5 }}>
            Room to breathe. For content that deserves attention. The default surface.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Badge label="Widget" color="#4E7B8E" />
            <Badge label="v2.1" color="#6B6878" />
          </div>
        </GlassCard>
        <GlassCard id="layout-card-hero" favorites={fav} revealed={revealed[2]} index={2}
          style={{ padding: '32px 28px' }}>
          <div style={{ fontFamily: 'var(--sn-font-serif)', fontSize: 20, fontWeight: 700, color: palette.text, marginBottom: 8 }}>Hero Card</div>
          <div style={{ fontSize: 13, color: palette.textSoft, lineHeight: 1.6, fontFamily: 'var(--sn-font-serif)', fontStyle: 'italic' }}>
            For moments of rest. Marketplace listings. Onboarding. The serif says: slow down.
          </div>
        </GlassCard>
      </div>

      {/* Modal */}
      <GroupLabel>Modal / Dialog</GroupLabel>
      <GlassCard id="layout-modal" favorites={fav} revealed={revealed[3]} index={3} wide>
        <InnerGlowButton label="Open Modal" hex="#4E7B8E" variant="subtle" onClick={() => setModalOpen(true)} />
        {modalOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setModalOpen(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              width: 400, padding: 28, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%), var(--sn-surface, #131317)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)',
              animation: `sn-unfold 400ms ${SPRING}`,
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: palette.text, marginBottom: 8 }}>Confirm Action</div>
              <div style={{ fontSize: 13, color: palette.textSoft, lineHeight: 1.5, marginBottom: 20 }}>
                This will publish the widget to the marketplace. All users will be able to install it.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <InnerGlowButton label="Cancel" hex="#6B6878" variant="ghost" onClick={() => setModalOpen(false)} />
                <InnerGlowButton label="Publish" hex="#4E7B8E" onClick={() => setModalOpen(false)} />
              </div>
            </div>
          </div>
        )}
        <span style={{ fontSize: 10, color: palette.textMuted, marginLeft: 12 }}>
          Click to preview the modal
        </span>
      </GlassCard>

      {/* Accordion */}
      <GroupLabel>Accordion / Collapsible</GroupLabel>
      <GlassCard id="layout-accordion" favorites={fav} revealed={revealed[4]} index={4} wide>
        {['Widget Properties', 'Transform', 'Style & Appearance'].map((title, i) => (
          <div key={title} style={{ borderBottom: i < 2 ? `1px solid ${palette.border}` : 'none' }}>
            <div onClick={() => setAccordionOpen(accordionOpen === i ? null : i)} style={{
              padding: '12px 8px', margin: '0 -8px', borderRadius: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', transition: `background 200ms ${SPRING}`,
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: palette.text }}>{title}</span>
              <span style={{
                fontSize: 10, color: palette.textMuted,
                transform: accordionOpen === i ? 'rotate(180deg)' : 'none',
                transition: `transform 300ms ${SPRING}`,
              }}>▾</span>
            </div>
            <div style={{
              overflow: 'hidden',
              maxHeight: accordionOpen === i ? 100 : 0,
              opacity: accordionOpen === i ? 1 : 0,
              transition: `all 400ms ${SPRING}`,
              paddingBottom: accordionOpen === i ? 12 : 0,
            }}>
              <div style={{ fontSize: 12, color: palette.textSoft, lineHeight: 1.5 }}>
                Content for {title.toLowerCase()}. Fields, sliders, and controls would live here.
              </div>
            </div>
          </div>
        ))}
      </GlassCard>

      {/* Empty State — breathing */}
      <GroupLabel>Empty State</GroupLabel>
      <GlassCard id="layout-empty" favorites={fav} revealed={revealed[5]} index={5} wide>
        <div style={{ textAlign: 'center', padding: '32px 0', position: 'relative' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
            {/* Radial glow behind diamond */}
            <div aria-hidden style={{
              position: 'absolute', inset: -20,
              background: 'radial-gradient(circle, rgba(78,123,142,0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              animation: 'sn-empty-breathe 5s ease-in-out infinite',
            }} />
            <div style={{
              fontSize: 36, opacity: 0.3, position: 'relative',
              animation: 'sn-empty-breathe 5s ease-in-out infinite',
            }}>◇</div>
          </div>
          <div style={{ fontFamily: 'var(--sn-font-serif)', fontSize: 18, color: palette.text, marginBottom: 6 }}>
            No widgets yet
          </div>
          <div style={{ fontSize: 13, color: palette.textMuted, marginBottom: 16 }}>
            Drop a widget from the marketplace to get started.
          </div>
          <InnerGlowButton label="Browse Marketplace" hex="#4E7B8E" variant="subtle" />
        </div>
      </GlassCard>

      {/* Constellation Lines */}
      <GroupLabel>Constellation Lines</GroupLabel>
      <GlassCard id="layout-constellation" favorites={fav} revealed={revealed[6]} index={6} wide>
        <div style={{ fontSize: 10, color: palette.textMuted, marginBottom: 12 }}>
          Click nodes to toggle selection. Lines connect selected entities.
        </div>
        <div style={{ position: 'relative', height: 180, background: 'rgba(0,0,0,0.15)', borderRadius: 10, overflow: 'hidden' }}>
          {/* SVG constellation lines */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {(() => {
              const positions = [
                { x: 80, y: 40 }, { x: 220, y: 70 }, { x: 160, y: 130 },
                { x: 340, y: 50 }, { x: 440, y: 120 },
              ];
              const selArr = [...selectedNodes];
              const lines: React.ReactNode[] = [];
              for (let i = 0; i < selArr.length; i++) {
                for (let j = i + 1; j < selArr.length; j++) {
                  const a = positions[selArr[i]], b = positions[selArr[j]];
                  lines.push(
                    <line key={`${selArr[i]}-${selArr[j]}`}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke="rgba(78,123,142,0.3)" strokeWidth={1.5}
                      strokeDasharray="4 6"
                      style={{
                        filter: 'drop-shadow(0 0 4px rgba(78,123,142,0.3))',
                        animation: 'sn-traveling-light 1s linear infinite',
                      }}
                    />
                  );
                }
              }
              return lines;
            })()}
          </svg>
          {/* Entity nodes */}
          {[
            { x: 80, y: 40, label: 'A' }, { x: 220, y: 70, label: 'B' },
            { x: 160, y: 130, label: 'C' }, { x: 340, y: 50, label: 'D' },
            { x: 440, y: 120, label: 'E' },
          ].map((node, i) => {
            const sel = selectedNodes.has(i);
            return (
              <div key={i} onClick={() => toggleNode(i)} style={{
                position: 'absolute', left: node.x - 16, top: node.y - 16,
                width: 32, height: 32, borderRadius: 8,
                background: sel ? 'rgba(78,123,142,0.15)' : 'rgba(255,255,255,0.04)',
                border: sel ? '1.5px solid rgba(78,123,142,0.5)' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: sel ? 'var(--sn-storm-light)' : palette.textMuted,
                cursor: 'pointer', transition: `all 300ms ${SPRING}`,
                boxShadow: sel
                  ? '0 0 1px rgba(78,123,142,0.25), 0 0 8px rgba(78,123,142,0.12), 0 0 24px rgba(78,123,142,0.06)'
                  : 'none',
              }}>{node.label}</div>
            );
          })}
        </div>
      </GlassCard>

      {/* Context Menu */}
      <GroupLabel>Context Menu</GroupLabel>
      <GlassCard id="layout-context" favorites={fav} revealed={revealed[7]} index={7} wide>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }); }}
            style={{
              position: 'relative', width: 300, height: 140,
              background: 'rgba(0,0,0,0.15)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: palette.textMuted, cursor: 'context-menu',
              border: '1px dashed rgba(255,255,255,0.06)',
            }}
            onClick={() => setCtxMenu(null)}
          >
            Right-click here
            {ctxMenu && (
              <div onClick={e => e.stopPropagation()} style={{
                position: 'absolute', left: ctxMenu.x, top: ctxMenu.y,
                minWidth: 180, padding: '6px 0', borderRadius: 10,
                background: 'rgba(20,17,24,0.92)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)',
                zIndex: 20,
              }}>
                {[
                  { label: 'Copy', key: 'Ctrl+C' },
                  { label: 'Paste', key: 'Ctrl+V' },
                  { label: 'Duplicate', key: 'Ctrl+D' },
                  { label: '—' },
                  { label: 'Bring to Front', key: ']' },
                  { label: 'Send to Back', key: '[' },
                  { label: '—' },
                  { label: 'Delete', key: '⌫', danger: true },
                ].map((item, i) => {
                  if (item.label === '—') return (
                    <div key={i} style={{
                      height: 1, margin: '4px 12px',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                    }} />
                  );
                  return (
                    <div key={i} onClick={() => setCtxMenu(null)} style={{
                      padding: '7px 14px', fontSize: 12,
                      color: item.danger ? 'var(--sn-ember)' : palette.text,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', transition: `all 150ms ${SPRING}`,
                      animation: `sn-context-stagger 200ms ${SPRING} ${i * 40}ms both`,
                      borderLeft: '2px solid transparent',
                    }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = item.danger ? 'rgba(232,128,108,0.08)' : 'rgba(78,123,142,0.08)';
                        e.currentTarget.style.borderLeftColor = item.danger ? 'var(--sn-ember)' : 'var(--sn-storm)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderLeftColor = 'transparent';
                      }}
                    >
                      <span>{item.label}</span>
                      {item.key && <span style={{ fontSize: 10, color: palette.textFaint, fontFamily: 'var(--sn-font-mono)' }}>{item.key}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <InnerGlowButton label="Show Menu" hex="#4E7B8E" variant="subtle"
            onClick={() => setCtxMenu({ x: 20, y: 20 })} />
        </div>
      </GlassCard>
    </>
  );
};
