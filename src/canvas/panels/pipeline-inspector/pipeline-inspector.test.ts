import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { PipelineNode, PipelineEdge } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

import { createPipelineInspectorController } from './pipeline-inspector';

const sampleNodes: PipelineNode[] = [
  {
    id: 'n1',
    type: 'widget',
    position: { x: 0, y: 0 },
    inputPorts: [{ id: 'p1', name: 'in', direction: 'input' }],
    outputPorts: [{ id: 'p2', name: 'out', direction: 'output' }],
  },
  {
    id: 'n2',
    type: 'filter',
    position: { x: 200, y: 0 },
    inputPorts: [{ id: 'p3', name: 'in', direction: 'input' }],
    outputPorts: [{ id: 'p4', name: 'out', direction: 'output' }],
  },
];

const sampleEdges: PipelineEdge[] = [
  { id: 'e1', sourceNodeId: 'n1', sourcePortId: 'p2', targetNodeId: 'n2', targetPortId: 'p3' },
];

describe('PipelineInspectorController', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('inspect returns null state for no selection', () => {
    const ctrl = createPipelineInspectorController();
    const state = ctrl.inspect(null, sampleNodes, sampleEdges);
    expect(state.selectedNodeId).toBeNull();
    expect(state.selectedNode).toBeNull();
    expect(state.connectedEdges).toHaveLength(0);
  });

  it('inspect returns node and connected edges', () => {
    const ctrl = createPipelineInspectorController();
    const state = ctrl.inspect('n1', sampleNodes, sampleEdges);
    expect(state.selectedNode?.id).toBe('n1');
    expect(state.connectedEdges).toHaveLength(1);
    expect(state.connectedEdges[0].id).toBe('e1');
  });

  it('removeNode emits PIPELINE_NODE_REMOVED', () => {
    const ctrl = createPipelineInspectorController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PIPELINE_NODE_REMOVED, handler);
    ctrl.removeNode('n1');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ nodeId: 'n1' });
  });

  it('removeEdge emits PIPELINE_EDGE_DELETED', () => {
    const ctrl = createPipelineInspectorController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.PIPELINE_EDGE_DELETED, handler);
    ctrl.removeEdge('e1');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ edgeId: 'e1' });
  });
});
