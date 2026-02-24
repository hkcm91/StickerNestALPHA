/**
 * Interaction Store tests
 * @module canvas/core/interaction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { InteractionModeEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

import {
  useInteractionStore,
  canManipulateEntities,
  areToolsEnabled,
  areWidgetsInteractive,
  setupInteractionBusSubscriptions,
  type InteractionMode,
} from './interaction-store';

describe('Interaction Store', () => {
  beforeEach(() => {
    useInteractionStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should start in edit mode', () => {
      const state = useInteractionStore.getState();
      expect(state.mode).toBe('edit');
    });

    it('should have tools enabled in edit mode', () => {
      const state = useInteractionStore.getState();
      expect(state.toolsEnabled).toBe(true);
    });

    it('should have widgets interactive in edit mode', () => {
      const state = useInteractionStore.getState();
      expect(state.widgetsInteractive).toBe(true);
    });
  });

  describe('setMode', () => {
    it('should change mode to play', () => {
      useInteractionStore.getState().setMode('play');
      expect(useInteractionStore.getState().mode).toBe('play');
    });

    it('should disable tools in play mode', () => {
      useInteractionStore.getState().setMode('play');
      expect(useInteractionStore.getState().toolsEnabled).toBe(false);
    });

    it('should keep widgets interactive in play mode', () => {
      useInteractionStore.getState().setMode('play');
      expect(useInteractionStore.getState().widgetsInteractive).toBe(true);
    });

    it('should change mode back to edit', () => {
      useInteractionStore.getState().setMode('play');
      useInteractionStore.getState().setMode('edit');
      expect(useInteractionStore.getState().mode).toBe('edit');
    });

    it('should re-enable tools when returning to edit mode', () => {
      useInteractionStore.getState().setMode('play');
      useInteractionStore.getState().setMode('edit');
      expect(useInteractionStore.getState().toolsEnabled).toBe(true);
    });

    it('should emit bus event when mode changes', () => {
      const emitSpy = vi.spyOn(bus, 'emit');
      useInteractionStore.getState().setMode('play');

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: InteractionModeEvents.MODE_CHANGED,
          payload: { mode: 'play' },
        })
      );

      emitSpy.mockRestore();
    });

    it('should not emit event if mode is unchanged', () => {
      const emitSpy = vi.spyOn(bus, 'emit');
      useInteractionStore.getState().setMode('edit'); // Already edit

      expect(emitSpy).not.toHaveBeenCalled();

      emitSpy.mockRestore();
    });
  });

  describe('toggleMode', () => {
    it('should toggle from edit to play', () => {
      useInteractionStore.getState().toggleMode();
      expect(useInteractionStore.getState().mode).toBe('play');
    });

    it('should toggle from play to edit', () => {
      useInteractionStore.getState().setMode('play');
      useInteractionStore.getState().toggleMode();
      expect(useInteractionStore.getState().mode).toBe('edit');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      useInteractionStore.getState().setMode('play');
      useInteractionStore.getState().reset();

      const state = useInteractionStore.getState();
      expect(state.mode).toBe('edit');
      expect(state.toolsEnabled).toBe(true);
      expect(state.widgetsInteractive).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    describe('canManipulateEntities', () => {
      it('should return true in edit mode', () => {
        useInteractionStore.getState().setMode('edit');
        expect(canManipulateEntities()).toBe(true);
      });

      it('should return false in play mode', () => {
        useInteractionStore.getState().setMode('play');
        expect(canManipulateEntities()).toBe(false);
      });
    });

    describe('areToolsEnabled', () => {
      it('should return true in edit mode', () => {
        useInteractionStore.getState().setMode('edit');
        expect(areToolsEnabled()).toBe(true);
      });

      it('should return false in play mode', () => {
        useInteractionStore.getState().setMode('play');
        expect(areToolsEnabled()).toBe(false);
      });
    });

    describe('areWidgetsInteractive', () => {
      it('should return true in edit mode', () => {
        useInteractionStore.getState().setMode('edit');
        expect(areWidgetsInteractive()).toBe(true);
      });

      it('should return true in play mode', () => {
        useInteractionStore.getState().setMode('play');
        expect(areWidgetsInteractive()).toBe(true);
      });
    });
  });

  describe('Bus Subscriptions', () => {
    beforeEach(() => {
      setupInteractionBusSubscriptions();
    });

    it('should update mode when receiving bus event', () => {
      // Emit from external source (simulating kernel uiStore)
      bus.emit({
        type: InteractionModeEvents.MODE_CHANGED,
        payload: { mode: 'play' as InteractionMode },
      });

      // Wait for subscription to process
      expect(useInteractionStore.getState().mode).toBe('play');
    });

    it('should ignore invalid mode values', () => {
      bus.emit({
        type: InteractionModeEvents.MODE_CHANGED,
        payload: { mode: 'invalid' },
      });

      expect(useInteractionStore.getState().mode).toBe('edit');
    });

    it('should not create infinite loop when mode is same', () => {
      const emitSpy = vi.spyOn(bus, 'emit');

      // Already in edit mode, emit edit mode event
      bus.emit({
        type: InteractionModeEvents.MODE_CHANGED,
        payload: { mode: 'edit' as InteractionMode },
      });

      // Should not emit another event
      const editEmits = emitSpy.mock.calls.filter(
        (call) => call[0].type === InteractionModeEvents.MODE_CHANGED
      );
      expect(editEmits.length).toBe(1); // Only the one we emitted

      emitSpy.mockRestore();
    });
  });
});

describe('Mode Behavior Matrix', () => {
  beforeEach(() => {
    useInteractionStore.getState().reset();
  });

  /**
   * Behavior Matrix from plan:
   * | chromeMode | interactionMode | Use Case |
   * |------------|-----------------|----------|
   * | editor | edit | Canvas Page default |
   * | editor | play | Test widgets in editor |
   * | clean | play | Public slug view |
   * | clean | edit | Mobile editing (optional) |
   */

  it('should support edit mode (Canvas Page default)', () => {
    useInteractionStore.getState().setMode('edit');
    const state = useInteractionStore.getState();

    expect(state.mode).toBe('edit');
    expect(state.toolsEnabled).toBe(true);
    expect(canManipulateEntities()).toBe(true);
  });

  it('should support play mode (Test widgets / Public slug)', () => {
    useInteractionStore.getState().setMode('play');
    const state = useInteractionStore.getState();

    expect(state.mode).toBe('play');
    expect(state.toolsEnabled).toBe(false);
    expect(canManipulateEntities()).toBe(false);
    expect(areWidgetsInteractive()).toBe(true); // Widgets still work
  });
});
