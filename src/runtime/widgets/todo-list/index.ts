/**
 * Todo List Widget — Barrel Exports
 *
 * @module runtime/widgets/todo-list
 * @layer L3
 */

// Component + manifest
export { TodoListWidget, todoListManifest } from './todo-list.widget';

// Config schema + types
export {
  todoConfigSchema,
  DEFAULT_TODO_CONFIG,
  parseTodoConfig,
  safeParseTodoConfig,
  todoPrioritySchema,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
} from './todo-list.schema';
export type { TodoItem, TodoConfig, TodoPriority } from './todo-list.schema';

// Events
export { TODO_EVENTS } from './todo-list.events';
