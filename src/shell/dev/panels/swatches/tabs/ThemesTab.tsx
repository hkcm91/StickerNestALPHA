/**
 * Themes tab — side-by-side comparison of dark, light, and
 * high-contrast theme token maps. Click a card to preview that theme.
 *
 * @module shell/dev/swatches/tabs
 * @layer L6
 */

import React, { useState } from 'react';

import { THEME_TOKENS } from '../../../../theme/theme-tokens';
import type { ThemeName } from '../../../../theme/theme-tokens';
import { SPRING } from '../constants';
import type { FavoritesHook } from '../hooks';
import { GlassCard, SectionTitle } from '../primitives';

const ThemeCard: React.FC<{
  name: ThemeName; label: string; id: string; fav: FavoritesHook;
  active: boolean; onSelect: () => void;
}> = ({ name, label, id, fav, active, onSelect }) => {
  const t = THEME_TOKENS[name];
  return (
    <GlassCard id={id} favorites={fav} revealed index={0}
      style={{
        cursor: 'pointer',
        border: active ? `2px solid ${t['--sn-storm']}` : undefined,
        boxShadow: active ? `0 0 12px ${t['--sn-storm']}33` : undefined,
      }}>
      <div onClick={onSelect} style={{
        background: t['--sn-bg'], borderRadius: 10, padding: 18,
        border: `1px solid ${t['--sn-border']}`,
        transition: `all 300ms ${SPRING}`,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t['--sn-text'], fontFamily: t['--sn-font-family'] }}>{label}</div>
          {active && <span style={{ fontSize: 9, color: t['--sn-storm'], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active</span>}
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {[t['--sn-storm'], t['--sn-ember'], t['--sn-opal'], t['--sn-moss'], t['--sn-violet']].map((c, i) => (
            <div key={i} style={{
              width: 22, height: 22, borderRadius: 6, background: c,
              border: `1px solid ${t['--sn-border']}`,
              boxShadow: `0 2px 8px ${c}33`,
            }} />
          ))}
        </div>
        <div style={{
          background: t['--sn-surface-glass'], borderRadius: 8, padding: 12,
          border: `1px solid ${t['--sn-border']}`, marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t['--sn-text'], fontFamily: t['--sn-font-family'] }}>Glass panel</div>
          <div style={{ fontSize: 10, color: t['--sn-text-muted'], fontFamily: t['--sn-font-family'], marginTop: 4 }}>Surface on {label.toLowerCase()}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ padding: '5px 12px', fontSize: 10, borderRadius: 6, background: t['--sn-storm'], color: '#fff' }}>Storm</span>
          <span style={{ padding: '5px 12px', fontSize: 10, borderRadius: 6, background: t['--sn-ember'], color: '#fff' }}>Ember</span>
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 11, color: t['--sn-text'] }}>Primary text</span>
          <span style={{ fontSize: 11, color: t['--sn-text-soft'] }}>Soft text</span>
          <span style={{ fontSize: 11, color: t['--sn-text-muted'] }}>Muted text</span>
          <span style={{ fontSize: 11, color: t['--sn-text-faint'] }}>Faint text</span>
        </div>
      </div>
    </GlassCard>
  );
};

export const ThemesTab: React.FC<{ fav: FavoritesHook }> = ({ fav }) => {
  const [activeTheme, setActiveTheme] = useState<ThemeName>('dark');

  const applyTheme = (name: ThemeName) => {
    setActiveTheme(name);
    const tokens = THEME_TOKENS[name];
    const root = document.documentElement;
    for (const [key, value] of Object.entries(tokens)) {
      root.style.setProperty(key, value);
    }
  };

  return (
    <>
      <SectionTitle sub="Dark mode glows. Light mode grounds. High-contrast draws hard lines. Click a card to preview.">Theme Comparison</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        <ThemeCard name="dark" label="Dark" id="theme-dark" fav={fav} active={activeTheme === 'dark'} onSelect={() => applyTheme('dark')} />
        <ThemeCard name="light" label="Light" id="theme-light" fav={fav} active={activeTheme === 'light'} onSelect={() => applyTheme('light')} />
        <ThemeCard name="high-contrast" label="High Contrast" id="theme-hc" fav={fav} active={activeTheme === 'high-contrast'} onSelect={() => applyTheme('high-contrast')} />
      </div>
    </>
  );
};
