/**
 * Canvas Core — barrel export
 *
 * @module canvas/core
 * @layer L4A-1
 */

// Viewport
export { createViewport, canvasToScreen, screenToCanvas, panBy, zoomTo, getVisibleBounds } from './viewport';
export type { ViewportState } from './viewport';

// Scene graph
export { createSceneGraph } from './scene';
export type { SceneGraph } from './scene';
export { createSpatialIndex } from './scene';
export type { SpatialIndex } from './scene';

// Hit-testing
export { hitTestPoint, hitTestRegion, entityBounds, pointInEntity } from './hittest';

// Renderer
export { createDirtyTracker } from './renderer';
export type { DirtyTracker } from './renderer';
export { createRenderLoop } from './renderer';
export type { RenderLoop, FrameCallback } from './renderer';

// Drag
export { createDragManager, DRAG_THRESHOLD } from './drag';
export type { DragManager, DragState } from './drag';

// Init
export { initCanvasCore, teardownCanvasCore, isCanvasCoreInitialized, getCanvasCoreContext } from './init';
export type { CanvasCoreContext } from './init';
