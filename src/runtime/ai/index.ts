/**
 * Unified AI Module
 *
 * Single source of truth for AI widget generation.
 * Both Lab (L2) and Canvas Widget (L4A-2) import from here.
 *
 * @module runtime/ai
 * @layer L3
 */

// ── Core Generator ──────────────────────────────────────────────────
export {
  createWidgetGenerator,
  validateWidgetHtml,
  extractHtml,
  buildEnrichedPrompt,
  computeCompatibility,
  generateClarifyingQuestions,
} from './widget-generator';

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
} from './widget-generator';

// ── Model Registry ──────────────────────────────────────────────────
export {
  AI_MODELS,
  getDefaultModel,
  getModelById,
  loadSavedModelId,
  saveModelId,
} from './models';
export type { AIModel } from './models';

// ── Manifest Generator ──────────────────────────────────────────────
export { generateManifestFromHtml } from './manifest-generator';
export type { ManifestGenerationResult } from './manifest-generator';
