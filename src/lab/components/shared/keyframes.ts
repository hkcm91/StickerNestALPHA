/**
 * Lab keyframe injection — injects all sn-* CSS animations into <head>.
 *
 * Ported from src/shell/dev/panels/swatches/constants.ts for L2 use.
 * Idempotent — safe to call multiple times.
 *
 * @module lab/components/shared
 * @layer L2
 */

const KEYFRAMES_ID = 'sn-lab-keyframes';

export function ensureLabKeyframes(): void {
  if (typeof document === 'undefined') return;
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
    /* Orb idle pulse — slow sine wave for AI companion */
    @keyframes sn-orb-idle {
      0%, 100% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.08); opacity: 1; }
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
