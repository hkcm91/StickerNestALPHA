/**
 * AI Model Registry — Shared across Lab and Canvas layers.
 *
 * Canonical source for available AI models. Lab and Canvas tools
 * both import from here.
 *
 * @module runtime/ai
 * @layer L3
 */

export interface AIModel {
  /** Unique identifier e.g. 'anthropic/claude-sonnet-4' */
  id: string;
  /** Human-readable name */
  name: string;
  /** Which API provider handles this model */
  provider: 'anthropic' | 'replicate';
  /** Replicate model path — only for provider='replicate' */
  replicateModel?: string;
  /** Short description shown in selector */
  description: string;
  /** Whether this is the default model */
  isDefault?: boolean;
}

/**
 * All available AI models.
 */
export const AI_MODELS: AIModel[] = [
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    description: 'Fast, intelligent',
    isDefault: true,
  },
  {
    id: 'replicate/kimi-k2.5',
    name: 'Kimi K2.5',
    provider: 'replicate',
    replicateModel: 'moonshotai/kimi-k2.5',
    description: 'Moonshot AI',
  },
  {
    id: 'replicate/llama-4-maverick',
    name: 'Llama 4 Maverick',
    provider: 'replicate',
    replicateModel: 'meta/llama-4-maverick-instruct',
    description: 'Meta',
  },
  {
    id: 'replicate/qwen3-235b',
    name: 'Qwen 3 235B',
    provider: 'replicate',
    replicateModel: 'qwen/qwen3-235b-a22b-instruct-2507',
    description: 'Alibaba',
  },
];

const STORAGE_KEY = 'sn:lab:ai-model';

/** Get the default model */
export function getDefaultModel(): AIModel {
  return AI_MODELS.find((m) => m.isDefault) ?? AI_MODELS[0];
}

/** Get a model by ID, falling back to the default */
export function getModelById(id: string): AIModel {
  return AI_MODELS.find((m) => m.id === id) ?? getDefaultModel();
}

/** Load saved model preference from localStorage */
export function loadSavedModelId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && AI_MODELS.some((m) => m.id === saved)) {
      return saved;
    }
  } catch {
    // localStorage not available
  }
  return getDefaultModel().id;
}

/** Save model preference to localStorage */
export function saveModelId(modelId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, modelId);
  } catch {
    // localStorage not available
  }
}
