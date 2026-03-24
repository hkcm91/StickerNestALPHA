import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { PipelinePort, PipelineNode } from '@sn/types';
import { CanvasEvents } from '@sn/types';

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
});

// =============================================================================
// AI Pipeline Node Tests
// =============================================================================

describe('AI Pipeline Nodes', () => {
  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => bus.unsubscribeAll());

  describe('ai-prompt node', () => {
    it('builds prompt from template and payload fields', () => {
      const graph = createPipelineGraph();
      graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
      graph.addNode({
        id: 'P',
        type: 'ai-prompt',
        position: { x: 0, y: 0 },
        config: { promptTemplate: 'Create a {{color}} {{shape}} at position {{x}},{{y}}' },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [makePort('out', 'output')],
      });
      graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));
      graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'P', targetPortId: 'in' });
      graph.addEdge({ id: 'e2', sourceNodeId: 'P', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });

      const engine = createExecutionEngine(graph);
      engine.start();

      const handler = vi.fn();
      bus.subscribe('canvas.pipeline.routed', handler);
      bus.emit('widget.output', { color: 'blue', shape: 'rectangle', x: 100, y: 200 });

      expect(handler).toHaveBeenCalledTimes(1);
      const routedPayload = handler.mock.calls[0][0].payload.payload;
      expect(routedPayload.prompt).toBe('Create a blue rectangle at position 100,200');
      // Original fields are preserved
      expect(routedPayload.color).toBe('blue');

      engine.stop();
    });

    it('uses default {{input}} template when none configured', () => {
      const graph = createPipelineGraph();
      graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
      graph.addNode({
        id: 'P',
        type: 'ai-prompt',
        position: { x: 0, y: 0 },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [makePort('out', 'output')],
      });
      graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));
      graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'P', targetPortId: 'in' });
      graph.addEdge({ id: 'e2', sourceNodeId: 'P', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });

      const engine = createExecutionEngine(graph);
      engine.start();

      const handler = vi.fn();
      bus.subscribe('canvas.pipeline.routed', handler);
      bus.emit('widget.output', { input: 'hello world' });

      const routedPayload = handler.mock.calls[0][0].payload.payload;
      expect(routedPayload.prompt).toBe('hello world');

      engine.stop();
    });
  });

  describe('ai-generate node', () => {
    it('calls onAIGenerate handler and forwards response', async () => {
      const graph = createPipelineGraph();
      graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
      graph.addNode({
        id: 'G',
        type: 'ai-generate',
        position: { x: 0, y: 0 },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [makePort('out', 'output')],
      });
      graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));
      graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'G', targetPortId: 'in' });
      graph.addEdge({ id: 'e2', sourceNodeId: 'G', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });

      const mockHandler = vi.fn().mockResolvedValue('{"actions": []}');

      const engine = createExecutionEngine(graph, { onAIGenerate: mockHandler });
      engine.start();

      const processingHandler = vi.fn();
      const completedHandler = vi.fn();
      const routedHandler = vi.fn();
      bus.subscribe(CanvasEvents.PIPELINE_AI_PROCESSING, processingHandler);
      bus.subscribe(CanvasEvents.PIPELINE_AI_COMPLETED, completedHandler);
      bus.subscribe('canvas.pipeline.routed', routedHandler);

      bus.emit('widget.output', { prompt: 'generate something' });

      // Processing event fires synchronously
      expect(processingHandler).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { nodeId: 'G' } }),
      );

      // Wait for async handler to resolve
      await vi.waitFor(() => expect(completedHandler).toHaveBeenCalledTimes(1));

      expect(mockHandler).toHaveBeenCalledWith('generate something', {});
      expect(completedHandler.mock.calls[0][0].payload.nodeId).toBe('G');
      expect(completedHandler.mock.calls[0][0].payload.response).toBe('{"actions": []}');

      // Routed to downstream widget B
      expect(routedHandler).toHaveBeenCalled();
      const routed = routedHandler.mock.calls[0][0].payload;
      expect(routed.payload.response).toBe('{"actions": []}');

      engine.stop();
    });

    it('emits error when onAIGenerate is not provided', () => {
      const graph = createPipelineGraph();
      graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
      graph.addNode({
        id: 'G',
        type: 'ai-generate',
        position: { x: 0, y: 0 },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [makePort('out', 'output')],
      });
      graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'G', targetPortId: 'in' });

      const engine = createExecutionEngine(graph); // no onAIGenerate
      engine.start();

      const errorHandler = vi.fn();
      bus.subscribe(CanvasEvents.PIPELINE_AI_ERROR, errorHandler);

      bus.emit('widget.output', { prompt: 'test' });

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { nodeId: 'G', error: 'No AI generation handler configured' },
        }),
      );

      engine.stop();
    });

    it('emits error when onAIGenerate rejects', async () => {
      const graph = createPipelineGraph();
      graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
      graph.addNode({
        id: 'G',
        type: 'ai-generate',
        position: { x: 0, y: 0 },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [makePort('out', 'output')],
      });
      graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'G', targetPortId: 'in' });

      const mockHandler = vi.fn().mockRejectedValue(new Error('API rate limit'));
      const engine = createExecutionEngine(graph, { onAIGenerate: mockHandler });
      engine.start();

      const errorHandler = vi.fn();
      bus.subscribe(CanvasEvents.PIPELINE_AI_ERROR, errorHandler);

      bus.emit('widget.output', { prompt: 'test' });

      await vi.waitFor(() => expect(errorHandler).toHaveBeenCalledTimes(1));
      expect(errorHandler.mock.calls[0][0].payload.error).toBe('API rate limit');

      engine.stop();
    });

    it('does not forward when engine stopped during async generation', async () => {
      const graph = createPipelineGraph();
      graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
      graph.addNode({
        id: 'G',
        type: 'ai-generate',
        position: { x: 0, y: 0 },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [makePort('out', 'output')],
      });
      graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));
      graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'G', targetPortId: 'in' });
      graph.addEdge({ id: 'e2', sourceNodeId: 'G', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });

      let resolveGeneration: (value: string) => void;
      const genPromise = new Promise<string>((resolve) => { resolveGeneration = resolve; });
      const mockHandler = vi.fn().mockReturnValue(genPromise);

      const engine = createExecutionEngine(graph, { onAIGenerate: mockHandler });
      engine.start();

      const routedHandler = vi.fn();
      bus.subscribe('canvas.pipeline.routed', routedHandler);

      bus.emit('widget.output', { prompt: 'test' });

      // Stop engine before generation completes
      engine.stop();
      resolveGeneration!('result');

      // Give the microtask queue time to flush
      await new Promise((r) => setTimeout(r, 10));

      // Should not have forwarded because engine was stopped
      expect(routedHandler).not.toHaveBeenCalled();
    });
  });

  describe('ai-create-entity node', () => {
    it('executes actions from parsed AI response', () => {
      const graph = createPipelineGraph();
      graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
      graph.addNode({
        id: 'C',
        type: 'ai-create-entity',
        position: { x: 0, y: 0 },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [makePort('out', 'output')],
      });
      graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));
      graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'C', targetPortId: 'in' });
      graph.addEdge({ id: 'e2', sourceNodeId: 'C', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });

      const engine = createExecutionEngine(graph);
      engine.start();

      const entityHandler = vi.fn();
      const routedHandler = vi.fn();
      bus.subscribe(CanvasEvents.ENTITY_CREATED, entityHandler);
      bus.subscribe('canvas.pipeline.routed', routedHandler);

      const response = JSON.stringify({
        actions: [
          { action: 'create_text', content: 'Hello', position: { x: 0, y: 0 } },
        ],
      });

      bus.emit('widget.output', { response });

      expect(entityHandler).toHaveBeenCalledTimes(1);
      expect(routedHandler).toHaveBeenCalledTimes(1);
      const result = routedHandler.mock.calls[0][0].payload.payload.executionResult;
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);

      engine.stop();
    });

    it('accepts pre-parsed actions array', () => {
      const graph = createPipelineGraph();
      graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
      graph.addNode({
        id: 'C',
        type: 'ai-create-entity',
        position: { x: 0, y: 0 },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [makePort('out', 'output')],
      });
      graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));
      graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'C', targetPortId: 'in' });
      graph.addEdge({ id: 'e2', sourceNodeId: 'C', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });

      const engine = createExecutionEngine(graph);
      engine.start();

      const entityHandler = vi.fn();
      bus.subscribe(CanvasEvents.ENTITY_CREATED, entityHandler);

      bus.emit('widget.output', {
        actions: [
          { action: 'create_text', content: 'Pre-parsed', position: { x: 50, y: 50 } },
          { action: 'create_text', content: 'Second', position: { x: 50, y: 100 } },
        ],
      });

      expect(entityHandler).toHaveBeenCalledTimes(2);

      engine.stop();
    });

    it('emits error on invalid response JSON', () => {
      const graph = createPipelineGraph();
      graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
      graph.addNode({
        id: 'C',
        type: 'ai-create-entity',
        position: { x: 0, y: 0 },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [],
      });
      graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'C', targetPortId: 'in' });

      const engine = createExecutionEngine(graph);
      engine.start();

      const errorHandler = vi.fn();
      bus.subscribe(CanvasEvents.PIPELINE_AI_ERROR, errorHandler);

      bus.emit('widget.output', { response: 'not valid json at all !!!' });

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            nodeId: 'C',
            error: 'Failed to parse AI response as action JSON',
          }),
        }),
      );

      engine.stop();
    });

    it('handles markdown-fenced JSON response', () => {
      const graph = createPipelineGraph();
      graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
      graph.addNode({
        id: 'C',
        type: 'ai-create-entity',
        position: { x: 0, y: 0 },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [],
      });
      graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'C', targetPortId: 'in' });

      const engine = createExecutionEngine(graph);
      engine.start();

      const entityHandler = vi.fn();
      bus.subscribe(CanvasEvents.ENTITY_CREATED, entityHandler);

      const response = '```json\n{"actions": [{"action": "create_text", "content": "Fenced", "position": {"x": 0, "y": 0}}]}\n```';
      bus.emit('widget.output', { response });

      expect(entityHandler).toHaveBeenCalledTimes(1);

      engine.stop();
    });
  });

  describe('AI pipeline chain (prompt → generate → create-entity)', () => {
    it('routes through full AI pipeline chain', async () => {
      const graph = createPipelineGraph();

      // Widget A → ai-prompt → ai-generate → ai-create-entity → Widget B
      graph.addNode(makeWidgetNode('A', [], [makePort('out', 'output')]));
      graph.addNode({
        id: 'prompt',
        type: 'ai-prompt',
        position: { x: 100, y: 0 },
        config: { promptTemplate: 'Add a {{item}} to the canvas' },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [makePort('out', 'output')],
      });
      graph.addNode({
        id: 'gen',
        type: 'ai-generate',
        position: { x: 200, y: 0 },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [makePort('out', 'output')],
      });
      graph.addNode({
        id: 'create',
        type: 'ai-create-entity',
        position: { x: 300, y: 0 },
        inputPorts: [makePort('in', 'input')],
        outputPorts: [makePort('out', 'output')],
      });
      graph.addNode(makeWidgetNode('B', [makePort('in', 'input')], []));

      graph.addEdge({ id: 'e1', sourceNodeId: 'A', sourcePortId: 'out', targetNodeId: 'prompt', targetPortId: 'in' });
      graph.addEdge({ id: 'e2', sourceNodeId: 'prompt', sourcePortId: 'out', targetNodeId: 'gen', targetPortId: 'in' });
      graph.addEdge({ id: 'e3', sourceNodeId: 'gen', sourcePortId: 'out', targetNodeId: 'create', targetPortId: 'in' });
      graph.addEdge({ id: 'e4', sourceNodeId: 'create', sourcePortId: 'out', targetNodeId: 'B', targetPortId: 'in' });

      const aiResponse = JSON.stringify({
        actions: [{ action: 'create_text', content: 'Clock Widget', position: { x: 300, y: 200 } }],
      });
      const mockHandler = vi.fn().mockResolvedValue(aiResponse);

      const engine = createExecutionEngine(graph, { onAIGenerate: mockHandler });
      engine.start();

      const entityHandler = vi.fn();
      const routedHandler = vi.fn();
      bus.subscribe(CanvasEvents.ENTITY_CREATED, entityHandler);
      bus.subscribe('canvas.pipeline.routed', routedHandler);

      bus.emit('widget.output', { item: 'clock' });

      // Prompt was built correctly
      expect(mockHandler).toHaveBeenCalledWith(
        'Add a clock to the canvas',
        {},
      );

      // Wait for async ai-generate
      await vi.waitFor(() => expect(entityHandler).toHaveBeenCalledTimes(1));

      // Entity was created
      expect(entityHandler.mock.calls[0][0].payload.content).toBe('Clock Widget');

      // Final result forwarded to widget B
      expect(routedHandler).toHaveBeenCalled();
      const lastRouted = routedHandler.mock.calls.find(
        (c) => c[0].payload.targetNodeId === 'B',
      );
      expect(lastRouted).toBeDefined();
      expect(lastRouted![0].payload.payload.executionResult.succeeded).toBe(1);

      engine.stop();
    });
  });
});
