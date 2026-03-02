/**
 * Built-in Widget React Components
 *
 * Trusted React components for built-in widgets.
 * Used by InlineWidgetFrame for zero-latency execution.
 *
 * @module runtime/widgets/built-in-components
 */

import type React from 'react';

import { ImageGeneratorWidget } from './image-generator/image-generator.widget';
import { KanbanWidget } from './kanban/kanban.widget';
import { PathfinderWidget } from './pathfinder/pathfinder.widget';
import { TodoListWidget } from './todo-list/todo-list.widget';

/**
 * Map of widget IDs to their React component implementations.
 */
export const BUILT_IN_WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'sn.builtin.image-generator': ImageGeneratorWidget,
  'sn.builtin.kanban': KanbanWidget,
  'sn.builtin.pathfinder': PathfinderWidget,
  'sn.builtin.todo-list': TodoListWidget,
};
