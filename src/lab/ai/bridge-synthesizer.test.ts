/**
 * Bridge Synthesizer Tests
 *
 * @module lab/ai
 * @layer L2
 */

import { describe, it, expect } from 'vitest';

import { parseAIResponse, buildBridgeFromDescriptors } from './bridge-synthesizer';

// ─── parseAIResponse ─────────────────────────────────────────────────

describe('parseAIResponse', () => {
  it('parses valid JSON response', () => {
    const json = JSON.stringify({
      transforms: [{ type: 'map', config: { mapping: { count: 'value' } } }],
      description: 'Maps count to value',
      confidence: 0.9,
    });

    const result = parseAIResponse(json);
    expect(result).not.toBeNull();
    expect(result!.transforms).toHaveLength(1);
    expect(result!.transforms[0].type).toBe('map');
    expect(result!.description).toBe('Maps count to value');
    expect(result!.confidence).toBe(0.9);
  });

  it('parses JSON from markdown code fences', () => {
    const text = '```json\n{"transforms":[{"type":"filter","config":{"condition":"active"}}],"description":"test","confidence":0.8}\n```';
    const result = parseAIResponse(text);
    expect(result).not.toBeNull();
    expect(result!.transforms[0].type).toBe('filter');
  });

  it('parses multi-node transform chain', () => {
    const json = JSON.stringify({
      transforms: [
        { type: 'map', config: { mapping: { count: 'value' } } },
        { type: 'debounce', config: { delayMs: 200 } },
      ],
      description: 'Map then debounce',
      confidence: 0.85,
    });

    const result = parseAIResponse(json);
    expect(result).not.toBeNull();
    expect(result!.transforms).toHaveLength(2);
  });

  it('rejects invalid node types', () => {
    const json = JSON.stringify({
      transforms: [{ type: 'widget', config: {} }],
      description: 'test',
      confidence: 0.5,
    });

    const result = parseAIResponse(json);
    expect(result).toBeNull();
  });

  it('rejects more than 3 transforms', () => {
    const json = JSON.stringify({
      transforms: [
        { type: 'map', config: {} },
        { type: 'filter', config: {} },
        { type: 'debounce', config: {} },
        { type: 'throttle', config: {} },
      ],
      description: 'too many',
      confidence: 0.5,
    });

    const result = parseAIResponse(json);
    expect(result).toBeNull();
  });

  it('rejects empty transforms array', () => {
    const json = JSON.stringify({
      transforms: [],
      description: 'nothing',
      confidence: 0.5,
    });

    const result = parseAIResponse(json);
    expect(result).toBeNull();
  });

  it('rejects invalid JSON', () => {
    expect(parseAIResponse('not json at all')).toBeNull();
  });

  it('clamps confidence to [0, 1]', () => {
    const json = JSON.stringify({
      transforms: [{ type: 'map', config: {} }],
      description: 'test',
      confidence: 5.0,
    });

    const result = parseAIResponse(json);
    expect(result!.confidence).toBe(1.0);
  });

  it('defaults description and confidence when missing', () => {
    const json = JSON.stringify({
      transforms: [{ type: 'tap', config: {} }],
    });

    const result = parseAIResponse(json);
    expect(result).not.toBeNull();
    expect(result!.description).toBe('AI-generated transform bridge');
    expect(result!.confidence).toBe(0.5);
  });
});

// ─── buildBridgeFromDescriptors ──────────────────────────────────────

describe('buildBridgeFromDescriptors', () => {
  it('builds a single-node bridge', () => {
    const bridge = buildBridgeFromDescriptors(
      [{ type: 'map', config: { mapping: { a: 'b' } } }],
      'Maps a to b',
      0.9,
    );

    expect(bridge.nodes).toHaveLength(1);
    expect(bridge.edges).toHaveLength(0); // No internal edges for single node
    expect(bridge.entryPortId).toBe('in');
    expect(bridge.exitPortId).toBe('out');
    expect(bridge.description).toBe('Maps a to b');
    expect(bridge.confidence).toBe(0.9);
  });

  it('builds a multi-node bridge with internal edges', () => {
    const bridge = buildBridgeFromDescriptors(
      [
        { type: 'map', config: { mapping: { count: 'value' } } },
        { type: 'debounce', config: { delayMs: 200 } },
        { type: 'filter', config: { condition: 'value' } },
      ],
      'Map, debounce, filter',
      0.75,
    );

    expect(bridge.nodes).toHaveLength(3);
    expect(bridge.edges).toHaveLength(2); // node0→node1, node1→node2

    // Verify chain connectivity
    expect(bridge.edges[0].sourceNodeId).toBe(bridge.nodes[0].id);
    expect(bridge.edges[0].targetNodeId).toBe(bridge.nodes[1].id);
    expect(bridge.edges[1].sourceNodeId).toBe(bridge.nodes[1].id);
    expect(bridge.edges[1].targetNodeId).toBe(bridge.nodes[2].id);
  });

  it('each node has correct in/out ports', () => {
    const bridge = buildBridgeFromDescriptors(
      [{ type: 'throttle', config: { intervalMs: 100 } }],
      'Throttle',
      1.0,
    );

    const node = bridge.nodes[0];
    expect(node.inputPorts).toHaveLength(1);
    expect(node.inputPorts[0].id).toBe('in');
    expect(node.outputPorts).toHaveLength(1);
    expect(node.outputPorts[0].id).toBe('out');
  });

  it('preserves transform config', () => {
    const bridge = buildBridgeFromDescriptors(
      [{ type: 'map', config: { mapping: { foo: 'bar', baz: 'qux' } } }],
      'test',
      0.5,
    );

    expect(bridge.nodes[0].config).toEqual({ mapping: { foo: 'bar', baz: 'qux' } });
  });
});
