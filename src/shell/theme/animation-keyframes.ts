/**
 * Global @keyframes for the StickerNest V5 design system.
 *
 * Injected once into document.head by ThemeProvider on mount.
 * Includes prefers-reduced-motion override for accessibility.
 *
 * @module shell/theme
 * @layer L6
 */

const STYLE_ID = 'sn-animation-keyframes';

const KEYFRAMES_CSS = `
/* ═══════════════════════════════════════════════════════════════════════
   P1: Arrival — widgets drift up and fade in
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-arrive {
  from { opacity: 0; transform: translateY(20px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes sn-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes sn-pop {
  from { transform: scale(0.85); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

@keyframes sn-toast-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

/* ═══════════════════════════════════════════════════════════════════════
   P2: Breathing / Idle — nothing is ever completely still
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-breathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.015); }
}

@keyframes sn-glow {
  0%, 100% { box-shadow: 0 0 4px 0 var(--sn-glow-color, var(--sn-accent)); }
  50%      { box-shadow: 0 0 14px 3px var(--sn-glow-color, var(--sn-accent)); }
}

@keyframes sn-breathe-dot {
  0%, 100% { opacity: 0.4; box-shadow: 0 0 4px var(--sn-glow-color, var(--sn-accent)); }
  50%      { opacity: 1;   box-shadow: 0 0 12px var(--sn-glow-color, var(--sn-accent)); }
}

@keyframes sn-breathe-bar {
  0%, 100% { opacity: 0.65; }
  50%      { opacity: 1; }
}

/* ═══════════════════════════════════════════════════════════════════════
   P3: Invisible Toolbar — contextual, spring entry
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-toolbar-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.95); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

/* ═══════════════════════════════════════════════════════════════════════
   P5: Halo handles — gentle pulse on selection handles
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-handle-pulse {
  0%, 100% { opacity: 0.75; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.2); }
}

/* ═══════════════════════════════════════════════════════════════════════
   P6: Feedback through light — color flood on action
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-light-feedback {
  0%   { box-shadow: inset 0 0 0 0 var(--sn-feedback-color, var(--sn-accent)); }
  30%  { box-shadow: inset 0 0 30px 4px var(--sn-feedback-color, var(--sn-accent)); }
  100% { box-shadow: inset 0 0 0 0 var(--sn-feedback-color, var(--sn-accent)); }
}

/* ═══════════════════════════════════════════════════════════════════════
   P10: Context menu — scale-in with slight offset
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-menu-in {
  from { opacity: 0; transform: scale(0.95) translateY(-4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* ═══════════════════════════════════════════════════════════════════════
   P12: Widget states — loading dots + sync bar
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-loading-dot {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50%      { opacity: 1;   transform: scale(1.2); }
}

@keyframes sn-sync-pulse {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}

@keyframes sn-sync-bar {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

@keyframes sn-sync-shimmer {
  0%, 100% { opacity: 0.3; }
  50%      { opacity: 0.6; }
}

/* ═══════════════════════════════════════════════════════════════════════
   P14: Panel slide — curtain entry
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-panel-in-right {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

@keyframes sn-panel-in-left {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}

/* ═══════════════════════════════════════════════════════════════════════
   P15: Command palette — search portal
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes sn-search-in {
  from { opacity: 0; transform: scale(0.96) translateY(-8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* ═══════════════════════════════════════════════════════════════════════
   P17: Rothko field — slow ambient drift
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-rothko-drift-1 {
  0%, 100% { transform: translateX(0)    translateY(0); }
  50%      { transform: translateX(20px) translateY(-10px); }
}

@keyframes sn-rothko-drift-2 {
  0%, 100% { transform: translateX(0)     translateY(0); }
  50%      { transform: translateX(-14px) translateY(8px); }
}

@keyframes sn-rothko-drift-3 {
  0%, 100% { transform: translateX(0)    translateY(0); }
  50%      { transform: translateX(16px) translateY(12px); }
}

/* ═══════════════════════════════════════════════════════════════════════
   Loading — shimmer for skeleton states
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ═══════════════════════════════════════════════════════════════════════
   Obsidian — Holographic shift for chrome/accent borders
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-holographic-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* ═══════════════════════════════════════════════════════════════════════
   Obsidian — Ambient orb drift (slow, organic movement)
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-orb-drift-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25%      { transform: translate(30px, -20px) scale(1.05); }
  50%      { transform: translate(-10px, 15px) scale(0.95); }
  75%      { transform: translate(20px, 10px) scale(1.02); }
}

@keyframes sn-orb-drift-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25%      { transform: translate(-25px, 12px) scale(0.97); }
  50%      { transform: translate(18px, -18px) scale(1.04); }
  75%      { transform: translate(-8px, -25px) scale(0.98); }
}

@keyframes sn-orb-drift-3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(22px, 18px) scale(1.03); }
  66%      { transform: translate(-15px, -12px) scale(0.96); }
}

/* ═══════════════════════════════════════════════════════════════════════
   Obsidian — Adaptive lift (hover state intensification)
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-lift {
  from { transform: translateY(0) scale(1); box-shadow: var(--sn-shadow-neo); }
  to   { transform: translateY(-2px) scale(1.008); box-shadow: var(--sn-shadow-neo), 0 8px 24px rgba(0,0,0,0.3); }
}

/* ═══════════════════════════════════════════════════════════════════════
   Obsidian — Liquid glass refraction shimmer
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-refraction {
  0%, 100% { opacity: 0.5; transform: translateX(-100%) skewX(-15deg); }
  50%      { opacity: 0.8; transform: translateX(100%) skewX(-15deg); }
}

/* ═══════════════════════════════════════════════════════════════════════
   Obsidian — Breathing scale for living UI feel
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes sn-breathe-subtle {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.008); }
}

/* ═══════════════════════════════════════════════════════════════════════
   Accessibility — respect user motion preferences
   ═══════════════════════════════════════════════════════════════════════ */

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

/**
 * Inject global animation keyframes into document.head.
 * Idempotent — safe to call multiple times.
 */
export function injectAnimationKeyframes(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = KEYFRAMES_CSS;
  document.head.appendChild(style);
}
