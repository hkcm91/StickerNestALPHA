/**
 * Widget Package Extractor
 *
 * Extracts and validates widget contents from a .zip-like ArrayBuffer produced
 * by the builder module. Handles missing manifests by auto-generating a minimal
 * one so that imported packages without a manifest.json can still be loaded.
 *
 * @module runtime/package/extractor
 * @layer L3
 */

import type { WidgetPackageContents } from '@sn/types/widget-package';

export type ExtractionResult =
  | { success: true; contents: WidgetPackageContents }
  | { success: false; error: string };

/**
 * Extracts widget contents from a package ArrayBuffer.
 *
 * Returns a typed result object — never throws. Callers should check
 * `result.success` before accessing `result.contents`.
 *
 * Auto-generation behaviour:
 * When `manifest.json` is absent, a minimal manifest is generated with
 * `manifestGenerated: true` so callers can surface a warning to the user.
 */
export function extractWidgetPackage(data: ArrayBuffer): ExtractionResult {
  try {
    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    const pkg = JSON.parse(json) as Record<string, string>;

    if (!pkg['widget.html']) {
      return { success: false, error: 'Package missing widget.html' };
    }

    const htmlContent = pkg['widget.html'];
    let manifest: WidgetPackageContents['manifest'];
    let manifestGenerated = false;

    if (pkg['manifest.json']) {
      try {
        manifest = JSON.parse(pkg['manifest.json']) as WidgetPackageContents['manifest'];
      } catch {
        return { success: false, error: 'Invalid manifest.json' };
      }
    } else {
      // Auto-generate a minimal manifest so callers can still proceed
      manifest = {
        id: `imported-widget-${Date.now()}`,
        name: 'Imported Widget',
        version: '1.0.0',
        description: 'Imported from .zip package',
        entry: 'widget.html',
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
      manifestGenerated = true;
    }

    return {
      success: true,
      contents: {
        manifest,
        htmlContent,
        readme: pkg['README.md'],
        manifestGenerated,
      },
    };
  } catch {
    return { success: false, error: 'Invalid package format' };
  }
}
