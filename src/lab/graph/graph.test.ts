import { describe, it, expect } from 'vitest';

import { createLabEditor } from '../editor/editor';

import { compileGraph, detectCycles } from './graph-compiler';
import type { GraphNode, GraphEdge } from './graph-compiler';
import { createGraphSync } from './graph-sync';

describe('detectCycles', () => {
  it('returns empty for acyclic graph', () => {
    const nodes: GraphNode[] = [
      { id: 'a', type: 'emit', config: {} },
      { id: 'b', type: 'subscribe', config: {} },
    ];
    const edges: GraphEdge[] = [
      { id: 'e1', sourceNodeId: 'a', sourcePort: 'out', targetNodeId: 'b', targetPort: 'in' },
    ];
    expect(detectCycles(nodes, edges)).toEqual([]);
  });

  it('detects a simple cycle', () => {
    const nodes: GraphNode[] = [
      { id: 'a', type: 'emit', config: {} },
      { id: 'b', type: 'subscribe', config: {} },
    ];
    const edges: GraphEdge[] = [
      { id: 'e1', sourceNodeId: 'a', sourcePort: 'out', targetNodeId: 'b', targetPort: 'in' },
      { id: 'e2', sourceNodeId: 'b', sourcePort: 'out', targetNodeId: 'a', targetPort: 'in' },
    ];
    const cycle = detectCycles(nodes, edges);
    expect(cycle.length).toBeGreaterThan(0);
  });

  it('returns empty for no edges', () => {
    const nodes: GraphNode[] = [
      { id: 'a', type: 'emit', config: {} },
    ];
    expect(detectCycles(nodes, [])).toEqual([]);
  });
});

describe('compileGraph', () => {
  it('compiles a single emit node', () => {
    const nodes: GraphNode[] = [
      { id: 'a', type: 'emit', config: { eventType: 'click', payload: { x: 1 } } },
    ];
    const result = compileGraph(nodes, []);
    expect(result.errors).toEqual([]);
    expect(result.html).toContain('StickerNest.emit');
    expect(result.html).toContain('StickerNest.register');
    expect(result.html).toContain('StickerNest.ready()');
  });

  it('compiles multiple connected nodes in topological order', () => {
    const nodes: GraphNode[] = [
      { id: 'a', type: 'subscribe', config: { eventType: 'data.in' } },
      { id: 'b', type: 'emit', config: { eventType: 'data.out' } },
    ];
    const edges: GraphEdge[] = [
      { id: 'e1', sourceNodeId: 'a', sourcePort: 'out', targetNodeId: 'b', targetPort: 'in' },
    ];
    const result = compileGraph(nodes, edges);
    expect(result.errors).toEqual([]);
    // a should appear before b in the output
    const aIndex = result.html.indexOf('subscribe');
    const bIndex = result.html.indexOf('StickerNest.emit');
    expect(aIndex).toBeLessThan(bIndex);
  });

  it('rejects graph with cycle', () => {
    const nodes: GraphNode[] = [
      { id: 'a', type: 'emit', config: {} },
      { id: 'b', type: 'subscribe', config: {} },
    ];
    const edges: GraphEdge[] = [
      { id: 'e1', sourceNodeId: 'a', sourcePort: 'out', targetNodeId: 'b', targetPort: 'in' },
      { id: 'e2', sourceNodeId: 'b', sourcePort: 'out', targetNodeId: 'a', targetPort: 'in' },
    ];
    const result = compileGraph(nodes, edges);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('cycle');
    expect(result.html).toBe('');
  });

  it('rejects empty graph', () => {
    const result = compileGraph([], []);
    expect(result.errors).toContain('Graph has no nodes');
  });

  it('compiles setState node', () => {
    const nodes: GraphNode[] = [
      { id: 'a', type: 'setState', config: { key: 'count', value: 0 } },
    ];
    const result = compileGraph(nodes, []);
    expect(result.html).toContain('StickerNest.setState');
    expect(result.html).toContain('"count"');
  });

  it('compiles getState node', () => {
    const nodes: GraphNode[] = [
      { id: 'a', type: 'getState', config: { key: 'count' } },
    ];
    const result = compileGraph(nodes, []);
    expect(result.html).toContain('StickerNest.getState');
  });

  it('compiles integration nodes', () => {
    const nodes: GraphNode[] = [
      { id: 'a', type: 'integration.query', config: { name: 'weather', params: {} } },
    ];
    const result = compileGraph(nodes, []);
    expect(result.html).toContain('StickerNest.integration');
    expect(result.html).toContain('query');
  });
});

describe('createGraphSync', () => {
  it('starts in sync mode', () => {
    const editor = createLabEditor();
    const sync = createGraphSync(editor);
    expect(sync.isInSyncMode()).toBe(true);
  });

  it('syncs graph to editor', () => {
    const editor = createLabEditor();
    const sync = createGraphSync(editor);
    sync.setGraph(
      [{ id: 'a', type: 'emit', config: { eventType: 'test' } }],
      [],
    );
    const success = sync.syncToEditor();
    expect(success).toBe(true);
    expect(editor.getContent()).toContain('StickerNest.emit');
  });

  it('enters text-only mode when editor content diverges', () => {
    const editor = createLabEditor();
    const sync = createGraphSync(editor);
    sync.setGraph(
      [{ id: 'a', type: 'emit', config: { eventType: 'test' } }],
      [],
    );
    sync.syncToEditor();

    // Manually edit the content
    editor.setContent('manual edit that breaks sync');
    const success = sync.syncFromEditor();
    expect(success).toBe(false);
    expect(sync.isInSyncMode()).toBe(false);
  });

  it('prevents syncToEditor in text-only mode', () => {
    const editor = createLabEditor();
    const sync = createGraphSync(editor);
    sync.setTextOnlyMode(true);
    expect(sync.syncToEditor()).toBe(false);
  });

  it('resets sync mode', () => {
    const editor = createLabEditor();
    const sync = createGraphSync(editor);
    sync.setTextOnlyMode(true);
    expect(sync.isInSyncMode()).toBe(false);

    sync.resetSync();
    expect(sync.isInSyncMode()).toBe(true);
  });

  it('returns copies of nodes and edges', () => {
    const editor = createLabEditor();
    const sync = createGraphSync(editor);
    const nodes: GraphNode[] = [{ id: 'a', type: 'emit', config: {} }];
    sync.setGraph(nodes, []);
    expect(sync.getNodes()).toEqual(nodes);
    expect(sync.getNodes()).not.toBe(nodes);
  });

  it('destroy clears state', () => {
    const editor = createLabEditor();
    const sync = createGraphSync(editor);
    sync.setGraph([{ id: 'a', type: 'emit', config: {} }], []);
    sync.destroy();
    expect(sync.getNodes()).toEqual([]);
    expect(sync.getEdges()).toEqual([]);
  });
});
