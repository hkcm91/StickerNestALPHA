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

export {
  snapToGrid,
  findAlignmentGuides,
  snapToGridCell,
  positionToGridCell,
  gridCellToPosition,
  getGridCellBounds,
  getGridCellCenter,
  widgetFitsInCell,
  widgetCellSpan,
} from './move/snap';
export type { AlignmentGuide } from './move/snap';

export { createResizeTool, getResizeHandles, computeResize } from './resize';
export type { HandlePosition, ResizeHandle } from './resize';

export { createPenTool } from './pen';
export { createTextTool } from './text';
export { createShapeTool } from './shape';
export type { ShapeMode } from './shape';
export { createStickerTool } from './sticker';
export { createWidgetTool } from './widget';
export { createGhostWidgetTool } from './ghost-widget';
export type { GhostWidgetPayload } from './ghost-widget';

export { createGridPaintTool, createGridPaintToolWithController } from './grid-paint';
export type { GridPaintToolOptions, GridPaintToolController } from './grid-paint';

export { initCanvasTools, teardownCanvasTools, isCanvasToolsInitialized } from './init';
export type { CanvasToolsContext } from './init';
