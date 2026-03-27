/**
 * Widget Package Extractor Tests
 *
 * @module runtime/package/extractor
 * @layer L3
 */

import { describe, it, expect } from 'vitest';

import { extractWidgetPackage } from './extractor';
import { buildWidgetPackage } from './builder';
import type { WidgetManifest } from '@sn/types';

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

/** Encodes a Record<string, string> into the package ArrayBuffer format. */
function encodePkg(pkg: Record<string, string>): ArrayBuffer {
  const json = JSON.stringify(pkg);
  return new TextEncoder().encode(json).buffer as ArrayBuffer;
}

describe('extractWidgetPackage', () => {
  it('extracts valid package with manifest', () => {
    const data = buildWidgetPackage({ manifest: testManifest, htmlContent: testHtml });
    const result = extractWidgetPackage(data);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.contents.htmlContent).toBe(testHtml);
    expect(result.contents.manifest.id).toBe('test-widget');
    expect(result.contents.manifestGenerated).toBe(false);
  });

  it('extracts package without manifest and auto-generates one', () => {
    const data = encodePkg({ 'widget.html': testHtml });
    const result = extractWidgetPackage(data);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.contents.manifestGenerated).toBe(true);
    expect(result.contents.manifest.name).toBe('Imported Widget');
    expect(result.contents.manifest.version).toBe('1.0.0');
  });

  it('auto-generated manifest id includes timestamp for uniqueness', () => {
    const data = encodePkg({ 'widget.html': testHtml });
    const result = extractWidgetPackage(data);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.contents.manifest.id).toMatch(/^imported-widget-\d+$/);
  });

  it('returns error for missing widget.html', () => {
    const data = encodePkg({
      'manifest.json': JSON.stringify(testManifest),
    });
    const result = extractWidgetPackage(data);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('Package missing widget.html');
  });

  it('returns error for invalid top-level JSON', () => {
    const invalid = new TextEncoder().encode('not valid json').buffer as ArrayBuffer;
    const result = extractWidgetPackage(invalid);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('Invalid package format');
  });

  it('returns error for invalid manifest.json content', () => {
    const data = encodePkg({
      'widget.html': testHtml,
      'manifest.json': '{ this is not valid json }',
    });
    const result = extractWidgetPackage(data);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('Invalid manifest.json');
  });

  it('includes readme field when present', () => {
    const readme = '# My Widget\nDoes amazing things.';
    const data = buildWidgetPackage({ manifest: testManifest, htmlContent: testHtml, readme });
    const result = extractWidgetPackage(data);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.contents.readme).toBe(readme);
  });

  it('readme is undefined when not included in package', () => {
    const data = buildWidgetPackage({ manifest: testManifest, htmlContent: testHtml });
    const result = extractWidgetPackage(data);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.contents.readme).toBeUndefined();
  });

  it('handles empty ArrayBuffer as invalid format', () => {
    const result = extractWidgetPackage(new ArrayBuffer(0));

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('Invalid package format');
  });
});
