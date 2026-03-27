/**
 * Manifest Generator Tests
 *
 * @module runtime/ai/manifest-generator
 * @layer L3
 */

import { describe, it, expect } from 'vitest';

import { generateManifestFromHtml } from './manifest-generator';

describe('generateManifestFromHtml', () => {
  describe('name extraction', () => {
    it('extracts name from <title> tag', () => {
      const html = '<html><head><title>My Awesome Widget</title></head><body></body></html>';
      const { manifest } = generateManifestFromHtml(html);

      expect(manifest.name).toBe('My Awesome Widget');
    });

    it('extracts name from <h1> tag when no title is present', () => {
      const html = '<html><body><h1>Counter Widget</h1></body></html>';
      const { manifest } = generateManifestFromHtml(html);

      expect(manifest.name).toBe('Counter Widget');
    });

    it('prefers <title> over <h1> when both are present', () => {
      const html = '<html><head><title>From Title</title></head><body><h1>From H1</h1></body></html>';
      const { manifest } = generateManifestFromHtml(html);

      expect(manifest.name).toBe('From Title');
    });

    it('falls back to "Imported Widget" when no name source is found', () => {
      const { manifest } = generateManifestFromHtml('<div>No name here</div>');

      expect(manifest.name).toBe('Imported Widget');
    });

    it('trims whitespace from extracted name', () => {
      const html = '<html><head><title>  Trimmed Name  </title></head></html>';
      const { manifest } = generateManifestFromHtml(html);

      expect(manifest.name).toBe('Trimmed Name');
    });
  });

  describe('event extraction', () => {
    it('extracts emit event types from StickerNest.emit() calls', () => {
      const html = `<script>
        StickerNest.emit('counter.incremented', { value: 1 });
        StickerNest.emit("counter.reset", {});
      </script>`;
      const { manifest } = generateManifestFromHtml(html);

      const emittedTypes = manifest.events.emits.map((e) => e.name);
      expect(emittedTypes).toContain('counter.incremented');
      expect(emittedTypes).toContain('counter.reset');
    });

    it('extracts subscribe event types from StickerNest.subscribe() calls', () => {
      const html = `<script>
        StickerNest.subscribe('theme.changed', handler);
        StickerNest.subscribe("data.updated", handler);
      </script>`;
      const { manifest } = generateManifestFromHtml(html);

      const subscribedTypes = manifest.events.subscribes.map((e) => e.name);
      expect(subscribedTypes).toContain('theme.changed');
      expect(subscribedTypes).toContain('data.updated');
    });

    it('deduplicates repeated emit event types', () => {
      const html = `<script>
        StickerNest.emit('click.happened', {});
        StickerNest.emit('click.happened', {});
      </script>`;
      const { manifest } = generateManifestFromHtml(html);

      const emittedTypes = manifest.events.emits.map((e) => e.name);
      expect(emittedTypes.filter((t) => t === 'click.happened')).toHaveLength(1);
    });

    it('produces empty events arrays for HTML with no SDK calls', () => {
      const { manifest } = generateManifestFromHtml('<div>No SDK</div>');

      expect(manifest.events.emits).toHaveLength(0);
      expect(manifest.events.subscribes).toHaveLength(0);
    });
  });

  describe('permission detection', () => {
    it('detects cross-canvas permission from emitCrossCanvas', () => {
      const html = '<script>StickerNest.emitCrossCanvas("ch", {});</script>';
      const { manifest } = generateManifestFromHtml(html);

      expect(manifest.permissions).toContain('cross-canvas');
    });

    it('detects cross-canvas permission from subscribeCrossCanvas', () => {
      const html = '<script>StickerNest.subscribeCrossCanvas("ch", handler);</script>';
      const { manifest } = generateManifestFromHtml(html);

      expect(manifest.permissions).toContain('cross-canvas');
    });

    it('detects integration permission from StickerNest.integration', () => {
      const html = '<script>StickerNest.integration("weather").query({});</script>';
      const { manifest } = generateManifestFromHtml(html);

      expect(manifest.permissions).toContain('integrations');
    });

    it('detects user-state permission from setUserState', () => {
      const html = '<script>StickerNest.setUserState("key", "val");</script>';
      const { manifest } = generateManifestFromHtml(html);

      expect(manifest.permissions).toContain('user-state');
    });

    it('detects user-state permission from getUserState', () => {
      const html = '<script>StickerNest.getUserState("key");</script>';
      const { manifest } = generateManifestFromHtml(html);

      expect(manifest.permissions).toContain('user-state');
    });

    it('produces no permissions for plain HTML with no SDK calls', () => {
      const { manifest } = generateManifestFromHtml('<div>Hello</div>');

      expect(manifest.permissions).toHaveLength(0);
    });
  });

  describe('confidence scoring', () => {
    it('returns base confidence of 0.3 for minimal HTML', () => {
      const { confidence } = generateManifestFromHtml('<div></div>');

      expect(confidence).toBeCloseTo(0.3);
    });

    it('returns higher confidence when register and ready are present', () => {
      const html = `<script>
        StickerNest.register({ id: 'x', name: 'X', version: '1.0.0' });
        StickerNest.ready();
      </script>`;
      const { confidence } = generateManifestFromHtml(html);

      // base 0.3 + register 0.15 + ready 0.15 = 0.6
      expect(confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('returns higher confidence with title + events + register + ready', () => {
      const html = `<html>
        <head><title>Full Widget</title></head>
        <body>
          <script>
            StickerNest.register({});
            StickerNest.ready();
            StickerNest.emit('done', {});
            StickerNest.subscribe('start', () => {});
          </script>
        </body>
      </html>`;
      const { confidence } = generateManifestFromHtml(html);

      // base 0.3 + title 0.2 + events 0.2 + register 0.15 + ready 0.15 = 1.0
      expect(confidence).toBeCloseTo(1.0);
    });

    it('never exceeds 1.0', () => {
      const html = `<html>
        <head><title>Widget</title></head>
        <body><h1>Widget</h1>
          <script>
            StickerNest.register({});
            StickerNest.ready();
            StickerNest.emit('a', {});
            StickerNest.emit('b', {});
            StickerNest.subscribe('c', () => {});
            StickerNest.integration('x').query({});
            StickerNest.emitCrossCanvas('ch', {});
          </script>
        </body>
      </html>`;
      const { confidence } = generateManifestFromHtml(html);

      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('manifest structure', () => {
    it('generates a unique id on each call', () => {
      const { manifest: m1 } = generateManifestFromHtml('<div>a</div>');
      const { manifest: m2 } = generateManifestFromHtml('<div>b</div>');

      // Both should start with 'gen-' prefix
      expect(m1.id).toMatch(/^gen-\d+$/);
      expect(m2.id).toMatch(/^gen-\d+$/);
    });

    it('always returns version 1.0.0', () => {
      const { manifest } = generateManifestFromHtml('<div>widget</div>');

      expect(manifest.version).toBe('1.0.0');
    });

    it('returns a valid manifest structure for empty HTML string', () => {
      const { manifest, confidence } = generateManifestFromHtml('');

      expect(manifest.id).toMatch(/^gen-/);
      expect(manifest.name).toBe('Imported Widget');
      expect(manifest.version).toBe('1.0.0');
      expect(Array.isArray(manifest.permissions)).toBe(true);
      expect(Array.isArray(manifest.events.emits)).toBe(true);
      expect(Array.isArray(manifest.events.subscribes)).toBe(true);
      expect(confidence).toBeCloseTo(0.3);
    });

    it('sets entry to widget.html', () => {
      const { manifest } = generateManifestFromHtml('<div>widget</div>');

      expect(manifest.entry).toBe('widget.html');
    });

    it('sets license to MIT by default', () => {
      const { manifest } = generateManifestFromHtml('<div>widget</div>');

      expect(manifest.license).toBe('MIT');
    });

    it('sets category to other by default', () => {
      const { manifest } = generateManifestFromHtml('<div>widget</div>');

      expect(manifest.category).toBe('other');
    });
  });
});
