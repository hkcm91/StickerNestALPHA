/**
 * Helpers for consuming StickerNest animation tokens in app UI.
 *
 * Mirrors the pattern in theme-vars.ts — provides animVar(), transition(),
 * arrive(), breathe(), and a timing convenience object.
 *
 * @module shell/theme
 * @layer L6
 */

import type React from 'react';

import { ANIMATION_CSS_VARS, ANIMATION_DURATION, ANIMATION_EASING } from './animation-tokens';

// =============================================================================
// Type
// =============================================================================

export type AnimationTokenKey = keyof typeof ANIMATION_CSS_VARS;

type DurationTier = keyof typeof ANIMATION_DURATION;

// =============================================================================
// animVar — CSS var() with fallback
// =============================================================================

/**
 * Build a CSS var reference with a hardcoded fallback for an animation token.
 *
 * ```ts
 * animVar('--sn-ease-spring')
 * // => 'var(--sn-ease-spring, cubic-bezier(0.16, 1, 0.3, 1))'
 * ```
 */
export function animVar(token: string): string {
  const fallback = ANIMATION_CSS_VARS[token];
  return fallback ? `var(${token}, ${fallback})` : `var(${token})`;
}

// =============================================================================
// transition — build CSS transition strings
// =============================================================================

export interface TransitionOptions {
  duration?: DurationTier;
  easing?: keyof typeof ANIMATION_EASING;
}

/**
 * Build a CSS `transition` string using design-system timing.
 *
 * ```ts
 * transition('background', 'color')
 * // => 'background 300ms cubic-bezier(0.16, 1, 0.3, 1), color 300ms ...'
 *
 * transition('opacity', { duration: 'fast' })
 * // => 'opacity 150ms cubic-bezier(0.16, 1, 0.3, 1)'
 * ```
 */
export function transition(...args: Array<string | TransitionOptions>): string {
  let options: TransitionOptions = {};
  const properties: string[] = [];

  for (const arg of args) {
    if (typeof arg === 'string') {
      properties.push(arg);
    } else {
      options = arg;
    }
  }

  const duration = ANIMATION_DURATION[options.duration ?? 'normal'];
  const easing = ANIMATION_EASING[options.easing ?? 'spring'];

  return properties.map((prop) => `${prop} ${duration} ${easing}`).join(', ');
}

// =============================================================================
// arrive — CSSProperties for arrival animation
// =============================================================================

/**
 * Returns `React.CSSProperties` for the arrival (fade + drift up) animation.
 *
 * @param index - Optional stagger index. Sets animation-delay based on
 *   the stagger gap (50ms per index by default).
 */
export function arrive(index?: number): React.CSSProperties {
  const base: React.CSSProperties = {
    animation: `sn-arrive ${ANIMATION_DURATION.normal} ${ANIMATION_EASING.spring} both`,
  };

  if (index !== undefined && index > 0) {
    base.animationDelay = `calc(${index} * ${ANIMATION_CSS_VARS['--sn-stagger-gap'] ?? '50ms'})`;
  }

  return base;
}

// =============================================================================
// breathe — CSSProperties for breathing idle state
// =============================================================================

export interface BreatheOptions {
  /** Use glow variant instead of scale pulse. */
  glow?: boolean;
  /** Custom glow color (CSS value). Sets --sn-glow-color. */
  glowColor?: string;
  /** Animation duration in seconds. Default: 3.5 */
  duration?: number;
}

/**
 * Returns `React.CSSProperties` for a breathing idle animation.
 *
 * ```ts
 * breathe()               // subtle scale pulse
 * breathe({ glow: true }) // box-shadow glow using --sn-accent
 * breathe({ glow: true, glowColor: 'var(--sn-ember)' })
 * ```
 */
export function breathe(options?: BreatheOptions): React.CSSProperties {
  const dur = options?.duration ?? 3.5;
  const name = options?.glow ? 'sn-glow' : 'sn-breathe';

  const style: React.CSSProperties = {
    animation: `${name} ${dur}s ease-in-out infinite`,
  };

  if (options?.glowColor) {
    (style as Record<string, string>)['--sn-glow-color'] = options.glowColor;
  }

  return style;
}

// =============================================================================
// timing — convenience object (mirrors palette)
// =============================================================================

export const timing = {
  spring: animVar('--sn-ease-spring'),
  smooth: animVar('--sn-ease-smooth'),
  fast: animVar('--sn-duration-fast'),
  normal: animVar('--sn-duration-normal'),
  slow: animVar('--sn-duration-slow'),
  gentle: animVar('--sn-duration-gentle'),
} as const;
