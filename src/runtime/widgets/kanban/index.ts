/**
 * Kanban Board Widget
 *
 * A drag-and-drop Kanban board with columns, cards, and color labels.
 *
 * @module runtime/widgets/kanban
 * @layer L3
 */

export { KanbanWidget, kanbanManifest } from './kanban.widget';
export { kanbanConfigSchema, DEFAULT_KANBAN_CONFIG } from './kanban.schema';
export type { KanbanCard, KanbanColumn, KanbanConfig } from './kanban.schema';
export { KANBAN_EVENTS } from './kanban.events';
