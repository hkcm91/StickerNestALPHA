/**
 * Content Security Policy — Tests
 *
 * @module runtime/security
 * @layer L3
 */

import { describe, it, expect } from 'vitest';

import { DEFAULT_CSP, generateCSPMetaTag } from './csp';

describe('DEFAULT_CSP', () => {
  it('blocks all network requests by default', () => {
    expect(DEFAULT_CSP).toContain("default-src 'none'");
    expect(DEFAULT_CSP).toContain("connect-src 'none'");
  });

  it('allows inline scripts (required for srcdoc widgets)', () => {
    expect(DEFAULT_CSP).toContain("script-src 'unsafe-inline'");
  });

  it('allows inline styles', () => {
    expect(DEFAULT_CSP).toContain("style-src 'unsafe-inline'");
  });

  it('allows data and blob URIs for images', () => {
    expect(DEFAULT_CSP).toContain('img-src data: blob:');
  });

  it('allows data and blob URIs for media', () => {
    expect(DEFAULT_CSP).toContain('media-src data: blob:');
  });

  it('allows data URIs for fonts', () => {
    expect(DEFAULT_CSP).toContain('font-src data:');
  });

  it('does NOT allow remote script sources', () => {
    expect(DEFAULT_CSP).not.toContain('https:');
    expect(DEFAULT_CSP).not.toContain('http:');
  });
});

describe('generateCSPMetaTag', () => {
  it('returns a valid HTML meta tag', () => {
    const tag = generateCSPMetaTag();
    expect(tag).toMatch(/^<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]+">$/);
  });

  it('includes the DEFAULT_CSP in the content attribute', () => {
    const tag = generateCSPMetaTag();
    expect(tag).toContain(DEFAULT_CSP);
  });
});
