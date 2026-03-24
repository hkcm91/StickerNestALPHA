import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { PipelineNode, PipelinePort } from '@sn/types';

import { bus } from '../../../kernel/bus';

import { isAsyncNode, executeAsyncNode, cancelAsyncNode, cancelAllAsyncNodes } from './async-nodes';

function makePort(id: string, direction: 'input' | 'output'): PipelinePort {
  return { id, name: id, direction };
}

function makeAsyncNode(type: string, config?: Record<string, unknown>): PipelineNode {
  return {
    id: `node-${type}`,
    type: type as PipelineNode['type'],
    position: { x: 0, y: 0 },
    inputPorts: [makePort('in', 'input')],
    outputPorts: [makePort('out', 'output')],
    config,
  };
}

describe('isAsyncNode', () => {
  it('returns true for async node types', () => {
    expect(isAsyncNode('ai-generate')).toBe(true);
    expect(isAsyncNode('ai-action')).toBe(true);
    expect(isAsyncNode('http-request')).toBe(true);
  });

  it('returns false for sync node types', () => {
    expect(isAsyncNode('widget')).toBe(false);
    expect(isAsyncNode('filter')).toBe(false);
    expect(isAsyncNode('map')).toBe(false);
    expect(isAsyncNode('tap')).toBe(false);
  });
});

describe('executeAsyncNode', () => {
  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => {
    bus.unsubscribeAll();
    cancelAllAsyncNodes();
  });

  it('emits pending event when starting async node', async () => {
    const handler = vi.fn();
    bus.subscribe('canvas.pipeline.node.pending', handler);

    const node = makeAsyncNode('ai-generate');
    const forward = vi.fn();

    // Subscribe to fulfill the AI request
    bus.subscribe('pipeline.ai.request', (event: unknown) => {
      const ev = event as { payload: { requestId: string } };
      bus.emit(`pipeline.ai.response.${ev.payload.requestId}`, { text: 'generated text' });
    });

    await executeAsyncNode(node, 'test prompt', forward);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toMatchObject({
      nodeId: 'node-ai-generate',
      type: 'ai-generate',
    });
  });

  it('emits completed event and forwards result on success', async () => {
    const completedHandler = vi.fn();
    bus.subscribe('canvas.pipeline.node.completed', completedHandler);

    const node = makeAsyncNode('ai-generate');
    const forward = vi.fn();

    bus.subscribe('pipeline.ai.request', (event: unknown) => {
      const ev = event as { payload: { requestId: string } };
      bus.emit(`pipeline.ai.response.${ev.payload.requestId}`, { text: 'AI result' });
    });

    await executeAsyncNode(node, 'test prompt', forward);

    expect(completedHandler).toHaveBeenCalledTimes(1);
    expect(forward).toHaveBeenCalledWith('node-ai-generate', 'AI result');
  });

  it('emits failed event on error', async () => {
    const failedHandler = vi.fn();
    bus.subscribe('canvas.pipeline.node.failed', failedHandler);

    const node = makeAsyncNode('ai-generate');
    const forward = vi.fn();

    bus.subscribe('pipeline.ai.request', (event: unknown) => {
      const ev = event as { payload: { requestId: string } };
      bus.emit(`pipeline.ai.response.${ev.payload.requestId}`, { error: 'AI error' });
    });

    await executeAsyncNode(node, 'test prompt', forward);

    expect(failedHandler).toHaveBeenCalledTimes(1);
    expect(failedHandler.mock.calls[0][0].payload.error).toBe('AI error');
    expect(forward).not.toHaveBeenCalled();
  });

  it('emits failed event on timeout', async () => {
    vi.useFakeTimers();
    const failedHandler = vi.fn();
    bus.subscribe('canvas.pipeline.node.failed', failedHandler);

    const node = makeAsyncNode('ai-generate', { timeoutMs: 100 });
    const forward = vi.fn();

    // Don't fulfill the request — let it timeout
    const promise = executeAsyncNode(node, 'test prompt', forward);

    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect(failedHandler).toHaveBeenCalledTimes(1);
    expect(failedHandler.mock.calls[0][0].payload.error).toContain('Cancelled');
    expect(forward).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('http-request node fails gracefully with missing url', async () => {
    const forward = vi.fn();

    // http-request with no url config should emit a result (not throw) — it returns error object
    // Since the url is empty, it returns { error: '...' } via forward
    const node = makeAsyncNode('http-request', {});
    bus.subscribe('canvas.pipeline.node.completed', () => {});

    await executeAsyncNode(node, 'payload', forward);

    // Should forward with error result since no URL
    expect(forward).toHaveBeenCalledWith('node-http-request', expect.objectContaining({ error: expect.stringContaining('url') }));
  });
});

describe('cancelAsyncNode', () => {
  it('does not throw when cancelling non-existent node', () => {
    expect(() => cancelAsyncNode('non-existent')).not.toThrow();
  });
});
