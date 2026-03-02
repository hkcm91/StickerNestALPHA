/**
 * Todo List Widget Events
 *
 * @module runtime/widgets/todo-list
 */

import { z } from 'zod';

/**
 * Event type constants for the Todo List widget.
 */
export const TODO_EVENTS = {
  emits: {
    READY: 'widget.todo.ready',
    ITEM_CREATED: 'widget.todo.item.created',
    ITEM_COMPLETED: 'widget.todo.item.completed',
    ITEM_UNCOMPLETED: 'widget.todo.item.uncompleted',
    ITEM_DELETED: 'widget.todo.item.deleted',
    ITEM_UPDATED: 'widget.todo.item.updated',
    LIST_CLEARED: 'widget.todo.list.cleared',
  },
  subscribes: {
    CONFIG_UPDATE: 'widget.todo.config.update',
    ADD_ITEM: 'widget.todo.command.add-item',
    CLEAR_COMPLETED: 'widget.todo.command.clear-completed',
  },
} as const;

/**
 * Payload schemas for emitted events.
 */
export const TodoEventPayloads = {
  emits: {
    [TODO_EVENTS.emits.READY]: z.object({
      instanceId: z.string(),
      timestamp: z.number(),
    }),
    [TODO_EVENTS.emits.ITEM_CREATED]: z.object({
      instanceId: z.string(),
      itemId: z.string(),
      title: z.string(),
      priority: z.string(),
      timestamp: z.number(),
    }),
    [TODO_EVENTS.emits.ITEM_COMPLETED]: z.object({
      instanceId: z.string(),
      itemId: z.string(),
      title: z.string(),
      timestamp: z.number(),
    }),
    [TODO_EVENTS.emits.ITEM_UNCOMPLETED]: z.object({
      instanceId: z.string(),
      itemId: z.string(),
      title: z.string(),
      timestamp: z.number(),
    }),
    [TODO_EVENTS.emits.ITEM_DELETED]: z.object({
      instanceId: z.string(),
      itemId: z.string(),
      timestamp: z.number(),
    }),
    [TODO_EVENTS.emits.ITEM_UPDATED]: z.object({
      instanceId: z.string(),
      itemId: z.string(),
      title: z.string(),
      priority: z.string().optional(),
      timestamp: z.number(),
    }),
    [TODO_EVENTS.emits.LIST_CLEARED]: z.object({
      instanceId: z.string(),
      clearedCount: z.number(),
      timestamp: z.number(),
    }),
  },
  subscribes: {
    [TODO_EVENTS.subscribes.CONFIG_UPDATE]: z.record(z.string(), z.unknown()),
    [TODO_EVENTS.subscribes.ADD_ITEM]: z.object({
      title: z.string(),
      priority: z.string().optional(),
      notes: z.string().optional(),
    }),
    [TODO_EVENTS.subscribes.CLEAR_COMPLETED]: z.object({}).optional(),
  },
};

/**
 * Inferred payload types.
 */
export type TodoEventPayloads = {
  emits: {
    [K in keyof typeof TodoEventPayloads.emits]: z.infer<typeof TodoEventPayloads.emits[K]>;
  };
  subscribes: {
    [K in keyof typeof TodoEventPayloads.subscribes]: z.infer<typeof TodoEventPayloads.subscribes[K]>;
  };
};
