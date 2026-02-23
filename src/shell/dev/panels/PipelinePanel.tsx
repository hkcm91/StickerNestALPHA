/**
 * PipelinePanel — Pipeline testing panel
 * Extracted from TestHarness.tsx
 *
 * @module shell/dev
 * @layer L6
 */

import React from 'react';

import type { PipelineNode, PipelineEdge } from '@sn/types';

export interface PipelinePanelProps {
  pipelineNodes: PipelineNode[];
  pipelineEdges: PipelineEdge[];
  addPipelineNode: (type: string) => void;
  connectNodes: (sourceId: string, targetId: string) => void;
  clearPipeline: () => void;
}

export const PipelinePanel: React.FC<PipelinePanelProps> = ({
  pipelineNodes, pipelineEdges, addPipelineNode, connectNodes, clearPipeline,
}) => {
  return (
    <section style={{ flex: '1 1 400px', border: '1px solid var(--sn-border, #374151)', padding: 10 }}>
      <h2>Pipeline</h2>

      <div style={{ marginBottom: 10 }}>
        <button onClick={() => addPipelineNode('widget')} style={{ marginRight: 5 }}>+ Widget Node</button>
        <button onClick={() => addPipelineNode('filter')} style={{ marginRight: 5 }}>+ Filter Node</button>
        <button onClick={() => addPipelineNode('transform')} style={{ marginRight: 5 }}>+ Transform</button>
        <button onClick={clearPipeline}>Clear</button>
      </div>

      {pipelineNodes.length >= 2 && (
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => connectNodes(pipelineNodes[0].id, pipelineNodes[1].id)}>
            Connect First Two Nodes
          </button>
        </div>
      )}

      <div style={{ fontSize: 10 }}>
        <strong>Nodes ({pipelineNodes.length}):</strong>
        {pipelineNodes.map((n) => (
          <div key={n.id} style={{ padding: '2px 0' }}>
            {n.id} ({n.type}) @ ({n.position.x.toFixed(0)},{n.position.y.toFixed(0)})
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, marginTop: 10 }}>
        <strong>Edges ({pipelineEdges.length}):</strong>
        {pipelineEdges.map((e) => (
          <div key={e.id} style={{ padding: '2px 0' }}>
            {e.sourceNodeId} → {e.targetNodeId}
          </div>
        ))}
      </div>
    </section>
  );
};
