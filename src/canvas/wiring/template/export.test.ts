import { describe, it, expect } from 'vitest';

import type { Pipeline, PipelineNode, PipelineEdge } from '@sn/types';

import { exportPipelineAsTemplate } from './export';
import type { WidgetResolutionEntry } from './export';

// ─── Helpers ─────────────────────────────────────────────────────────

function makeNode(
  id: string,
  type: PipelineNode['type'] = 'filter',
  overrides: Partial<PipelineNode> = {},
): PipelineNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    config: {},
    inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
    outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
    ...overrides,
  };
}

function makeEdge(id: string, sourceNodeId: string, targetNodeId: string): PipelineEdge {
  return { id, sourceNodeId, sourcePortId: 'out', targetNodeId, targetPortId: 'in' };
}

function makePipeline(nodes: PipelineNode[], edges: PipelineEdge[]): Pipeline {
  return {
    id: 'pipeline-1',
    canvasId: '00000000-0000-0000-0000-000000000001',
    nodes,
    edges,
    createdAt: '2026-03-28T00:00:00.000Z',
    updatedAt: '2026-03-28T00:00:00.000Z',
  };
}

function makeWidgetResolution(entries: Record<string, WidgetResolutionEntry>) {
  return new Map(Object.entries(entries));
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('exportPipelineAsTemplate', () => {
  it('exports a simple pipeline with transform nodes', () => {
    const pipeline = makePipeline(
      [makeNode('n1', 'filter'), makeNode('n2', 'map')],
      [makeEdge('e1', 'n1', 'n2')],
    );

    const template = exportPipelineAsTemplate(pipeline, {
      widgetResolution: new Map(),
    });

    expect(template.formatVersion).toBe(1);
    expect(template.nodes).toHaveLength(2);
    expect(template.edges).toHaveLength(1);
    expect(template.requiredWidgets).toHaveLength(0);
  });

  it('remaps node IDs to template-scoped IDs', () => {
    const pipeline = makePipeline(
      [makeNode('abc-123'), makeNode('def-456')],
      [makeEdge('e1', 'abc-123', 'def-456')],
    );

    const template = exportPipelineAsTemplate(pipeline, {
      widgetResolution: new Map(),
    });

    expect(template.nodes[0].id).toBe('tpl-0');
    expect(template.nodes[1].id).toBe('tpl-1');
    // No original UUIDs leak
    expect(template.nodes.map((n) => n.id)).not.toContain('abc-123');
    expect(template.nodes.map((n) => n.id)).not.toContain('def-456');
  });

  it('remaps edge references to template node IDs', () => {
    const pipeline = makePipeline(
      [makeNode('n1'), makeNode('n2')],
      [makeEdge('e1', 'n1', 'n2')],
    );

    const template = exportPipelineAsTemplate(pipeline, {
      widgetResolution: new Map(),
    });

    expect(template.edges[0].sourceNodeId).toBe('tpl-0');
    expect(template.edges[0].targetNodeId).toBe('tpl-1');
  });

  it('handles widget nodes with widgetResolution', () => {
    const widgetNode = makeNode('w1', 'widget', {
      widgetInstanceId: 'inst-abc',
    });
    const filterNode = makeNode('f1', 'filter');
    const pipeline = makePipeline([widgetNode, filterNode], [makeEdge('e1', 'w1', 'f1')]);

    const template = exportPipelineAsTemplate(pipeline, {
      widgetResolution: makeWidgetResolution({
        'inst-abc': { marketplaceSlug: 'my-widget', name: 'My Widget' },
      }),
    });

    expect(template.requiredWidgets).toHaveLength(1);
    expect(template.requiredWidgets[0].marketplaceSlug).toBe('my-widget');
    expect(template.requiredWidgets[0].name).toBe('My Widget');
    expect(template.requiredWidgets[0].nodeIds).toEqual(['tpl-0']);
    // widgetInstanceId is stripped
    expect(template.nodes[0].widgetInstanceId).toBeUndefined();
  });

  it('groups multiple widget nodes with same marketplace slug', () => {
    const w1 = makeNode('w1', 'widget', { widgetInstanceId: 'inst-1' });
    const w2 = makeNode('w2', 'widget', { widgetInstanceId: 'inst-2' });
    const pipeline = makePipeline([w1, w2], []);

    const template = exportPipelineAsTemplate(pipeline, {
      widgetResolution: makeWidgetResolution({
        'inst-1': { marketplaceSlug: 'same-widget', name: 'Same Widget' },
        'inst-2': { marketplaceSlug: 'same-widget', name: 'Same Widget' },
      }),
    });

    expect(template.requiredWidgets).toHaveLength(1);
    expect(template.requiredWidgets[0].nodeIds).toEqual(['tpl-0', 'tpl-1']);
  });

  it('throws when widget node has no widgetResolution entry', () => {
    const widgetNode = makeNode('w1', 'widget', { widgetInstanceId: 'inst-missing' });
    const pipeline = makePipeline([widgetNode], []);

    expect(() =>
      exportPipelineAsTemplate(pipeline, {
        widgetResolution: new Map(),
      }),
    ).toThrow(/widgetResolution/);
  });

  it('counts AI nodes correctly', () => {
    const pipeline = makePipeline(
      [
        makeNode('n1', 'ai-prompt'),
        makeNode('n2', 'ai-generate'),
        makeNode('n3', 'filter'),
        makeNode('n4', 'ai-transform'),
      ],
      [],
    );

    const template = exportPipelineAsTemplate(pipeline, {
      widgetResolution: new Map(),
    });

    expect(template.aiNodesCount).toBe(3);
  });

  it('remaps configMapping paths from original to template node IDs', () => {
    const pipeline = makePipeline(
      [makeNode('original-id', 'http-request', { config: { url: 'https://example.com' } })],
      [],
    );

    const template = exportPipelineAsTemplate(pipeline, {
      widgetResolution: new Map(),
      configSchema: {
        api_endpoint: { label: 'API Endpoint', type: 'string', required: true },
      },
      configMapping: { api_endpoint: 'original-id.url' },
    });

    expect(template.configMapping.api_endpoint).toBe('tpl-0.url');
  });

  it('clears config values that are mapped to configSchema fields', () => {
    const pipeline = makePipeline(
      [makeNode('n1', 'http-request', { config: { url: 'https://secret.com', method: 'GET' } })],
      [],
    );

    const template = exportPipelineAsTemplate(pipeline, {
      widgetResolution: new Map(),
      configSchema: {
        endpoint: { label: 'Endpoint', type: 'string', required: true },
      },
      configMapping: { endpoint: 'n1.url' },
    });

    // url should be cleared (buyer fills it in), method should be preserved
    expect(template.nodes[0].config?.url).toBeUndefined();
    expect(template.nodes[0].config?.method).toBe('GET');
  });

  it('throws on invalid configMapping path format', () => {
    const pipeline = makePipeline([makeNode('n1')], []);

    expect(() =>
      exportPipelineAsTemplate(pipeline, {
        widgetResolution: new Map(),
        configMapping: { field: 'no-dot-in-path' },
      }),
    ).toThrow(/configMapping path/);
  });

  it('throws when configMapping references nonexistent node', () => {
    const pipeline = makePipeline([makeNode('n1')], []);

    expect(() =>
      exportPipelineAsTemplate(pipeline, {
        widgetResolution: new Map(),
        configMapping: { field: 'nonexistent.url' },
      }),
    ).toThrow(/does not exist/);
  });

  it('preserves node positions', () => {
    const pipeline = makePipeline(
      [
        makeNode('n1', 'filter', { position: { x: 100, y: 200 } }),
        makeNode('n2', 'map', { position: { x: 300, y: 400 } }),
      ],
      [],
    );

    const template = exportPipelineAsTemplate(pipeline, {
      widgetResolution: new Map(),
    });

    expect(template.nodes[0].position).toEqual({ x: 100, y: 200 });
    expect(template.nodes[1].position).toEqual({ x: 300, y: 400 });
  });

  it('includes estimatedCostPerRun when provided', () => {
    const pipeline = makePipeline([makeNode('n1')], []);

    const template = exportPipelineAsTemplate(pipeline, {
      widgetResolution: new Map(),
      estimatedCostPerRun: '~$0.05 per run',
    });

    expect(template.estimatedCostPerRun).toBe('~$0.05 per run');
  });
});
