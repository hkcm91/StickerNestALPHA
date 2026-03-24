/**
 * Pipeline Execution Engine — routes events through the pipeline graph
 *
 * @module canvas/wiring/engine
 * @layer L4A-3
 */

import type { BusEvent } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { PipelineGraph } from '../graph';

export interface ExecutionEngine {
  start(): void;
  stop(): void;
  readonly isRunning: boolean;
}

export function createExecutionEngine(graph: PipelineGraph): ExecutionEngine {
  let unsubscribe: (() => void) | null = null;
  let running = false;

  function routeEvent(event: BusEvent) {
    // Ignore events emitted by the engine itself to prevent infinite loops
    if (event.type === 'canvas.pipeline.routed') return;

    const nodes = graph.getAllNodes();
    const edges = graph.getAllEdges();

    // Find widget nodes that match the emitting widget
    for (const node of nodes) {
      if (node.type !== 'widget') continue;

      // Check output ports for edges
      for (const port of node.outputPorts) {
        const outEdges = edges.filter(
          (e) => e.sourceNodeId === node.id && e.sourcePortId === port.id,
        );

        for (const edge of outEdges) {
          const targetNode = graph.getNode(edge.targetNodeId);
          if (!targetNode) continue;

          processNode(targetNode, edge.targetPortId, event.payload);
        }
      }
    }
  }

  function processNode(node: ReturnType<PipelineGraph['getNode']>, portId: string, payload: unknown): void {
    if (!node) return;

    const edges = graph.getAllEdges();

    switch (node.type) {
      case 'widget':
        bus.emit('canvas.pipeline.routed', {
          targetNodeId: node.id,
          targetPortId: portId,
          payload,
        });
        break;

      case 'tap':
        // Passthrough — forward unchanged
        forwardFromNode(node.id, payload, edges);
        break;

      case 'filter': {
        const condition = node.config?.condition as string | undefined;
        if (condition && payload && typeof payload === 'object') {
          const val = (payload as Record<string, unknown>)[condition];
          if (val) forwardFromNode(node.id, payload, edges);
        } else {
          forwardFromNode(node.id, payload, edges);
        }
        break;
      }

      case 'map': {
        const mapping = node.config?.mapping as Record<string, string> | undefined;
        if (mapping && payload && typeof payload === 'object') {
          const mapped: Record<string, unknown> = {};
          for (const [from, to] of Object.entries(mapping)) {
            mapped[to] = (payload as Record<string, unknown>)[from];
          }
          forwardFromNode(node.id, mapped, edges);
        } else {
          forwardFromNode(node.id, payload, edges);
        }
        break;
      }

      case 'delay': {
        const delayMs = (node.config?.delayMs as number) ?? 100;
        setTimeout(() => forwardFromNode(node.id, payload, edges), delayMs);
        break;
      }

      case 'merge':
        forwardFromNode(node.id, payload, edges);
        break;

      case 'throttle': {
        const intervalMs = (node.config?.intervalMs as number) ?? 100;
        const now = Date.now();
        const nodeId = node.id;
        if (!throttleTimestamps.has(nodeId) || now - throttleTimestamps.get(nodeId)! >= intervalMs) {
          throttleTimestamps.set(nodeId, now);
          forwardFromNode(nodeId, payload, edges);
        }
        break;
      }

      case 'debounce': {
        const debounceMs = (node.config?.delayMs as number) ?? 100;
        const nodeId = node.id;
        if (debounceTimers.has(nodeId)) {
          clearTimeout(debounceTimers.get(nodeId)!);
        }
        debounceTimers.set(
          nodeId,
          setTimeout(() => {
            debounceTimers.delete(nodeId);
            forwardFromNode(nodeId, payload, edges);
          }, debounceMs) as unknown as number,
        );
        break;
      }

      case 'switch': {
        const conditions = node.config?.conditions as Array<{ portId: string; expression: string }> | undefined;
        if (conditions && payload && typeof payload === 'object') {
          let matched = false;
          for (const cond of conditions) {
            const val = (payload as Record<string, unknown>)[cond.expression];
            if (val) {
              // Forward to the specific output port for this condition
              const condEdges = edges.filter(
                (e) => e.sourceNodeId === node.id && e.sourcePortId === cond.portId,
              );
              for (const edge of condEdges) {
                const targetNode = graph.getNode(edge.targetNodeId);
                if (targetNode) processNode(targetNode, edge.targetPortId, payload);
              }
              matched = true;
              break;
            }
          }
          // Fallthrough: forward to 'default' output port if no condition matched
          if (!matched) {
            const defaultEdges = edges.filter(
              (e) => e.sourceNodeId === node.id && e.sourcePortId === 'default',
            );
            for (const edge of defaultEdges) {
              const targetNode = graph.getNode(edge.targetNodeId);
              if (targetNode) processNode(targetNode, edge.targetPortId, payload);
            }
          }
        } else {
          forwardFromNode(node.id, payload, edges);
        }
        break;
      }

      case 'accumulate': {
        const nodeId = node.id;
        const count = (node.config?.count as number) ?? 0;
        const windowMs = (node.config?.windowMs as number) ?? 0;
        const mode = (node.config?.mode as string) ?? 'count';

        if (!accumulateBuffers.has(nodeId)) {
          accumulateBuffers.set(nodeId, []);
        }
        const buffer = accumulateBuffers.get(nodeId)!;
        buffer.push(payload);

        const shouldFlush =
          (mode === 'count' && count > 0 && buffer.length >= count) ||
          (mode === 'both' && count > 0 && buffer.length >= count);

        if (shouldFlush) {
          const batch = buffer.splice(0);
          forwardFromNode(nodeId, batch, edges);
          // Clear any pending timer
          if (accumulateTimers.has(nodeId)) {
            clearTimeout(accumulateTimers.get(nodeId)!);
            accumulateTimers.delete(nodeId);
          }
        } else if ((mode === 'time' || mode === 'both') && windowMs > 0 && !accumulateTimers.has(nodeId)) {
          accumulateTimers.set(
            nodeId,
            setTimeout(() => {
              accumulateTimers.delete(nodeId);
              const buf = accumulateBuffers.get(nodeId);
              if (buf && buf.length > 0) {
                const batch = buf.splice(0);
                forwardFromNode(nodeId, batch, edges);
              }
            }, windowMs) as unknown as number,
          );
        }
        break;
      }

      case 'ai-transform': {
        const prompt = node.config?.prompt as string | undefined;
        const nodeId = node.id;
        if (!prompt) {
          forwardFromNode(nodeId, payload, edges);
          break;
        }

        // Rate limiting: max 10 calls/minute per node
        const now = Date.now();
        if (!aiTransformCallLog.has(nodeId)) {
          aiTransformCallLog.set(nodeId, []);
        }
        const callLog = aiTransformCallLog.get(nodeId)!;
        // Prune entries older than 60s
        const cutoff = now - 60_000;
        while (callLog.length > 0 && callLog[0] < cutoff) callLog.shift();

        if (callLog.length >= 10) {
          // Rate limited — emit error and drop
          bus.emit('canvas.pipeline.error', {
            nodeId,
            error: 'ai-transform rate limit exceeded (10/min)',
          });
          break;
        }
        callLog.push(now);

        // Async: emit to a handler that will process and forward
        bus.emit('canvas.pipeline.ai-transform.requested', {
          nodeId,
          prompt,
          payload,
        });
        break;
      }
    }
  }

  const throttleTimestamps = new Map<string, number>();
  const debounceTimers = new Map<string, number>();
  const accumulateBuffers = new Map<string, unknown[]>();
  const accumulateTimers = new Map<string, number>();
  const aiTransformCallLog = new Map<string, number[]>();

  function forwardFromNode(nodeId: string, payload: unknown, edges: ReturnType<PipelineGraph['getAllEdges']>): void {
    const node = graph.getNode(nodeId);
    if (!node) return;

    for (const port of node.outputPorts) {
      const outEdges = edges.filter(
        (e) => e.sourceNodeId === nodeId && e.sourcePortId === port.id,
      );
      for (const edge of outEdges) {
        const targetNode = graph.getNode(edge.targetNodeId);
        if (targetNode) {
          processNode(targetNode, edge.targetPortId, payload);
        }
      }
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      unsubscribe = bus.subscribe('widget.*', routeEvent);
    },

    stop() {
      if (!running) return;
      running = false;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      throttleTimestamps.clear();
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }
      debounceTimers.clear();
      accumulateBuffers.clear();
      for (const timer of accumulateTimers.values()) {
        clearTimeout(timer);
      }
      accumulateTimers.clear();
      aiTransformCallLog.clear();
    },

    get isRunning() {
      return running;
    },
  };
}
