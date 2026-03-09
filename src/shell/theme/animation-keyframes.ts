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
/* ── Arrival ────────────────────────────────────────────────────────── */

@keyframes sn-arrive {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes sn-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes sn-pop {
  from { transform: scale(0.9); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

@keyframes sn-toast-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

/* ── Breathing / Idle ───────────────────────────────────────────────── */

@keyframes sn-breathe {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.02); }
  100% { transform: scale(1); }
}

@keyframes sn-glow {
  0%   { box-shadow: 0 0 0 0 var(--sn-glow-color, var(--sn-accent)); }
  50%  { box-shadow: 0 0 12px 2px var(--sn-glow-color, var(--sn-accent)); }
  100% { box-shadow: 0 0 0 0 var(--sn-glow-color, var(--sn-accent)); }
}

/* ── Loading ────────────────────────────────────────────────────────── */

@keyframes sn-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Accessibility ──────────────────────────────────────────────────── */

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
