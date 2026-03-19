/**
 * Theme tests
 * @module shell/theme
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ShellEvents, CORE_TOKEN_KEYS } from '@sn/types';

import { bus } from '../../kernel/bus';

import { applyThemeTokens, emitThemeChange } from './theme-provider';

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
      expect(style.getPropertyValue('--sn-bg')).toBe('#0A0A0E');
      expect(style.getPropertyValue('--sn-text')).toBe('#EDEBE6');
      expect(style.getPropertyValue('--sn-accent')).toBe('#3E7D94');
    });

    it('sets CSS variables on documentElement for light theme', () => {
      applyThemeTokens('light');
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--sn-bg')).toBe('#FAF8F5');
      expect(style.getPropertyValue('--sn-text')).toBe('#1A1820');
    });

    it('sets --sn-radius to 0px for high-contrast theme', () => {
      applyThemeTokens('high-contrast');
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--sn-radius')).toBe('0px');
      expect(style.getPropertyValue('--sn-accent')).toBe('#6BA4B8');
    });

    it('sets data-theme attribute', () => {
      applyThemeTokens('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('applies all extended tokens to documentElement', () => {
      applyThemeTokens('dark');
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--sn-storm')).toBe('#3E7D94');
      expect(style.getPropertyValue('--sn-ember')).toBe('#E8806C');
      expect(style.getPropertyValue('--sn-opal')).toBe('#B0D0D8');
      expect(style.getPropertyValue('--sn-moss')).toBe('#5AA878');
      expect(style.getPropertyValue('--sn-violet')).toBe('#B8A0D8');
      expect(style.getPropertyValue('--sn-surface-raised')).toBe('#1A1A1F');
      expect(style.getPropertyValue('--sn-surface-glass')).toBe('rgba(20,17,24,0.75)');
      expect(style.getPropertyValue('--sn-surface-glass-light')).toBe('rgba(20,17,24,0.65)');
      expect(style.getPropertyValue('--sn-bg-ground')).toBe('#110E14');
      expect(style.getPropertyValue('--sn-font-serif')).toContain('Newsreader');
      expect(style.getPropertyValue('--sn-font-mono')).toContain('DM Mono');
      expect(style.getPropertyValue('--sn-success')).toBe('#5AA878');
      expect(style.getPropertyValue('--sn-warning')).toBe('#D4A04C');
      expect(style.getPropertyValue('--sn-error')).toBe('#C85858');
    });
  });

  describe('emitThemeChange', () => {
    it('emits ShellEvents.THEME_CHANGED with ONLY core tokens', () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(ShellEvents.THEME_CHANGED, handler);

      emitThemeChange('dark');

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0];
      const payload = event.payload as { theme: string; tokens: Record<string, string> };

      // Should contain exactly the 8 core token keys
      const tokenKeys = Object.keys(payload.tokens);
      expect(tokenKeys).toHaveLength(CORE_TOKEN_KEYS.length);
      for (const key of CORE_TOKEN_KEYS) {
        expect(tokenKeys).toContain(key);
      }

      // Should NOT contain extended tokens
      expect(tokenKeys).not.toContain('--sn-storm');
      expect(tokenKeys).not.toContain('--sn-ember');
      expect(tokenKeys).not.toContain('--sn-surface-raised');

      unsub();
    });

    it('emits correct core token values for dark theme', () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(ShellEvents.THEME_CHANGED, handler);

      emitThemeChange('dark');

      const event = handler.mock.calls[0][0];
      const payload = event.payload as { theme: string; tokens: Record<string, string> };
      expect(payload.theme).toBe('dark');
      expect(payload.tokens['--sn-bg']).toBe('#0A0A0E');
      expect(payload.tokens['--sn-accent']).toBe('#3E7D94');

      unsub();
    });

    it('emits correct tokens for high-contrast', () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(ShellEvents.THEME_CHANGED, handler);

      emitThemeChange('high-contrast');

      const event = handler.mock.calls[0][0];
      const payload = event.payload as { theme: string; tokens: Record<string, string> };
      expect(payload.tokens['--sn-radius']).toBe('0px');

      unsub();
    });
  });
});
