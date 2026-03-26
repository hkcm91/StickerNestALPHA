/**
 * Animation tokens tests
 * @module shell/theme
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  ANIMATION_EASING,
  ANIMATION_DURATION,
  ANIMATION_CSS_VARS,
  applyAnimationTokens,
} from './animation-tokens';

describe('ANIMATION_EASING', () => {
  it('has spring, smooth, and linear easing curves', () => {
    expect(ANIMATION_EASING.spring).toContain('cubic-bezier');
    expect(ANIMATION_EASING.smooth).toContain('cubic-bezier');
    expect(ANIMATION_EASING.linear).toBe('linear');
  });

  it('spring has overshoot characteristic (second control point y > 1)', () => {
    // cubic-bezier(0.16, 1, 0.3, 1) — y2=1 means settle at exact target
    expect(ANIMATION_EASING.spring).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
  });
});

describe('ANIMATION_DURATION', () => {
  it('has four tiers in ascending order', () => {
    const fast = parseInt(ANIMATION_DURATION.fast);
    const normal = parseInt(ANIMATION_DURATION.normal);
    const slow = parseInt(ANIMATION_DURATION.slow);
    const gentle = parseInt(ANIMATION_DURATION.gentle);
    expect(fast).toBeLessThan(normal);
    expect(normal).toBeLessThan(slow);
    expect(slow).toBeLessThan(gentle);
  });

  it('all values end with ms', () => {
    for (const value of Object.values(ANIMATION_DURATION)) {
      expect(value).toMatch(/^\d+ms$/);
    }
  });
});

describe('ANIMATION_CSS_VARS', () => {
  it('contains easing and duration variables', () => {
    expect(ANIMATION_CSS_VARS['--sn-ease-spring']).toBe(ANIMATION_EASING.spring);
    expect(ANIMATION_CSS_VARS['--sn-ease-smooth']).toBe(ANIMATION_EASING.smooth);
    expect(ANIMATION_CSS_VARS['--sn-duration-fast']).toBe(ANIMATION_DURATION.fast);
    expect(ANIMATION_CSS_VARS['--sn-duration-normal']).toBe(ANIMATION_DURATION.normal);
  });

  it('includes stagger gap', () => {
    expect(ANIMATION_CSS_VARS['--sn-stagger-gap']).toBe('50ms');
  });
});

describe('applyAnimationTokens', () => {
  beforeEach(() => {
    document.documentElement.style.cssText = '';
  });

  it('sets all animation CSS vars on documentElement', () => {
    applyAnimationTokens();
    const style = document.documentElement.style;
    for (const [key, value] of Object.entries(ANIMATION_CSS_VARS)) {
      expect(style.getPropertyValue(key)).toBe(value);
    }
  });

  it('is safe to call multiple times', () => {
    applyAnimationTokens();
    applyAnimationTokens();
    expect(document.documentElement.style.getPropertyValue('--sn-ease-spring')).toBe(ANIMATION_EASING.spring);
  });

  it('does not remove pre-existing style properties', () => {
    document.documentElement.style.setProperty('--custom-prop', 'test');
    applyAnimationTokens();
    expect(document.documentElement.style.getPropertyValue('--custom-prop')).toBe('test');
  });
});
