import { describe, it, expect } from 'vitest';

import type { PipelineNode, PipelineEdge, PipelinePort } from '@sn/types';

import { detectCycle, arePortsCompatible, validatePipeline } from './validator';

function makeNode(id: string, inputs: PipelinePort[] = [], outputs: PipelinePort[] = []): PipelineNode {
  return { id, type: 'widget', position: { x: 0, y: 0 }, inputPorts: inputs, outputPorts: outputs };
}

function makePort(id: string, direction: 'input' | 'output', schema?: Record<string, unknown>): PipelinePort {
  return { id, name: id, direction, schema };
}

describe('detectCycle', () => {
  it('returns false for a DAG', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
    const edges: PipelineEdge[] = [
      { id: 'e1', sourceNodeId: 'A', sourcePortId: 'p1', targetNodeId: 'B', targetPortId: 'p2' },
      { id: 'e2', sourceNodeId: 'B', sourcePortId: 'p3', targetNodeId: 'C', targetPortId: 'p4' },
    ];
    expect(detectCycle(nodes, edges).hasCycle).toBe(false);
  });

  it('returns true for a cycle A→B→C→A', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
    const edges: PipelineEdge[] = [
      { id: 'e1', sourceNodeId: 'A', sourcePortId: 'p1', targetNodeId: 'B', targetPortId: 'p2' },
      { id: 'e2', sourceNodeId: 'B', sourcePortId: 'p3', targetNodeId: 'C', targetPortId: 'p4' },
      { id: 'e3', sourceNodeId: 'C', sourcePortId: 'p5', targetNodeId: 'A', targetPortId: 'p6' },
    ];
    const result = detectCycle(nodes, edges);
    expect(result.hasCycle).toBe(true);
    expect(result.path).toBeDefined();
  });

  it('returns false for disconnected nodes', () => {
    const nodes = [makeNode('A'), makeNode('B')];
    const result = detectCycle(nodes, []);
    expect(result.hasCycle).toBe(false);
  });
});

describe('arePortsCompatible', () => {
  it('returns true for untyped ports', () => {
    const source = makePort('s', 'output');
    const target = makePort('t', 'input');
    expect(arePortsCompatible(source, target)).toBe(true);
  });

  it('returns true for compatible schemas', () => {
    const source = makePort('s', 'output', { value: 'number' });
    const target = makePort('t', 'input', { value: 'number', extra: 'string' });
    expect(arePortsCompatible(source, target)).toBe(true);
  });

  it('returns false for incompatible schemas', () => {
    const source = makePort('s', 'output', { value: 'number', missing: 'bool' });
    const target = makePort('t', 'input', { value: 'number' });
    expect(arePortsCompatible(source, target)).toBe(false);
  });

  it('returns false when directions are wrong', () => {
    const source = makePort('s', 'input');
    const target = makePort('t', 'input');
    expect(arePortsCompatible(source, target)).toBe(false);
  });
});

describe('validatePipeline', () => {
  it('valid DAG with correct ports', () => {
    const nodes = [
      makeNode('A', [], [makePort('out', 'output')]),
      makeNode('B', [makePort('in', 'input')], []),
    ];
    const edges: PipelineEdge[] = [
      { id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' },
    ];
    const result = validatePipeline(nodes, edges);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects missing ports', () => {
    const nodes = [makeNode('A', [], []), makeNode('B', [], [])];
    const edges: PipelineEdge[] = [
      { id: 'e1', sourceNodeId: 'A', sourcePortId: 'nonexistent', targetNodeId: 'B', targetPortId: 'also_nonexistent' },
    ];
    const result = validatePipeline(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'missing_port')).toBe(true);
  });

  it('detects duplicate input connections', () => {
    const nodes = [
      makeNode('A', [], [makePort('out1', 'output'), makePort('out2', 'output')]),
      makeNode('B', [makePort('in', 'input')], []),
    ];
    const edges: PipelineEdge[] = [
      { id: 'e1', sourceNodeId: 'A', sourcePortId: 'out1', targetNodeId: 'B', targetPortId: 'in' },
      { id: 'e2', sourceNodeId: 'A', sourcePortId: 'out2', targetNodeId: 'B', targetPortId: 'in' },
    ];
    const result = validatePipeline(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'duplicate_input')).toBe(true);
  });

  it('detects cycles', () => {
    const nodes = [
      makeNode('A', [makePort('in', 'input')], [makePort('out', 'output')]),
      makeNode('B', [makePort('in', 'input')], [makePort('out', 'output')]),
    ];
    const edges: PipelineEdge[] = [
      { id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' },
      { id: 'e2', sourceNodeId: 'B', sourcePortId: 'out', targetNodeId: 'A', targetPortId: 'in' },
    ];
    const result = validatePipeline(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'cycle')).toBe(true);
  });
});
