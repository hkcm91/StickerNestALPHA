/**
 * Widget Package Builder
 *
 * Builds a .zip-like ArrayBuffer from widget contents for export and distribution.
 * Uses a simple JSON envelope with embedded file contents — no external zip library
 * is required, keeping the runtime dependency surface small.
 *
 * @module runtime/package/builder
 * @layer L3
 */

import type { WidgetManifest } from '@sn/types';

export interface BuildPackageInput {
  manifest: WidgetManifest;
  htmlContent: string;
  readme?: string;
}

/**
 * Builds a widget package as an ArrayBuffer.
 *
 * The package format is a JSON envelope whose keys are file paths and whose
 * values are their UTF-8 string contents. This keeps the format self-contained
 * and universally decodable without a zip library.
 *
 * Structure:
 * - `manifest.json` — validated widget manifest, pretty-printed
 * - `widget.html`   — single-file HTML widget source
 * - `README.md`     — optional readme (omitted when not supplied)
 */
export function buildWidgetPackage(input: BuildPackageInput): ArrayBuffer {
  const pkg: Record<string, string> = {
    'manifest.json': JSON.stringify(input.manifest, null, 2),
    'widget.html': input.htmlContent,
    ...(input.readme ? { 'README.md': input.readme } : {}),
  };
  const json = JSON.stringify(pkg);
  const encoder = new TextEncoder();
  return encoder.encode(json).buffer as ArrayBuffer;
}

/**
 * Triggers a browser file download for the given package data.
 *
 * Creates a temporary object URL, clicks it programmatically, then
 * immediately revokes the URL to avoid memory leaks.
 */
export function downloadPackage(data: ArrayBuffer, filename: string): void {
  const blob = new Blob([data], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
