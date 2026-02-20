/**
 * Shell init tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { initShell, teardownShell, isShellInitialized } from './init';
import { THEME_TOKENS } from './theme/theme-tokens';

describe('initShell', () => {
  beforeEach(() => {
    document.documentElement.style.cssText = '';
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    teardownShell();
  });

  it('applies CSS vars on init', () => {
    initShell();
    // Default theme is 'light'
    expect(document.documentElement.style.getPropertyValue('--sn-bg')).toBe(
      THEME_TOKENS.light['--sn-bg'],
    );
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('sets initialized flag', () => {
    expect(isShellInitialized()).toBe(false);
    initShell();
    expect(isShellInitialized()).toBe(true);
  });

  it('is idempotent — double init does not error', () => {
    initShell();
    initShell(); // should not throw
    expect(isShellInitialized()).toBe(true);
  });

  it('teardown cleans up', () => {
    initShell();
    teardownShell();
    expect(isShellInitialized()).toBe(false);
  });

  it('can reinitialize after teardown', () => {
    initShell();
    teardownShell();
    initShell();
    expect(isShellInitialized()).toBe(true);
  });
});
