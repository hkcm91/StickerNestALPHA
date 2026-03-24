/**
 * AI Module — Barrel Export
 * @module kernel/ai
 */

export {
  buildCanvasAIContext,
  type BuildCanvasAIContextOptions,
  type ViewportState,
} from './canvas-context';

export {
  executeAIAction,
  executeAIActions,
  executeAIActionBatch,
  type ActionResult,
  type ExecutionResult,
} from './action-executor';

export {
  buildAIPrompt,
  parseAIResponse,
  type BuildAIPromptOptions,
  type AIPrompt,
} from './prompt-builder';

export {
  entityDistance,
  pointToEntityDistance,
  entitiesOverlap,
  entityContains,
  findNearbyEntities,
  findKNearest,
  findOverlapping,
  computeSpatialRelations,
  type ProximityQuery,
  type ProximityResult,
} from './proximity';

export {
  createEventStream,
  type EventStream,
  type EventStreamEntry,
  type EventStreamOptions,
} from './event-stream';
