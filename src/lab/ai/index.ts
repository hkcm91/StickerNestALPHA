/**
 * Lab AI Module
 *
 * Lab-specific AI features that build ON TOP of the unified generator.
 * The generator itself lives in runtime/ai — Lab only adds:
 * - Graph context serialization (scene/widget-level awareness)
 * - Full project context (design spec, source, manifest, theme)
 * - Voice input / command parsing
 * - Auto-wiring (connecting generated widgets to graph neighbors)
 * - Pipeline builder (natural language → DAG)
 *
 * @module lab/ai
 * @layer L2
 */

// ── Re-export unified generator (Lab consumers import from here) ────
export {
  createWidgetGenerator,
  validateWidgetHtml,
  buildEnrichedPrompt,
  computeCompatibility,
  generateClarifyingQuestions,
} from '../../runtime/ai';

export type {
  WidgetGenerator,
  GenerationResult,
  ExplainResult,
  PromptToggles,
  PortContract,
  CompatibleWidget,
  CanvasContext,
  LabContext,
  EnrichmentOptions,
} from '../../runtime/ai';

// ── Lab-only: Graph Context ─────────────────────────────────────────
export { buildAIGraphContext, serializeContextForPrompt } from './ai-context';
export type { AIGraphContext, AIContextBuilderInput } from './ai-context';

// ── Lab-only: Full Project Context ──────────────────────────────────
export { serializeFullContextForPrompt } from './ai-full-context';
export type { AIFullContext } from './ai-full-context';

// ── Lab-only: Voice Input ───────────────────────────────────────────
export { createVoiceInput } from './voice-input';
export type { VoiceInput, VoiceInputOptions } from './voice-input';

// ── Lab-only: Voice Command Parser ──────────────────────────────────
export { parseVoiceCommand } from './voice-command-parser';
export type { VoiceCommand, VoiceIntent } from './voice-command-parser';

// ── Lab-only: Auto-Wire ─────────────────────────────────────────────
export { autoWireWidget, wireMatchingPorts } from './auto-wire';
export type { AutoWireGraphAPI, AutoWireOptions } from './auto-wire';

// ── Lab-only: Pipeline Builder ──────────────────────────────────────
export { buildPipelineFromDescription, parsePipelineResponse } from './pipeline-builder';
export type { PipelineBuildRequest, PipelineBuildResult } from './pipeline-builder';
