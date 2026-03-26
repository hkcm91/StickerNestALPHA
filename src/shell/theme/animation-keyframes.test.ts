/**
 * Animation keyframes injection tests
 * @module shell/theme
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { injectAnimationKeyframes } from './animation-keyframes';

describe('injectAnimationKeyframes', () => {
  beforeEach(() => {
    const existing = document.getElementById('sn-animation-keyframes');
    if (existing) existing.remove();
  });

  it('creates a style element in document.head', () => {
    injectAnimationKeyframes();
    const el = document.getElementById('sn-animation-keyframes');
    expect(el).not.toBeNull();
    expect(el!.tagName.toLowerCase()).toBe('style');
  });

  it('is idempotent — multiple calls produce only one style element', () => {
    injectAnimationKeyframes();
    injectAnimationKeyframes();
    injectAnimationKeyframes();
    const elements = document.querySelectorAll('#sn-animation-keyframes');
    expect(elements).toHaveLength(1);
  });

  it('contains all expected @keyframes definitions', () => {
    injectAnimationKeyframes();
    const css = document.getElementById('sn-animation-keyframes')!.textContent ?? '';
    const expected = [
      'sn-arrive',
      'sn-fade-in',
      'sn-pop',
      'sn-toast-in',
      'sn-breathe',
      'sn-glow',
      'sn-toolbar-in',
      'sn-handle-pulse',
      'sn-light-feedback',
      'sn-menu-in',
      'sn-loading-dot',
      'sn-sync-pulse',
      'sn-sync-bar',
      'sn-panel-in-right',
      'sn-panel-in-left',
      'sn-backdrop-in',
      'sn-search-in',
      'sn-rothko-drift-1',
      'sn-rothko-drift-2',
      'sn-rothko-drift-3',
      'sn-shimmer',
    ];
    for (const name of expected) {
      expect(css).toContain(`@keyframes ${name}`);
    }
  });

  it('includes prefers-reduced-motion media query', () => {
    injectAnimationKeyframes();
    const css = document.getElementById('sn-animation-keyframes')!.textContent ?? '';
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation-duration: 0.01ms');
  });
});
