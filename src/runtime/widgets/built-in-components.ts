/**
 * Built-in Widget React Components
 *
 * Trusted React components for built-in widgets.
 * Used by InlineWidgetFrame for zero-latency execution.
 *
 * @module runtime/widgets/built-in-components
 */

import type React from 'react';

import { AiAgentWidget } from './ai-agent/ai-agent.widget';
import { AICanvasAgentWidget } from './ai-canvas-agent/ai-canvas-agent.widget';
import { ImageGeneratorWidget } from './image-generator/image-generator.widget';
import { KanbanWidget } from './kanban/kanban.widget';
import { PathfinderWidget } from './pathfinder/pathfinder.widget';
import { TodoListWidget } from './todo-list/todo-list.widget';

/**
 * Map of widget IDs to their React component implementations.
 */
export const BUILT_IN_WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'sn.builtin.ai-agent': AiAgentWidget,
  'sn.builtin.ai-canvas-agent': AICanvasAgentWidget,
  'sn.builtin.image-generator': ImageGeneratorWidget,
  'sn.builtin.kanban': KanbanWidget,
  'sn.builtin.pathfinder': PathfinderWidget,
  'sn.builtin.todo-list': TodoListWidget,
};
