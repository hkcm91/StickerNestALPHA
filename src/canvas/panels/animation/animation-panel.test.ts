/**
 * Animation Panel Controller Tests
 *
 * @module canvas/panels/animation/animation-panel.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { AnimationClip, AnimationBinding, AnimationState, EntityAnimationConfig } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

import { createAnimationPanelController } from './animation-panel';

function createTestConfig(): EntityAnimationConfig {
  return {
    clips: [
      {
        id: 'clip-1',
        name: 'Test Fade',
        keyframes: [
          { offset: 0, properties: { opacity: 0 }, easing: 'linear' },
          { offset: 1, properties: { opacity: 1 }, easing: 'linear' },
        ],
        duration: 1,
        delay: 0,
        repeat: 0,
        yoyo: false,
        fillMode: 'none',
      },
    ],
    bindings: [
      {
        id: 'bind-1',
        trigger: { type: 'click' },
        clipId: 'clip-1',
        enabled: true,
        priority: 0,
      },
    ],
    states: [],
    enabled: true,
  };
}

describe('AnimationPanelController', () => {
  let controller: ReturnType<typeof createAnimationPanelController>;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    controller = createAnimationPanelController();
    emitSpy = vi.spyOn(bus, 'emit');
  });

  describe('clip operations', () => {
    it('getClips returns clips from config', () => {
      const config = createTestConfig();
      const clips = controller.getClips(config);
      expect(clips).toHaveLength(1);
      expect(clips[0].name).toBe('Test Fade');
    });

    it('getClips returns empty array for undefined config', () => {
      expect(controller.getClips(undefined)).toEqual([]);
    });

    it('addClip emits entity updated event', () => {
      const config = createTestConfig();
      const newClip: AnimationClip = {
        id: 'clip-2',
        name: 'Slide',
        keyframes: [
          { offset: 0, properties: { positionX: -100 }, easing: 'linear' },
          { offset: 1, properties: { positionX: 0 }, easing: 'easeOutCubic' },
        ],
        duration: 0.5,
        delay: 0,
        repeat: 0,
        yoyo: false,
        fillMode: 'forwards',
      };

      controller.addClip('entity-1', config, newClip);

      expect(emitSpy).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.objectContaining({
          entityId: 'entity-1',
          entity: expect.objectContaining({
            animations: expect.objectContaining({
              clips: expect.arrayContaining([
                expect.objectContaining({ id: 'clip-2' }),
              ]),
            }),
          }),
        }),
      );
    });

    it('removeClip also removes referencing bindings', () => {
      const config = createTestConfig();
      controller.removeClip('entity-1', config, 'clip-1');

      expect(emitSpy).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.objectContaining({
          entity: expect.objectContaining({
            animations: expect.objectContaining({
              clips: [],
              bindings: [],
            }),
          }),
        }),
      );
    });
  });

  describe('preset application', () => {
    it('applies a preset and emits update', () => {
      const result = controller.applyPreset('entity-1', undefined, 'preset-fade-in', 'new-clip-id');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Fade In');
      expect(result!.id).toBe('new-clip-id');

      expect(emitSpy).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.objectContaining({
          entityId: 'entity-1',
        }),
      );
    });

    it('returns null for unknown preset', () => {
      const result = controller.applyPreset('entity-1', undefined, 'unknown-preset', 'id');
      expect(result).toBeNull();
    });
  });

  describe('binding operations', () => {
    it('addBinding emits entity updated event', () => {
      const config = createTestConfig();
      const newBinding: AnimationBinding = {
        id: 'bind-2',
        trigger: { type: 'hover-enter' },
        clipId: 'clip-1',
        enabled: true,
        priority: 0,
      };

      controller.addBinding('entity-1', config, newBinding);

      expect(emitSpy).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.objectContaining({
          entity: expect.objectContaining({
            animations: expect.objectContaining({
              bindings: expect.arrayContaining([
                expect.objectContaining({ id: 'bind-2' }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe('state operations', () => {
    it('addState emits entity updated event', () => {
      const config = createTestConfig();
      const state: AnimationState = {
        id: 'state-1',
        name: 'active',
        propertyOverrides: { opacity: 0.8 },
      };

      controller.addState('entity-1', config, state);

      expect(emitSpy).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_UPDATED,
        expect.objectContaining({
          entity: expect.objectContaining({
            animations: expect.objectContaining({
              states: expect.arrayContaining([
                expect.objectContaining({ name: 'active' }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe('preview', () => {
    it('previewClip emits animation triggered event', () => {
      controller.previewClip('entity-1', 'clip-1');

      expect(emitSpy).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_ANIMATION_TRIGGERED,
        expect.objectContaining({
          entityId: 'entity-1',
          clipId: 'clip-1',
          source: 'preview',
        }),
      );
    });

    it('stopPreview emits animation cancelled event', () => {
      controller.stopPreview('entity-1');

      expect(emitSpy).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_ANIMATION_CANCELLED,
        expect.objectContaining({
          entityId: 'entity-1',
          source: 'preview',
        }),
      );
    });
  });
});
