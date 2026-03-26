/**
 * Canvas Wiring — barrel export
 *
 * @module canvas/wiring
 * @layer L4A-3
 */

export { createPipelineGraph } from './graph';
export type { PipelineGraph, PipelineGraphResult } from './graph';

export { validatePipeline, detectCycle, arePortsCompatible } from './validator';
export type { ValidationError, ValidationResult } from './validator';

export { createExecutionEngine } from './engine';
export type { ExecutionEngine } from './engine';

export { createPipelinePersistence } from './persistence';
export type { PipelinePersistence } from './persistence';

export { initCanvasWiring, teardownCanvasWiring, isCanvasWiringInitialized, initAnimationTriggers } from './init';
export type { CanvasWiringContext } from './init';

export { createAnimationTriggers } from './animation-triggers';
export type { AnimationTriggersContext } from './animation-triggers';

export { derivePipelineChannelName, initCrossCanvasEdgeHandler } from './cross-canvas-edge';
export type { CrossCanvasEdgeRequest } from './cross-canvas-edge';
