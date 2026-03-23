/**
 * Tests for manifest-extractor module
 *
 * @module lab/ai
 * @layer L2
 */

import { describe, it, expect } from 'vitest';

import { extractManifestFromHtml, extractRegisterArgument } from './manifest-extractor';

// ─── extractRegisterArgument ─────────────────────────────────────────

describe('extractRegisterArgument', () => {
  it('extracts a clean JSON object', () => {
    const html = `<script>StickerNest.register({"name":"Timer","version":"0.1.0"});</script>`;
    const result = extractRegisterArgument(html);
    expect(result).toBe('{"name":"Timer","version":"0.1.0"}');
  });

  it('handles nested braces', () => {
    const html = `<script>StickerNest.register({
      "name": "Widget",
      "events": { "emits": [{ "name": "tick" }], "subscribes": [] }
    });</script>`;
    const result = extractRegisterArgument(html);
    expect(result).not.toBeNull();
    expect(result).toContain('"emits"');
    expect(result).toContain('"tick"');
  });

  it('returns null when no register call exists', () => {
    const html = `<script>StickerNest.ready();</script>`;
    expect(extractRegisterArgument(html)).toBeNull();
  });

  it('handles whitespace between register and paren', () => {
    const html = `<script>StickerNest.register  ({"name":"Test"});</script>`;
    const result = extractRegisterArgument(html);
    expect(result).toBe('{"name":"Test"}');
  });

  it('returns null for malformed (unclosed braces)', () => {
    const html = `<script>StickerNest.register({"name":"broken")</script>`;
    expect(extractRegisterArgument(html)).toBeNull();
  });
});

// ─── extractManifestFromHtml ─────────────────────────────────────────

describe('extractManifestFromHtml', () => {
  it('extracts a valid manifest from clean JSON', () => {
    const html = `<!DOCTYPE html><html><head></head><body>
    <script>
      StickerNest.register({
        "name": "Timer",
        "version": "0.1.0",
        "events": {
          "emits": [{"name": "tick"}],
          "subscribes": []
        }
      });
      StickerNest.ready();
    </script></body></html>`;

    const manifest = extractManifestFromHtml(html);
    expect(manifest).not.toBeNull();
    expect(manifest!.name).toBe('Timer');
    expect(manifest!.events.emits).toHaveLength(1);
    expect(manifest!.events.emits[0].name).toBe('tick');
  });

  it('handles JS object literals (unquoted keys)', () => {
    const html = `<script>
      StickerNest.register({
        name: "Counter",
        version: "1.0.0",
        events: {
          emits: [{ name: "count-changed" }],
          subscribes: [{ name: "increment" }]
        }
      });
    </script>`;

    const manifest = extractManifestFromHtml(html);
    expect(manifest).not.toBeNull();
    expect(manifest!.name).toBe('Counter');
    expect(manifest!.events.emits[0].name).toBe('count-changed');
    expect(manifest!.events.subscribes[0].name).toBe('increment');
  });

  it('returns null when no register call exists', () => {
    const html = `<script>StickerNest.ready();</script>`;
    expect(extractManifestFromHtml(html)).toBeNull();
  });

  it('returns null for completely malformed argument', () => {
    const html = `<script>StickerNest.register(not valid at all);</script>`;
    expect(extractManifestFromHtml(html)).toBeNull();
  });

  it('handles manifest with missing optional fields', () => {
    const html = `<script>
      StickerNest.register({
        name: "Minimal",
        version: "0.1.0"
      });
    </script>`;

    const manifest = extractManifestFromHtml(html);
    expect(manifest).not.toBeNull();
    expect(manifest!.name).toBe('Minimal');
  });

  it('finds register in any script tag', () => {
    const html = `
      <script>console.log("hello")</script>
      <style>body { color: red }</style>
      <script>
        StickerNest.register({ name: "Found", version: "1.0.0" });
        StickerNest.ready();
      </script>`;

    const manifest = extractManifestFromHtml(html);
    expect(manifest).not.toBeNull();
    expect(manifest!.name).toBe('Found');
  });
});
