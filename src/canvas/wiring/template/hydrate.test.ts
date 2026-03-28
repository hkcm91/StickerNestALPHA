import { describe, it, expect } from 'vitest';

import type { MarketplacePipelineTemplate } from '@sn/types';

import { hydratePipelineTemplate } from './hydrate';

// ─── Helpers ─────────────────────────────────────────────────────────

const CANVAS_ID = 'a0000000-0000-4000-8000-000000000099';

function makeTemplate(
  overrides: Partial<MarketplacePipelineTemplate> = {},
): MarketplacePipelineTemplate {
  return {
    formatVersion: 1 as const,
    nodes: [
      {
        id: 'tpl-0',
        type: 'filter',
        position: { x: 100, y: 200 },
        config: { condition: 'true' },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
        outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
      },
      {
        id: 'tpl-1',
        type: 'widget',
        position: { x: 300, y: 200 },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
        outputPorts: [],
      },
    ],
    edges: [
      { id: 'tpl-e0', sourceNodeId: 'tpl-0', sourcePortId: 'out', targetNodeId: 'tpl-1', targetPortId: 'in' },
    ],
    requiredWidgets: [
      { marketplaceSlug: 'my-widget', name: 'My Widget', nodeIds: ['tpl-1'] },
    ],
    configSchema: {},
    configMapping: {},
    aiNodesCount: 0,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('hydratePipelineTemplate', () => {
  it('produces a valid Pipeline', () => {
    const pipeline = hydratePipelineTemplate(makeTemplate(), {
      canvasId: CANVAS_ID,
      widgetInstanceMapping: new Map([['my-widget', 'inst-real-123']]),
    });

    expect(pipeline.canvasId).toBe(CANVAS_ID);
    expect(pipeline.nodes).toHaveLength(2);
    expect(pipeline.edges).toHaveLength(1);
    expect(pipeline.id).toBeDefined();
    expect(pipeline.createdAt).toBeDefined();
    expect(pipeline.updatedAt).toBeDefined();
  });

  it('generates fresh UUIDs for all nodes', () => {
    const pipeline = hydratePipelineTemplate(makeTemplate(), {
      canvasId: CANVAS_ID,
      widgetInstanceMapping: new Map([['my-widget', 'inst-real-123']]),
    });

    // No template IDs remain
    expect(pipeline.nodes.map((n) => n.id)).not.toContain('tpl-0');
    expect(pipeline.nodes.map((n) => n.id)).not.toContain('tpl-1');

    // Each ID is unique
    const ids = new Set(pipeline.nodes.map((n) => n.id));
    expect(ids.size).toBe(pipeline.nodes.length);
  });

  it('generates fresh UUIDs for all edges', () => {
    const pipeline = hydratePipelineTemplate(makeTemplate(), {
      canvasId: CANVAS_ID,
      widgetInstanceMapping: new Map([['my-widget', 'inst-real-123']]),
    });

    expect(pipeline.edges[0].id).not.toBe('tpl-e0');
  });

  it('updates edge references to new node IDs', () => {
    const pipeline = hydratePipelineTemplate(makeTemplate(), {
      canvasId: CANVAS_ID,
      widgetInstanceMapping: new Map([['my-widget', 'inst-real-123']]),
    });

    const nodeIds = new Set(pipeline.nodes.map((n) => n.id));
    expect(nodeIds.has(pipeline.edges[0].sourceNodeId)).toBe(true);
    expect(nodeIds.has(pipeline.edges[0].targetNodeId)).toBe(true);
  });

  it('resolves widget instance IDs from widgetInstanceMapping', () => {
    const pipeline = hydratePipelineTemplate(makeTemplate(), {
      canvasId: CANVAS_ID,
      widgetInstanceMapping: new Map([['my-widget', 'inst-real-123']]),
    });

    const widgetNode = pipeline.nodes.find((n) => n.type === 'widget');
    expect(widgetNode?.widgetInstanceId).toBe('inst-real-123');
  });

  it('throws when required widget is not mapped', () => {
    expect(() =>
      hydratePipelineTemplate(makeTemplate(), {
        canvasId: CANVAS_ID,
        widgetInstanceMapping: new Map(), // missing 'my-widget'
      }),
    ).toThrow(/not mapped/);
  });

  it('applies config values via configMapping', () => {
    const template = makeTemplate({
      configSchema: {
        api_key: { label: 'API Key', type: 'string', required: true },
      },
      configMapping: { api_key: 'tpl-0.condition' },
    });

    const pipeline = hydratePipelineTemplate(template, {
      canvasId: CANVAS_ID,
      widgetInstanceMapping: new Map([['my-widget', 'inst-1']]),
      configValues: { api_key: 'sk-secret-123' },
    });

    const filterNode = pipeline.nodes.find((n) => n.type === 'filter');
    expect(filterNode?.config?.condition).toBe('sk-secret-123');
  });

  it('applies default config values when no user value provided', () => {
    const template = makeTemplate({
      configSchema: {
        model: {
          label: 'Model',
          type: 'select',
          default: 'claude-3',
          required: true,
          options: ['gpt-4', 'claude-3'],
        },
      },
      configMapping: { model: 'tpl-0.condition' },
    });

    const pipeline = hydratePipelineTemplate(template, {
      canvasId: CANVAS_ID,
      widgetInstanceMapping: new Map([['my-widget', 'inst-1']]),
      configValues: {}, // no model value — should use default
    });

    const filterNode = pipeline.nodes.find((n) => n.type === 'filter');
    expect(filterNode?.config?.condition).toBe('claude-3');
  });

  it('throws when required config field has no value and no default', () => {
    const template = makeTemplate({
      configSchema: {
        secret: { label: 'Secret', type: 'string', required: true },
      },
      configMapping: { secret: 'tpl-0.condition' },
    });

    expect(() =>
      hydratePipelineTemplate(template, {
        canvasId: CANVAS_ID,
        widgetInstanceMapping: new Map([['my-widget', 'inst-1']]),
        configValues: {}, // missing required 'secret'
      }),
    ).toThrow(/Required config field/);
  });

  it('does not throw for optional config field with no value', () => {
    const template = makeTemplate({
      configSchema: {
        optional_field: { label: 'Optional', type: 'string', required: false },
      },
      configMapping: { optional_field: 'tpl-0.condition' },
    });

    expect(() =>
      hydratePipelineTemplate(template, {
        canvasId: CANVAS_ID,
        widgetInstanceMapping: new Map([['my-widget', 'inst-1']]),
        configValues: {},
      }),
    ).not.toThrow();
  });

  it('applies position offset to all nodes', () => {
    const pipeline = hydratePipelineTemplate(makeTemplate(), {
      canvasId: CANVAS_ID,
      widgetInstanceMapping: new Map([['my-widget', 'inst-1']]),
      positionOffset: { x: 500, y: 300 },
    });

    // Original positions were (100,200) and (300,200)
    expect(pipeline.nodes[0].position).toEqual({ x: 600, y: 500 });
    expect(pipeline.nodes[1].position).toEqual({ x: 800, y: 500 });
  });

  it('defaults position offset to (0,0)', () => {
    const pipeline = hydratePipelineTemplate(makeTemplate(), {
      canvasId: CANVAS_ID,
      widgetInstanceMapping: new Map([['my-widget', 'inst-1']]),
    });

    expect(pipeline.nodes[0].position).toEqual({ x: 100, y: 200 });
  });

  it('handles template with no widget nodes', () => {
    const template = makeTemplate({
      nodes: [
        {
          id: 'tpl-0',
          type: 'filter',
          position: { x: 0, y: 0 },
          config: {},
          inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
          outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
        },
      ],
      edges: [],
      requiredWidgets: [],
    });

    const pipeline = hydratePipelineTemplate(template, {
      canvasId: CANVAS_ID,
      widgetInstanceMapping: new Map(),
    });

    expect(pipeline.nodes).toHaveLength(1);
    expect(pipeline.nodes[0].widgetInstanceId).toBeUndefined();
  });

  it('handles template with empty config', () => {
    const pipeline = hydratePipelineTemplate(makeTemplate(), {
      canvasId: CANVAS_ID,
      widgetInstanceMapping: new Map([['my-widget', 'inst-1']]),
      configValues: {},
    });

    expect(pipeline).toBeDefined();
    expect(pipeline.nodes).toHaveLength(2);
  });
});
