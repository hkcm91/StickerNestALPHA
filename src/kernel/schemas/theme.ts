/**
 * Theme token schemas for the StickerNest V5 design system.
 *
 * Two-tier architecture:
 * - **Core tokens** (8 keys) — the widget bridge contract, forwarded to iframe widgets
 * - **Extended tokens** (16 keys) — app-internal palette, applied to documentElement only
 *
 * @module @sn/types/theme
 */

import { z } from 'zod';

// =============================================================================
// Core Theme Tokens — Widget Bridge Contract (L3 Runtime forwards these)
// =============================================================================

/**
 * The 8 core theme tokens that constitute the widget API contract.
 * These are the only tokens sent to iframe widgets via the bridge protocol.
 */
export const CoreThemeTokensSchema = z.object({
  '--sn-bg': z.string(),
  '--sn-surface': z.string(),
  '--sn-accent': z.string(),
  '--sn-text': z.string(),
  '--sn-text-muted': z.string(),
  '--sn-border': z.string(),
  '--sn-radius': z.string(),
  '--sn-font-family': z.string(),
});

export type CoreThemeTokens = z.infer<typeof CoreThemeTokensSchema>;

/**
 * The 8 core token key names, used to extract the widget-facing subset
 * from the full token map.
 */
export const CORE_TOKEN_KEYS = Object.keys(
  CoreThemeTokensSchema.shape,
) as (keyof CoreThemeTokens)[];

// =============================================================================
// Extended Theme Tokens — App-Internal Palette
// =============================================================================

/**
 * Extended tokens for the Her/Rothko-inspired palette.
 * These are applied to document.documentElement but NEVER sent across the
 * bridge to widget iframes.
 */
export const ExtendedThemeTokensSchema = z.object({
  // Surface & background variants
  '--sn-bg-ground': z.string(),
  '--sn-surface-raised': z.string(),

  // Text variants
  '--sn-accent-light': z.string(),
  '--sn-text-soft': z.string(),
  '--sn-text-faint': z.string(),

  // Border variants
  '--sn-border-hover': z.string(),

  // Named palette colors
  '--sn-storm': z.string(),
  '--sn-storm-light': z.string(),
  '--sn-ember': z.string(),
  '--sn-ember-light': z.string(),
  '--sn-opal': z.string(),
  '--sn-moss': z.string(),
  '--sn-violet': z.string(),

  // Semantic state colors
  '--sn-success': z.string(),
  '--sn-warning': z.string(),
  '--sn-error': z.string(),
});

export type ExtendedThemeTokens = z.infer<typeof ExtendedThemeTokensSchema>;

// =============================================================================
// Full Theme Tokens — Core + Extended
// =============================================================================

/**
 * The full token map applied to document.documentElement.
 * Merges core (widget-facing) and extended (app-internal) tokens.
 */
export const FullThemeTokensSchema = CoreThemeTokensSchema.merge(
  ExtendedThemeTokensSchema,
);

export type FullThemeTokens = z.infer<typeof FullThemeTokensSchema>;

// =============================================================================
// Theme Name
// =============================================================================

/**
 * Built-in theme names.
 */
export const ThemeNameSchema = z.enum(['light', 'dark', 'high-contrast']);

export type ThemeName = z.infer<typeof ThemeNameSchema>;

// =============================================================================
// JSON Schema Exports
// =============================================================================

export const CoreThemeTokensJSONSchema = CoreThemeTokensSchema.toJSONSchema();
export const ExtendedThemeTokensJSONSchema = ExtendedThemeTokensSchema.toJSONSchema();
export const FullThemeTokensJSONSchema = FullThemeTokensSchema.toJSONSchema();
export const ThemeNameJSONSchema = ThemeNameSchema.toJSONSchema();
