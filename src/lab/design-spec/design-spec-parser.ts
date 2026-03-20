/**
 * Design Spec Parser — Markdown ↔ WidgetDesignSpec round-trip.
 *
 * Converts a WidgetDesignSpec to a portable DESIGN.md markdown string
 * and back, enabling export/import of design systems as text.
 *
 * @module lab/design-spec
 * @layer L2
 */

import type { WidgetDesignSpec } from '@sn/types';

/**
 * Serialize a WidgetDesignSpec to a markdown DESIGN.md string.
 */
export function serializeDesignSpec(spec: WidgetDesignSpec): string {
  const lines: string[] = [];

  lines.push(`# ${spec.name ?? 'Widget Design System'}`);
  lines.push('');

  if (spec.colors) {
    lines.push('## Colors');
    lines.push('');
    for (const [key, value] of Object.entries(spec.colors)) {
      if (value) lines.push(`- **${key}**: \`${value}\``);
    }
    lines.push('');
  }

  if (spec.typography) {
    lines.push('## Typography');
    lines.push('');
    for (const [key, value] of Object.entries(spec.typography)) {
      if (value !== undefined) lines.push(`- **${key}**: \`${value}\``);
    }
    lines.push('');
  }

  if (spec.spacing) {
    lines.push('## Spacing');
    lines.push('');
    for (const [key, value] of Object.entries(spec.spacing)) {
      if (value) lines.push(`- **${key}**: \`${value}\``);
    }
    lines.push('');
  }

  if (spec.borders) {
    lines.push('## Borders');
    lines.push('');
    for (const [key, value] of Object.entries(spec.borders)) {
      if (value) lines.push(`- **${key}**: \`${value}\``);
    }
    lines.push('');
  }

  if (spec.shadows) {
    lines.push('## Shadows');
    lines.push('');
    for (const [key, value] of Object.entries(spec.shadows)) {
      if (value) lines.push(`- **${key}**: \`${value}\``);
    }
    lines.push('');
  }

  if (spec.components && spec.components.length > 0) {
    lines.push('## Components');
    lines.push('');
    for (const comp of spec.components) {
      lines.push(`### ${comp.name}`);
      lines.push('');
      for (const [key, value] of Object.entries(comp.tokens)) {
        lines.push(`- **${key}**: \`${value}\``);
      }
      lines.push('');
    }
  }

  if (spec.customTokens && Object.keys(spec.customTokens).length > 0) {
    lines.push('## Custom Tokens');
    lines.push('');
    for (const [key, value] of Object.entries(spec.customTokens)) {
      lines.push(`- **${key}**: \`${value}\``);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

/**
 * Parse a DESIGN.md markdown string back into a WidgetDesignSpec.
 *
 * Best-effort: parses `- **key**: \`value\`` patterns under known headings.
 */
export function parseDesignSpec(markdown: string): WidgetDesignSpec {
  const spec: WidgetDesignSpec = { version: 1 };

  const lines = markdown.split('\n');
  let currentSection: string | null = null;
  let currentComponent: string | null = null;

  // Extract title
  const titleMatch = lines[0]?.match(/^#\s+(.+)/);
  if (titleMatch) spec.name = titleMatch[1].trim();

  for (const line of lines) {
    // Section headings
    const h2 = line.match(/^##\s+(\w+)/);
    if (h2) {
      currentSection = h2[1].toLowerCase();
      currentComponent = null;
      continue;
    }

    // Component sub-heading
    const h3 = line.match(/^###\s+(.+)/);
    if (h3 && currentSection === 'components') {
      currentComponent = h3[1].trim();
      if (!spec.components) spec.components = [];
      spec.components.push({ name: currentComponent, tokens: {} });
      continue;
    }

    // Key-value pairs
    const kvMatch = line.match(/^-\s+\*\*(.+?)\*\*:\s+`(.+?)`/);
    if (!kvMatch || !currentSection) continue;

    const [, key, value] = kvMatch;

    switch (currentSection) {
      case 'colors':
        if (!spec.colors) spec.colors = {};
        (spec.colors as Record<string, string>)[key] = value;
        break;
      case 'typography':
        if (!spec.typography) spec.typography = {};
        if (key === 'fontWeightNormal' || key === 'fontWeightBold') {
          (spec.typography as Record<string, unknown>)[key] = Number(value);
        } else {
          (spec.typography as Record<string, string>)[key] = value;
        }
        break;
      case 'spacing':
        if (!spec.spacing) spec.spacing = {};
        (spec.spacing as Record<string, string>)[key] = value;
        break;
      case 'borders':
        if (!spec.borders) spec.borders = {};
        (spec.borders as Record<string, string>)[key] = value;
        break;
      case 'shadows':
        if (!spec.shadows) spec.shadows = {};
        (spec.shadows as Record<string, string>)[key] = value;
        break;
      case 'components': {
        const comp = spec.components?.find((c) => c.name === currentComponent);
        if (comp) comp.tokens[key] = value;
        break;
      }
      case 'custom':
        if (!spec.customTokens) spec.customTokens = {};
        spec.customTokens[key] = value;
        break;
    }
  }

  return spec;
}
