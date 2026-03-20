/**
 * AI Full Context — Enhanced context engine for Stitch 2.0-style whole-project awareness.
 *
 * Extends the existing AIGraphContext with design spec, widget source,
 * manifest, preview state, theme, and version history. This gives the AI
 * full awareness across the entire widget project, not just the graph.
 *
 * @module lab/ai
 * @layer L2
 */

import type { WidgetManifest, WidgetDesignSpec } from '@sn/types';

import type { PreviewMode } from '../preview/preview-manager';

import type { AIGraphContext } from './ai-context';
import { serializeContextForPrompt } from './ai-context';

// ═══════════════════════════════════════════════════════════════════
// Full Context Interface
// ═══════════════════════════════════════════════════════════════════

export interface AIFullContext extends AIGraphContext {
  designSpec: WidgetDesignSpec | null;
  currentSource: string | null;
  manifest: WidgetManifest | null;
  previewState: {
    mode: PreviewMode;
    isReady: boolean;
    lastError: string | null;
  } | null;
  platformTheme: {
    name: string;
    tokens: Record<string, string>;
  } | null;
  versionHistory: Array<{
    label: string;
    createdAt: string;
  }>;
  editorDirtyState: boolean;
}

/** Maximum number of source lines included in the prompt. */
const SOURCE_LINE_LIMIT = 200;

// ═══════════════════════════════════════════════════════════════════
// Serializer
// ═══════════════════════════════════════════════════════════════════

/**
 * Serialize an AIFullContext into a structured text block for AI injection.
 *
 * Backward compatible: if the input is a plain AIGraphContext
 * (no extra fields), it delegates to the original serializer.
 */
export function serializeFullContextForPrompt(ctx: AIFullContext): string {
  const sections: string[] = [];

  // Include graph context first (reuse the existing serializer)
  sections.push(serializeContextForPrompt(ctx));

  // Design spec
  if (ctx.designSpec) {
    sections.push('');
    sections.push('=== DESIGN SYSTEM ===');
    if (ctx.designSpec.name) sections.push(`Name: ${ctx.designSpec.name}`);
    if (ctx.designSpec.colors) {
      sections.push('Colors:');
      for (const [k, v] of Object.entries(ctx.designSpec.colors)) {
        if (v) sections.push(`  ${k}: ${v}`);
      }
    }
    if (ctx.designSpec.typography) {
      sections.push('Typography:');
      for (const [k, v] of Object.entries(ctx.designSpec.typography)) {
        if (v !== undefined) sections.push(`  ${k}: ${v}`);
      }
    }
    if (ctx.designSpec.spacing) {
      sections.push('Spacing:');
      for (const [k, v] of Object.entries(ctx.designSpec.spacing)) {
        if (v) sections.push(`  ${k}: ${v}`);
      }
    }
    if (ctx.designSpec.borders) {
      sections.push('Borders:');
      for (const [k, v] of Object.entries(ctx.designSpec.borders)) {
        if (v) sections.push(`  ${k}: ${v}`);
      }
    }
    if (ctx.designSpec.customTokens) {
      sections.push('Custom tokens:');
      for (const [k, v] of Object.entries(ctx.designSpec.customTokens)) {
        sections.push(`  ${k}: ${v}`);
      }
    }
    sections.push('=== END DESIGN SYSTEM ===');
  }

  // Current source (truncated)
  if (ctx.currentSource) {
    sections.push('');
    sections.push('=== CURRENT SOURCE ===');
    const lines = ctx.currentSource.split('\n');
    if (lines.length > SOURCE_LINE_LIMIT) {
      sections.push(`(Truncated to last ${SOURCE_LINE_LIMIT} of ${lines.length} lines)`);
      sections.push(lines.slice(-SOURCE_LINE_LIMIT).join('\n'));
    } else {
      sections.push(ctx.currentSource);
    }
    sections.push('=== END SOURCE ===');
  }

  // Manifest
  if (ctx.manifest) {
    sections.push('');
    sections.push('=== MANIFEST ===');
    sections.push(`Name: ${ctx.manifest.name}`);
    sections.push(`Version: ${ctx.manifest.version}`);
    if (ctx.manifest.events.emits.length > 0) {
      sections.push(`Emits: ${ctx.manifest.events.emits.map((e) => e.name).join(', ')}`);
    }
    if (ctx.manifest.events.subscribes.length > 0) {
      sections.push(`Subscribes: ${ctx.manifest.events.subscribes.map((e) => e.name).join(', ')}`);
    }
    if (ctx.manifest.permissions.length > 0) {
      sections.push(`Permissions: ${ctx.manifest.permissions.join(', ')}`);
    }
    sections.push('=== END MANIFEST ===');
  }

  // Preview state
  if (ctx.previewState) {
    sections.push('');
    sections.push('=== PREVIEW STATE ===');
    sections.push(`Mode: ${ctx.previewState.mode}`);
    sections.push(`Ready: ${ctx.previewState.isReady}`);
    if (ctx.previewState.lastError) {
      sections.push(`Last error: ${ctx.previewState.lastError}`);
    }
    sections.push('=== END PREVIEW ===');
  }

  // Platform theme
  if (ctx.platformTheme) {
    sections.push('');
    sections.push('=== PLATFORM THEME ===');
    sections.push(`Theme: ${ctx.platformTheme.name}`);
    for (const [k, v] of Object.entries(ctx.platformTheme.tokens)) {
      sections.push(`  ${k}: ${v}`);
    }
    sections.push('=== END THEME ===');
  }

  // Version history
  if (ctx.versionHistory.length > 0) {
    sections.push('');
    sections.push('=== VERSION HISTORY ===');
    for (const v of ctx.versionHistory.slice(0, 10)) {
      sections.push(`  ${v.label} (${v.createdAt})`);
    }
    sections.push('=== END HISTORY ===');
  }

  return sections.join('\n');
}
