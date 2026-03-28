/**
 * Obsidian Design System — ambient visual effects layer.
 *
 * Injects theme-aware CSS for:
 * - Film grain texture (SVG feTurbulence at token-controlled opacity)
 * - Hexagonal background pattern (CSS-only, token-controlled opacity)
 * - Liquid glass utility classes (.sn-glass, .sn-glass-heavy, .sn-liquid-glass, .sn-elevated)
 * - Neo-skeuomorphic depth utility (.sn-neo, .sn-neo-inset)
 * - Holographic border accent utility (.sn-holo-border)
 * - Chrome text utility (.sn-chrome-text)
 * - Adaptive motion utilities (.sn-breathe, .sn-lift-on-hover)
 * - Ambient orb container (.sn-ambient-orbs)
 *
 * All effects respect `prefers-reduced-motion: reduce` via the global
 * keyframe override in animation-keyframes.ts. Grain and hex opacities
 * are controlled by theme tokens so high-contrast can disable them (0).
 *
 * @module shell/theme
 * @layer L6
 */

const STYLE_ID = 'sn-obsidian-effects';

/**
 * SVG noise filter definition for film grain.
 * Uses feTurbulence for organic noise, applied as a fixed overlay.
 * Opacity driven by CSS custom property --sn-grain-opacity.
 */
const GRAIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute">
  <filter id="sn-grain-filter">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
</svg>`;

const OBSIDIAN_CSS = `
/* ═══════════════════════════════════════════════════════════════════════
   Grain Overlay — full-viewport SVG noise texture
   ═══════════════════════════════════════════════════════════════════════ */

.sn-grain-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: var(--sn-grain-opacity, 0.15);
  mix-blend-mode: overlay;
}

.sn-grain-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  filter: url(#sn-grain-filter);
  background: transparent;
  width: 100%;
  height: 100%;
}

/* ═══════════════════════════════════════════════════════════════════════
   Hexagonal Pattern — CSS-only overlapping gradient grid
   ═══════════════════════════════════════════════════════════════════════ */

.sn-hex-pattern {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: var(--sn-hex-opacity, 0.12);
  background-image:
    linear-gradient(30deg,  var(--sn-border) 12%, transparent 12.5%, transparent 87%, var(--sn-border) 87.5%, var(--sn-border)),
    linear-gradient(150deg, var(--sn-border) 12%, transparent 12.5%, transparent 87%, var(--sn-border) 87.5%, var(--sn-border)),
    linear-gradient(30deg,  var(--sn-border) 12%, transparent 12.5%, transparent 87%, var(--sn-border) 87.5%, var(--sn-border)),
    linear-gradient(150deg, var(--sn-border) 12%, transparent 12.5%, transparent 87%, var(--sn-border) 87.5%, var(--sn-border)),
    linear-gradient(60deg,  var(--sn-text-faint, rgba(255,255,255,0.05)) 25%, transparent 25.5%, transparent 75%, var(--sn-text-faint, rgba(255,255,255,0.05)) 75%, var(--sn-text-faint, rgba(255,255,255,0.05))),
    linear-gradient(60deg,  var(--sn-text-faint, rgba(255,255,255,0.05)) 25%, transparent 25.5%, transparent 75%, var(--sn-text-faint, rgba(255,255,255,0.05)) 75%, var(--sn-text-faint, rgba(255,255,255,0.05)));
  background-size: 80px 140px;
  background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px;
}

/* ═══════════════════════════════════════════════════════════════════════
   Glass Surface Utilities — four tiers from design system
   ═══════════════════════════════════════════════════════════════════════ */

.sn-glass {
  background: var(--sn-surface-glass);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid var(--sn-border);
  border-radius: var(--sn-radius);
}

.sn-glass-heavy {
  background: var(--sn-surface-glass-heavy);
  backdrop-filter: blur(48px) saturate(1.6);
  -webkit-backdrop-filter: blur(48px) saturate(1.6);
  border: 1px solid var(--sn-border);
  border-radius: var(--sn-radius);
}

.sn-liquid-glass {
  background: var(--sn-surface-liquid-glass);
  backdrop-filter: blur(40px) saturate(1.5) brightness(1.1);
  -webkit-backdrop-filter: blur(40px) saturate(1.5) brightness(1.1);
  border: 1px solid var(--sn-border);
  border-radius: var(--sn-radius);
  position: relative;
  overflow: hidden;
}

/* Refraction edge highlight on liquid glass */
.sn-liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    var(--sn-refraction-edge, rgba(255,255,255,0.15)) 0%,
    transparent 35%,
    transparent 65%,
    var(--sn-refraction-edge, rgba(255,255,255,0.15)) 100%
  );
  pointer-events: none;
  animation: sn-liquid-shimmer 8s ease-in-out infinite;
}

@keyframes sn-liquid-shimmer {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.sn-elevated {
  background: var(--sn-surface-elevated);
  backdrop-filter: blur(48px) saturate(1.6);
  -webkit-backdrop-filter: blur(48px) saturate(1.6);
  border: 1px solid var(--sn-border);
  border-radius: var(--sn-radius);
  box-shadow: 0 16px 48px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2);
}

/* ═══════════════════════════════════════════════════════════════════════
   Neo-Skeuomorphic Depth Utilities
   ═══════════════════════════════════════════════════════════════════════ */

.sn-neo {
  box-shadow: var(--sn-shadow-neo, 8px 8px 20px rgba(0,0,0,0.5), -3px -3px 10px rgba(255,255,255,0.04));
}

.sn-neo-inset {
  box-shadow: var(--sn-shadow-neo-inset, inset 4px 4px 12px rgba(0,0,0,0.4), inset -2px -2px 8px rgba(255,255,255,0.03));
}

/* ═══════════════════════════════════════════════════════════════════════
   Holographic / Chrome Accent Utilities
   ═══════════════════════════════════════════════════════════════════════ */

.sn-holo-border {
  position: relative;
}

.sn-holo-border::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: var(--sn-holographic-border, linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #5f27cd, #ff6b6b));
  background-size: 300% 300%;
  animation: sn-holographic-shift 4s ease-in-out infinite;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
  padding: 2px;
  pointer-events: none;
  z-index: 1;
  opacity: 0.8;
}

.sn-chrome-text {
  background: var(--sn-chrome-gradient, linear-gradient(135deg, #e0e0e0, #ffffff, #a0a0a0, #ffffff, #c0c0c0, #ffffff, #e0e0e0));
  background-size: 300% 300%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: sn-holographic-shift 3s ease-in-out infinite;
  filter: drop-shadow(0 0 2px rgba(255,255,255,0.3));
}

/* ═══════════════════════════════════════════════════════════════════════
   Adaptive Motion Utilities
   ═══════════════════════════════════════════════════════════════════════ */

.sn-breathe {
  animation: sn-breathe-dramatic 5s ease-in-out infinite;
}

@keyframes sn-breathe-dramatic {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.03); opacity: 1; }
}

.sn-lift-on-hover {
  transition: transform 300ms var(--sn-transition-spring, cubic-bezier(0.16, 1, 0.3, 1)),
              box-shadow 300ms var(--sn-transition-spring, cubic-bezier(0.16, 1, 0.3, 1)),
              filter 300ms ease;
}

.sn-lift-on-hover:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: var(--sn-shadow-neo, 8px 8px 20px rgba(0,0,0,0.5)), 0 12px 32px rgba(0,0,0,0.3);
  filter: brightness(1.1);
}

.sn-lift-on-hover:active {
  transform: translateY(-1px) scale(0.99);
  transition-duration: 100ms;
}

/* ═══════════════════════════════════════════════════════════════════════
   Ambient Orbs — background breathing light
   ═══════════════════════════════════════════════════════════════════════ */

.sn-ambient-orbs {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.sn-ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.55;
}

.sn-ambient-orb:nth-child(1) {
  width: 600px;
  height: 600px;
  top: 5%;
  left: 10%;
  background: var(--sn-accent-glow, rgba(232,93,47,0.4));
  animation: sn-orb-drift-1 20s ease-in-out infinite;
}

.sn-ambient-orb:nth-child(2) {
  width: 500px;
  height: 500px;
  top: 55%;
  right: 10%;
  background: var(--sn-glow, rgba(78,123,142,0.4));
  animation: sn-orb-drift-2 25s ease-in-out infinite;
}

.sn-ambient-orb:nth-child(3) {
  width: 450px;
  height: 450px;
  bottom: 10%;
  left: 35%;
  background: var(--sn-accent-muted, rgba(139,92,246,0.3));
  animation: sn-orb-drift-3 30s ease-in-out infinite;
}

/* ═══════════════════════════════════════════════════════════════════════
   Accessibility — hide ambient orbs for reduced-motion users
   ═══════════════════════════════════════════════════════════════════════ */

@media (prefers-reduced-motion: reduce) {
  .sn-ambient-orbs,
  .sn-grain-overlay {
    display: none !important;
  }
  .sn-holo-border::after,
  .sn-chrome-text {
    animation: none !important;
  }
  .sn-breathe {
    animation: none !important;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Global Scrollbar Hide — scroll works via trackpad/wheel/touch
   ═══════════════════════════════════════════════════════════════════════ */
*::-webkit-scrollbar { display: none; }
* { scrollbar-width: none; -ms-overflow-style: none; }
`;

/**
 * Inject the Obsidian design system CSS and grain SVG into the document.
 * Idempotent — safe to call multiple times.
 */
export function injectObsidianEffects(): void {
  if (document.getElementById(STYLE_ID)) return;

  // Inject grain SVG filter definition
  const svgContainer = document.createElement('div');
  svgContainer.id = 'sn-grain-svg';
  svgContainer.innerHTML = GRAIN_SVG;
  svgContainer.style.position = 'absolute';
  svgContainer.style.width = '0';
  svgContainer.style.height = '0';
  svgContainer.style.overflow = 'hidden';
  document.body.appendChild(svgContainer);

  // Inject Obsidian CSS
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = OBSIDIAN_CSS;
  document.head.appendChild(style);
}

/**
 * Create the grain overlay element and append to the app root.
 * Call once on mount. The overlay uses CSS from injectObsidianEffects().
 */
export function mountGrainOverlay(container: HTMLElement): HTMLDivElement {
  const existing = container.querySelector('.sn-grain-overlay');
  if (existing) return existing as HTMLDivElement;

  const overlay = document.createElement('div');
  overlay.className = 'sn-grain-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  container.appendChild(overlay);
  return overlay;
}

/**
 * Create the hex pattern element and append to the app root.
 * Call once on mount. The pattern uses CSS from injectObsidianEffects().
 */
export function mountHexPattern(container: HTMLElement): HTMLDivElement {
  const existing = container.querySelector('.sn-hex-pattern');
  if (existing) return existing as HTMLDivElement;

  const pattern = document.createElement('div');
  pattern.className = 'sn-hex-pattern';
  pattern.setAttribute('aria-hidden', 'true');
  container.appendChild(pattern);
  return pattern;
}

/**
 * Create the ambient orb container with 3 orbs and append to the app root.
 * Call once on mount. The orbs use CSS from injectObsidianEffects().
 */
export function mountAmbientOrbs(container: HTMLElement): HTMLDivElement {
  const existing = container.querySelector('.sn-ambient-orbs');
  if (existing) return existing as HTMLDivElement;

  const orbs = document.createElement('div');
  orbs.className = 'sn-ambient-orbs';
  orbs.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const orb = document.createElement('div');
    orb.className = 'sn-ambient-orb';
    orbs.appendChild(orb);
  }
  container.appendChild(orbs);
  return orbs;
}
