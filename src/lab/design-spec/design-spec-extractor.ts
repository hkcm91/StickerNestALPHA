/**
 * Design Spec Extractor — Extracts design tokens from widget HTML source.
 *
 * Uses regex/string analysis to find colors, fonts, radii, spacing
 * patterns in existing widget code. Best-effort heuristic.
 *
 * @module lab/design-spec
 * @layer L2
 */

import type { WidgetDesignSpec, DesignSpecColors, DesignSpecTypography, DesignSpecBorders, DesignSpecSpacing } from '@sn/types';

export interface ExtractionResult {
  spec: Partial<WidgetDesignSpec>;
  confidence: number;
  suggestions: string[];
}

/**
 * Extract design tokens from widget HTML source.
 */
export function extractDesignSpec(html: string): ExtractionResult {
  const suggestions: string[] = [];
  let found = 0;
  let possible = 0;

  const colors = extractColors(html);
  possible += 4;
  found += Object.values(colors).filter(Boolean).length;

  const typography = extractTypography(html);
  possible += 2;
  found += Object.values(typography).filter(Boolean).length;

  const borders = extractBorders(html);
  possible += 1;
  found += Object.values(borders).filter(Boolean).length;

  const spacing = extractSpacing(html);
  possible += 2;
  found += Object.values(spacing).filter(Boolean).length;

  const customTokens = extractCustomProperties(html);
  found += Object.keys(customTokens).length;
  possible += Math.max(Object.keys(customTokens).length, 1);

  const spec: Partial<WidgetDesignSpec> = { version: 1 };

  if (Object.values(colors).some(Boolean)) spec.colors = colors;
  else suggestions.push('No color values detected. Consider adding a color palette.');

  if (Object.values(typography).some(Boolean)) spec.typography = typography;
  else suggestions.push('No font-family declarations found. Consider specifying typography.');

  if (Object.values(borders).some(Boolean)) spec.borders = borders;
  else suggestions.push('No border-radius values found. Consider adding border rules.');

  if (Object.values(spacing).some(Boolean)) spec.spacing = spacing;

  if (Object.keys(customTokens).length > 0) spec.customTokens = customTokens;

  const confidence = possible > 0 ? Math.min(found / possible, 1) : 0;

  return { spec, confidence, suggestions };
}

function extractColors(html: string): Partial<DesignSpecColors> {
  const colors: Partial<DesignSpecColors> = {};

  // Find hex colors
  const hexMatches = html.match(/#(?:[0-9a-fA-F]{3,4}){1,2}\b/g) ?? [];
  // Find rgb/rgba colors
  const rgbMatches = html.match(/rgba?\([^)]+\)/g) ?? [];
  const allColors = [...hexMatches, ...rgbMatches];

  // Heuristic assignment: first color-like value with "background" context → background
  const bgMatch = html.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/i);
  if (bgMatch) colors.background = bgMatch[1];

  const textMatch = html.match(/(?:^|[;{"'\s])color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/i);
  if (textMatch) colors.text = textMatch[1];

  // Assign remaining unique colors
  const unique = [...new Set(allColors)].filter(
    (c) => c !== colors.background && c !== colors.text,
  );
  if (unique[0]) colors.primary = unique[0];
  if (unique[1]) colors.accent = unique[1];

  return colors;
}

function extractTypography(html: string): Partial<DesignSpecTypography> {
  const typo: Partial<DesignSpecTypography> = {};

  const fontMatch = html.match(/font-family:\s*([^;}"]+)/i);
  if (fontMatch) typo.fontFamily = fontMatch[1].trim();

  const sizeMatch = html.match(/font-size:\s*([^;}"]+)/i);
  if (sizeMatch) typo.fontSizeBase = sizeMatch[1].trim();

  return typo;
}

function extractBorders(html: string): Partial<DesignSpecBorders> {
  const borders: Partial<DesignSpecBorders> = {};

  const radiusMatch = html.match(/border-radius:\s*([^;}"]+)/i);
  if (radiusMatch) borders.radius = radiusMatch[1].trim();

  const borderColorMatch = html.match(/border(?:-color)?:\s*[^;]*?(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/i);
  if (borderColorMatch) borders.color = borderColorMatch[1];

  return borders;
}

function extractSpacing(html: string): Partial<DesignSpecSpacing> {
  const spacing: Partial<DesignSpecSpacing> = {};

  // Collect all padding/margin values
  const spacingMatches = html.match(/(?:padding|margin):\s*(\d+px)/gi) ?? [];
  const values = spacingMatches
    .map((m) => m.match(/(\d+)px/)?.[1])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b);

  const unique = [...new Set(values)];
  if (unique[0] !== undefined) spacing.sm = `${unique[0]}px`;
  if (unique[1] !== undefined) spacing.md = `${unique[1]}px`;
  if (unique[2] !== undefined) spacing.lg = `${unique[2]}px`;

  return spacing;
}

function extractCustomProperties(html: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const matches = html.matchAll(/(--[\w-]+):\s*([^;}"]+)/g);
  for (const m of matches) {
    tokens[m[1]] = m[2].trim();
  }
  return tokens;
}
