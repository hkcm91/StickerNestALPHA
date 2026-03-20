/**
 * Design Spec Injector — Converts WidgetDesignSpec to CSS custom properties.
 *
 * Generates a `<style>` block that can be injected into the preview iframe
 * srcdoc, making design tokens available to the widget.
 *
 * @module lab/design-spec
 * @layer L2
 */

import type { WidgetDesignSpec } from '@sn/types';

/**
 * Flatten a WidgetDesignSpec into a flat map of CSS custom property name → value.
 */
export function flattenDesignSpec(spec: WidgetDesignSpec): Record<string, string> {
  const tokens: Record<string, string> = {};

  if (spec.colors) {
    for (const [key, value] of Object.entries(spec.colors)) {
      if (value) tokens[`--wd-color-${camelToKebab(key)}`] = value;
    }
  }

  if (spec.typography) {
    for (const [key, value] of Object.entries(spec.typography)) {
      if (value !== undefined) tokens[`--wd-typo-${camelToKebab(key)}`] = String(value);
    }
  }

  if (spec.spacing) {
    for (const [key, value] of Object.entries(spec.spacing)) {
      if (value) tokens[`--wd-space-${key}`] = value;
    }
  }

  if (spec.borders) {
    for (const [key, value] of Object.entries(spec.borders)) {
      if (value) tokens[`--wd-border-${camelToKebab(key)}`] = value;
    }
  }

  if (spec.shadows) {
    for (const [key, value] of Object.entries(spec.shadows)) {
      if (value) tokens[`--wd-shadow-${key}`] = value;
    }
  }

  if (spec.components) {
    for (const comp of spec.components) {
      const prefix = `--wd-${camelToKebab(comp.name)}`;
      for (const [key, value] of Object.entries(comp.tokens)) {
        tokens[`${prefix}-${camelToKebab(key)}`] = value;
      }
    }
  }

  if (spec.customTokens) {
    for (const [key, value] of Object.entries(spec.customTokens)) {
      // Custom tokens are passed through directly
      tokens[key.startsWith('--') ? key : `--wd-${camelToKebab(key)}`] = value;
    }
  }

  return tokens;
}

/**
 * Generate a `<style>` block from a WidgetDesignSpec.
 * This block is injected into the iframe srcdoc.
 */
export function generateDesignSpecStyleBlock(spec: WidgetDesignSpec): string {
  const tokens = flattenDesignSpec(spec);
  const entries = Object.entries(tokens);

  if (entries.length === 0) return '';

  const declarations = entries
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join('\n');

  return `<style data-sn-design-spec>\n:root {\n${declarations}\n}\n</style>`;
}

/**
 * Inject a design spec style block into widget HTML.
 * Inserts before the closing </head> tag, or prepends if no <head>.
 */
export function injectDesignSpecIntoHtml(html: string, spec: WidgetDesignSpec): string {
  const styleBlock = generateDesignSpecStyleBlock(spec);
  if (!styleBlock) return html;

  // Try inserting before </head>
  const headCloseIdx = html.indexOf('</head>');
  if (headCloseIdx !== -1) {
    return html.slice(0, headCloseIdx) + styleBlock + '\n' + html.slice(headCloseIdx);
  }

  // Prepend if no <head> tag
  return styleBlock + '\n' + html;
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
