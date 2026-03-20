/**
 * Controls tab — buttons, toggles, checkboxes, radios, inputs,
 * selects, sliders displayed in their glass card specimens.
 *
 * @module shell/dev/swatches/tabs
 * @layer L6
 */

import React from 'react';

import {
  InnerGlowButton, LiquidToggle, GlowCheckbox,
  GlowRadio, GlowInput, GlowSelect, GlowSlider,
} from '../controls';
import type { FavoritesHook } from '../hooks';
import { useStaggerReveal } from '../hooks';
import { GlassCard, SectionTitle, GroupLabel } from '../primitives';

export const ControlsTab: React.FC<{ fav: FavoritesHook }> = ({ fav }) => {
  const revealed = useStaggerReveal(10, 'controls');
  return (
    <>
      <SectionTitle sub="Every control glows from within. Press to feel the spring.">Controls</SectionTitle>

      <GroupLabel>Buttons — Solid</GroupLabel>
      <GlassCard id="btn-solid" favorites={fav} revealed={revealed[0]} index={0} wide>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <InnerGlowButton label="Storm" hex="#4E7B8E" />
          <InnerGlowButton label="Ember" hex="#E8806C" />
          <InnerGlowButton label="Moss" hex="#5AA878" />
          <InnerGlowButton label="Violet" hex="#B8A0D8" />
          <InnerGlowButton label="Opal" hex="#B0D0D8" />
        </div>
      </GlassCard>

      <GroupLabel>Buttons — Ghost</GroupLabel>
      <GlassCard id="btn-ghost" favorites={fav} revealed={revealed[1]} index={1} wide>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <InnerGlowButton label="Storm" hex="#4E7B8E" variant="ghost" />
          <InnerGlowButton label="Ember" hex="#E8806C" variant="ghost" />
          <InnerGlowButton label="Muted" hex="#6B6878" variant="ghost" />
        </div>
      </GlassCard>

      <GroupLabel>Buttons — Subtle</GroupLabel>
      <GlassCard id="btn-subtle" favorites={fav} revealed={revealed[2]} index={2} wide>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <InnerGlowButton label="Storm" hex="#4E7B8E" variant="subtle" />
          <InnerGlowButton label="Ember" hex="#E8806C" variant="subtle" />
        </div>
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <GlassCard id="ctrl-toggles" favorites={fav} revealed={revealed[3]} index={3}>
          <GroupLabel>Toggles</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <LiquidToggle label="Dark mode" defaultOn />
            <LiquidToggle label="Notifications" />
            <LiquidToggle label="Ambient breathing" defaultOn />
          </div>
        </GlassCard>

        <GlassCard id="ctrl-checks" favorites={fav} revealed={revealed[4]} index={4}>
          <GroupLabel>Checkboxes</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlowCheckbox label="Enable pipeline" defaultChecked />
            <GlowCheckbox label="Show grid" />
            <GlowCheckbox label="Snap to guides" defaultChecked />
          </div>
        </GlassCard>

        <GlassCard id="ctrl-radio" favorites={fav} revealed={revealed[5]} index={5}>
          <GroupLabel>Radio Group</GroupLabel>
          <GlowRadio name="mode" options={['Edit mode', 'Preview mode', 'Presentation']} />
        </GlassCard>

        <GlassCard id="ctrl-inputs" favorites={fav} revealed={revealed[6]} index={6}>
          <GroupLabel>Inputs</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlowInput placeholder="Canvas name..." />
            <GlowInput placeholder="Search widgets..." type="search" />
          </div>
        </GlassCard>

        <GlassCard id="ctrl-select" favorites={fav} revealed={revealed[7]} index={7}>
          <GlowSelect label="Dropdown" options={['Sticker', 'Widget', 'Text', 'Shape', 'Pipeline Node']} />
        </GlassCard>

        <GlassCard id="ctrl-slider" favorites={fav} revealed={revealed[8]} index={8}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlowSlider label="Opacity" initial={80} />
            <GlowSlider label="Blur Radius" max={50} initial={20} />
            <GlowSlider label="Grid Size" min={8} max={64} initial={16} />
          </div>
        </GlassCard>
      </div>
    </>
  );
};
