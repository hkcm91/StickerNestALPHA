/**
 * Animation token constants for the StickerNest V5 design system.
 *
 * Spring physics easing (Her-inspired), duration tiers, and stagger gap.
 * These are global constants — not per-theme — because timing expresses
 * interaction physics, not visual identity.
 *
 * @module shell/theme
 * @layer L6
 */

// =============================================================================
// Easing Curves
// =============================================================================

export const ANIMATION_EASING = {
  /** Her spring — overshoot + settle. Primary interactive easing. */
  spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Material-style smooth decelerate. For subtle UI transitions. */
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Linear — for looping/continuous animations only. */
  linear: 'linear',
} as const;

// =============================================================================
// Duration Tiers
// =============================================================================

export const ANIMATION_DURATION = {
  /** 150ms — micro-interactions: button hover, toggle, tooltip */
  fast: '150ms',
  /** 300ms — standard transitions: panel slide, widget open */
  normal: '300ms',
  /** 500ms — deliberate motions: modal open, page transition */
  slow: '500ms',
  /** 800ms — atmospheric motions: canvas zoom, ambient drift */
  gentle: '800ms',
} as const;

// =============================================================================
// CSS Custom Properties
// =============================================================================

export const ANIMATION_CSS_VARS: Record<string, string> = {
  '--sn-ease-spring': ANIMATION_EASING.spring,
  '--sn-ease-smooth': ANIMATION_EASING.smooth,
  '--sn-duration-fast': ANIMATION_DURATION.fast,
  '--sn-duration-normal': ANIMATION_DURATION.normal,
  '--sn-duration-slow': ANIMATION_DURATION.slow,
  '--sn-duration-gentle': ANIMATION_DURATION.gentle,
  '--sn-stagger-gap': '50ms',
};

// =============================================================================
// DOM Application
// =============================================================================

/**
 * Apply animation CSS custom properties to document.documentElement.
 * Called once on mount by ThemeProvider — animation tokens are global constants.
 */
export function applyAnimationTokens(): void {
  const el = document.documentElement;
  for (const [key, value] of Object.entries(ANIMATION_CSS_VARS)) {
    el.style.setProperty(key, value);
  }
}
