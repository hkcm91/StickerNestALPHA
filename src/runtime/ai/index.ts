/**
 * Shared AI module — importable by Lab (L2) and Canvas (L4A-2).
 *
 * @module runtime/ai
 * @layer L3
 */

export { createAIGenerator, validateWidgetHtml, extractHtml } from './ai-generator';
export type { AIGenerator, AIGenerationResult } from './ai-generator';
export { AI_MODELS, getDefaultModel, getModelById, loadSavedModelId, saveModelId } from './models';
export type { AIModel } from './models';
export { generateManifestFromHtml } from './manifest-generator';
export type { ManifestGenerationResult } from './manifest-generator';
