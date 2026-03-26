/**
 * SDK Builder Tests
 *
 * @module runtime/sdk
 * @layer L3
 */

import { describe, it, expect } from 'vitest';

import { buildSrcdoc } from './sdk-builder';

const defaults = {
  widgetHtml: '<div>Hello Widget</div>',
  widgetId: 'test.widget',
  instanceId: 'inst-001',
};

describe('buildSrcdoc', () => {
  it('returns a valid HTML document structure', () => {
    const html = buildSrcdoc(defaults);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<head>');
    expect(html).toContain('</head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</body>');
  });

  it('includes the CSP meta tag', () => {
    const html = buildSrcdoc(defaults);
    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain("default-src 'none'");
  });

  it('includes the SDK script with window.StickerNest', () => {
    const html = buildSrcdoc(defaults);
    expect(html).toContain('<script>');
    expect(html).toContain('window.StickerNest');
  });

  it('places SDK before widget HTML in document order', () => {
    const html = buildSrcdoc(defaults);
    const sdkIdx = html.indexOf('window.StickerNest');
    const widgetIdx = html.indexOf('<div>Hello Widget</div>');
    expect(sdkIdx).toBeLessThan(widgetIdx);
  });

  it('includes widget HTML in the body', () => {
    const html = buildSrcdoc(defaults);
    const bodyStart = html.indexOf('<body>');
    const widgetIdx = html.indexOf('<div>Hello Widget</div>');
    expect(widgetIdx).toBeGreaterThan(bodyStart);
  });

  it('includes meta tags for widget-id and instance-id', () => {
    const html = buildSrcdoc(defaults);
    expect(html).toContain('name="sn-widget-id" content="test.widget"');
    expect(html).toContain('name="sn-instance-id" content="inst-001"');
  });

  it('escapes HTML special characters in widgetId and instanceId', () => {
    const html = buildSrcdoc({
      widgetHtml: '<p>Hi</p>',
      widgetId: '"><script>alert(1)</script>',
      instanceId: 'a&b<c>d"e\'f',
    });

    expect(html).not.toContain('content=""><script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
    expect(html).toContain('&#39;');
  });

  it('includes base styles with box-sizing and margin reset', () => {
    const html = buildSrcdoc(defaults);
    expect(html).toContain('box-sizing: border-box');
    expect(html).toContain('margin: 0');
  });
});
