/**
 * Manifest Inferrer — heuristic manifest generation for uploaded widgets
 * that lack a StickerNest.register() call.
 *
 * @module marketplace/upload
 * @layer L5
 */

import { WidgetManifestSchema, type WidgetManifest, type WidgetPermission } from '@sn/types';

// ---------------------------------------------------------------------------
// Heuristic extraction helpers
// ---------------------------------------------------------------------------

/** Extract widget name from <title> tag or filename */
function inferName(html: string, filename?: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim().slice(0, 50);
  if (filename) {
    return filename
      .replace(/\.[^.]+$/, '') // strip extension
      .replace(/[-_]+/g, ' ')  // dashes/underscores to spaces
      .replace(/\b\w/g, (c) => c.toUpperCase()) // title case
      .slice(0, 50);
  }
  return 'Uploaded Widget';
}

/** Extract description from <meta name="description"> */
function inferDescription(html: string): string | undefined {
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  return match ? match[1].trim().slice(0, 500) : undefined;
}

/** Infer permissions from API usage patterns in the HTML */
function inferPermissions(html: string): WidgetPermission[] {
  const permissions: WidgetPermission[] = [];

  const patterns: [RegExp, WidgetPermission][] = [
    [/\blocalStorage\b|\bsessionStorage\b/, 'storage'],
    [/\bfetch\s*\(|\bXMLHttpRequest\b/, 'integrations'],
    [/\bnavigator\.clipboard\b/, 'clipboard'],
    [/\bNotification\b|\bnotification\b/, 'notifications'],
    [/\bnavigator\.mediaDevices\b|\bgetUserMedia\b/, 'media'],
    [/\bnavigator\.geolocation\b/, 'geolocation'],
  ];

  for (const [pattern, permission] of patterns) {
    if (pattern.test(html)) {
      permissions.push(permission);
    }
  }

  return permissions;
}

/** Compute confidence score based on how many fields were extracted vs defaulted */
function computeConfidence(
  hasTitle: boolean,
  hasDescription: boolean,
  hasPermissions: boolean,
): number {
  let score = 0.3; // base confidence for any upload
  if (hasTitle) score += 0.2;
  if (hasDescription) score += 0.15;
  if (hasPermissions) score += 0.15;
  return Math.min(score, 0.8);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface InferredManifest {
  manifest: WidgetManifest;
  confidence: number;
}

/**
 * Infer a widget manifest from HTML content that does not contain
 * a StickerNest.register() call.
 *
 * @param html - The widget HTML source
 * @param filename - Optional original filename for name inference
 * @returns The inferred manifest and a confidence score (0-1)
 */
export function inferManifest(html: string, filename?: string): InferredManifest {
  const name = inferName(html, filename);
  const description = inferDescription(html);
  const permissions = inferPermissions(html);

  const hasTitle = !!html.match(/<title[^>]*>[^<]+<\/title>/i);
  const hasDescription = !!description;
  const hasPermissions = permissions.length > 0;

  const confidence = computeConfidence(hasTitle, hasDescription, hasPermissions);

  const manifestInput = {
    id: `upload.${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`,
    name,
    description,
    version: '1.0.0',
    license: 'MIT' as const,
    tags: [],
    category: 'other' as const,
    permissions,
    events: { emits: [], subscribes: [] },
    config: { fields: [] },
    size: { defaultWidth: 300, defaultHeight: 200, aspectLocked: false },
    entry: 'index.html',
    spatialSupport: false,
    crossCanvasChannels: [],
  };

  const result = WidgetManifestSchema.safeParse(manifestInput);
  if (!result.success) {
    // Fallback: absolute minimum manifest
    const fallback = WidgetManifestSchema.parse({
      id: `upload.widget-${Date.now().toString(36)}`,
      name: 'Uploaded Widget',
      version: '1.0.0',
    });
    return { manifest: fallback, confidence: 0.3 };
  }

  return { manifest: result.data, confidence };
}

/**
 * Wraps widget HTML with StickerNest SDK bootstrap calls so it passes
 * the existing validator (which requires register() and ready()).
 *
 * Only call this for HTML that does NOT already contain these calls.
 *
 * @param html - The raw widget HTML
 * @param manifest - The manifest to register
 * @returns The HTML with SDK calls injected
 */
export function injectSdkBootstrap(html: string, manifest: WidgetManifest): string {
  const manifestJson = JSON.stringify(manifest);
  const bootstrap = `<script>
if (typeof StickerNest !== 'undefined') {
  StickerNest.register(${manifestJson});
  StickerNest.ready();
}
</script>`;

  // Insert before </body> if present, otherwise append
  if (html.includes('</body>')) {
    return html.replace('</body>', `${bootstrap}\n</body>`);
  }
  return html + '\n' + bootstrap;
}
