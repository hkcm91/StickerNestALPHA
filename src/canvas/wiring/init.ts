/**
 * Canvas Wiring — initialization
 *
 * @module canvas/wiring
 * @layer L4A-3
 */

import { createAnimationTriggers } from './animation-triggers';
import type { AnimationTriggersContext } from './animation-triggers';
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
  animationTriggers: AnimationTriggersContext | null;
}

let context: CanvasWiringContext | null = null;

export function initCanvasWiring(): CanvasWiringContext {
  if (context) return context;

  const graph = createPipelineGraph();
  const engine = createExecutionEngine(graph);
  const persistence = createPipelinePersistence();

  engine.start();

  // Animation triggers are initialized lazily when an orchestrator is available.
  // The orchestrator is created by the world system and injected via
  // initAnimationTriggers() after world setup.
  context = { graph, engine, persistence, animationTriggers: null };
  return context;
}

export function initAnimationTriggers(
  orchestrator: Parameters<typeof createAnimationTriggers>[0],
): AnimationTriggersContext | null {
  if (!context) return null;
  if (context.animationTriggers) return context.animationTriggers;
  context.animationTriggers = createAnimationTriggers(orchestrator);
  return context.animationTriggers;
}

export function teardownCanvasWiring(): void {
  if (context) {
    context.engine.stop();
    context.animationTriggers?.destroy();
  }
  context = null;
}

export function isCanvasWiringInitialized(): boolean {
  return context !== null;
}
