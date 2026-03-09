/**
 * Animation utility tests
 * @module shell/theme
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { injectAnimationKeyframes } from './animation-keyframes';
import { applyAnimationTokens, ANIMATION_CSS_VARS, ANIMATION_EASING, ANIMATION_DURATION } from './animation-tokens';
import { animVar, transition, arrive, breathe } from './animation-vars';

describe('Animation utilities', () => {
  beforeEach(() => {
    // Reset documentElement styles
    document.documentElement.style.cssText = '';
    // Remove any injected keyframe style elements
    const existing = document.getElementById('sn-animation-keyframes');
    if (existing) existing.remove();
  });

  // ── applyAnimationTokens ───────────────────────────────────────────

  describe('applyAnimationTokens', () => {
    it('sets --sn-ease-spring on documentElement', () => {
      applyAnimationTokens();
      const value = document.documentElement.style.getPropertyValue('--sn-ease-spring');
      expect(value).toBe(ANIMATION_EASING.spring);
    });

    it('sets all animation CSS vars', () => {
      applyAnimationTokens();
      const style = document.documentElement.style;
      for (const [key, expected] of Object.entries(ANIMATION_CSS_VARS)) {
        expect(style.getPropertyValue(key)).toBe(expected);
      }
    });
  });

  // ── injectAnimationKeyframes ───────────────────────────────────────

  describe('injectAnimationKeyframes', () => {
    it('is idempotent — calling twice creates only one style element', () => {
      injectAnimationKeyframes();
      injectAnimationKeyframes();
      const elements = document.querySelectorAll('#sn-animation-keyframes');
      expect(elements).toHaveLength(1);
    });

    it('injects all required keyframe names', () => {
      injectAnimationKeyframes();
      const style = document.getElementById('sn-animation-keyframes');
      expect(style).not.toBeNull();
      const css = style!.textContent ?? '';
      const requiredKeyframes = [
        'sn-arrive',
        'sn-fade-in',
        'sn-pop',
        'sn-toast-in',
        'sn-breathe',
        'sn-glow',
        'sn-shimmer',
      ];
      for (const name of requiredKeyframes) {
        expect(css).toContain(name);
      }
    });

    it('includes prefers-reduced-motion override', () => {
      injectAnimationKeyframes();
      const style = document.getElementById('sn-animation-keyframes');
      const css = style!.textContent ?? '';
      expect(css).toContain('prefers-reduced-motion');
    });
  });

  // ── transition() ───────────────────────────────────────────────────

  describe('transition()', () => {
    it('builds transition string with spring easing for multiple properties', () => {
      const result = transition('background', 'color');
      expect(result).toContain('background');
      expect(result).toContain('color');
      expect(result).toContain(ANIMATION_EASING.spring);
      expect(result).toContain(ANIMATION_DURATION.normal);
    });

    it('respects duration option', () => {
      const result = transition('opacity', { duration: 'fast' });
      expect(result).toContain('150ms');
      expect(result).toContain(ANIMATION_EASING.spring);
    });

    it('respects easing option', () => {
      const result = transition('transform', { easing: 'smooth' });
      expect(result).toContain(ANIMATION_EASING.smooth);
    });
  });

  // ── arrive() ───────────────────────────────────────────────────────

  describe('arrive()', () => {
    it('returns CSSProperties with sn-arrive animation', () => {
      const style = arrive();
      expect(style.animation).toContain('sn-arrive');
      expect(style.animation).toContain(ANIMATION_EASING.spring);
    });

    it('includes animationDelay when index > 0', () => {
      const style = arrive(3);
      expect(style.animationDelay).toBeDefined();
      expect(style.animationDelay).toContain('3');
    });

    it('omits animationDelay when index is 0 or undefined', () => {
      expect(arrive().animationDelay).toBeUndefined();
      expect(arrive(0).animationDelay).toBeUndefined();
    });
  });

  // ── breathe() ──────────────────────────────────────────────────────

  describe('breathe()', () => {
    it('returns CSSProperties with infinite animation', () => {
      const style = breathe();
      expect(style.animation).toContain('infinite');
      expect(style.animation).toContain('sn-breathe');
    });

    it('uses sn-glow when glow option is true', () => {
      const style = breathe({ glow: true });
      expect(style.animation).toContain('sn-glow');
    });

    it('sets custom glow color', () => {
      const style = breathe({ glow: true, glowColor: 'var(--sn-ember)' });
      expect((style as Record<string, string>)['--sn-glow-color']).toBe('var(--sn-ember)');
    });
  });

  // ── animVar() ──────────────────────────────────────────────────────

  describe('animVar()', () => {
    it('returns var() with correct fallback', () => {
      const result = animVar('--sn-ease-spring');
      expect(result).toBe(`var(--sn-ease-spring, ${ANIMATION_EASING.spring})`);
    });

    it('returns var() without fallback for unknown tokens', () => {
      const result = animVar('--sn-unknown');
      expect(result).toBe('var(--sn-unknown)');
    });
  });
});
