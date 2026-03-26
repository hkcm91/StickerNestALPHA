/**
 * Animation vars helper tests
 * @module shell/theme
 */

import { describe, it, expect } from 'vitest';

import { ANIMATION_CSS_VARS, ANIMATION_DURATION, ANIMATION_EASING } from './animation-tokens';
import { animVar, transition, arrive, breathe, timing } from './animation-vars';

describe('animVar', () => {
  it('returns var() with fallback for known tokens', () => {
    expect(animVar('--sn-ease-spring')).toBe(
      `var(--sn-ease-spring, ${ANIMATION_EASING.spring})`,
    );
  });

  it('returns var() without fallback for unknown tokens', () => {
    expect(animVar('--sn-unknown-token')).toBe('var(--sn-unknown-token)');
  });

  it('works for duration tokens', () => {
    expect(animVar('--sn-duration-fast')).toBe(
      `var(--sn-duration-fast, ${ANIMATION_DURATION.fast})`,
    );
  });
});

describe('transition', () => {
  it('builds transition string with default spring easing and normal duration', () => {
    const result = transition('opacity');
    expect(result).toBe(`opacity ${ANIMATION_DURATION.normal} ${ANIMATION_EASING.spring}`);
  });

  it('handles multiple properties', () => {
    const result = transition('background', 'color', 'transform');
    // Result contains cubic-bezier with internal commas, so check substring presence
    expect(result).toContain('background');
    expect(result).toContain('color');
    expect(result).toContain('transform');
    // Each property should appear once with its own timing
    const bgIndex = result.indexOf('background');
    const colorIndex = result.indexOf('color');
    const transformIndex = result.indexOf('transform');
    expect(bgIndex).toBeLessThan(colorIndex);
    expect(colorIndex).toBeLessThan(transformIndex);
  });

  it('respects duration and easing options', () => {
    const result = transition('opacity', { duration: 'fast', easing: 'smooth' });
    expect(result).toContain(ANIMATION_DURATION.fast);
    expect(result).toContain(ANIMATION_EASING.smooth);
  });
});

describe('arrive', () => {
  it('returns CSSProperties with sn-arrive animation', () => {
    const style = arrive();
    expect(style.animation).toContain('sn-arrive');
    expect(style.animation).toContain(ANIMATION_DURATION.normal);
    expect(style.animation).toContain(ANIMATION_EASING.spring);
  });

  it('adds animationDelay for index > 0', () => {
    const style = arrive(5);
    expect(style.animationDelay).toBeDefined();
    expect(style.animationDelay).toContain('5');
  });

  it('no animationDelay for index 0 or undefined', () => {
    expect(arrive().animationDelay).toBeUndefined();
    expect(arrive(0).animationDelay).toBeUndefined();
  });
});

describe('breathe', () => {
  it('returns scale-based breathing animation by default', () => {
    const style = breathe();
    expect(style.animation).toContain('sn-breathe');
    expect(style.animation).toContain('infinite');
  });

  it('uses glow animation when glow option is true', () => {
    const style = breathe({ glow: true });
    expect(style.animation).toContain('sn-glow');
  });

  it('respects custom duration', () => {
    const style = breathe({ duration: 5 });
    expect(style.animation).toContain('5s');
  });

  it('sets --sn-glow-color when glowColor is provided', () => {
    const style = breathe({ glow: true, glowColor: 'red' });
    expect((style as Record<string, string>)['--sn-glow-color']).toBe('red');
  });
});

describe('timing', () => {
  it('maps to CSS var references for all timing tokens', () => {
    expect(timing.spring).toContain('var(--sn-ease-spring');
    expect(timing.smooth).toContain('var(--sn-ease-smooth');
    expect(timing.fast).toContain('var(--sn-duration-fast');
    expect(timing.normal).toContain('var(--sn-duration-normal');
    expect(timing.slow).toContain('var(--sn-duration-slow');
    expect(timing.gentle).toContain('var(--sn-duration-gentle');
  });
});
