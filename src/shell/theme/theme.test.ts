/**
 * Theme tests
 * @module shell/theme
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ShellEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

import { applyThemeTokens, emitThemeChange } from './theme-provider';
import { THEME_TOKENS } from './theme-tokens';

describe('Theme system', () => {
  beforeEach(() => {
    // Reset documentElement styles
    const el = document.documentElement;
    el.style.cssText = '';
    delete el.dataset.theme;
  });

  describe('applyThemeTokens', () => {
    it('sets CSS variables on documentElement for dark theme', () => {
      applyThemeTokens('dark');
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--sn-bg')).toBe('#111827');
      expect(style.getPropertyValue('--sn-text')).toBe('#f9fafb');
      expect(style.getPropertyValue('--sn-accent')).toBe('#3B82F6');
    });

    it('sets CSS variables on documentElement for light theme', () => {
      applyThemeTokens('light');
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--sn-bg')).toBe('#ffffff');
      expect(style.getPropertyValue('--sn-text')).toBe('#111827');
    });

    it('sets --sn-radius to 0px for high-contrast theme', () => {
      applyThemeTokens('high-contrast');
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--sn-radius')).toBe('0px');
      expect(style.getPropertyValue('--sn-accent')).toBe('#FACC15');
    });

    it('sets data-theme attribute', () => {
      applyThemeTokens('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  describe('emitThemeChange', () => {
    it('emits ShellEvents.THEME_CHANGED with theme name and tokens', () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(ShellEvents.THEME_CHANGED, handler);

      emitThemeChange('dark');

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0];
      expect(event.payload).toEqual({
        theme: 'dark',
        tokens: THEME_TOKENS.dark,
      });

      unsub();
    });

    it('emits correct tokens for high-contrast', () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(ShellEvents.THEME_CHANGED, handler);

      emitThemeChange('high-contrast');

      const event = handler.mock.calls[0][0];
      expect(event.payload.tokens['--sn-radius']).toBe('0px');

      unsub();
    });
  });
});
