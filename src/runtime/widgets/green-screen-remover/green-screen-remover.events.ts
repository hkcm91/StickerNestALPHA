/**
 * Green Screen Remover Widget Events
 *
 * @module runtime/widgets/green-screen-remover
 */

import { z } from 'zod';

/**
 * Event type constants for the Green Screen Remover widget.
 */
export const GREEN_SCREEN_REMOVER_EVENTS = {
  emits: {
    READY: 'widget.green-screen-remover.ready',
    PROCESSING_STARTED: 'widget.green-screen-remover.processing.started',
    PROCESSING_COMPLETED: 'widget.green-screen-remover.processing.completed',
    PROCESSING_FAILED: 'widget.green-screen-remover.processing.failed',
  },
  subscribes: {
    ENTITY_SELECTED: 'canvas.entity.selected',
    SELECTION_CLEARED: 'canvas.selection.cleared',
  },
} as const;

/**
 * Payload schemas for emitted events.
 */
export const GreenScreenRemoverEventPayloads = {
  emits: {
    [GREEN_SCREEN_REMOVER_EVENTS.emits.READY]: z.object({
      instanceId: z.string(),
      timestamp: z.number(),
    }),
    [GREEN_SCREEN_REMOVER_EVENTS.emits.PROCESSING_STARTED]: z.object({
      instanceId: z.string(),
      entityId: z.string(),
      timestamp: z.number(),
    }),
    [GREEN_SCREEN_REMOVER_EVENTS.emits.PROCESSING_COMPLETED]: z.object({
      instanceId: z.string(),
      entityId: z.string(),
      duration: z.number(),
      timestamp: z.number(),
    }),
    [GREEN_SCREEN_REMOVER_EVENTS.emits.PROCESSING_FAILED]: z.object({
      instanceId: z.string(),
      error: z.string(),
      timestamp: z.number(),
    }),
  },
  subscribes: {
    [GREEN_SCREEN_REMOVER_EVENTS.subscribes.ENTITY_SELECTED]: z.object({
      entities: z.array(z.record(z.string(), z.unknown())).optional(),
    }),
    [GREEN_SCREEN_REMOVER_EVENTS.subscribes.SELECTION_CLEARED]: z.object({}).optional(),
  },
};

export type GreenScreenRemoverEventPayloads = {
  emits: {
    [K in keyof typeof GreenScreenRemoverEventPayloads.emits]: z.infer<typeof GreenScreenRemoverEventPayloads.emits[K]>;
  };
  subscribes: {
    [K in keyof typeof GreenScreenRemoverEventPayloads.subscribes]: z.infer<typeof GreenScreenRemoverEventPayloads.subscribes[K]>;
  };
};
