/**
 * Built-in Widget React Components
 *
 * Trusted React components for built-in widgets.
 * Used by InlineWidgetFrame for zero-latency execution.
 *
 * @module runtime/widgets/built-in-components
 */

import type React from 'react';

import { ActivityFeedWidget } from './activity-feed/activity-feed.widget';
import { AiAgentWidget } from './ai-agent/ai-agent.widget';
import { AICanvasAgentWidget } from './ai-canvas-agent/ai-canvas-agent.widget';
import { AIWidgetGeneratorWidget } from './ai-widget-generator/ai-widget-generator.widget';
import { GalleryWidget } from './gallery/gallery.widget';
import { GreenScreenRemoverWidget } from './green-screen-remover/green-screen-remover.widget';
import { ImageGeneratorWidget } from './image-generator/image-generator.widget';
import { KanbanWidget } from './kanban/kanban.widget';
import { PathfinderWidget } from './pathfinder/pathfinder.widget';
import { TodoListWidget } from './todo-list/todo-list.widget';

/**
 * Map of widget IDs to their React component implementations.
 */
export const BUILT_IN_WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'sn.builtin.activity-feed': ActivityFeedWidget,
  'sn.builtin.ai-agent': AiAgentWidget,
  'sn.builtin.ai-canvas-agent': AICanvasAgentWidget,
  'sn.builtin.ai-widget-generator': AIWidgetGeneratorWidget,
  'sn.builtin.image-generator': ImageGeneratorWidget,
  'sn.builtin.green-screen-remover': GreenScreenRemoverWidget,
  'sn.builtin.kanban': KanbanWidget,
  'sn.builtin.pathfinder': PathfinderWidget,
  'sn.builtin.todo-list': TodoListWidget,
  'sn.builtin.gallery': GalleryWidget,
};
