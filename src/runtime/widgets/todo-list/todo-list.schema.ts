/**
 * Todo List Widget Schemas
 *
 * Zod schemas and types for the Todo List widget.
 *
 * @module runtime/widgets/todo-list
 * @layer L3
 */

import { z } from 'zod';

// ── Priority enum ──────────────────────────────────────────────

export const todoPrioritySchema = z.enum(['high', 'medium', 'low', 'none']);
export type TodoPriority = z.infer<typeof todoPrioritySchema>;

export const PRIORITY_LABELS: Record<TodoPriority, string> = {
  high: '🔴 High',
  medium: '🟡 Medium',
  low: '🟢 Low',
  none: '⚪ None',
};

export const PRIORITY_ORDER: Record<TodoPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

// ── Todo item ──────────────────────────────────────────────────

export const todoItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean().default(false),
  priority: todoPrioritySchema.default('none'),
  category: z.string().default(''),
  dueDate: z.string().optional(),
  createdAt: z.number(),
  completedAt: z.number().optional(),
  notes: z.string().default(''),
});

export type TodoItem = z.infer<typeof todoItemSchema>;

// ── Widget config ──────────────────────────────────────────────

export const todoConfigSchema = z.object({
  listTitle: z.string().default('My Tasks'),
  showCompleted: z.boolean().default(true),
  sortBy: z.enum(['createdAt', 'priority', 'dueDate', 'title']).default('createdAt'),
  defaultPriority: todoPrioritySchema.default('none'),
});

export type TodoConfig = z.infer<typeof todoConfigSchema>;

export const DEFAULT_TODO_CONFIG: TodoConfig = todoConfigSchema.parse({});

export const parseTodoConfig = (data: unknown): TodoConfig =>
  todoConfigSchema.parse(data);

export const safeParseTodoConfig = (data: unknown) =>
  todoConfigSchema.safeParse(data);
