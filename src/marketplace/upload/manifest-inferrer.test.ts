/**
 * Manifest Inferrer tests
 *
 * @module marketplace/upload
 * @layer L5
 */

import { describe, it, expect } from 'vitest';

import { inferManifest, injectSdkBootstrap } from './manifest-inferrer';

describe('inferManifest', () => {
  it('extracts name from <title> tag', () => {
    const html = '<html><head><title>My Cool Widget</title></head><body></body></html>';
    const { manifest } = inferManifest(html);
    expect(manifest.name).toBe('My Cool Widget');
  });

  it('falls back to filename for name when no <title>', () => {
    const html = '<html><body>no title here</body></html>';
    const { manifest } = inferManifest(html, 'awesome-timer.html');
    expect(manifest.name).toBe('Awesome Timer');
  });

  it('defaults to "Uploaded Widget" when no title or filename', () => {
    const html = '<html><body>bare minimum</body></html>';
    const { manifest } = inferManifest(html);
    expect(manifest.name).toBe('Uploaded Widget');
  });

  it('extracts description from meta tag', () => {
    const html = '<html><head><meta name="description" content="A timer widget"></head><body></body></html>';
    const { manifest } = inferManifest(html);
    expect(manifest.description).toBe('A timer widget');
  });

  it('infers storage permission from localStorage usage', () => {
    const html = '<script>localStorage.setItem("key", "val")</script>';
    const { manifest } = inferManifest(html);
    expect(manifest.permissions).toContain('storage');
  });

  it('infers integrations permission from fetch usage', () => {
    const html = '<script>fetch("/api/data")</script>';
    const { manifest } = inferManifest(html);
    expect(manifest.permissions).toContain('integrations');
  });

  it('returns higher confidence when more fields are extracted', () => {
    const richHtml = `
      <html>
      <head>
        <title>Full Widget</title>
        <meta name="description" content="A fully described widget">
      </head>
      <body><script>localStorage.getItem("x")</script></body>
      </html>`;
    const { confidence: richConfidence } = inferManifest(richHtml);

    const bareHtml = '<html><body>bare</body></html>';
    const { confidence: bareConfidence } = inferManifest(bareHtml);

    expect(richConfidence).toBeGreaterThan(bareConfidence);
  });

  it('returns a valid WidgetManifest', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const { manifest } = inferManifest(html);
    expect(manifest.id).toBeTruthy();
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.license).toBe('MIT');
  });

  it('confidence is between 0.3 and 0.8', () => {
    const html = '<html><body></body></html>';
    const { confidence } = inferManifest(html);
    expect(confidence).toBeGreaterThanOrEqual(0.3);
    expect(confidence).toBeLessThanOrEqual(0.8);
  });
});

describe('injectSdkBootstrap', () => {
  it('injects register and ready calls before </body>', () => {
    const html = '<html><body><div>content</div></body></html>';
    const manifest = {
      id: 'test.widget',
      name: 'Test',
      version: '1.0.0',
      license: 'MIT' as const,
      tags: [],
      category: 'other' as const,
      permissions: [],
      events: { emits: [], subscribes: [] },
      config: { fields: [] },
      size: { defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
      entry: 'index.html',
      spatialSupport: false,
      crossCanvasChannels: [],
    };
    const result = injectSdkBootstrap(html, manifest);
    expect(result).toContain('StickerNest.register(');
    expect(result).toContain('StickerNest.ready()');
    expect(result).toContain('</body>');
  });

  it('appends bootstrap when no </body> tag exists', () => {
    const html = '<div>no body tag</div>';
    const manifest = {
      id: 'test.widget',
      name: 'Test',
      version: '1.0.0',
      license: 'MIT' as const,
      tags: [],
      category: 'other' as const,
      permissions: [],
      events: { emits: [], subscribes: [] },
      config: { fields: [] },
      size: { defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
      entry: 'index.html',
      spatialSupport: false,
      crossCanvasChannels: [],
    };
    const result = injectSdkBootstrap(html, manifest);
    expect(result).toContain('StickerNest.register(');
    expect(result).toContain('StickerNest.ready()');
  });
});
