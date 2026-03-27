/**
 * Widget Package Builder Tests
 *
 * @module runtime/package/builder
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { buildWidgetPackage, downloadPackage } from './builder';
import type { WidgetManifest } from '@sn/types';

// Minimal manifest fixture that satisfies the WidgetManifest type
const testManifest: WidgetManifest = {
  id: 'test-widget',
  name: 'Test Widget',
  version: '1.0.0',
  description: 'A test widget',
  entry: 'index.html',
  permissions: [],
  events: { emits: [], subscribes: [] },
  config: { fields: [] },
  size: { defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
  tags: [],
  category: 'other',
  license: 'MIT',
  crossCanvasChannels: [],
  spatialSupport: false,
};

const testHtml = '<html><body><script>StickerNest.ready()</script></body></html>';

describe('buildWidgetPackage', () => {
  it('returns an ArrayBuffer', () => {
    const result = buildWidgetPackage({ manifest: testManifest, htmlContent: testHtml });
    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('round-trip: build then decode matches input', () => {
    const result = buildWidgetPackage({ manifest: testManifest, htmlContent: testHtml });
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(result)) as Record<string, string>;

    expect(parsed['widget.html']).toBe(testHtml);
    expect(JSON.parse(parsed['manifest.json'])).toMatchObject({ id: 'test-widget', name: 'Test Widget' });
  });

  it('includes README.md when readme is provided', () => {
    const readme = '# Test Widget\nA simple test widget.';
    const result = buildWidgetPackage({ manifest: testManifest, htmlContent: testHtml, readme });
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(result)) as Record<string, string>;

    expect(parsed['README.md']).toBe(readme);
  });

  it('handles missing readme gracefully — no README.md key in output', () => {
    const result = buildWidgetPackage({ manifest: testManifest, htmlContent: testHtml });
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(result)) as Record<string, string>;

    expect('README.md' in parsed).toBe(false);
  });

  it('pretty-prints manifest.json', () => {
    const result = buildWidgetPackage({ manifest: testManifest, htmlContent: testHtml });
    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(result)) as Record<string, string>;

    // Pretty-printed JSON contains newlines
    expect(parsed['manifest.json']).toContain('\n');
  });

  it('produces non-empty buffer for minimal input', () => {
    const result = buildWidgetPackage({ manifest: testManifest, htmlContent: '' });
    expect(result.byteLength).toBeGreaterThan(0);
  });
});

describe('downloadPackage', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let createElementSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURLSpy = vi.fn().mockReturnValue('blob:http://localhost/fake-uuid');
    revokeObjectURLSpy = vi.fn();
    clickSpy = vi.fn();

    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLAnchorElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a Blob URL and clicks the link', () => {
    const data = new ArrayBuffer(8);
    downloadPackage(data, 'my-widget.zip');

    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('revokes the object URL after clicking', () => {
    const data = new ArrayBuffer(8);
    downloadPackage(data, 'my-widget.zip');

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:http://localhost/fake-uuid');
  });

  it('sets the correct filename on the anchor element', () => {
    const data = new ArrayBuffer(8);
    const anchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
    createElementSpy.mockReturnValue(anchor);

    downloadPackage(data, 'exported-widget-v1.2.3.zip');

    expect(anchor.download).toBe('exported-widget-v1.2.3.zip');
  });

  it('creates element with tag "a"', () => {
    const data = new ArrayBuffer(8);
    downloadPackage(data, 'test.zip');

    expect(createElementSpy).toHaveBeenCalledWith('a');
  });
});
