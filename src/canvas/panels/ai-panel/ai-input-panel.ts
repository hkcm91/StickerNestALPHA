/**
 * AI Input Panel — Floating panel for on-canvas AI widget generation
 *
 * Opens at the canvas position when the AI tool is clicked. Provides
 * a text input, model selector, and generates widgets via the shared
 * AI generator in src/runtime/ai/.
 *
 * Panel dispatches intent by emitting bus events — it does not call
 * store actions directly.
 *
 * @module canvas/panels/ai-panel
 * @layer L4A-4
 */

import type { Point2D } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { AIModel } from '../../../runtime/ai/models'; // L3 — allowed import
import { AI_MODELS, getDefaultModel, getModelById, saveModelId } from '../../../runtime/ai/models'; // L3 — allowed import

// Bus event constants — defined here to avoid importing from canvas-tools layer
// (L4A-4 panels MUST NOT import from L4A-2 tools per boundary rules)
const AI_TOOL_PANEL_OPEN = 'canvas.ai.panel.open';
const AI_TOOL_CANCELLED = 'canvas.ai.cancelled';

// ---------------------------------------------------------------------------
// Panel State
// ---------------------------------------------------------------------------

export interface AiPanelState {
  isOpen: boolean;
  canvasPosition: Point2D | null;
  screenPosition: Point2D | null;
  prompt: string;
  selectedModel: AIModel;
  isGenerating: boolean;
  streamingOutput: string;
  error: string | null;
}

export function createInitialPanelState(): AiPanelState {
  return {
    isOpen: false,
    canvasPosition: null,
    screenPosition: null,
    prompt: '',
    selectedModel: getDefaultModel(),
    isGenerating: false,
    streamingOutput: '',
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Panel Controller
// ---------------------------------------------------------------------------

export interface AiPanelController {
  getState(): AiPanelState;
  open(canvasPosition: Point2D, screenPosition: Point2D): void;
  close(): void;
  setPrompt(prompt: string): void;
  setModel(modelId: string): void;
  getAvailableModels(): AIModel[];
  generate(): void;
  cancel(): void;
}

/**
 * Creates the AI panel controller. The controller emits bus events
 * for all actions — it does not mutate stores directly.
 */
export function createAiPanelController(): AiPanelController {
  const state = createInitialPanelState();

  // Subscribe to AI tool panel open events
  bus.subscribe(AI_TOOL_PANEL_OPEN, (event: unknown) => {
    const e = event as { payload?: { canvasPosition?: Point2D; screenPosition?: Point2D } };
    const payload = e?.payload ?? (e as { canvasPosition?: Point2D; screenPosition?: Point2D });
    if (payload?.canvasPosition && payload?.screenPosition) {
      state.isOpen = true;
      state.canvasPosition = payload.canvasPosition;
      state.screenPosition = payload.screenPosition;
      state.prompt = '';
      state.streamingOutput = '';
      state.error = null;
      state.isGenerating = false;
    }
  });

  // Subscribe to AI tool cancellation
  bus.subscribe(AI_TOOL_CANCELLED, () => {
    state.isOpen = false;
    state.isGenerating = false;
    state.streamingOutput = '';
  });

  return {
    getState: () => ({ ...state }),

    open(canvasPosition: Point2D, screenPosition: Point2D) {
      state.isOpen = true;
      state.canvasPosition = canvasPosition;
      state.screenPosition = screenPosition;
      state.prompt = '';
      state.streamingOutput = '';
      state.error = null;
    },

    close() {
      state.isOpen = false;
      state.canvasPosition = null;
      state.screenPosition = null;
      state.isGenerating = false;
    },

    setPrompt(prompt: string) {
      state.prompt = prompt;
    },

    setModel(modelId: string) {
      state.selectedModel = getModelById(modelId);
      saveModelId(modelId);
    },

    getAvailableModels: () => [...AI_MODELS],

    generate() {
      if (!state.prompt.trim() || state.isGenerating || !state.canvasPosition) return;

      state.isGenerating = true;
      state.streamingOutput = '';
      state.error = null;

      // Emit bus event requesting generation — the shell/canvas layer
      // will create the AIGenerator and handle the actual edge function call.
      bus.emit('canvas.ai.generate.requested', {
        prompt: state.prompt,
        model: state.selectedModel.id,
        canvasPosition: state.canvasPosition,
      });
    },

    cancel() {
      state.isGenerating = false;
      state.streamingOutput = '';
      bus.emit(AI_TOOL_CANCELLED, {});
    },
  };
}
