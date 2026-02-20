/**
 * Canvas Wiring — initialization
 *
 * @module canvas/wiring
 * @layer L4A-3
 */

import { createExecutionEngine } from './engine';
import type { ExecutionEngine } from './engine';
import { createPipelineGraph } from './graph';
import type { PipelineGraph } from './graph';
import { createPipelinePersistence } from './persistence';
import type { PipelinePersistence } from './persistence';

export interface CanvasWiringContext {
  graph: PipelineGraph;
  engine: ExecutionEngine;
  persistence: PipelinePersistence;
}

let context: CanvasWiringContext | null = null;

export function initCanvasWiring(): CanvasWiringContext {
  if (context) return context;

  const graph = createPipelineGraph();
  const engine = createExecutionEngine(graph);
  const persistence = createPipelinePersistence();

  engine.start();

  context = { graph, engine, persistence };
  return context;
}

export function teardownCanvasWiring(): void {
  if (context) {
    context.engine.stop();
  }
  context = null;
}

export function isCanvasWiringInitialized(): boolean {
  return context !== null;
}
