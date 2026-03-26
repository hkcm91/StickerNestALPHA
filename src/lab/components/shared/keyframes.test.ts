/**
 * Lab keyframe injection tests.
 *
 * @vitest-environment happy-dom
 * @module lab/components/shared
 * @layer L2
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { ensureLabKeyframes } from './keyframes';

describe('ensureLabKeyframes', () => {
  beforeEach(() => {
    // Remove the style element if it was previously injected
    const existing = document.getElementById('sn-lab-keyframes');
    if (existing) existing.remove();
  });

  it('injects a style element into the document head', () => {
    ensureLabKeyframes();
    const el = document.getElementById('sn-lab-keyframes');
    expect(el).toBeTruthy();
    expect(el!.tagName.toLowerCase()).toBe('style');
  });

  it('is idempotent — calling twice does not duplicate the style element', () => {
    ensureLabKeyframes();
    ensureLabKeyframes();
    const elements = document.querySelectorAll('#sn-lab-keyframes');
    expect(elements.length).toBe(1);
  });

  it('contains expected keyframe animation names', () => {
    ensureLabKeyframes();
    const el = document.getElementById('sn-lab-keyframes') as HTMLStyleElement;
    const content = el.textContent ?? '';
    expect(content).toContain('@keyframes sn-breathe');
    expect(content).toContain('@keyframes sn-drift-up');
    expect(content).toContain('@keyframes sn-glow-pulse');
    expect(content).toContain('@keyframes sn-shimmer');
    expect(content).toContain('@keyframes sn-unfold');
    expect(content).toContain('@keyframes sn-spin');
    expect(content).toContain('@keyframes sn-aurora-1');
    expect(content).toContain('@keyframes sn-orb-idle');
  });

  it('includes prefers-reduced-motion media query', () => {
    ensureLabKeyframes();
    const el = document.getElementById('sn-lab-keyframes') as HTMLStyleElement;
    const content = el.textContent ?? '';
    expect(content).toContain('prefers-reduced-motion');
  });
});
