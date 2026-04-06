import { describe, it, expect } from 'vitest';

import {
  MarketplacePipelineTemplateSchema,
  TemplateConfigFieldSchema,
  TemplateRequiredWidgetSchema,
} from './marketplace-pipeline-template';

// ─── Helpers ─────────────────────────────────────────────────────────

function makeValidTemplate() {
  return {
    formatVersion: 1 as const,
    nodes: [
      {
        id: 'tpl-0',
        type: 'filter' as const,
        position: { x: 0, y: 0 },
        config: { condition: 'true' },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' as const }],
        outputPorts: [{ id: 'out', name: 'out', direction: 'output' as const }],
      },
      {
        id: 'tpl-1',
        type: 'widget' as const,
        position: { x: 200, y: 0 },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' as const }],
        outputPorts: [],
      },
    ],
    edges: [
      { id: 'tpl-e0', sourceNodeId: 'tpl-0', sourcePortId: 'out', targetNodeId: 'tpl-1', targetPortId: 'in' },
    ],
    requiredWidgets: [
      { marketplaceSlug: 'my-widget', name: 'My Widget', nodeIds: ['tpl-1'] },
    ],
    configSchema: {
      api_key: { label: 'API Key', type: 'string' as const, required: true },
    },
    configMapping: { api_key: 'tpl-0.condition' },
    aiNodesCount: 0,
  };
}

// ─── Schema Tests ────────────────────────────────────────────────────

describe('MarketplacePipelineTemplateSchema', () => {
  it('parses a valid template', () => {
    const result = MarketplacePipelineTemplateSchema.safeParse(makeValidTemplate());
    expect(result.success).toBe(true);
  });

  it('rejects missing formatVersion', () => {
    const tpl = makeValidTemplate();
    (tpl as any).formatVersion = undefined;
    const result = MarketplacePipelineTemplateSchema.safeParse(tpl);
    expect(result.success).toBe(false);
  });

  it('rejects wrong formatVersion', () => {
    const tpl = makeValidTemplate();
    (tpl as any).formatVersion = 2;
    const result = MarketplacePipelineTemplateSchema.safeParse(tpl);
    expect(result.success).toBe(false);
  });

  it('rejects missing nodes', () => {
    const tpl = makeValidTemplate();
    (tpl as any).nodes = undefined;
    const result = MarketplacePipelineTemplateSchema.safeParse(tpl);
    expect(result.success).toBe(false);
  });

  it('rejects missing edges', () => {
    const tpl = makeValidTemplate();
    (tpl as any).edges = undefined;
    const result = MarketplacePipelineTemplateSchema.safeParse(tpl);
    expect(result.success).toBe(false);
  });

  it('defaults configSchema to empty object', () => {
    const tpl = makeValidTemplate();
    delete (tpl as any).configSchema;
    const result = MarketplacePipelineTemplateSchema.parse(tpl);
    expect(result.configSchema).toEqual({});
  });

  it('defaults configMapping to empty object', () => {
    const tpl = makeValidTemplate();
    delete (tpl as any).configMapping;
    const result = MarketplacePipelineTemplateSchema.parse(tpl);
    expect(result.configMapping).toEqual({});
  });

  it('defaults requiredWidgets to empty array', () => {
    const tpl = makeValidTemplate();
    delete (tpl as any).requiredWidgets;
    const result = MarketplacePipelineTemplateSchema.parse(tpl);
    expect(result.requiredWidgets).toEqual([]);
  });

  it('defaults aiNodesCount to 0', () => {
    const tpl = makeValidTemplate();
    delete (tpl as any).aiNodesCount;
    const result = MarketplacePipelineTemplateSchema.parse(tpl);
    expect(result.aiNodesCount).toBe(0);
  });

  it('round-trips through parse/serialize/parse', () => {
    const original = MarketplacePipelineTemplateSchema.parse(makeValidTemplate());
    const serialized = JSON.parse(JSON.stringify(original));
    const reparsed = MarketplacePipelineTemplateSchema.parse(serialized);
    expect(reparsed).toEqual(original);
  });
});

describe('TemplateConfigFieldSchema', () => {
  it('parses a valid string config field', () => {
    const result = TemplateConfigFieldSchema.safeParse({
      label: 'API Key',
      type: 'string',
    });
    expect(result.success).toBe(true);
  });

  it('parses a select config field with options', () => {
    const result = TemplateConfigFieldSchema.safeParse({
      label: 'Model',
      type: 'select',
      options: ['gpt-4', 'claude-3'],
      default: 'claude-3',
      description: 'Choose the AI model',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing label', () => {
    const result = TemplateConfigFieldSchema.safeParse({ type: 'string' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = TemplateConfigFieldSchema.safeParse({
      label: 'X',
      type: 'array',
    });
    expect(result.success).toBe(false);
  });
});

describe('TemplateRequiredWidgetSchema', () => {
  it('parses a valid required widget', () => {
    const result = TemplateRequiredWidgetSchema.safeParse({
      marketplaceSlug: 'etsy-connector',
      name: 'Etsy Connector',
      nodeIds: ['tpl-0', 'tpl-2'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional marketplaceId', () => {
    const result = TemplateRequiredWidgetSchema.safeParse({
      marketplaceSlug: 'etsy-connector',
      marketplaceId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Etsy Connector',
      nodeIds: ['tpl-0'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty marketplaceSlug', () => {
    const result = TemplateRequiredWidgetSchema.safeParse({
      marketplaceSlug: '',
      name: 'X',
      nodeIds: ['tpl-0'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = TemplateRequiredWidgetSchema.safeParse({
      marketplaceSlug: 'x',
      name: '',
      nodeIds: ['tpl-0'],
    });
    expect(result.success).toBe(false);
  });
});
