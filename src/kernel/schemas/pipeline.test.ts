import { describe, it, expect } from 'vitest';

import {
  PipelinePortSchema,
  PipelineNodeSchema,
  PipelineEdgeSchema,
  PipelineSchema,
  PipelinePortJSONSchema,
  PipelineNodeJSONSchema,
  PipelineEdgeJSONSchema,
  PipelineJSONSchema,
} from './pipeline';

describe('PipelinePortSchema', () => {
  it('validates a valid port', () => {
    const result = PipelinePortSchema.safeParse({
      id: 'port-1',
      name: 'output',
      direction: 'output',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional schema field', () => {
    const result = PipelinePortSchema.safeParse({
      id: 'port-1',
      name: 'data',
      direction: 'input',
      schema: { type: 'string' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid direction', () => {
    const result = PipelinePortSchema.safeParse({
      id: 'port-1',
      name: 'data',
      direction: 'both',
    });
    expect(result.success).toBe(false);
  });
});

describe('PipelineNodeSchema', () => {
  it('validates a widget node', () => {
    const result = PipelineNodeSchema.safeParse({
      id: 'node-1',
      type: 'widget',
      widgetInstanceId: 'inst-1',
      position: { x: 100, y: 200 },
      inputPorts: [{ id: 'p1', name: 'in', direction: 'input' }],
      outputPorts: [{ id: 'p2', name: 'out', direction: 'output' }],
    });
    expect(result.success).toBe(true);
  });

  it('validates a transform node', () => {
    const result = PipelineNodeSchema.safeParse({
      id: 'node-2',
      type: 'filter',
      position: { x: 0, y: 0 },
      config: { expression: 'payload.value > 10' },
      inputPorts: [],
      outputPorts: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid node type', () => {
    const result = PipelineNodeSchema.safeParse({
      id: 'node-1',
      type: 'invalid',
      position: { x: 0, y: 0 },
      inputPorts: [],
      outputPorts: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('PipelineEdgeSchema', () => {
  it('validates a valid edge', () => {
    const result = PipelineEdgeSchema.safeParse({
      id: 'edge-1',
      sourceNodeId: 'node-1',
      sourcePortId: 'port-1',
      targetNodeId: 'node-2',
      targetPortId: 'port-2',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty node ids', () => {
    const result = PipelineEdgeSchema.safeParse({
      id: 'edge-1',
      sourceNodeId: '',
      sourcePortId: 'port-1',
      targetNodeId: 'node-2',
      targetPortId: 'port-2',
    });
    expect(result.success).toBe(false);
  });
});

describe('PipelineSchema', () => {
  it('validates a full pipeline', () => {
    const now = new Date().toISOString();
    const result = PipelineSchema.safeParse({
      id: 'pipe-1',
      canvasId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Test Pipeline',
      nodes: [
        {
          id: 'n1',
          type: 'widget',
          position: { x: 0, y: 0 },
          inputPorts: [],
          outputPorts: [{ id: 'p1', name: 'out', direction: 'output' }],
        },
        {
          id: 'n2',
          type: 'filter',
          position: { x: 200, y: 0 },
          inputPorts: [{ id: 'p2', name: 'in', direction: 'input' }],
          outputPorts: [],
        },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'n1', sourcePortId: 'p1', targetNodeId: 'n2', targetPortId: 'p2' },
      ],
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty nodes and edges', () => {
    const now = new Date().toISOString();
    const result = PipelineSchema.safeParse({
      id: 'pipe-1',
      canvasId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      nodes: [],
      edges: [],
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(true);
  });
});

describe('JSON Schema exports', () => {
  it('exports PipelinePortJSONSchema', () => {
    expect(PipelinePortJSONSchema).toBeTruthy();
    expect(typeof PipelinePortJSONSchema).toBe('object');
  });

  it('exports PipelineNodeJSONSchema', () => {
    expect(PipelineNodeJSONSchema).toBeTruthy();
  });

  it('exports PipelineEdgeJSONSchema', () => {
    expect(PipelineEdgeJSONSchema).toBeTruthy();
  });

  it('exports PipelineJSONSchema', () => {
    expect(PipelineJSONSchema).toBeTruthy();
  });
});
