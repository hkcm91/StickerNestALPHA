/**
 * Tests for the Obsidian design system CSS injection module.
 * @module shell/theme
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  injectObsidianEffects,
  mountGrainOverlay,
  mountHexPattern,
  mountAmbientOrbs,
} from './obsidian-effects';

describe('injectObsidianEffects', () => {
  beforeEach(() => {
    // Clean up any injected elements
    document.getElementById('sn-obsidian-effects')?.remove();
    document.getElementById('sn-grain-svg')?.remove();
  });

  afterEach(() => {
    document.getElementById('sn-obsidian-effects')?.remove();
    document.getElementById('sn-grain-svg')?.remove();
  });

  it('injects the Obsidian CSS stylesheet into document.head', () => {
    injectObsidianEffects();
    const style = document.getElementById('sn-obsidian-effects');
    expect(style).toBeTruthy();
    expect(style?.tagName.toLowerCase()).toBe('style');
    expect(style?.textContent).toContain('.sn-glass');
    expect(style?.textContent).toContain('.sn-liquid-glass');
    expect(style?.textContent).toContain('.sn-grain-overlay');
    expect(style?.textContent).toContain('.sn-hex-pattern');
    expect(style?.textContent).toContain('.sn-neo');
    expect(style?.textContent).toContain('.sn-holo-border');
    expect(style?.textContent).toContain('.sn-chrome-text');
    expect(style?.textContent).toContain('.sn-breathe');
    expect(style?.textContent).toContain('.sn-lift-on-hover');
    expect(style?.textContent).toContain('.sn-ambient-orbs');
  });

  it('injects the grain SVG filter into document.body', () => {
    injectObsidianEffects();
    const svg = document.getElementById('sn-grain-svg');
    expect(svg).toBeTruthy();
    expect(svg?.innerHTML).toContain('sn-grain-filter');
    expect(svg?.innerHTML).toContain('feTurbulence');
  });

  it('is idempotent — calling twice does not duplicate elements', () => {
    injectObsidianEffects();
    injectObsidianEffects();
    const styles = document.querySelectorAll('#sn-obsidian-effects');
    expect(styles.length).toBe(1);
  });

  it('includes prefers-reduced-motion overrides', () => {
    injectObsidianEffects();
    const style = document.getElementById('sn-obsidian-effects');
    expect(style?.textContent).toContain('prefers-reduced-motion');
    expect(style?.textContent).toContain('.sn-ambient-orbs');
    expect(style?.textContent).toContain('display: none');
  });

  it('glass utilities reference correct CSS custom properties', () => {
    injectObsidianEffects();
    const css = document.getElementById('sn-obsidian-effects')?.textContent ?? '';
    expect(css).toContain('--sn-surface-glass');
    expect(css).toContain('--sn-surface-glass-heavy');
    expect(css).toContain('--sn-surface-liquid-glass');
    expect(css).toContain('--sn-surface-elevated');
    expect(css).toContain('--sn-blur-surface');
    expect(css).toContain('--sn-blur-heavy');
    expect(css).toContain('--sn-refraction-edge');
    expect(css).toContain('--sn-shadow-neo');
    expect(css).toContain('--sn-grain-opacity');
    expect(css).toContain('--sn-hex-opacity');
  });
});

describe('mountGrainOverlay', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates a grain overlay element', () => {
    const overlay = mountGrainOverlay(container);
    expect(overlay.className).toBe('sn-grain-overlay');
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });

  it('is idempotent — second call returns the existing element', () => {
    const first = mountGrainOverlay(container);
    const second = mountGrainOverlay(container);
    expect(first).toBe(second);
    expect(container.querySelectorAll('.sn-grain-overlay').length).toBe(1);
  });
});

describe('mountHexPattern', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates a hex pattern element', () => {
    const pattern = mountHexPattern(container);
    expect(pattern.className).toBe('sn-hex-pattern');
    expect(pattern.getAttribute('aria-hidden')).toBe('true');
  });

  it('is idempotent', () => {
    mountHexPattern(container);
    mountHexPattern(container);
    expect(container.querySelectorAll('.sn-hex-pattern').length).toBe(1);
  });
});

describe('mountAmbientOrbs', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates an ambient orbs container with 3 orbs', () => {
    const orbs = mountAmbientOrbs(container);
    expect(orbs.className).toBe('sn-ambient-orbs');
    expect(orbs.getAttribute('aria-hidden')).toBe('true');
    expect(orbs.querySelectorAll('.sn-ambient-orb').length).toBe(3);
  });

  it('is idempotent', () => {
    mountAmbientOrbs(container);
    mountAmbientOrbs(container);
    expect(container.querySelectorAll('.sn-ambient-orbs').length).toBe(1);
  });
});
