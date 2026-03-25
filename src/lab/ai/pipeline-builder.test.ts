/**
 * Pipeline Builder Tests
 *
 * @module lab/ai
 * @layer L2
 */

import { describe, it, expect } from 'vitest';

import type { Pipeline } from '@sn/types';

import { parsePipelineResponse } from './pipeline-builder';

// ─── parsePipelineResponse ───────────────────────────────────────────

describe('parsePipelineResponse', () => {
  it('parses valid pipeline JSON', () => {
    const json = JSON.stringify({
      nodes: [
        {
          id: 'counter',
          type: 'widget',
          widgetInstanceId: 'w-1',
          position: { x: 0, y: 0 },
          inputPorts: [],
          outputPorts: [{ id: 'out-0', name: 'countChanged', direction: 'output' }],
        },
        {
          id: 'display',
          type: 'widget',
          widgetInstanceId: 'w-2',
          position: { x: 300, y: 0 },
          inputPorts: [{ id: 'in-0', name: 'value', direction: 'input' }],
          outputPorts: [],
        },
      ],
      edges: [
        {
          id: 'e-1',
          sourceNodeId: 'counter',
          sourcePortId: 'out-0',
          targetNodeId: 'display',
          targetPortId: 'in-0',
        },
      ],
      explanation: 'Connects counter to display',
    });

    const result = parsePipelineResponse(json);
    expect(result).not.toBeNull();
    expect(result!.pipeline.nodes).toHaveLength(2);
    expect(result!.pipeline.edges).toHaveLength(1);
    expect(result!.explanation).toBe('Connects counter to display');
    expect(result!.newNodesAdded).toEqual(['counter', 'display']);
    expect(result!.newEdgesAdded).toEqual(['e-1']);
  });

  it('parses JSON from markdown code fences', () => {
    const text = '```json\n{"nodes":[{"id":"n1","type":"tap","position":{"x":0,"y":0},"inputPorts":[],"outputPorts":[]}],"edges":[],"explanation":"test"}\n```';
    const result = parsePipelineResponse(text);
    expect(result).not.toBeNull();
    expect(result!.pipeline.nodes).toHaveLength(1);
  });

  it('parses pipeline with transform nodes', () => {
    const json = JSON.stringify({
      nodes: [
        {
          id: 'w1',
          type: 'widget',
          position: { x: 0, y: 0 },
          inputPorts: [],
          outputPorts: [{ id: 'out', name: 'data', direction: 'output' }],
        },
        {
          id: 'f1',
          type: 'filter',
          position: { x: 200, y: 0 },
          config: { condition: 'active' },
          inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
          outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
        },
        {
          id: 'w2',
          type: 'widget',
          position: { x: 400, y: 0 },
          inputPorts: [{ id: 'in', name: 'data', direction: 'input' }],
          outputPorts: [],
        },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'w1', sourcePortId: 'out', targetNodeId: 'f1', targetPortId: 'in' },
        { id: 'e2', sourceNodeId: 'f1', sourcePortId: 'out', targetNodeId: 'w2', targetPortId: 'in' },
      ],
      explanation: 'Source → filter → display',
    });

    const result = parsePipelineResponse(json);
    expect(result).not.toBeNull();
    expect(result!.pipeline.nodes).toHaveLength(3);
    expect(result!.pipeline.edges).toHaveLength(2);
    expect(result!.pipeline.nodes[1].config).toEqual({ condition: 'active' });
  });

  it('merges with existing pipeline', () => {
    const existing: Pipeline = {
      id: 'existing-1',
      canvasId: '11111111-1111-1111-1111-111111111111',
      nodes: [
        {
          id: 'old-node',
          type: 'widget',
          position: { x: 0, y: 0 },
          inputPorts: [],
          outputPorts: [],
        },
      ],
      edges: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const json = JSON.stringify({
      nodes: [{ id: 'new-node', type: 'tap', position: { x: 100, y: 0 }, inputPorts: [], outputPorts: [] }],
      edges: [],
      explanation: 'Added a tap',
    });

    const result = parsePipelineResponse(json, existing);
    expect(result).not.toBeNull();
    expect(result!.pipeline.id).toBe('existing-1');
    expect(result!.pipeline.canvasId).toBe('11111111-1111-1111-1111-111111111111');
    expect(result!.pipeline.nodes).toHaveLength(2); // old + new
    expect(result!.newNodesAdded).toEqual(['new-node']);
  });

  it('rejects missing nodes array', () => {
    expect(parsePipelineResponse('{"edges":[]}')).toBeNull();
  });

  it('rejects missing edges array', () => {
    expect(parsePipelineResponse('{"nodes":[]}')).toBeNull();
  });

  it('rejects nodes without id', () => {
    const json = JSON.stringify({
      nodes: [{ type: 'tap' }],
      edges: [],
    });
    expect(parsePipelineResponse(json)).toBeNull();
  });

  it('rejects edges without required fields', () => {
    const json = JSON.stringify({
      nodes: [{ id: 'n1', type: 'tap', inputPorts: [], outputPorts: [] }],
      edges: [{ id: 'e1', sourceNodeId: 'n1' }], // missing other fields
    });
    expect(parsePipelineResponse(json)).toBeNull();
  });

  it('rejects invalid JSON', () => {
    expect(parsePipelineResponse('not json')).toBeNull();
  });

  it('defaults explanation when missing', () => {
    const json = JSON.stringify({
      nodes: [{ id: 'n1', type: 'tap', inputPorts: [], outputPorts: [] }],
      edges: [],
    });
    const result = parsePipelineResponse(json);
    expect(result!.explanation).toBe('AI-generated pipeline');
  });

  it('defaults position when missing from node', () => {
    const json = JSON.stringify({
      nodes: [{ id: 'n1', type: 'tap', inputPorts: [], outputPorts: [] }],
      edges: [],
    });
    const result = parsePipelineResponse(json);
    expect(result!.pipeline.nodes[0].position).toEqual({ x: 0, y: 0 });
  });
});
