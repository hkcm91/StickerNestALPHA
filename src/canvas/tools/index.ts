/**
 * Canvas Tools — barrel export
 *
 * @module canvas/tools
 * @layer L4A-2
 */

export { createToolRegistry } from './registry';
export type { ToolRegistry, Tool, CanvasPointerEvent, CanvasKeyEvent } from './registry';

export { createSelectTool } from './select';
export type { SelectTool } from './select';

export { createMoveTool } from './move';
export type { MoveToolOptions } from './move';
export { snapToGrid, findAlignmentGuides } from './move';
export type { AlignmentGuide } from './move';

export { createResizeTool, getResizeHandles, computeResize } from './resize';
export type { HandlePosition, ResizeHandle } from './resize';

export { createPenTool } from './pen';
export { createTextTool } from './text';
export { createShapeTool } from './shape';
export type { ShapeMode } from './shape';
export { createStickerTool } from './sticker';
export { createWidgetTool } from './widget';

export { initCanvasTools, teardownCanvasTools, isCanvasToolsInitialized } from './init';
export type { CanvasToolsContext } from './init';
