import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { PipelinePort, PipelineNode } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { createPipelineGraph } from '../graph';

import { createExecutionEngine } from './execution-engine';

function makePort(id: string, direction: 'input' | 'output'): PipelinePort {
  return { id, name: id, direction };
}

function makeWidgetNode(id: string, inputs: PipelinePort[] = [], outputs: PipelinePort[] = []): PipelineNode {
  return { id, type: 'widget', position: { x: 0, y: 0 }, inputPorts: inputs, outputPorts: outputs };
}

describe('ExecutionEngine', () => {
  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => bus.unsubscribeAll());

  it('routes events through pipeline edge', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
    graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));
    graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });

    const engine = createExecutionEngine(graph);
    engine.start();

    const handler = vi.fn();
    bus.subscribe('canvas.pipeline.routed', handler);

    bus.emit('widget.output', { data: 'hello' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.targetNodeId).toBe('B');

    engine.stop();
  });

  it('stops routing after stop()', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
    graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));
    graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });

    const engine = createExecutionEngine(graph);
    engine.start();
    engine.stop();

    const handler = vi.fn();
    bus.subscribe('canvas.pipeline.routed', handler);
    bus.emit('widget.output', { data: 'hello' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('tap node passes through unchanged', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
    graph.addNode({ id: 'T', type: 'tap', position: { x: 0, y: 0 }, inputPorts: [makePort('in', 'input')], outputPorts: [makePort('out', 'output')] });
    graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));
    graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'T', targetPortId: 'in' });
    graph.addEdge({ id: 'e2', sourceNodeId: 'T', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });

    const engine = createExecutionEngine(graph);
    engine.start();

    const handler = vi.fn();
    bus.subscribe('canvas.pipeline.routed', handler);
    bus.emit('widget.output', { data: 'passthrough' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.targetNodeId).toBe('B');

    engine.stop();
  });

  it('isRunning reflects state', () => {
    const graph = createPipelineGraph();
    const engine = createExecutionEngine(graph);
    expect(engine.isRunning).toBe(false);
    engine.start();
    expect(engine.isRunning).toBe(true);
    engine.stop();
    expect(engine.isRunning).toBe(false);
  });

  it('routes through ai-generate async node', async () => {
    const graph = createPipelineGraph();
    graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
    graph.addNode({
      id: 'AI', type: 'ai-generate' as PipelineNode['type'], position: { x: 0, y: 0 },
      inputPorts: [makePort('in', 'input')],
      outputPorts: [makePort('out', 'output')],
    });
    graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));
    graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'AI', targetPortId: 'in' });
    graph.addEdge({ id: 'e2', sourceNodeId: 'AI', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });

    const engine = createExecutionEngine(graph);
    engine.start();

    // Mock the AI request handler
    bus.subscribe('pipeline.ai.request', (event: unknown) => {
      const ev = event as { payload: { requestId: string } };
      bus.emit(`pipeline.ai.response.${ev.payload.requestId}`, { text: 'AI generated text' });
    });

    const handler = vi.fn();
    bus.subscribe('canvas.pipeline.routed', handler);

    bus.emit('widget.output', { prompt: 'test' });

    // Wait for async node to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.targetNodeId).toBe('B');
    expect(handler.mock.calls[0][0].payload.payload).toBe('AI generated text');

    engine.stop();
  });
});
