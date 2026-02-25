import { describe, it, expect } from 'vitest';

import type { PipelineNode, PipelinePort } from '@sn/types';

import { createPipelineGraph } from './pipeline-graph';

function makePort(id: string, direction: 'input' | 'output', schema?: Record<string, unknown>): PipelinePort {
  return { id, name: id, direction, schema };
}

function makeNode(id: string, inputs: PipelinePort[] = [], outputs: PipelinePort[] = []): PipelineNode {
  return { id, type: 'widget', position: { x: 0, y: 0 }, inputPorts: inputs, outputPorts: outputs };
}

describe('PipelineGraph', () => {
  it('adds and retrieves nodes', () => {
    const graph = createPipelineGraph();
    const node = makeNode('n1');
    graph.addNode(node);
    expect(graph.getNode('n1')).toEqual(node);
    expect(graph.getAllNodes()).toHaveLength(1);
  });

  it('removes nodes and their edges', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeNode('n1', [], [makePort('out', 'output')]));
    graph.addNode(makeNode('n2', [makePort('in', 'input')], []));
    graph.addEdge({ id: 'e1', sourceNodeId: 'n1', sourcePortId: 'out', targetNodeId: 'n2', targetPortId: 'in' });
    graph.removeNode('n1');
    expect(graph.getNode('n1')).toBeUndefined();
    expect(graph.getAllEdges()).toHaveLength(0);
  });

  it('adds valid edge', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeNode('n1', [], [makePort('out', 'output')]));
    graph.addNode(makeNode('n2', [makePort('in', 'input')], []));
    const result = graph.addEdge({ id: 'e1', sourceNodeId: 'n1', sourcePortId: 'out', targetNodeId: 'n2', targetPortId: 'in' });
    expect(result.success).toBe(true);
    expect(graph.getAllEdges()).toHaveLength(1);
  });

  it('rejects edge that creates cycle', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeNode('A', [makePort('in', 'input')], [makePort('out', 'output')]));
    graph.addNode(makeNode('B', [makePort('in', 'input')], [makePort('out', 'output')]));
    graph.addNode(makeNode('C', [makePort('in', 'input')], [makePort('out', 'output')]));
    graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });
    graph.addEdge({ id: 'e2', sourceNodeId: 'B', sourcePortId: 'out', targetNodeId: 'C', targetPortId: 'in' });
    const result = graph.addEdge({ id: 'e3', sourceNodeId: 'C', sourcePortId: 'out', targetNodeId: 'A', targetPortId: 'in' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('cycle');
    expect(graph.getAllEdges()).toHaveLength(2);
  });

  it('rejects incompatible port types', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeNode('n1', [], [makePort('out', 'output', { value: 'number', extra: 'bool' })]));
    graph.addNode(makeNode('n2', [makePort('in', 'input', { value: 'number' })], []));
    const result = graph.addEdge({ id: 'e1', sourceNodeId: 'n1', sourcePortId: 'out', targetNodeId: 'n2', targetPortId: 'in' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('compatible');
  });

  it('rejects duplicate input connection', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeNode('n1', [], [makePort('out1', 'output'), makePort('out2', 'output')]));
    graph.addNode(makeNode('n2', [makePort('in', 'input')], []));
    graph.addEdge({ id: 'e1', sourceNodeId: 'n1', sourcePortId: 'out1', targetNodeId: 'n2', targetPortId: 'in' });
    const result = graph.addEdge({ id: 'e2', sourceNodeId: 'n1', sourcePortId: 'out2', targetNodeId: 'n2', targetPortId: 'in' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('already has a connection');
  });

  it('toSchema returns Pipeline shape', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeNode('n1', [], [makePort('out', 'output')]));
    const schema = graph.toSchema('p1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(schema.id).toBe('p1');
    expect(schema.canvasId).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(schema.nodes).toHaveLength(1);
    expect(schema.edges).toHaveLength(0);
    expect(schema.createdAt).toBeDefined();
  });

  it('getEdgesForNode returns connected edges', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeNode('n1', [], [makePort('out', 'output')]));
    graph.addNode(makeNode('n2', [makePort('in', 'input')], [makePort('out2', 'output')]));
    graph.addNode(makeNode('n3', [makePort('in3', 'input')], []));
    graph.addEdge({ id: 'e1', sourceNodeId: 'n1', sourcePortId: 'out', targetNodeId: 'n2', targetPortId: 'in' });
    graph.addEdge({ id: 'e2', sourceNodeId: 'n2', sourcePortId: 'out2', targetNodeId: 'n3', targetPortId: 'in3' });
    const edges = graph.getEdgesForNode('n2');
    expect(edges).toHaveLength(2);
  });
});
