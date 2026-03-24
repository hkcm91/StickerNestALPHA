/**
 * AI Input Panel Tests
 *
 * @module canvas/panels/ai-panel
 * @layer L4A-4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { bus } from '../../../kernel/bus';

import { createAiPanelController, createInitialPanelState } from './ai-input-panel';

vi.mock('../../../kernel/bus', () => ({
  bus: {
    emit: vi.fn(),
    subscribe: vi.fn(),
  },
}));

vi.mock('../../../runtime/ai/models', () => ({
  AI_MODELS: [
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', description: 'Test', isDefault: true },
    { id: 'replicate/kimi-k2.5', name: 'Kimi K2.5', provider: 'replicate', description: 'Test' },
  ],
  getDefaultModel: () => ({ id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', description: 'Test', isDefault: true }),
  getModelById: (id: string) => {
    if (id === 'replicate/kimi-k2.5') return { id: 'replicate/kimi-k2.5', name: 'Kimi K2.5', provider: 'replicate', description: 'Test' };
    return { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', description: 'Test', isDefault: true };
  },
  saveModelId: vi.fn(),
}));

describe('AI Input Panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInitialPanelState', () => {
    it('creates closed state with default model', () => {
      const state = createInitialPanelState();
      expect(state.isOpen).toBe(false);
      expect(state.canvasPosition).toBeNull();
      expect(state.prompt).toBe('');
      expect(state.isGenerating).toBe(false);
      expect(state.selectedModel.id).toBe('anthropic/claude-sonnet-4');
    });
  });

  describe('controller', () => {
    it('opens panel at specified position', () => {
      const ctrl = createAiPanelController();
      ctrl.open({ x: 100, y: 200 }, { x: 150, y: 250 });

      const state = ctrl.getState();
      expect(state.isOpen).toBe(true);
      expect(state.canvasPosition).toEqual({ x: 100, y: 200 });
      expect(state.screenPosition).toEqual({ x: 150, y: 250 });
    });

    it('closes panel and resets state', () => {
      const ctrl = createAiPanelController();
      ctrl.open({ x: 100, y: 200 }, { x: 150, y: 250 });
      ctrl.close();

      const state = ctrl.getState();
      expect(state.isOpen).toBe(false);
      expect(state.canvasPosition).toBeNull();
    });

    it('sets prompt text', () => {
      const ctrl = createAiPanelController();
      ctrl.setPrompt('Create a timer widget');
      expect(ctrl.getState().prompt).toBe('Create a timer widget');
    });

    it('changes selected model', () => {
      const ctrl = createAiPanelController();
      ctrl.setModel('replicate/kimi-k2.5');
      expect(ctrl.getState().selectedModel.id).toBe('replicate/kimi-k2.5');
    });

    it('returns available models list', () => {
      const ctrl = createAiPanelController();
      const models = ctrl.getAvailableModels();
      expect(models.length).toBe(2);
      expect(models[0].id).toBe('anthropic/claude-sonnet-4');
    });

    it('emits generate event when prompt is set and panel is open', () => {
      const ctrl = createAiPanelController();
      ctrl.open({ x: 100, y: 200 }, { x: 150, y: 250 });
      ctrl.setPrompt('Make a clock widget');
      ctrl.generate();

      expect(bus.emit).toHaveBeenCalledWith('canvas.ai.generate.requested', {
        prompt: 'Make a clock widget',
        model: 'anthropic/claude-sonnet-4',
        canvasPosition: { x: 100, y: 200 },
      });

      expect(ctrl.getState().isGenerating).toBe(true);
    });

    it('does not generate with empty prompt', () => {
      const ctrl = createAiPanelController();
      ctrl.open({ x: 100, y: 200 }, { x: 150, y: 250 });
      ctrl.setPrompt('   ');
      ctrl.generate();

      expect(bus.emit).not.toHaveBeenCalledWith(
        'canvas.ai.generate.requested',
        expect.anything(),
      );
    });

    it('does not generate when already generating', () => {
      const ctrl = createAiPanelController();
      ctrl.open({ x: 100, y: 200 }, { x: 150, y: 250 });
      ctrl.setPrompt('Test');
      ctrl.generate(); // First call
      vi.clearAllMocks();
      ctrl.generate(); // Second call — should be no-op

      expect(bus.emit).not.toHaveBeenCalledWith(
        'canvas.ai.generate.requested',
        expect.anything(),
      );
    });

    it('cancel stops generation and emits cancelled event', () => {
      const ctrl = createAiPanelController();
      ctrl.open({ x: 100, y: 200 }, { x: 150, y: 250 });
      ctrl.setPrompt('Test');
      ctrl.generate();
      vi.clearAllMocks();

      ctrl.cancel();
      expect(ctrl.getState().isGenerating).toBe(false);
      expect(bus.emit).toHaveBeenCalledWith('canvas.ai.cancelled', {});
    });

    it('subscribes to panel open and cancelled events', () => {
      createAiPanelController();

      // Should have subscribed to two events
      expect(bus.subscribe).toHaveBeenCalledWith('canvas.ai.panel.open', expect.any(Function));
      expect(bus.subscribe).toHaveBeenCalledWith('canvas.ai.cancelled', expect.any(Function));
    });
  });
});
