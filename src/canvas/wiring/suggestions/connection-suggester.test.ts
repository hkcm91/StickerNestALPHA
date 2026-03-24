/**
 * Connection Suggester Tests
 *
 * @module canvas/wiring/suggestions
 * @layer L4A-3
 */

import { describe, it, expect } from 'vitest';

import type { PipelineNode, PipelineEdge, PipelinePort } from '@sn/types';

import { computeSuggestions } from './connection-suggester';

// ─── Helpers ─────────────────────────────────────────────────────────

function makePort(id: string, name: string, direction: 'input' | 'output', schema?: Record<string, unknown>): PipelinePort {
  return { id, name, direction, schema };
}

function makeWidget(id: string, inputs: PipelinePort[] = [], outputs: PipelinePort[] = []): PipelineNode {
  return {
    id,
    type: 'widget',
    position: { x: 0, y: 0 },
    inputPorts: inputs,
    outputPorts: outputs,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('computeSuggestions', () => {
  it('suggests exact match connections', () => {
    const newNode = makeWidget('counter', [], [
      makePort('emit-0', 'countChanged', 'output'),
    ]);
    const existing = [
      makeWidget('display', [
        makePort('sub-0', 'countChanged', 'input'),
      ]),
    ];

    const suggestions = computeSuggestions(newNode, existing, []);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].score).toBe(1.0);
    expect(suggestions[0].matchType).toBe('exact');
    expect(suggestions[0].needsBridge).toBe(false);
    expect(suggestions[0].sourceNodeId).toBe('counter');
    expect(suggestions[0].targetNodeId).toBe('display');
  });

  it('suggests synonym match connections', () => {
    const newNode = makeWidget('counter', [], [
      makePort('emit-0', 'countChanged', 'output'),
    ]);
    const existing = [
      makeWidget('display', [
        makePort('sub-0', 'countUpdated', 'input'),
      ]),
    ];

    const suggestions = computeSuggestions(newNode, existing, []);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].matchType).toBe('synonym');
    expect(suggestions[0].needsBridge).toBe(true); // score 0.7 < 0.9
  });

  it('suggests bidirectional connections', () => {
    const newNode = makeWidget('editor', [
      makePort('sub-0', 'dataChanged', 'input'),
    ], [
      makePort('emit-0', 'saveRequested', 'output'),
    ]);
    const existing = [
      makeWidget('database', [
        makePort('sub-0', 'saveRequested', 'input'),
      ], [
        makePort('emit-0', 'dataChanged', 'output'),
      ]),
    ];

    const suggestions = computeSuggestions(newNode, existing, []);
    expect(suggestions).toHaveLength(2);
    // Both should be exact matches
    expect(suggestions.every((s) => s.score === 1.0)).toBe(true);
  });

  it('excludes already-connected input ports', () => {
    const newNode = makeWidget('counter', [], [
      makePort('emit-0', 'countChanged', 'output'),
    ]);
    const existing = [
      makeWidget('display', [
        makePort('sub-0', 'countChanged', 'input'),
      ]),
    ];
    // Display's input port is already connected
    const edges: PipelineEdge[] = [{
      id: 'e1',
      sourceNodeId: 'other',
      sourcePortId: 'out',
      targetNodeId: 'display',
      targetPortId: 'sub-0',
    }];

    const suggestions = computeSuggestions(newNode, existing, edges);
    expect(suggestions).toHaveLength(0);
  });

  it('does not suggest self-connections', () => {
    const newNode = makeWidget('widget-1', [
      makePort('sub-0', 'data', 'input'),
    ], [
      makePort('emit-0', 'data', 'output'),
    ]);

    const suggestions = computeSuggestions(newNode, [newNode], []);
    expect(suggestions).toHaveLength(0);
  });

  it('respects minScore threshold', () => {
    const newNode = makeWidget('a', [], [
      makePort('emit-0', 'something', 'output'),
    ]);
    const existing = [
      makeWidget('b', [
        makePort('sub-0', '*', 'input'),
      ]),
    ];

    // Wildcard scores 0.3 — threshold at 0.5 excludes it
    expect(computeSuggestions(newNode, existing, [], 0.5)).toHaveLength(0);
    // Default threshold (0.3) includes it
    expect(computeSuggestions(newNode, existing, [])).toHaveLength(1);
  });

  it('sorts suggestions by score descending', () => {
    const newNode = makeWidget('source', [], [
      makePort('emit-0', 'countChanged', 'output'),
    ]);
    const existing = [
      makeWidget('exact', [makePort('sub-0', 'countChanged', 'input')]),
      makeWidget('synonym', [makePort('sub-0', 'countUpdated', 'input')]),
      makeWidget('wild', [makePort('sub-0', '*', 'input')]),
    ];

    const suggestions = computeSuggestions(newNode, existing, []);
    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i].score).toBeLessThanOrEqual(suggestions[i - 1].score);
    }
  });

  it('performs well with 100 nodes (< 50ms)', () => {
    const newNode = makeWidget('new', [
      makePort('sub-0', 'dataChanged', 'input'),
    ], [
      makePort('emit-0', 'dataChanged', 'output'),
    ]);

    const existing = Array.from({ length: 100 }, (_, i) =>
      makeWidget(`node-${i}`, [
        makePort(`sub-${i}`, `event-${i % 10}`, 'input'),
      ], [
        makePort(`emit-${i}`, `event-${i % 10}`, 'output'),
      ]),
    );

    const start = performance.now();
    computeSuggestions(newNode, existing, []);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});
