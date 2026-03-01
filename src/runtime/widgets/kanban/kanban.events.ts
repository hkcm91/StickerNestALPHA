/**
 * Kanban Board Widget Events
 *
 * @module runtime/widgets/kanban
 */

import { z } from 'zod';

/**
 * Event type constants for the Kanban Board widget.
 */
export const KANBAN_EVENTS = {
  emits: {
    READY: 'widget.kanban.ready',
    CARD_CREATED: 'widget.kanban.card.created',
    CARD_MOVED: 'widget.kanban.card.moved',
    CARD_DELETED: 'widget.kanban.card.deleted',
    CARD_UPDATED: 'widget.kanban.card.updated',
    COLUMN_CREATED: 'widget.kanban.column.created',
    COLUMN_DELETED: 'widget.kanban.column.deleted',
    BOARD_CLEARED: 'widget.kanban.board.cleared',
  },
  subscribes: {
    CONFIG_UPDATE: 'widget.kanban.config.update',
    ADD_CARD: 'widget.kanban.command.add-card',
    CLEAR_BOARD: 'widget.kanban.command.clear-board',
  },
} as const;

/**
 * Payload schemas for emitted events.
 */
export const KanbanEventPayloads = {
  emits: {
    [KANBAN_EVENTS.emits.READY]: z.object({
      instanceId: z.string(),
      timestamp: z.number(),
    }),
    [KANBAN_EVENTS.emits.CARD_CREATED]: z.object({
      instanceId: z.string(),
      cardId: z.string(),
      columnId: z.string(),
      title: z.string(),
      timestamp: z.number(),
    }),
    [KANBAN_EVENTS.emits.CARD_MOVED]: z.object({
      instanceId: z.string(),
      cardId: z.string(),
      fromColumnId: z.string(),
      toColumnId: z.string(),
      timestamp: z.number(),
    }),
    [KANBAN_EVENTS.emits.CARD_DELETED]: z.object({
      instanceId: z.string(),
      cardId: z.string(),
      columnId: z.string(),
      timestamp: z.number(),
    }),
    [KANBAN_EVENTS.emits.CARD_UPDATED]: z.object({
      instanceId: z.string(),
      cardId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      timestamp: z.number(),
    }),
    [KANBAN_EVENTS.emits.COLUMN_CREATED]: z.object({
      instanceId: z.string(),
      columnId: z.string(),
      title: z.string(),
      timestamp: z.number(),
    }),
    [KANBAN_EVENTS.emits.COLUMN_DELETED]: z.object({
      instanceId: z.string(),
      columnId: z.string(),
      timestamp: z.number(),
    }),
    [KANBAN_EVENTS.emits.BOARD_CLEARED]: z.object({
      instanceId: z.string(),
      timestamp: z.number(),
    }),
  },
  subscribes: {
    [KANBAN_EVENTS.subscribes.CONFIG_UPDATE]: z.record(z.string(), z.unknown()),
    [KANBAN_EVENTS.subscribes.ADD_CARD]: z.object({
      columnId: z.string(),
      title: z.string(),
      description: z.string().optional(),
    }),
    [KANBAN_EVENTS.subscribes.CLEAR_BOARD]: z.object({}).optional(),
  },
};

/**
 * Inferred payload types.
 */
export type KanbanEventPayloads = {
  emits: {
    [K in keyof typeof KanbanEventPayloads.emits]: z.infer<typeof KanbanEventPayloads.emits[K]>;
  };
  subscribes: {
    [K in keyof typeof KanbanEventPayloads.subscribes]: z.infer<typeof KanbanEventPayloads.subscribes[K]>;
  };
};
