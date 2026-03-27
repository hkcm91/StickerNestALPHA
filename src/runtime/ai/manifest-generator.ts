/**
 * AI-powered Manifest Generator
 *
 * Analyzes widget HTML content using heuristic pattern matching to generate
 * a WidgetManifest without requiring an actual AI call. This is intentionally
 * fast and deterministic — it covers the common case where a creator imports
 * an existing HTML widget that already uses the SDK but has no manifest.
 *
 * Extracted signals:
 * - Widget name from <title> or first <h1>
 * - Emitted event types from `StickerNest.emit(...)` calls
 * - Subscribed event types from `StickerNest.subscribe(...)` calls
 * - Permissions from SDK method presence (`integration`, `cross-canvas`, `user-state`)
 * - Confidence score (0–1) reflecting how much signal was available
 *
 * @module runtime/ai/manifest-generator
 * @layer L3
 */

import type { WidgetManifest } from '@sn/types';

export interface ManifestGenerationResult {
  manifest: WidgetManifest;
  /** Confidence score 0–1. Higher means more SDK signals were found. */
  confidence: number;
}

/**
 * Generates a WidgetManifest from raw widget HTML using heuristic analysis.
 *
 * This function never throws. For completely empty or minimal HTML it produces
 * a valid manifest with confidence === 0.3 (the base score).
 */
export function generateManifestFromHtml(html: string): ManifestGenerationResult {
  // --- Name extraction ---
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const name = (titleMatch?.[1] ?? h1Match?.[1] ?? 'Imported Widget').trim();

  // --- Event type extraction ---
  const emitMatches = [...html.matchAll(/StickerNest\.emit\(\s*['"]([^'"]+)['"]/g)];
  const subMatches = [...html.matchAll(/StickerNest\.subscribe\(\s*['"]([^'"]+)['"]/g)];

  const emits = [...new Set(emitMatches.map((m) => m[1]))];
  const subscribes = [...new Set(subMatches.map((m) => m[1]))];

  // --- Permission detection ---
  const permissions: string[] = [];
  if (html.includes('StickerNest.integration')) permissions.push('integrations');
  if (
    html.includes('StickerNest.emitCrossCanvas') ||
    html.includes('StickerNest.subscribeCrossCanvas')
  ) {
    permissions.push('cross-canvas');
  }
  if (
    html.includes('StickerNest.setUserState') ||
    html.includes('StickerNest.getUserState')
  ) {
    permissions.push('user-state');
  }

  // --- Confidence scoring ---
  let confidence = 0.3; // base: we at least have some HTML
  if (titleMatch ?? h1Match) confidence += 0.2;
  if (emits.length > 0 || subscribes.length > 0) confidence += 0.2;
  if (html.includes('StickerNest.register')) confidence += 0.15;
  if (html.includes('StickerNest.ready')) confidence += 0.15;

  const manifest: WidgetManifest = {
    id: `gen-${Date.now()}`,
    name,
    version: '1.0.0',
    description: `Auto-generated manifest for ${name}`,
    entry: 'widget.html',
    permissions: permissions as WidgetManifest['permissions'],
    events: {
      emits: emits.map((type) => ({ name: type, description: '' })),
      subscribes: subscribes.map((type) => ({ name: type, description: '' })),
    },
    config: { fields: [] },
    size: { defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
    tags: [],
    category: 'other',
    license: 'MIT',
    crossCanvasChannels: [],
    spatialSupport: false,
  };

  return {
    manifest,
    confidence: Math.min(confidence, 1),
  };
}
