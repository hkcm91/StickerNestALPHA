/**
 * Manifest Extractor — Parses StickerNest.register() from generated widget HTML.
 *
 * Used by the auto-wire pipeline to extract the manifest from AI-generated
 * widget HTML so we know what ports the widget declared.
 *
 * @module lab/ai
 * @layer L2
 */

import { WidgetManifestSchema, type WidgetManifest } from '@sn/types';

/**
 * Extracts the raw argument string from a `StickerNest.register(...)` call
 * in the given HTML. Finds the call and extracts the object argument by
 * counting balanced braces.
 *
 * @returns The raw argument string (including outer braces), or null if not found.
 */
export function extractRegisterArgument(html: string): string | null {
  const match = html.match(/StickerNest\.register\s*\(/);
  if (!match || match.index == null) return null;

  const startAfterParen = match.index + match[0].length;
  let braceStart = -1;
  let depth = 0;

  for (let i = startAfterParen; i < html.length; i++) {
    const ch = html[i];

    if (ch === '{') {
      if (braceStart === -1) braceStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && braceStart !== -1) {
        return html.slice(braceStart, i + 1);
      }
    }
  }

  return null;
}

/**
 * Extracts a WidgetManifest from generated widget HTML by parsing the
 * `StickerNest.register({...})` call.
 *
 * Tries JSON.parse first, then falls back to Function evaluation for
 * JS object literals with unquoted keys or trailing commas.
 * Validates against WidgetManifestSchema.
 *
 * @returns The parsed and validated manifest, or null if extraction fails.
 */
export function extractManifestFromHtml(html: string): WidgetManifest | null {
  const raw = extractRegisterArgument(html);
  if (!raw) return null;

  let parsed: unknown = null;

  // Attempt 1: JSON.parse (works for valid JSON object literals)
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not valid JSON — try Function eval
  }

  // Attempt 2: Function eval (handles unquoted keys, trailing commas, etc.)
  if (!parsed) {
    try {
      // eslint-disable-next-line no-new-func
      parsed = new Function(`return (${raw})`)();
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;

  // Attempt 3: Validate against the full WidgetManifest schema
  const fullResult = WidgetManifestSchema.safeParse(parsed);
  if (fullResult.success) {
    return fullResult.data;
  }

  // Attempt 4: Build a minimal manifest from whatever we have
  const obj = parsed as Record<string, unknown>;
  const minimal = {
    name: typeof obj.name === 'string' ? obj.name : 'Untitled Widget',
    version: typeof obj.version === 'string' ? obj.version : '0.1.0',
    events: obj.events ?? { emits: [], subscribes: [] },
    // Fill in required defaults
    id: typeof obj.id === 'string' ? obj.id : `gen-${Date.now()}`,
    license: 'MIT',
    tags: [],
    category: 'other',
    permissions: [],
    config: { fields: [] },
    size: obj.size ?? {
      defaultWidth: 300,
      defaultHeight: 200,
      aspectLocked: false,
    },
    entry: 'index.html',
    spatialSupport: false,
    crossCanvasChannels: [],
  };

  const minimalResult = WidgetManifestSchema.safeParse(minimal);
  if (minimalResult.success) {
    return minimalResult.data;
  }

  return null;
}
