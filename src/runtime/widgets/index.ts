/**
 * Built-in Widgets
 *
 * Trusted widgets that use the same SDK interface as sandboxed widgets.
 * Current set: Sticky Note, Clock/Timer, Counter, Image viewer, Markdown note.
 *
 * @module runtime/widgets
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

// Built-in widgets will be exported here as they are implemented.
// Each built-in must use the same SDK interface as sandboxed widgets.
// No privileged internal APIs — this ensures portability.

export { AICanvasAgentWidget } from './ai-canvas-agent/ai-canvas-agent.widget';
export { aiCanvasAgentManifest } from './ai-canvas-agent/ai-canvas-agent.widget';
export { ImageGeneratorWidget } from './image-generator/image-generator.widget';
export { imageGeneratorManifest } from './image-generator/image-generator.widget';
export { KanbanWidget } from './kanban/kanban.widget';
export { kanbanManifest } from './kanban/kanban.widget';
export { PathfinderWidget } from './pathfinder/pathfinder.widget';
export { pathfinderManifest } from './pathfinder/pathfinder.widget';
export { TodoListWidget } from './todo-list/todo-list.widget';
export { todoListManifest } from './todo-list/todo-list.widget';
export { AiAgentWidget } from './ai-agent/ai-agent.widget';
export { aiAgentManifest } from './ai-agent/ai-agent.widget';
export { GalleryWidget } from './gallery/gallery.widget';
export { galleryManifest } from './gallery/gallery.widget';
export { GreenScreenRemoverWidget } from './green-screen-remover/green-screen-remover.widget';
export { greenScreenRemoverManifest } from './green-screen-remover/green-screen-remover.widget';
export { SharedBeaconWidget } from './shared-beacon/shared-beacon.widget';
export { sharedBeaconManifest } from './shared-beacon/shared-beacon.widget';
export { BUILT_IN_WIDGET_HTML } from './built-in-html';
export { BUILT_IN_WIDGET_COMPONENTS } from './built-in-components';
