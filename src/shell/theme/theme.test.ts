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
    it('sets CSS variables on documentElement for midnight-aurora theme', () => {
      applyThemeTokens('midnight-aurora');
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--sn-bg')).toBe('#0A0A0E');
      expect(style.getPropertyValue('--sn-text')).toBe('#EDEBE6');
      expect(style.getPropertyValue('--sn-accent')).toBe('#4E7B8E');
    });

    it('sets CSS variables on documentElement for crystal-light theme', () => {
      applyThemeTokens('crystal-light');
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--sn-bg')).toBe('#FAF8F5');
      expect(style.getPropertyValue('--sn-text')).toBe('#1A1820');
    });

    it('sets --sn-radius to 0px for high-contrast theme', () => {
      applyThemeTokens('high-contrast');
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--sn-radius')).toBe('0px');
      expect(style.getPropertyValue('--sn-accent')).toBe('#7A9DAE');
    });

    it('sets data-theme attribute', () => {
      applyThemeTokens('midnight-aurora');
      expect(document.documentElement.dataset.theme).toBe('midnight-aurora');
    });

    it('applies all extended tokens to documentElement', () => {
      applyThemeTokens('midnight-aurora');
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--sn-storm')).toBe('#4E7B8E');
      expect(style.getPropertyValue('--sn-ember')).toBe('#E8806C');
      expect(style.getPropertyValue('--sn-opal')).toBe('#B0D0D8');
      expect(style.getPropertyValue('--sn-moss')).toBe('#5AA878');
      expect(style.getPropertyValue('--sn-violet')).toBe('#B8A0D8');
      expect(style.getPropertyValue('--sn-surface-raised')).toBe('#1E1E24');
      expect(style.getPropertyValue('--sn-surface-glass')).toBe('rgba(20,17,24,0.85)');
      expect(style.getPropertyValue('--sn-surface-glass-light')).toBe('rgba(20,17,24,0.72)');
      expect(style.getPropertyValue('--sn-bg-ground')).toBe('#110E14');
      expect(style.getPropertyValue('--sn-font-serif')).toContain('Newsreader');
      expect(style.getPropertyValue('--sn-font-mono')).toContain('DM Mono');
      expect(style.getPropertyValue('--sn-success')).toBe('#5AA878');
      expect(style.getPropertyValue('--sn-warning')).toBe('#D4A04C');
      expect(style.getPropertyValue('--sn-error')).toBe('#C85858');
    });

    it('applies bubbles-sky theme tokens', () => {
      applyThemeTokens('bubbles-sky');
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--sn-bg')).toBe('#0B1628');
      expect(style.getPropertyValue('--sn-accent')).toBe('#38BDF8');
    });

    it('applies autumn-fireflies theme tokens', () => {
      applyThemeTokens('autumn-fireflies');
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--sn-bg')).toBe('#1A1008');
      expect(style.getPropertyValue('--sn-accent')).toBe('#E8A44C');
    });
  });

  describe('emitThemeChange', () => {
    it('emits ShellEvents.THEME_CHANGED with ONLY core tokens', () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(ShellEvents.THEME_CHANGED, handler);

      emitThemeChange('midnight-aurora');

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

    it('emits correct core token values for midnight-aurora theme', () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(ShellEvents.THEME_CHANGED, handler);

      emitThemeChange('midnight-aurora');

      const event = handler.mock.calls[0][0];
      const payload = event.payload as { theme: string; tokens: Record<string, string> };
      expect(payload.theme).toBe('midnight-aurora');
      expect(payload.tokens['--sn-bg']).toBe('#0A0A0E');
      expect(payload.tokens['--sn-accent']).toBe('#4E7B8E');

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
