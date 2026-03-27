/**
 * StickerNest MCP Artifact Rendering + Widget Authoring Tools
 *
 * Self-contained module that exports:
 * - ARTIFACT_TOOL_DEFS: tool definitions for the MCP ListTools handler
 * - handleArtifactTool(): handler function for the MCP CallTool handler
 * - widgetHtmlRegistry: the mutable widget HTML registry
 *
 * This module is imported by index.ts with minimal wiring.
 */

import { renderCanvas, renderWidget, renderWidgetPreview } from './renderer.js';
import { WIDGET_HTML_TEMPLATES, TEMPLATE_NAMES } from './widget-html.js';

// ============================================================================
// Widget HTML Registry
// ============================================================================

/** Maps widgetId → HTML source. Pre-populated with built-in templates. */
export const widgetHtmlRegistry: Record<string, string> = { ...WIDGET_HTML_TEMPLATES };

// ============================================================================
// Tool Definitions
// ============================================================================

export const ARTIFACT_TOOL_DEFS = [
  {
    name: 'render_canvas',
    description: 'Render the current canvas as a self-contained interactive HTML artifact. Returns HTML that can be displayed as an artifact in chat. Supports pan/zoom, entity selection, and fully functional widgets running inside iframes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        theme: { type: 'string', enum: ['midnight-aurora', 'crystal-light', 'bubbles-sky', 'autumn-fireflies', 'high-contrast'], description: 'Theme (default: current UI theme or midnight-aurora)' },
        zoom: { type: 'number', description: 'Initial zoom level (default: auto-fit to content)' },
        center: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, description: 'Center point in canvas space' },
        showGrid: { type: 'boolean', description: 'Show dot grid overlay (default: false)' },
        title: { type: 'string', description: 'Artifact title' },
      },
    },
  },
  {
    name: 'render_widget',
    description: 'Render a single widget instance as a standalone interactive HTML artifact with its SDK, theme, and config.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instanceId: { type: 'string', description: 'Widget instance ID to render' },
        theme: { type: 'string', enum: ['midnight-aurora', 'crystal-light', 'bubbles-sky', 'autumn-fireflies', 'high-contrast'], description: 'Theme name' },
        width: { type: 'number', description: 'Width in pixels (default: 400)' },
        height: { type: 'number', description: 'Height in pixels (default: 300)' },
        title: { type: 'string', description: 'Artifact title' },
      },
      required: ['instanceId'],
    },
  },
  {
    name: 'render_widget_preview',
    description: 'Render raw widget HTML as a preview artifact. Wraps the HTML with the StickerNest SDK stub and theme tokens so widgets can call StickerNest.register() and StickerNest.ready().',
    inputSchema: {
      type: 'object' as const,
      properties: {
        html: { type: 'string', description: 'Raw widget HTML code' },
        theme: { type: 'string', enum: ['midnight-aurora', 'crystal-light', 'bubbles-sky', 'autumn-fireflies', 'high-contrast'], description: 'Theme name' },
        width: { type: 'number', description: 'Preview width in pixels (default: 400)' },
        height: { type: 'number', description: 'Preview height in pixels (default: 300)' },
        config: { type: 'object', description: 'Config object passed to widget via StickerNest.getConfig()' },
        title: { type: 'string', description: 'Artifact title' },
      },
      required: ['html'],
    },
  },
  {
    name: 'widget_create_html',
    description: 'Create a new widget from a built-in template or custom HTML and register it. Available templates: ' + TEMPLATE_NAMES.join(', '),
    inputSchema: {
      type: 'object' as const,
      properties: {
        widgetId: { type: 'string', description: 'Unique widget ID (e.g., "my-custom-widget")' },
        template: { type: 'string', enum: [...TEMPLATE_NAMES, 'custom'], description: 'Template name, or "custom" for raw HTML' },
        html: { type: 'string', description: 'Custom widget HTML (required if template is "custom")' },
        name: { type: 'string', description: 'Display name for the widget' },
      },
      required: ['widgetId'],
    },
  },
  {
    name: 'widget_edit_html',
    description: 'Get the raw HTML source for a registered widget. Use to inspect or modify widget code.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        widgetId: { type: 'string', description: 'Widget ID to get HTML for' },
      },
      required: ['widgetId'],
    },
  },
  {
    name: 'widget_set_html',
    description: 'Update the HTML source for a registered widget.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        widgetId: { type: 'string', description: 'Widget ID to update' },
        html: { type: 'string', description: 'New widget HTML source' },
      },
      required: ['widgetId', 'html'],
    },
  },
];

// ============================================================================
// Tool Names (for the switch check in index.ts)
// ============================================================================

const ARTIFACT_TOOL_NAMES = new Set(ARTIFACT_TOOL_DEFS.map(t => t.name));

export function isArtifactTool(name: string): boolean {
  return ARTIFACT_TOOL_NAMES.has(name);
}

// ============================================================================
// Tool Handler
// ============================================================================

interface ToolContext {
  scene: {
    getAllEntities(): unknown[];
  };
  viewport: {
    getState(): { offset: { x: number; y: number }; zoom: number; width: number; height: number };
  };
  widgets: {
    listInstances(): Array<{ id: string; widgetId: string; config: Record<string, unknown>; state: Record<string, unknown> }>;
    getInstance(id: string): { id: string; widgetId: string; config: Record<string, unknown>; state: Record<string, unknown> } | null;
  };
  ui: {
    getState(): { theme: string };
  };
}

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };

export function handleArtifactTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): ToolResult {
  const a = args;

  switch (name) {
    // =================================================================
    // Rendering
    // =================================================================
    case 'render_canvas': {
      const entities = ctx.scene.getAllEntities() as Parameters<typeof renderCanvas>[0];
      const viewportState = ctx.viewport.getState();
      const instances = ctx.widgets.listInstances();
      const themeName = (a.theme as string) ?? ctx.ui.getState().theme;
      const html = renderCanvas(entities, viewportState, widgetHtmlRegistry, instances, {
        theme: themeName,
        zoom: a.zoom as number | undefined,
        center: a.center as { x: number; y: number } | undefined,
        showGrid: a.showGrid as boolean | undefined,
        title: (a.title as string) ?? 'StickerNest Canvas',
      });
      return { content: [{ type: 'text', text: html }] };
    }

    case 'render_widget': {
      const instanceId = a.instanceId as string;
      const inst = ctx.widgets.getInstance(instanceId);
      if (!inst) {
        return { content: [{ type: 'text', text: `Widget instance not found: ${instanceId}` }], isError: true };
      }
      const whtml = widgetHtmlRegistry[inst.widgetId];
      if (!whtml) {
        return { content: [{ type: 'text', text: `No HTML registered for widget: ${inst.widgetId}. Use widget_create_html or widget_set_html first.` }], isError: true };
      }
      const html = renderWidget(inst, whtml, {
        theme: (a.theme as string) ?? ctx.ui.getState().theme,
        width: a.width as number | undefined,
        height: a.height as number | undefined,
        title: a.title as string | undefined,
      });
      return { content: [{ type: 'text', text: html }] };
    }

    case 'render_widget_preview': {
      const rawHtml = a.html as string;
      if (!rawHtml) {
        return { content: [{ type: 'text', text: 'html parameter is required' }], isError: true };
      }
      const html = renderWidgetPreview(rawHtml, {
        theme: (a.theme as string) ?? ctx.ui.getState().theme,
        width: a.width as number | undefined,
        height: a.height as number | undefined,
        config: a.config as Record<string, unknown> | undefined,
        title: a.title as string | undefined,
      });
      return { content: [{ type: 'text', text: html }] };
    }

    // =================================================================
    // Widget Authoring
    // =================================================================
    case 'widget_create_html': {
      const widgetId = a.widgetId as string;
      const template = (a.template as string) ?? 'custom';
      const displayName = (a.name as string) ?? widgetId;

      if (template === 'custom') {
        const customHtml = a.html as string;
        if (!customHtml) {
          return { content: [{ type: 'text', text: 'html parameter is required when template is "custom"' }], isError: true };
        }
        widgetHtmlRegistry[widgetId] = customHtml;
      } else {
        const templateHtml = WIDGET_HTML_TEMPLATES[template];
        if (!templateHtml) {
          return { content: [{ type: 'text', text: `Unknown template: ${template}. Available: ${TEMPLATE_NAMES.join(', ')}` }], isError: true };
        }
        // Clone template with updated widget ID and name
        widgetHtmlRegistry[widgetId] = templateHtml.replace(
          /StickerNest\.register\(\{[^}]+\}\)/,
          `StickerNest.register({ id: '${widgetId}', name: '${displayName.replace(/'/g, "\\'")}', version: '1.0.0' })`,
        );
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            widgetId,
            template,
            registered: true,
            htmlLength: widgetHtmlRegistry[widgetId].length,
            availableWidgets: Object.keys(widgetHtmlRegistry),
          }, null, 2),
        }],
      };
    }

    case 'widget_edit_html': {
      const widgetId = a.widgetId as string;
      const html = widgetHtmlRegistry[widgetId];
      if (!html) {
        return {
          content: [{
            type: 'text',
            text: `No HTML registered for widget: ${widgetId}. Available: ${Object.keys(widgetHtmlRegistry).join(', ')}`,
          }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: html }] };
    }

    case 'widget_set_html': {
      const widgetId = a.widgetId as string;
      const html = a.html as string;
      if (!html) {
        return { content: [{ type: 'text', text: 'html parameter is required' }], isError: true };
      }
      widgetHtmlRegistry[widgetId] = html;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ widgetId, updated: true, htmlLength: html.length }, null, 2),
        }],
      };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown artifact tool: ${name}` }], isError: true };
  }
}
