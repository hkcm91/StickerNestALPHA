/**
 * Feedback tab — toasts, progress bars, skeletons, badges,
 * status indicators, spinners, tooltips.
 *
 * @module shell/dev/swatches/tabs
 * @layer L6
 */

import React, { useState } from 'react';

import { palette } from '../../../../theme/theme-vars';
import { InnerGlowButton } from '../controls';
import { ToastDemo, PhosphorProgress, SkeletonLine, Badge, StatusDot, RadialRippleSkeleton, InteractiveTooltip } from '../feedback';
import type { FavoritesHook } from '../hooks';
import { useStaggerReveal } from '../hooks';
import { GlassCard, SectionTitle, GroupLabel } from '../primitives';

export const FeedbackTab: React.FC<{ fav: FavoritesHook }> = ({ fav }) => {
  const [progress, setProgress] = useState(65);
  const revealed = useStaggerReveal(10, 'feedback');

  return (
    <>
      <SectionTitle sub="Feedback through light, not motion. Warm ember, not red alert.">Feedback & Status</SectionTitle>

      <GroupLabel>Toasts</GroupLabel>
      <GlassCard id="fb-toasts" favorites={fav} revealed={revealed[0]} index={0} wide>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ToastDemo variant="success" message="Canvas saved successfully" />
          <ToastDemo variant="warning" message="Row changed — refreshed" />
          <ToastDemo variant="error" message="Widget failed to load" />
          <ToastDemo variant="info" message="2 collaborators joined" />
        </div>
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <GlassCard id="fb-progress" favorites={fav} revealed={revealed[1]} index={1}>
          <GroupLabel>Progress Bars</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: palette.textMuted }}>Uploading...</span>
                <span style={{ fontSize: 10, color: palette.textMuted, fontFamily: 'var(--sn-font-mono)' }}>{progress}%</span>
              </div>
              <PhosphorProgress value={progress} />
            </div>
            <div>
              <span style={{ fontSize: 10, color: palette.textMuted }}>Publishing</span>
              <PhosphorProgress value={35} color="var(--sn-ember)" />
            </div>
            <div>
              <span style={{ fontSize: 10, color: palette.textMuted }}>Complete</span>
              <PhosphorProgress value={100} color="var(--sn-moss)" />
            </div>
            <input type="range" min={0} max={100} value={progress}
              onChange={e => setProgress(+e.target.value)}
              style={{ width: '100%', opacity: 0.5, cursor: 'pointer' }} />
          </div>
        </GlassCard>

        <GlassCard id="fb-skeleton" favorites={fav} revealed={revealed[2]} index={2}>
          <GroupLabel>Loading Skeleton</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <SkeletonLine width="40px" height={40} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SkeletonLine width="70%" />
                <SkeletonLine width="45%" />
              </div>
            </div>
            <SkeletonLine />
            <SkeletonLine width="80%" />
            <SkeletonLine width="60%" />
          </div>
        </GlassCard>

        <GlassCard id="fb-badges" favorites={fav} revealed={revealed[3]} index={3}>
          <GroupLabel>Badges & Pills</GroupLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge label="Published" color="#5AA878" />
            <Badge label="Draft" color="#D4A04C" />
            <Badge label="Deprecated" color="#C85858" />
            <Badge label="Featured" color="#4E7B8E" />
            <Badge label="New" color="#B8A0D8" />
            <Badge label="Pro" color="#E8806C" />
          </div>
        </GlassCard>

        <GlassCard id="fb-status" favorites={fav} revealed={revealed[4]} index={4}>
          <GroupLabel>Status Indicators</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StatusDot label="Online" color="#5AA878" pulse />
            <StatusDot label="Away" color="#D4A04C" />
            <StatusDot label="Busy" color="#C85858" pulse />
            <StatusDot label="Syncing" color="#4E7B8E" pulse />
            <StatusDot label="Offline" color="#6B6878" />
          </div>
        </GlassCard>

        <GlassCard id="fb-spinner" favorites={fav} revealed={revealed[5]} index={5}>
          <GroupLabel>Spinners</GroupLabel>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {/* Ring spinner */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '2.5px solid rgba(255,255,255,0.06)',
              borderTopColor: 'var(--sn-storm)',
              animation: 'sn-spin 0.8s linear infinite',
              boxShadow: '0 0 8px rgba(78,123,142,0.2)',
            }} />
            {/* Dots */}
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--sn-storm)',
                  animation: `sn-breathe 1.5s ease-in-out ${i * 200}ms infinite`,
                }} />
              ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard id="fb-tooltip" favorites={fav} revealed={revealed[6]} index={6}>
          <GroupLabel>Interactive Tooltip</GroupLabel>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <InteractiveTooltip text="Ctrl+Z to undo">
              <InnerGlowButton label="Hover me" hex="#4E7B8E" variant="subtle" />
            </InteractiveTooltip>
            <InteractiveTooltip text="Publish to marketplace">
              <InnerGlowButton label="Publish" hex="#E8806C" variant="subtle" />
            </InteractiveTooltip>
            <InteractiveTooltip text="Save draft (Ctrl+S)">
              <span style={{
                fontSize: 11, color: palette.textSoft, cursor: 'default',
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>Save</span>
            </InteractiveTooltip>
          </div>
        </GlassCard>

        <GlassCard id="fb-radial-skeleton" favorites={fav} revealed={revealed[7]} index={7}>
          <GroupLabel>Radial Ripple Loading</GroupLabel>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
            <RadialRippleSkeleton size={60} />
            <RadialRippleSkeleton size={80} color="rgba(232,128,108,0.12)" />
            <RadialRippleSkeleton size={50} color="rgba(184,160,216,0.15)" />
          </div>
          <div style={{ fontSize: 10, color: palette.textMuted, textAlign: 'center', marginTop: 8 }}>
            Organic loading — concentric ripples, not linear shimmer
          </div>
        </GlassCard>

        <GlassCard id="fb-completion" favorites={fav} revealed={revealed[8]} index={8} wide>
          <GroupLabel>Completion Burst</GroupLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: palette.textMuted }}>Upload progress</span>
                <span style={{ fontSize: 10, color: palette.textMuted, fontFamily: 'var(--sn-font-mono)' }}>{progress}%</span>
              </div>
              <PhosphorProgress value={progress} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="range" min={0} max={100} value={progress}
                onChange={e => setProgress(+e.target.value)}
                style={{ flex: 1, opacity: 0.5, cursor: 'pointer' }} />
              <span style={{ fontSize: 9, color: palette.textFaint }}>Drag to 100% for burst</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </>
  );
};
