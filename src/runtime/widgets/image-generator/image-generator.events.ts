/**
 * Image Generator Widget Events
 */

import { z } from 'zod';

/**
 * Event type constants for the Image Generator widget.
 */
export const IMAGE_GENERATOR_EVENTS = {
  emits: {
    READY: 'widget.image-generator.ready',
    GENERATION_STARTED: 'widget.image-generator.generation.started',
    GENERATION_COMPLETED: 'widget.image-generator.generation.completed',
    GENERATION_FAILED: 'widget.image-generator.generation.failed',
    ACTION: 'widget.image-generator.action',
  },
  subscribes: {
    CONFIG_UPDATE: 'widget.image-generator.config.update',
    TRIGGER_GENERATE: 'widget.image-generator.command.generate',
    ENTITY_SELECTED: 'canvas.entity.selected',
    SELECTION_CLEARED: 'canvas.selection.cleared',
  },
} as const;

/**
 * Payload schemas for emitted events.
 */
export const ImageGeneratorEventPayloads = {
  emits: {
    [IMAGE_GENERATOR_EVENTS.emits.READY]: z.object({
      instanceId: z.string(),
      timestamp: z.number(),
    }),
    [IMAGE_GENERATOR_EVENTS.emits.GENERATION_STARTED]: z.object({
      instanceId: z.string(),
      prompt: z.string(),
      model: z.string(),
      timestamp: z.number(),
    }),
    [IMAGE_GENERATOR_EVENTS.emits.GENERATION_COMPLETED]: z.object({
      instanceId: z.string(),
      imageUrl: z.string(),
      prompt: z.string(),
      model: z.string(),
      duration: z.number(),
      timestamp: z.number(),
    }),
    [IMAGE_GENERATOR_EVENTS.emits.GENERATION_FAILED]: z.object({
      instanceId: z.string(),
      error: z.string(),
      prompt: z.string(),
      model: z.string(),
      timestamp: z.number(),
    }),
    [IMAGE_GENERATOR_EVENTS.emits.ACTION]: z.object({
      instanceId: z.string(),
      action: z.string(),
      data: z.record(z.string(), z.unknown()),
      timestamp: z.number(),
    }),
  },
  subscribes: {
    [IMAGE_GENERATOR_EVENTS.subscribes.CONFIG_UPDATE]: z.record(z.string(), z.unknown()),
    [IMAGE_GENERATOR_EVENTS.subscribes.TRIGGER_GENERATE]: z.object({
      prompt: z.string(),
      model: z.string().optional(),
    }),
    [IMAGE_GENERATOR_EVENTS.subscribes.ENTITY_SELECTED]: z.object({
      entities: z.array(z.record(z.string(), z.unknown())).optional(),
    }),
    [IMAGE_GENERATOR_EVENTS.subscribes.SELECTION_CLEARED]: z.object({}).optional(),
  },
};

export type ImageGeneratorEventPayloads = {
  emits: {
    [K in keyof typeof ImageGeneratorEventPayloads.emits]: z.infer<typeof ImageGeneratorEventPayloads.emits[K]>;
  };
  subscribes: {
    [K in keyof typeof ImageGeneratorEventPayloads.subscribes]: z.infer<typeof ImageGeneratorEventPayloads.subscribes[K]>;
  };
};
