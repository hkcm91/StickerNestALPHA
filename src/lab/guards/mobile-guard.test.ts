import { describe, it, expect } from 'vitest';

import { checkDesktopViewport, MIN_DESKTOP_WIDTH } from './mobile-guard';

describe('checkDesktopViewport', () => {
  it('returns true for desktop width (1024+)', () => {
    expect(checkDesktopViewport(1024)).toBe(true);
    expect(checkDesktopViewport(1920)).toBe(true);
  });

  it('returns false for narrow viewports', () => {
    expect(checkDesktopViewport(768)).toBe(false);
    expect(checkDesktopViewport(375)).toBe(false);
  });

  it('returns false for width just below threshold', () => {
    expect(checkDesktopViewport(MIN_DESKTOP_WIDTH - 1)).toBe(false);
  });

  it('returns true for width exactly at threshold', () => {
    expect(checkDesktopViewport(MIN_DESKTOP_WIDTH)).toBe(true);
  });
});
