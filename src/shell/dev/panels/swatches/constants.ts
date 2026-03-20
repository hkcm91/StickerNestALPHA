/**
 * Shared constants, types, and keyframe injection for the UI Swatches gallery.
 *
 * @module shell/dev/swatches
 * @layer L6
 */

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

export const STORAGE_KEY = 'sn:swatch-favorites';
export const SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const STAGGER_MS = 70;

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export type SwatchTab = 'palette' | 'controls' | 'feedback' | 'layout' | 'data' | 'themes';

export const TABS: { id: SwatchTab; label: string }[] = [
  { id: 'palette', label: 'Palette & Type' },
  { id: 'controls', label: 'Controls' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'layout', label: 'Layout' },
  { id: 'data', label: 'Data' },
  { id: 'themes', label: 'Themes' },
];

export interface ColorDef {
  id: string;
  name: string;
  cssVar: string;
  hex: string;
}

export const NAMED_COLORS: ColorDef[] = [
  { id: 'storm', name: 'Storm', cssVar: '--sn-storm', hex: '#4E7B8E' },
  { id: 'storm-light', name: 'Storm Light', cssVar: '--sn-storm-light', hex: '#6A95A6' },
  { id: 'ember', name: 'Ember', cssVar: '--sn-ember', hex: '#E8806C' },
  { id: 'ember-light', name: 'Ember Light', cssVar: '--sn-ember-light', hex: '#F09A88' },
  { id: 'opal', name: 'Opal', cssVar: '--sn-opal', hex: '#B0D0D8' },
  { id: 'moss', name: 'Moss', cssVar: '--sn-moss', hex: '#5AA878' },
  { id: 'violet', name: 'Violet', cssVar: '--sn-violet', hex: '#B8A0D8' },
];

// ═══════════════════════════════════════════════════════════════════
// Keyframes — injected once into <head>
// ═══════════════════════════════════════════════════════════════════

const KEYFRAMES_ID = 'sn-swatches-keyframes';

export function ensureKeyframes(): void {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes sn-breathe {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.12); }
    }
    @keyframes sn-drift-up {
      0% { opacity: 0; transform: translateY(20px) scale(0.97); }
      60% { opacity: 1; transform: translateY(-4px) scale(1.005); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes sn-glow-pulse {
      0%, 100% { box-shadow: 0 0 12px rgba(232,128,108,0.15); }
      50% { box-shadow: 0 0 28px rgba(232,128,108,0.35); }
    }
    @keyframes sn-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes sn-liquid-fill {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(0); }
    }
    @keyframes sn-unfold {
      0% { opacity: 0; transform: scaleY(0.3) scaleX(0.95); transform-origin: top; }
      50% { transform: scaleY(1.03) scaleX(1.005); }
      100% { opacity: 1; transform: scaleY(1) scaleX(1); }
    }
    @keyframes sn-phosphor {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
    @keyframes sn-toast-in {
      0% { opacity: 0; transform: translateX(40px) scale(0.95); }
      60% { transform: translateX(-6px) scale(1.01); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes sn-skeleton-wave {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes sn-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes sn-bg-drift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    /* Aurora — each gradient drifts on its own prime-number cycle */
    @keyframes sn-aurora-1 {
      0%, 100% { transform: translate(0%, 0%) scale(1); }
      33% { transform: translate(5%, -8%) scale(1.05); }
      66% { transform: translate(-3%, 6%) scale(0.97); }
    }
    @keyframes sn-aurora-2 {
      0%, 100% { transform: translate(0%, 0%) scale(1); }
      40% { transform: translate(-6%, 4%) scale(1.03); }
      70% { transform: translate(4%, -5%) scale(0.98); }
    }
    @keyframes sn-aurora-3 {
      0%, 100% { transform: translate(0%, 0%) scale(1); }
      50% { transform: translate(3%, 7%) scale(1.04); }
    }
    /* Breathing grain — baseFrequency cycles */
    @keyframes sn-grain-breathe {
      0%, 100% { opacity: 0.035; }
      50% { opacity: 0.055; }
    }
    /* Bioluminescent pulse — tight, warm glow */
    @keyframes sn-bioluminescent {
      0%, 100% {
        box-shadow: 0 0 3px var(--sn-glow-color, rgba(232,128,108,0.12)),
                    0 0 8px var(--sn-glow-color, rgba(232,128,108,0.05));
      }
      50% {
        box-shadow: 0 0 4px var(--sn-glow-color, rgba(232,128,108,0.16)),
                    0 0 10px var(--sn-glow-color, rgba(232,128,108,0.06)),
                    0 0 18px var(--sn-glow-color, rgba(232,128,108,0.02));
      }
    }
    /* 4-layer phosphorescent glow — expanding halos */
    @keyframes sn-bioluminescent-4layer {
      0%, 100% {
        box-shadow: 0 0 1px var(--sn-glow-color, rgba(78,123,142,0.25)),
                    0 0 8px var(--sn-glow-color, rgba(78,123,142,0.12)),
                    0 0 24px var(--sn-glow-color, rgba(78,123,142,0.06)),
                    0 0 48px var(--sn-glow-color, rgba(78,123,142,0.02));
      }
      50% {
        box-shadow: 0 0 2px var(--sn-glow-color, rgba(78,123,142,0.35)),
                    0 0 12px var(--sn-glow-color, rgba(78,123,142,0.18)),
                    0 0 28px var(--sn-glow-color, rgba(78,123,142,0.08)),
                    0 0 56px var(--sn-glow-color, rgba(78,123,142,0.03));
      }
    }
    /* Traveling light on constellation lines */
    @keyframes sn-traveling-light {
      0% { stroke-dashoffset: 20; }
      100% { stroke-dashoffset: 0; }
    }
    /* Radial ripple loading — stone in water */
    @keyframes sn-ripple-radial {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 0.4; }
      100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
    }
    /* Tooltip spring entrance */
    @keyframes sn-tooltip-in {
      0% { opacity: 0; transform: scale(0.92) translateY(4px); }
      60% { opacity: 1; transform: scale(1.02) translateY(-1px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    /* Context menu item stagger */
    @keyframes sn-context-stagger {
      0% { opacity: 0; transform: translateX(-8px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    /* Button bioluminescent press ripple */
    @keyframes sn-btn-ripple {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 0.3; }
      100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
    }
    /* Slider fill traveling shimmer */
    @keyframes sn-slider-shimmer {
      0% { background-position: -100% 0; }
      100% { background-position: 200% 0; }
    }
    /* Slow ambient orb drift — prime-number durations */
    @keyframes sn-orb-drift {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25% { transform: translate(3%, -5%) scale(1.02); }
      50% { transform: translate(-2%, 3%) scale(0.98); }
      75% { transform: translate(4%, 2%) scale(1.01); }
    }
    /* Breathing empty state */
    @keyframes sn-empty-breathe {
      0%, 100% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.06); opacity: 0.45; filter: drop-shadow(0 0 12px rgba(78,123,142,0.15)); }
    }
    /* Table row left-edge glow reveal */
    @keyframes sn-edge-glow-in {
      0% { transform: scaleY(0); }
      100% { transform: scaleY(1); }
    }
    /* Progress bar completion burst */
    @keyframes sn-completion-burst {
      0% { transform: scale(0.5); opacity: 0.6; }
      50% { transform: scale(1.5); opacity: 0.3; }
      100% { transform: scale(2); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 200ms !important;
      }
    }
  `;
  document.head.appendChild(style);
}
