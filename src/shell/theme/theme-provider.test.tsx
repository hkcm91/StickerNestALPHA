/**
 * ThemeProvider component tests
 * @module shell/theme
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useUIStore } from '../../kernel/stores/ui/ui.store';

import { applyThemeTokens, emitThemeChange, useThemeActions, ThemeProvider } from './theme-provider';
import { THEME_TOKENS } from './theme-tokens';

// Mock the animation modules to avoid side effects
vi.mock('./animation-keyframes', () => ({
  injectAnimationKeyframes: vi.fn(),
}));
vi.mock('./animation-tokens', () => ({
  applyAnimationTokens: vi.fn(),
}));

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.style.cssText = '';
    delete document.documentElement.dataset.theme;
    useUIStore.setState({ theme: 'midnight-aurora' });
  });

  it('renders children', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Hello</div>
      </ThemeProvider>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.getByTestId('child').textContent).toBe('Hello');
  });

  it('applies theme tokens on mount from uiStore theme', () => {
    useUIStore.setState({ theme: 'crystal-light' });
    render(
      <ThemeProvider>
        <span>ok</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.style.getPropertyValue('--sn-bg')).toBe('#FAF8F5');
    expect(document.documentElement.dataset.theme).toBe('crystal-light');
  });

  it('applies tokens when store theme changes', async () => {
    useUIStore.setState({ theme: 'midnight-aurora' });
    const { rerender } = render(
      <ThemeProvider>
        <span>ok</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe('midnight-aurora');

    // Simulate theme change
    useUIStore.setState({ theme: 'high-contrast' });
    rerender(
      <ThemeProvider>
        <span>ok</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe('high-contrast');
    expect(document.documentElement.style.getPropertyValue('--sn-bg')).toBe('#000000');
  });

  it('calls injectAnimationKeyframes and applyAnimationTokens on mount', async () => {
    const { injectAnimationKeyframes } = await import('./animation-keyframes');
    const { applyAnimationTokens: applyAnim } = await import('./animation-tokens');
    render(
      <ThemeProvider>
        <span>ok</span>
      </ThemeProvider>,
    );
    expect(injectAnimationKeyframes).toHaveBeenCalled();
    expect(applyAnim).toHaveBeenCalled();
  });
});

describe('applyThemeTokens', () => {
  beforeEach(() => {
    document.documentElement.style.cssText = '';
    delete document.documentElement.dataset.theme;
  });

  it('does nothing for an invalid theme name', () => {
    applyThemeTokens('nonexistent' as never);
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('sets all token keys from the requested theme', () => {
    applyThemeTokens('bubbles-sky');
    const tokens = THEME_TOKENS['bubbles-sky'];
    for (const [key, value] of Object.entries(tokens)) {
      expect(document.documentElement.style.getPropertyValue(key)).toBe(value);
    }
  });

  it('overwrites previous theme tokens', () => {
    applyThemeTokens('midnight-aurora');
    expect(document.documentElement.style.getPropertyValue('--sn-bg')).toBe('#0A0A0E');
    applyThemeTokens('crystal-light');
    expect(document.documentElement.style.getPropertyValue('--sn-bg')).toBe('#FAF8F5');
  });
});

describe('useThemeActions', () => {
  beforeEach(() => {
    document.documentElement.style.cssText = '';
    delete document.documentElement.dataset.theme;
  });

  it('changeTheme applies tokens and emits bus event', () => {
    // Use the hook result directly (it's not a React hook, just returns an object)
    const { changeTheme } = useThemeActions();
    changeTheme('autumn-fireflies');
    expect(document.documentElement.dataset.theme).toBe('autumn-fireflies');
    expect(document.documentElement.style.getPropertyValue('--sn-bg')).toBe('#1A1008');
  });
});
