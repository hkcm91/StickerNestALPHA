/**
 * Port Matcher Tests
 *
 * @module kernel/pipeline
 * @layer L0
 */

import { describe, it, expect } from 'vitest';

import {
  matchPorts,
  findCompatiblePorts,
  findAllConnections,
  tokenize,
  type PortLike,
  type NodeWithPorts,
} from './port-matcher';

// ─── Helpers ─────────────────────────────────────────────────────────

function outPort(overrides: Partial<PortLike> = {}): PortLike {
  return {
    id: 'out-1',
    name: 'output',
    direction: 'output',
    ...overrides,
  };
}

function inPort(overrides: Partial<PortLike> = {}): PortLike {
  return {
    id: 'in-1',
    name: 'input',
    direction: 'input',
    ...overrides,
  };
}

// ─── tokenize ────────────────────────────────────────────────────────

describe('tokenize', () => {
  it('splits dot notation', () => {
    expect(tokenize('widget.todo.item.created')).toEqual(['widget', 'todo', 'item', 'created']);
  });

  it('splits camelCase', () => {
    expect(tokenize('itemCreated')).toEqual(['item', 'created']);
  });

  it('splits kebab-case', () => {
    expect(tokenize('item-created')).toEqual(['item', 'created']);
  });

  it('splits snake_case', () => {
    expect(tokenize('item_created')).toEqual(['item', 'created']);
  });

  it('handles mixed delimiters', () => {
    expect(tokenize('widget.itemCreated')).toEqual(['widget', 'item', 'created']);
  });

  it('lowercases all tokens', () => {
    expect(tokenize('CountChanged')).toEqual(['count', 'changed']);
  });
});

// ─── matchPorts ──────────────────────────────────────────────────────

describe('matchPorts', () => {
  it('returns 0 for wrong direction (input→input)', () => {
    const result = matchPorts(
      inPort({ eventType: 'foo' }),
      inPort({ eventType: 'foo' }),
    );
    expect(result.score).toBe(0);
    expect(result.matchType).toBe('none');
  });

  it('returns 0 for wrong direction (output→output)', () => {
    const result = matchPorts(
      outPort({ eventType: 'foo' }),
      outPort({ eventType: 'foo' }),
    );
    expect(result.score).toBe(0);
  });

  // Exact match
  it('scores 1.0 for exact event type match', () => {
    const result = matchPorts(
      outPort({ eventType: 'widget.counter.countChanged' }),
      inPort({ eventType: 'widget.counter.countChanged' }),
    );
    expect(result.score).toBe(1.0);
    expect(result.matchType).toBe('exact');
  });

  // Normalized match
  it('scores 0.9 for normalized match (camelCase vs kebab)', () => {
    const result = matchPorts(
      outPort({ eventType: 'countChanged' }),
      inPort({ eventType: 'count-changed' }),
    );
    expect(result.score).toBe(0.9);
    expect(result.matchType).toBe('normalized');
  });

  it('scores 0.9 for normalized match (with widget. prefix stripped)', () => {
    const result = matchPorts(
      outPort({ eventType: 'widget.item.created' }),
      inPort({ eventType: 'item-created' }),
    );
    expect(result.score).toBe(0.9);
    expect(result.matchType).toBe('normalized');
  });

  it('scores 0.9 for normalized match (snake_case vs camelCase)', () => {
    const result = matchPorts(
      outPort({ eventType: 'item_updated' }),
      inPort({ eventType: 'itemUpdated' }),
    );
    expect(result.score).toBe(0.9);
    expect(result.matchType).toBe('normalized');
  });

  // Synonym match
  it('scores 0.7 for synonym match (changed/updated)', () => {
    const result = matchPorts(
      outPort({ eventType: 'countChanged' }),
      inPort({ eventType: 'countUpdated' }),
    );
    expect(result.score).toBe(0.7);
    expect(result.matchType).toBe('synonym');
  });

  it('scores 0.7 for synonym match (created/added)', () => {
    const result = matchPorts(
      outPort({ eventType: 'itemCreated' }),
      inPort({ eventType: 'itemAdded' }),
    );
    expect(result.score).toBe(0.7);
    expect(result.matchType).toBe('synonym');
  });

  it('scores 0.7 for synonym match (deleted/removed)', () => {
    const result = matchPorts(
      outPort({ eventType: 'item.deleted' }),
      inPort({ eventType: 'item-removed' }),
    );
    expect(result.score).toBe(0.7);
    expect(result.matchType).toBe('synonym');
  });

  // Wildcard match
  it('scores 0.3 for wildcard target', () => {
    const result = matchPorts(
      outPort({ eventType: 'anything.here' }),
      inPort({ eventType: '*' }),
    );
    expect(result.score).toBe(0.3);
    expect(result.matchType).toBe('wildcard');
  });

  // Schema structural match
  it('scores 0.5 for schema key overlap', () => {
    const result = matchPorts(
      outPort({ eventType: 'foo', schema: { count: 'number', label: 'string' } }),
      inPort({ eventType: 'bar', schema: { count: 'number', title: 'string' } }),
    );
    expect(result.score).toBe(0.5);
    expect(result.matchType).toBe('schema');
    expect(result.suggestedMapping).toBeDefined();
    expect(result.suggestedMapping!['count']).toBe('count');
  });

  it('suggests mapping for synonym schema keys', () => {
    const result = matchPorts(
      outPort({ eventType: 'x', schema: { value: 'number' } }),
      inPort({ eventType: 'y', schema: { data: 'number' } }),
    );
    expect(result.score).toBe(0.5);
    expect(result.matchType).toBe('schema');
    expect(result.suggestedMapping!['value']).toBe('data');
  });

  it('returns 0 for no schema overlap', () => {
    const result = matchPorts(
      outPort({ eventType: 'x', schema: { alpha: 'string' } }),
      inPort({ eventType: 'y', schema: { beta: 'number' } }),
    );
    expect(result.score).toBe(0);
  });

  // No match
  it('returns 0 for completely unrelated ports', () => {
    const result = matchPorts(
      outPort({ eventType: 'widget.chart.render' }),
      inPort({ eventType: 'widget.auth.login' }),
    );
    expect(result.score).toBe(0);
    expect(result.matchType).toBe('none');
  });

  // Falls back to name when eventType is missing
  it('uses port name when eventType is absent', () => {
    const result = matchPorts(
      outPort({ name: 'countChanged' }),
      inPort({ name: 'countChanged' }),
    );
    expect(result.score).toBe(1.0);
    expect(result.matchType).toBe('exact');
  });
});

// ─── findCompatiblePorts ─────────────────────────────────────────────

describe('findCompatiblePorts', () => {
  it('returns ranked matches sorted by score', () => {
    const source = outPort({ eventType: 'countChanged' });
    const candidates = [
      inPort({ id: 'exact', eventType: 'countChanged' }),
      inPort({ id: 'synonym', eventType: 'countUpdated' }),
      inPort({ id: 'wild', eventType: '*' }),
      inPort({ id: 'none', eventType: 'unrelated.event' }),
    ];

    const results = findCompatiblePorts(source, candidates);
    expect(results).toHaveLength(3); // exact, synonym, wildcard — not unrelated
    expect(results[0].port.id).toBe('exact');
    expect(results[0].result.score).toBe(1.0);
    expect(results[1].port.id).toBe('synonym');
    expect(results[1].result.score).toBe(0.7);
    expect(results[2].port.id).toBe('wild');
    expect(results[2].result.score).toBe(0.3);
  });

  it('returns empty array when no matches', () => {
    const source = outPort({ eventType: 'unique.event' });
    const candidates = [
      inPort({ id: 'a', eventType: 'other.thing' }),
    ];

    const results = findCompatiblePorts(source, candidates);
    expect(results).toHaveLength(0);
  });
});

// ─── findAllConnections ──────────────────────────────────────────────

describe('findAllConnections', () => {
  it('finds connections between nodes', () => {
    const nodes: NodeWithPorts[] = [
      {
        id: 'counter',
        label: 'Counter',
        inputPorts: [inPort({ id: 'sub-0', eventType: 'increment' })],
        outputPorts: [outPort({ id: 'emit-0', eventType: 'countChanged' })],
      },
      {
        id: 'display',
        label: 'Display',
        inputPorts: [inPort({ id: 'sub-0', eventType: 'countUpdated' })],
        outputPorts: [],
      },
    ];

    const connections = findAllConnections(nodes);
    expect(connections.length).toBeGreaterThanOrEqual(1);
    expect(connections[0].sourceNodeId).toBe('counter');
    expect(connections[0].targetNodeId).toBe('display');
    expect(connections[0].matchType).toBe('synonym');
  });

  it('does not suggest self-connections', () => {
    const nodes: NodeWithPorts[] = [
      {
        id: 'widget-1',
        label: 'Widget',
        inputPorts: [inPort({ id: 'in', eventType: 'data' })],
        outputPorts: [outPort({ id: 'out', eventType: 'data' })],
      },
    ];

    const connections = findAllConnections(nodes);
    expect(connections).toHaveLength(0);
  });

  it('respects minScore threshold', () => {
    const nodes: NodeWithPorts[] = [
      {
        id: 'a',
        label: 'A',
        inputPorts: [],
        outputPorts: [outPort({ id: 'out', eventType: 'foo' })],
      },
      {
        id: 'b',
        label: 'B',
        inputPorts: [inPort({ id: 'in', eventType: '*' })],
        outputPorts: [],
      },
    ];

    // Wildcard scores 0.3 — threshold at 0.5 should exclude it
    const connections = findAllConnections(nodes, 0.5);
    expect(connections).toHaveLength(0);

    // Default threshold (0.3) should include it
    const withDefault = findAllConnections(nodes);
    expect(withDefault).toHaveLength(1);
  });

  it('performs well with 50 nodes (< 50ms)', () => {
    const nodes: NodeWithPorts[] = Array.from({ length: 50 }, (_, i) => ({
      id: `node-${i}`,
      label: `Node ${i}`,
      inputPorts: [
        inPort({ id: `in-${i}`, eventType: `event.type.${i % 5}` }),
      ],
      outputPorts: [
        outPort({ id: `out-${i}`, eventType: `event.type.${i % 5}` }),
      ],
    }));

    const start = performance.now();
    findAllConnections(nodes);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });
});
