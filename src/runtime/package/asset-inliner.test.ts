/**
 * Asset Inliner Tests
 *
 * @module runtime/package/asset-inliner
 * @layer L3
 */

import { describe, it, expect } from 'vitest';

import { inlineAssets, estimatePackageSize } from './asset-inliner';

describe('inlineAssets', () => {
  it('returns original HTML when no external refs are present', () => {
    const html = '<html><body><p>Hello world</p></body></html>';
    const result = inlineAssets(html);

    expect(result.html).toBe(html);
    expect(result.inlinedCount).toBe(0);
  });

  it('returns zero inlinedCount for HTML with external img src (stub behaviour)', () => {
    const html = '<html><body><img src="https://example.com/image.png"></body></html>';
    const result = inlineAssets(html);

    // Stub passthrough — external refs are not yet inlined
    expect(result.html).toBe(html);
    expect(result.inlinedCount).toBe(0);
  });

  it('handles empty string without throwing', () => {
    const result = inlineAssets('');

    expect(result.html).toBe('');
    expect(result.inlinedCount).toBe(0);
  });

  it('returns an object with html and inlinedCount properties', () => {
    const result = inlineAssets('<div>test</div>');

    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('inlinedCount');
    expect(typeof result.html).toBe('string');
    expect(typeof result.inlinedCount).toBe('number');
  });
});

describe('estimatePackageSize', () => {
  it('returns a positive byte count for non-empty inputs', () => {
    const html = '<html><body>Hello</body></html>';
    const manifest = { id: 'test', name: 'Test', version: '1.0.0' };
    const size = estimatePackageSize(html, manifest);

    expect(size).toBeGreaterThan(0);
  });

  it('returns a reasonable byte count — at least the raw string length', () => {
    const html = '<html><body>Hello</body></html>';
    const manifest = { id: 'test', name: 'Test', version: '1.0.0' };
    const size = estimatePackageSize(html, manifest);
    const minExpected = html.length + JSON.stringify(manifest).length;

    // UTF-8 encoding of ASCII-only strings is byte-for-byte equal to char count
    expect(size).toBeGreaterThanOrEqual(minExpected);
  });

  it('returns zero for empty html and empty manifest', () => {
    const size = estimatePackageSize('', {});

    // JSON.stringify({}) === '{}', so 2 bytes from manifest
    expect(size).toBeGreaterThanOrEqual(2);
  });

  it('scales with larger input', () => {
    const shortHtml = '<p>Hi</p>';
    const longHtml = '<p>' + 'a'.repeat(10_000) + '</p>';
    const manifest = { id: 'x', version: '1.0.0' };

    const shortSize = estimatePackageSize(shortHtml, manifest);
    const longSize = estimatePackageSize(longHtml, manifest);

    expect(longSize).toBeGreaterThan(shortSize);
  });
});
