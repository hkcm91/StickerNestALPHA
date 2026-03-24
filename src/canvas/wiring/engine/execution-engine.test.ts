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

  it('switch node routes to matching condition port', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
    graph.addNode({
      id: 'S',
      type: 'switch',
      position: { x: 0, y: 0 },
      config: { conditions: [{ portId: 'urgent', expression: 'priority' }] },
      inputPorts: [makePort('in', 'input')],
      outputPorts: [makePort('urgent', 'output'), makePort('default', 'output')],
    });
    graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));
    graph.addNode(makeWidgetNode('C', [makePort('in', 'input')], []));
    graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'S', targetPortId: 'in' });
    graph.addEdge({ id: 'e2', sourceNodeId: 'S', sourcePortId: 'urgent', targetNodeId: 'B', targetPortId: 'in' });
    graph.addEdge({ id: 'e3', sourceNodeId: 'S', sourcePortId: 'default', targetNodeId: 'C', targetPortId: 'in' });

    const engine = createExecutionEngine(graph);
    engine.start();

    const handler = vi.fn();
    bus.subscribe('canvas.pipeline.routed', handler);

    // Payload with priority=true → should route to B via 'urgent' port
    bus.emit('widget.test', { priority: true, msg: 'urgent' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.targetNodeId).toBe('B');

    engine.stop();
  });

  it('switch node routes to default when no condition matches', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
    graph.addNode({
      id: 'S',
      type: 'switch',
      position: { x: 0, y: 0 },
      config: { conditions: [{ portId: 'urgent', expression: 'priority' }] },
      inputPorts: [makePort('in', 'input')],
      outputPorts: [makePort('urgent', 'output'), makePort('default', 'output')],
    });
    graph.addNode(makeWidgetNode('C', [makePort('in', 'input')], []));
    graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'S', targetPortId: 'in' });
    graph.addEdge({ id: 'e3', sourceNodeId: 'S', sourcePortId: 'default', targetNodeId: 'C', targetPortId: 'in' });

    const engine = createExecutionEngine(graph);
    engine.start();

    const handler = vi.fn();
    bus.subscribe('canvas.pipeline.routed', handler);

    // Payload without priority → should route to C via 'default' port
    bus.emit('widget.test', { msg: 'normal' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.targetNodeId).toBe('C');

    engine.stop();
  });

  it('accumulate node collects events and emits batch', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
    graph.addNode({
      id: 'ACC',
      type: 'accumulate',
      position: { x: 0, y: 0 },
      config: { count: 3, mode: 'count' },
      inputPorts: [makePort('in', 'input')],
      outputPorts: [makePort('out', 'output')],
    });
    graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));
    graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'ACC', targetPortId: 'in' });
    graph.addEdge({ id: 'e2', sourceNodeId: 'ACC', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });

    const engine = createExecutionEngine(graph);
    engine.start();

    const handler = vi.fn();
    bus.subscribe('canvas.pipeline.routed', handler);

    // Send 2 events — should not flush yet
    bus.emit('widget.data', { value: 1 });
    bus.emit('widget.data', { value: 2 });
    expect(handler).not.toHaveBeenCalled();

    // 3rd event triggers flush
    bus.emit('widget.data', { value: 3 });
    expect(handler).toHaveBeenCalledTimes(1);
    const batch = handler.mock.calls[0][0].payload.payload;
    expect(batch).toHaveLength(3);

    engine.stop();
  });

  it('ai-transform node emits transform request on bus', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
    graph.addNode({
      id: 'AI',
      type: 'ai-transform',
      position: { x: 0, y: 0 },
      config: { prompt: 'Summarize this text' },
      inputPorts: [makePort('in', 'input')],
      outputPorts: [makePort('out', 'output')],
    });
    graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'AI', targetPortId: 'in' });

    const engine = createExecutionEngine(graph);
    engine.start();

    const handler = vi.fn();
    bus.subscribe('canvas.pipeline.ai-transform.requested', handler);

    bus.emit('widget.text', { content: 'long text here' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.nodeId).toBe('AI');
    expect(handler.mock.calls[0][0].payload.prompt).toBe('Summarize this text');

    engine.stop();
  });

  it('ai-transform rate limits at 10 per minute', () => {
    const graph = createPipelineGraph();
    graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
    graph.addNode({
      id: 'AI',
      type: 'ai-transform',
      position: { x: 0, y: 0 },
      config: { prompt: 'transform' },
      inputPorts: [makePort('in', 'input')],
      outputPorts: [makePort('out', 'output')],
    });
    graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'AI', targetPortId: 'in' });

    const engine = createExecutionEngine(graph);
    engine.start();

    const transformHandler = vi.fn();
    const errorHandler = vi.fn();
    bus.subscribe('canvas.pipeline.ai-transform.requested', transformHandler);
    bus.subscribe('canvas.pipeline.error', errorHandler);

    // Send 11 events
    for (let i = 0; i < 11; i++) {
      bus.emit('widget.data', { i });
    }

    expect(transformHandler).toHaveBeenCalledTimes(10);
    expect(errorHandler).toHaveBeenCalledTimes(1);

    engine.stop();
  });
});
